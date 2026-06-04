const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateUID } = require('../utils/security');
const { logAudit } = require('../services/AuditService');

router.use(authenticateToken);

async function getRazorpayInstance() {
  const configService = require('../services/SystemConfigService');
  const keyId = process.env.RAZORPAY_KEY_ID || await configService.getSetting('razorpay_key_id', '');
  const keySecret = process.env.RAZORPAY_KEY_SECRET || await configService.getSetting('razorpay_key_secret', '');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ── Create Razorpay Order ─────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { batchId, coupon_code, referral_code } = req.body;
  try {
    const batch = await db.query(`
      SELECT b.*, c.fees, c.title as course_title, c.id as course_id
      FROM batches b JOIN courses c ON c.id = b.course_id
      WHERE b.id = $1 AND b.status = 'active'
    `, [batchId]);
    if (!batch.rows.length) return res.status(404).json({ error: 'Batch not found' });
    const b = batch.rows[0];

    let amount = parseFloat(b.fees);
    let discountAmount = 0;
    let couponCodeUsed = null;

    // Apply coupon
    if (coupon_code) {
      const coupon = await db.query(
        "SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > NOW()) AND used_count < max_uses",
        [coupon_code.toUpperCase()]
      );
      if (coupon.rows.length > 0) {
        discountAmount = (amount * parseFloat(coupon.rows[0].discount_percent)) / 100;
        amount = Math.max(1, amount - discountAmount);
        couponCodeUsed = coupon.rows[0].code;
        await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = $1', [couponCodeUsed]);
      }
    }

    // Determine commission type (referral vs standard)
    let commissionType = 'standard';
    let referralTeacherId = null;

    if (referral_code) {
      const refTeacher = await db.query("SELECT id FROM users WHERE referral_code = $1 AND role = 'teacher'", [referral_code]);
      if (refTeacher.rows.length > 0) {
        commissionType = 'referral';
        referralTeacherId = refTeacher.rows[0].id;
      }
    }

    // Get commission split
    const commission = await db.query('SELECT * FROM commission_config WHERE commission_type = $1', [commissionType]);
    const teacherPct = parseFloat(commission.rows[0]?.teacher_pct || 50);
    const platformPct = parseFloat(commission.rows[0]?.platform_pct || 50);
    const teacherShare = (amount * teacherPct) / 100;
    const platformShare = (amount * platformPct) / 100;

    const razorpay = await getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `speaxsa_${Date.now()}`,
    });

    // Create pending payment record
    const paymentId = generateUID('pay');
    await db.query(`
      INSERT INTO payments (id, razorpay_order_id, student_id, batch_id, course_id, teacher_id,
        amount, platform_share, teacher_share, commission_type, coupon_code, discount_amount,
        status, billing_name, billing_email, billing_phone, referral_teacher_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13,$14,$15,$16)
    `, [paymentId, order.id, req.user.id, batchId, b.course_id, b.teacher_id,
        amount, platformShare, teacherShare, commissionType, couponCodeUsed, discountAmount,
        req.user.name, req.user.email, req.user.phone, referralTeacherId]);

    res.json({
      order_id: order.id,
      amount: Math.round(amount * 100),
      currency: 'INR',
      payment_id: paymentId,
      discount_applied: discountAmount,
      teacher_share: teacherShare,
    });
  } catch (err) {
    console.error('[Payment] Order creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify Payment ────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = req.body;
  try {
    const configService = require('../services/SystemConfigService');
    const keySecret = process.env.RAZORPAY_KEY_SECRET || await configService.getSetting('razorpay_key_secret', '');

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Update payment record
    await db.query(`
      UPDATE payments SET status = 'captured', razorpay_payment_id = $1, payment_method = 'razorpay'
      WHERE id = $2
    `, [razorpay_payment_id, payment_id]);

    // Get payment details
    const paymentRes = await db.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
    const payment = paymentRes.rows[0];

    // Auto-enroll student in batch
    const existing = await db.query(
      'SELECT id FROM batch_students WHERE batch_id = $1 AND student_id = $2',
      [payment.batch_id, payment.student_id]
    );
    if (!existing.rows.length) {
      await db.query(
        'INSERT INTO batch_students (batch_id, student_id, payment_id, status) VALUES ($1,$2,$3,$4)',
        [payment.batch_id, payment.student_id, payment_id, 'active']
      );
      await db.query('UPDATE batches SET seats_filled = seats_filled + 1 WHERE id = $1', [payment.batch_id]);
    }

    // Update teacher wallet
    if (payment.teacher_id) {
      await db.query(`
        INSERT INTO teacher_wallet (teacher_id, total_earnings, pending_earnings, wallet_balance)
        VALUES ($1, $2, $2, $2)
        ON CONFLICT (teacher_id) DO UPDATE SET
          total_earnings = teacher_wallet.total_earnings + $2,
          pending_earnings = teacher_wallet.pending_earnings + $2,
          wallet_balance = teacher_wallet.wallet_balance + $2
      `, [payment.teacher_id, payment.teacher_share]);
    }

    await logAudit(req.user.id, 'PAYMENT_CAPTURED', 'payment', payment_id, {
      amount: payment.amount, batch_id: payment.batch_id
    });

    res.json({ message: 'Payment verified. Enrollment confirmed!', payment_id });
  } catch (err) {
    console.error('[Payment] Verify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify Coupon ─────────────────────────────────────────────
router.post('/verify-coupon', async (req, res) => {
  const { code, amount } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > NOW()) AND used_count < max_uses",
      [code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired coupon' });
    const coupon = result.rows[0];
    const discount = (parseFloat(amount) * parseFloat(coupon.discount_percent)) / 100;
    res.json({ valid: true, discount_percent: coupon.discount_percent, discount_amount: discount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Payment History ───────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, b.batch_name, c.title as course_title
      FROM payments p
      LEFT JOIN batches b ON b.id = p.batch_id
      LEFT JOIN courses c ON c.id = p.course_id
      WHERE p.student_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Request Refund ────────────────────────────────────────────
router.post('/refund', async (req, res) => {
  const { payment_id, reason } = req.body;
  try {
    const payment = await db.query(
      "SELECT * FROM payments WHERE id = $1 AND student_id = $2 AND status = 'captured'",
      [payment_id, req.user.id]
    );
    if (!payment.rows.length) return res.status(404).json({ error: 'Payment not found' });

    const id = generateUID('refund');
    await db.query(`
      INSERT INTO refunds (id, payment_id, student_id, amount, reason, status)
      VALUES ($1,$2,$3,$4,$5,'pending')
    `, [id, payment_id, req.user.id, payment.rows[0].amount, reason]);

    await logAudit(req.user.id, 'REFUND_REQUESTED', 'payment', payment_id, { reason });
    res.status(201).json({ message: 'Refund request submitted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Webhook (no auth) ─────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const configService = require('../services/SystemConfigService');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || await configService.getSetting('razorpay_webhook_secret', '');
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (signature !== expectedSig) return res.status(400).json({ error: 'Invalid webhook signature' });

    const event = JSON.parse(body);
    console.log('[Razorpay Webhook]', event.event);

    res.json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
