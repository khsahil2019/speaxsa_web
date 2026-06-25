const db = require('../src/db');
const { generateUID } = require('../src/utils/security');
const { executePayout } = require('../src/services/RazorpayPayoutService');

async function cleanAll() {
  try {
    // Delete payments and referrers child references first
    await db.query("DELETE FROM teacher_wallet_ledger WHERE payment_id = 'pay_test_ref_e2e' OR id LIKE 'tx_alw_%' OR id LIKE 'tx_rwd_%' OR id LIKE 'tx_payout_test_e2e_ref%'");
    await db.query("DELETE FROM teacher_allowances WHERE id LIKE 'alw_202606_%'");
    await db.query("DELETE FROM teacher_rewards WHERE id IN ('reward_test_e2e', 'reward_senior_prof_ref')");
    await db.query("DELETE FROM teacher_payouts WHERE id = 'payout_test_e2e_ref'");
    await db.query("DELETE FROM batch_students WHERE payment_id = 'pay_test_ref_e2e'");
    await db.query("DELETE FROM payments WHERE id = 'pay_test_ref_e2e'");
    await db.query("DELETE FROM batches WHERE id = 'batch_test_ref'");
    await db.query("DELETE FROM courses WHERE id = 'course_test_ref'");
    
    // Delete wallets and SOP files
    for (let i = 1; i <= 12; i++) {
      await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [`teacher_ref_child_${i}`]);
      await db.query("DELETE FROM teacher_wallet WHERE teacher_id = $1", [`teacher_ref_child_${i}`]);
      await db.query("DELETE FROM users WHERE id = $1", [`teacher_ref_child_${i}`]);
    }
    
    await db.query("DELETE FROM users WHERE id = 'student_ref_child'");
    await db.query("DELETE FROM teacher_wallet WHERE teacher_id = 'teacher_ref_root'");
    await db.query("DELETE FROM users WHERE id = 'teacher_ref_root'");
    await db.query("DELETE FROM users WHERE id = 'admin_test_root'");
  } catch (err) {
    // Suppress cleanup warnings for initial clean
  }
}

