const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

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
