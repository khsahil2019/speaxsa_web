const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');


// ── GET ALL INQUIRIES & TICKETS (Admin Only) ──────────────────
router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const result = await db.query(`
      SELECT t.*, 
             u.name as u_name, u.role as u_role, u.email as u_email, u.phone as u_phone
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PUBLIC SUBMIT (Connect with Us Form) ──────────────────────
router.post('/public-connect', async (req, res) => {
  const { name, email, phone, role, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const id = 'tkt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  try {
    const result = await db.query(`
      INSERT INTO support_tickets (id, user_id, subject, description, status, priority, guest_name, guest_email, guest_phone, guest_role)
      VALUES ($1, NULL, $2, $3, 'open', 'normal', $4, $5, $6, $7)
      RETURNING *
    `, [id, `Contact Inquiry from ${name}`, message, name, email, phone, role]);

    res.status(201).json({ message: 'Thank you for contacting us. Your inquiry has been logged successfully.', ticket: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── CREATE TICKET (Authenticated Portals - Student/Teacher) ──
router.post('/create', authenticateToken, async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required.' });
  }

  const id = 'tkt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  try {
    const result = await db.query(`
      INSERT INTO support_tickets (id, user_id, subject, description, status, priority)
      VALUES ($1, $2, $3, $4, 'open', 'normal')
      RETURNING *
    `, [id, req.user.id, subject, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── REPLY TO TICKET (Admin or Ticket Owner) ──────────────────
router.post('/:id/reply', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Reply message cannot be empty.' });
  }

  try {
    // Verify ticket exists
    const tkt = await db.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
    if (!tkt.rows.length) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = tkt.rows[0];
    
    // Authorization: Must be admin, or the ticket owner
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Insert reply
    await db.query(`
      INSERT INTO support_replies (ticket_id, user_id, message)
      VALUES ($1, $2, $3)
    `, [id, req.user.id, message]);

    // Update ticket status
    const newStatus = req.user.role === 'admin' ? 'resolved' : 'open';
    await db.query('UPDATE support_tickets SET status = $1 WHERE id = $2', [newStatus, id]);

    // Send direct email response to user/guest if admin is replying
    if (req.user.role === 'admin') {
      try {
        let recipientEmail = ticket.guest_email;
        let recipientName = ticket.guest_name || 'Valued User';

        if (ticket.user_id) {
          const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [ticket.user_id]);
          if (userRes.rows.length > 0) {
            recipientEmail = userRes.rows[0].email;
            recipientName = userRes.rows[0].name;
          }
        }

        if (recipientEmail) {
          const settingsRes = await db.query(
            "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','platform_name')"
          );
          const settings = {};
          settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

          if (settings.smtp_host && settings.smtp_user) {
            const transporter = nodemailer.createTransport({
              host: settings.smtp_host,
              port: parseInt(settings.smtp_port || '587'),
              secure: parseInt(settings.smtp_port || '587') === 465,
              auth: { user: settings.smtp_user, pass: settings.smtp_pass },
            });

            const platformName = settings.platform_name || 'SPEAXSA';
            await transporter.sendMail({
              from: `"${platformName} Support" <${settings.smtp_user}>`,
              to: recipientEmail,
              subject: `Reply to your inquiry: ${ticket.subject}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <div style="background-color: #3CBDB0; padding: 24px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-family: 'Outfit', sans-serif;">${platformName} Support</h2>
                  </div>
                  <div style="padding: 30px; color: #333333; line-height: 1.6;">
                    <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Hello ${recipientName},</p>
                    <p>We have received a reply from our support team regarding your inquiry: <strong>"${ticket.subject}"</strong></p>
                    
                    <div style="background-color: #f9fafb; border-left: 4px solid #3CBDB0; padding: 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; font-weight: bold; color: #4b5563; font-size: 14px;">Support Reply:</p>
                      <p style="margin: 8px 0 0 0; font-style: italic; color: #1f2937;">${message}</p>
                    </div>

                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">If you have further questions, please do not hesitate to contact us.</p>
                  </div>
                  <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                    &copy; 2026 ${platformName}. All rights reserved.
                  </div>
                </div>
              `,
            });
            console.log(`[Support Mail] Reply sent successfully to ${recipientEmail}`);
          } else {
            console.log(`========================================`);
            console.log(`[Support Mail Simulation] To: ${recipientEmail} | Reply: ${message}`);
            console.log(`========================================`);
          }
        }
      } catch (mailError) {
        console.error('[Support Mail Error] Failed to send email:', mailError.message);
      }
    }

    res.json({ message: 'Reply sent successfully', status: newStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET TICKET REPLIES (Admin or Ticket Owner) ────────────────
router.get('/:id/replies', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const tkt = await db.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
    if (!tkt.rows.length) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = tkt.rows[0];
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const replies = await db.query(`
      SELECT r.*, u.name as sender_name, u.role as sender_role
      FROM support_replies r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.ticket_id = $1
      ORDER BY r.created_at ASC
    `, [id]);

    res.json(replies.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