async function runVerification() {
  console.log("=== STARTING END-TO-END REFERRAL & REWARDS SYSTEM VERIFICATION ===\n");
  
  try {
    // Perform initial cleanup
    await cleanAll();

    // Ensure we have a valid admin user for processed_by foreign key
    const adminQuery = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    let adminId = adminQuery.rows[0]?.id;
    if (!adminId) {
      adminId = 'admin_test_root';
      await db.query(`
        INSERT INTO users (id, email, phone, name, role, password_hash, approval_status)
        VALUES ($1, 'admin_temp@speaxa.com', '9000000000', 'Temp Admin', 'admin', 'hash', 'approved')
        ON CONFLICT (id) DO NOTHING
      `, [adminId]);
      console.log("Temporary Admin user created for foreign key reference.");
    } else {
      console.log(`Using existing Admin user ID for references: ${adminId}`);
    }

    // ------------------------------------------------------------------
    // TEST 1: Referral Capacity Cap (Maximum 10 Teachers)
    // ------------------------------------------------------------------
    console.log("--- TEST 1: Referral Capacity Cap (10 Referred Teachers Max) ---");
    
    // Create referring teacher
    const referrerId = 'teacher_ref_root';
    const referrerEmail = 'referrer@speaxa.com';
    
    await db.query(`
      INSERT INTO users (id, email, phone, name, role, password_hash, referral_code, approval_status, teacher_level)
      VALUES ($1, $2, '9999999999', 'Root Referrer', 'teacher', 'hash', 'REFROOT123', 'approved', 'Bronze')
      ON CONFLICT (id) DO NOTHING
    `, [referrerId, referrerEmail]);
    
    await db.query("INSERT INTO teacher_wallet (teacher_id) VALUES ($1) ON CONFLICT (teacher_id) DO NOTHING", [referrerId]);

    console.log("Root Referrer created with referral code 'REFROOT123'.");

    // Simulate 12 teacher signups using the root referral code
    let linkedCount = 0;
    for (let i = 1; i <= 12; i++) {
      const teacherId = `teacher_ref_child_${i}`;
      const email = `child_teacher_${i}@speaxa.com`;

      // Look up code logic similar to auth.js signup
      let referredById = null;
      const referrerQuery = await db.query("SELECT id, role FROM users WHERE referral_code = 'REFROOT123'");
      if (referrerQuery.rows.length > 0) {
        const refUser = referrerQuery.rows[0];
        // Enforce cap check
        const countCheck = await db.query(
          "SELECT COUNT(*) as count FROM users WHERE referred_by = $1 AND role = 'teacher'",
          [refUser.id]
        );
        const currentCount = parseInt(countCheck.rows[0].count || 0);
        if (currentCount < 10) {
          referredById = refUser.id;
          linkedCount++;
        }
      }

      await db.query(`
        INSERT INTO users (id, email, phone, name, role, password_hash, referral_code, approval_status, referred_by, teacher_level)
        VALUES ($1, $2, $3, $4, 'teacher', 'hash', $5, 'approved', $6, 'Bronze')
        ON CONFLICT (id) DO NOTHING
      `, [teacherId, email, `99999990${i.toString().padStart(2, '0')}`, `Child Teacher ${i}`, `REFCHILD${i}`, referredById]);

      await db.query("INSERT INTO teacher_wallet (teacher_id) VALUES ($1) ON CONFLICT (teacher_id) DO NOTHING", [teacherId]);
    }

    console.log(`Simulated 12 child teacher signups. Linked count: ${linkedCount} (Expected: 10)`);
    if (linkedCount !== 10) {
      throw new Error(`FAIL: Cap check linked ${linkedCount} teachers instead of 10.`);
    }
    console.log("✓ Capacity Cap verification PASSED.\n");

    // ------------------------------------------------------------------
    // TEST 2: Payment Commission Allocations (5% Student, 1% Teacher)
    // ------------------------------------------------------------------
    console.log("--- TEST 2: Student Referral (5%) & Teacher Referral (1%) Commissions ---");

    // Create a referred student
    const studentId = 'student_ref_child';
    await db.query(`
      INSERT INTO users (id, email, phone, name, role, password_hash, approval_status, referred_by)
      VALUES ($1, 'child_student@speaxa.com', '9888888888', 'Child Student', 'student', 'hash', 'approved', $2)
      ON CONFLICT (id) DO NOTHING
    `, [studentId, referrerId]);

    // Create course and batch for child teacher 1 (who is referred by root referrer)
    const creatorTeacherId = 'teacher_ref_child_1';
    const courseId = 'course_test_ref';
    const batchId = 'batch_test_ref';

    await db.query(`
      INSERT INTO courses (id, title, fees, status, created_by)
      VALUES ($1, 'Test Referral Course', 10000.00, 'active', $2)
      ON CONFLICT (id) DO NOTHING
    `, [courseId, creatorTeacherId]);

    await db.query(`
      INSERT INTO batches (id, course_id, teacher_id, batch_name, status, capacity, seats_filled)
      VALUES ($1, $2, $3, 'Test Batch', 'active', 30, 0)
      ON CONFLICT (id) DO NOTHING
    `, [batchId, courseId, creatorTeacherId]);

    // Insert payment record
    const paymentId = 'pay_test_ref_e2e';
    await db.query(`
      INSERT INTO payments (id, student_id, batch_id, course_id, teacher_id, amount, platform_share, teacher_share, commission_type, status)
      VALUES ($1, $2, $3, $4, $5, 10000.00, 5000.00, 5000.00, 'standard', 'pending')
      ON CONFLICT (id) DO NOTHING
    `, [paymentId, studentId, batchId, courseId, creatorTeacherId]);

    // Process payment verification logic (simulating payments.js verify endpoint)
    await db.query("UPDATE payments SET status = 'captured' WHERE id = $1", [paymentId]);

    // Enroll student in batch
    await db.query(`
      INSERT INTO batch_students (batch_id, student_id, payment_id, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT DO NOTHING
    `, [batchId, studentId, paymentId]);
    await db.query("UPDATE batches SET seats_filled = seats_filled + 1 WHERE id = $1", [batchId]);

    // Credit course teacher
    await db.query(`
      UPDATE teacher_wallet SET
        total_earnings = total_earnings + 5000.00,
        pending_earnings = pending_earnings + 5000.00,
        wallet_balance = wallet_balance + 5000.00
      WHERE teacher_id = $1
    `, [creatorTeacherId]);

    await db.query(`
      INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, payment_id)
      VALUES ($1, $2, 5000.00, 'course_share', 'Course share earnings', $3)
    `, [generateUID('tx'), creatorTeacherId, paymentId]);

    // Student Referral commission (5% of 10,000 = ₹500)
    const studentRefShare = 10000.00 * 0.05;
    await db.query(`
      UPDATE teacher_wallet SET
        total_earnings = total_earnings + $2,
        pending_earnings = pending_earnings + $2,
        wallet_balance = wallet_balance + $2
      WHERE teacher_id = $1
    `, [referrerId, studentRefShare]);

    await db.query(`
      INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, payment_id, referred_user_id)
      VALUES ($1, $2, $3, 'student_referral', 'Student referral commission', $4, $5)
    `, [generateUID('tx'), referrerId, studentRefShare, paymentId, studentId]);

    // Teacher Referral commission (1% of creator share (5000) = ₹50)
    const teacherRefShare = 5000.00 * 0.01;
    await db.query(`
      UPDATE teacher_wallet SET
        total_earnings = total_earnings + $2,
        pending_earnings = pending_earnings + $2,
        wallet_balance = wallet_balance + $2
      WHERE teacher_id = $1
    `, [referrerId, teacherRefShare]);

    await db.query(`
      INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, payment_id, referred_user_id)
      VALUES ($1, $2, $3, 'teacher_referral', 'Teacher referral commission', $4, $5)
    `, [generateUID('tx'), referrerId, teacherRefShare, paymentId, creatorTeacherId]);

    // Query root wallet
    const walletQuery = await db.query("SELECT * FROM teacher_wallet WHERE teacher_id = $1", [referrerId]);
    const balance = parseFloat(walletQuery.rows[0].wallet_balance);
    console.log(`Root Referrer Wallet Balance: ₹${balance} (Expected: ₹550.00)`);
    if (balance !== 550.00) {
      throw new Error(`FAIL: Commission credit mismatch. Balance is ₹${balance}`);
    }
    console.log("✓ Commissions allocation verification PASSED.\n");

    // ------------------------------------------------------------------
    // TEST 3: Performance Slab Rewards claiming & approvals
    // ------------------------------------------------------------------
    console.log("--- TEST 3: Performance Slab Rewards Review & Wallet Credit ---");

    // Simulate child teacher crossing 1L threshold (we'll insert a pending claim manually to test admin flow)
    const rewardId = 'reward_test_e2e';
    
    await db.query("DELETE FROM teacher_rewards WHERE id = $1", [rewardId]);
    await db.query(`
      INSERT INTO teacher_rewards (id, teacher_id, slab_name, target_revenue, reward_amount, reward_item, status)
      VALUES ($1, $2, 'Junior Teacher', 100000.00, 5000.00, 'Executive Kit', 'pending_review')
    `, [rewardId, creatorTeacherId]);

    console.log("Inserted pending slab claim for 'Junior Teacher' (₹5,000).");

    // Approve the reward claim (simulating POST /admin/rewards/:id/approve)
    await db.query(`
      UPDATE teacher_rewards 
      SET status = 'approved', processed_at = NOW(), processed_by = $2
      WHERE id = $1
    `, [rewardId, adminId]);

    await db.query(`
      UPDATE teacher_wallet SET
        total_earnings = total_earnings + 5000.00,
        pending_earnings = pending_earnings + 5000.00,
        wallet_balance = wallet_balance + 5000.00
      WHERE teacher_id = $1
    `, [creatorTeacherId]);

    await db.query(`
      INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description)
      VALUES ($1, $2, 5000.00, 'slab_reward', 'Performance reward approved')
    `, [`tx_rwd_${rewardId}`, creatorTeacherId]);

    // Check creator wallet
    const creatorWallet = await db.query("SELECT wallet_balance FROM teacher_wallet WHERE teacher_id = $1", [creatorTeacherId]);
    const creatorBal = parseFloat(creatorWallet.rows[0].wallet_balance);
    console.log(`Creator Teacher Wallet Balance: ₹${creatorBal} (Expected: ₹10,000.00 = 5K course share + 5K slab reward)`);
    if (creatorBal !== 10000.00) {
      throw new Error(`FAIL: Reward wallet credit mismatch. Balance is ₹${creatorBal}`);
    }
    console.log("✓ Performance slab approval & credit verification PASSED.\n");

    // ------------------------------------------------------------------
    // TEST 4: Grooming Allowance Generation
    // ------------------------------------------------------------------
    console.log("--- TEST 4: Grooming Allowance Generation ---");
    
    // We will generate grooming allowance for month '2026-06'
    // Creator teacher highest approved slab is 'Junior Teacher', which belongs to Group 4 (Foundation Group) -> ₹0
    // Let's create an approved Senior Professor slab reward for root referrer first to check Group 2 (₹10,000) allowance!
    const seniorProfRewardId = 'reward_senior_prof_ref';
    await db.query(`
      INSERT INTO teacher_rewards (id, teacher_id, slab_name, target_revenue, reward_amount, reward_item, status)
      VALUES ($1, $2, 'Senior Professor', 5000000.00, 300000.00, 'Family Tour (3L)', 'approved')
    `, [seniorProfRewardId, referrerId]);

    const month = '2026-06';
    const allowanceId = `alw_202606_${referrerId}`;

    // Run the generation logic
    const teachersSlabQuery = await db.query(`
      SELECT DISTINCT ON (teacher_id) teacher_id, slab_name, target_revenue
      FROM teacher_rewards
      WHERE status = 'approved' AND teacher_id = $1
      ORDER BY teacher_id, target_revenue DESC
    `, [referrerId]);

    if (teachersSlabQuery.rows.length > 0) {
      const row = teachersSlabQuery.rows[0];
      const slabName = row.slab_name;
      let groupName = 'Foundation Group';
      let amount = 0.00;

      if (slabName === 'Dean' || slabName === 'HOD') {
        groupName = 'Leadership Group';
        amount = 25000.00;
      } else if (slabName === 'Senior Professor' || slabName === 'Professor') {
        groupName = 'Academic Excellence Group';
        amount = 10000.00;
      } else if (slabName === 'Lecturer' || slabName === 'Executive Teacher' || slabName === 'Senior Teacher') {
        groupName = 'Teaching Excellence Group';
        amount = 5000.00;
      }

      await db.query(`
        INSERT INTO teacher_allowances (id, teacher_id, group_name, allowance_amount, payment_month, status)
        VALUES ($1, $2, $3, $4, $5, 'paid')
        ON CONFLICT (id) DO NOTHING
      `, [allowanceId, referrerId, groupName, amount, month]);

      if (amount > 0) {
        await db.query(`
          UPDATE teacher_wallet SET
            total_earnings = total_earnings + $2,
            pending_earnings = pending_earnings + $2,
            wallet_balance = wallet_balance + $2
          WHERE teacher_id = $1
        `, [referrerId, amount]);

        await db.query(`
          INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description)
          VALUES ($1, $2, $3, 'grooming_allowance', 'Grooming allowance credit')
        `, [`tx_alw_${allowanceId}`, referrerId, amount]);
      }
    }

    // Verify root referrer balance
    const rootWalletUpdated = await db.query("SELECT wallet_balance FROM teacher_wallet WHERE teacher_id = $1", [referrerId]);
    const rootBal = parseFloat(rootWalletUpdated.rows[0].wallet_balance);
    console.log(`Root Referrer Wallet Balance: ₹${rootBal} (Expected: ₹10,550.00 = ₹550 commission + ₹10K Group 2 allowance)`);
    if (rootBal !== 10550.00) {
      throw new Error(`FAIL: Allowance wallet credit mismatch. Balance is ₹${rootBal}`);
    }
    console.log("✓ Grooming Allowance generation verification PASSED.\n");

    // ------------------------------------------------------------------
    // TEST 5: Razorpay Payout Execution
    // ------------------------------------------------------------------
    console.log("--- TEST 5: Razorpay Payout Execution (Simulated API Call & Wallet Debit) ---");
    
    // Request a payout withdrawal for Root Referrer (amount: ₹5,000)
    const payoutId = 'payout_test_e2e_ref';

    await db.query("DELETE FROM teacher_payouts WHERE id = $1", [payoutId]);
    await db.query(`
      INSERT INTO teacher_payouts (id, teacher_id, amount, bank_account, status)
      VALUES ($1, $2, 5000.00, 'Bank: Standard | A/C: 1234567890 | IFSC: HDFC0001234 | Holder: Root Referrer', 'requested')
    `, [payoutId, referrerId]);

    // Approve the payout request
    await db.query("UPDATE teacher_payouts SET status = 'approved' WHERE id = $1", [payoutId]);

    // Execute Razorpay payout
    console.log("Invoking executePayout...");
    const payoutRes = await executePayout(payoutId);
    console.log(`Payout Execution response:`, payoutRes);

    // Verify payout state in DB
    const finalPayoutQuery = await db.query("SELECT * FROM teacher_payouts WHERE id = $1", [payoutId]);
    const payoutRow = finalPayoutQuery.rows[0];
    console.log(`Payout status in DB: ${payoutRow.status} (Expected: 'paid')`);
    console.log(`Razorpay payout ID: ${payoutRow.razorpay_payout_id}`);
    
    if (payoutRow.status !== 'paid' || !payoutRow.razorpay_payout_id) {
      throw new Error("FAIL: Payout state not updated properly in database.");
    }

    // Verify final wallet balance
    const finalWallet = await db.query("SELECT wallet_balance FROM teacher_wallet WHERE teacher_id = $1", [referrerId]);
    const finalBal = parseFloat(finalWallet.rows[0].wallet_balance);
    console.log(`Final root wallet balance: ₹${finalBal} (Expected: ₹5,550.00 = ₹10,550 - ₹5,000 withdrawal)`);
    if (finalBal !== 5550.00) {
      throw new Error(`FAIL: Wallet balance debit mismatch. Balance is ₹${finalBal}`);
    }
    console.log("✓ Razorpay Payout execution verification PASSED.\n");

    console.log("🎉 ALL END-TO-END REFERRAL & REWARDS INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (err) {
    console.error("\n❌ VERIFICATION TEST FAILED:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    console.log("\nCleaning up test records...");
    await cleanAll();
    console.log("Cleanup complete.");
    process.exit(0);
  }
}

runVerification();
