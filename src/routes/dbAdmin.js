const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const isProduction = process.env.NODE_ENV === 'production';

// Security Middleware: Strictly enforce admin roles in production, allow open testing in dev.
const requireDevOrAdmin = (req, res, next) => {
  if (isProduction) {
    return auth.authenticateToken(req, res, () => {
      auth.requireAdmin(req, res, next);
    });
  }
  
  // If authorization header is present in dev, verify it; otherwise proceed.
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.split(' ')[1]) {
    return auth.authenticateToken(req, res, next);
  }
  next();
};

// Introspect helper: queries all tables in the public schema
const getValidTables = async () => {
  const res = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  return res.rows.map(r => r.table_name);
};

// Parameter validator: protects against SQL Injection by validating table parameters against whitelist.
const validateTable = async (req, res, next) => {
  try {
    const { table } = req.params;
    const tables = await getValidTables();
    if (!tables.includes(table)) {
      return res.status(400).json({ error: `Invalid or unauthorized table name: ${table}` });
    }
    req.validTableName = table;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. List all tables and row counts
router.get('/tables', requireDevOrAdmin, async (req, res) => {
  try {
    const tables = await getValidTables();
    const tableInfo = [];
    
    for (const t of tables) {
      const countRes = await db.query(`SELECT COUNT(*) FROM "${t}"`);
      tableInfo.push({
        name: t,
        rowCount: parseInt(countRes.rows[0].count)
      });
    }
    res.json(tableInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch schema structure of a table
router.get('/tables/:table/schema', requireDevOrAdmin, validateTable, async (req, res) => {
  const table = req.validTableName;
  try {
    const colRes = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    // Query primary keys of the table
    const pkRes = await db.query(`
      SELECT a.attname AS column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary;
    `, [table]);

    const primaryKeys = pkRes.rows.map(r => r.column_name);

    res.json({
      columns: colRes.rows.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
        default: c.column_default,
        isPrimaryKey: primaryKeys.includes(c.column_name)
      })),
      primaryKeys
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch rows with safety limit (200)
router.get('/tables/:table/rows', requireDevOrAdmin, validateTable, async (req, res) => {
  const table = req.validTableName;
  try {
    // Determine default ordering dynamically based on schema columns
    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);
    const cols = colsRes.rows.map(r => r.column_name);

    let orderBy = '';
    if (cols.includes('id')) {
      orderBy = 'ORDER BY id ASC';
    } else if (cols.includes('created_at')) {
      orderBy = 'ORDER BY created_at DESC';
    } else if (cols.includes('key')) {
      orderBy = 'ORDER BY key ASC';
    }

    const queryText = `SELECT * FROM "${table}" ${orderBy} LIMIT 200`;
    const result = await db.query(queryText);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Insert row
router.post('/tables/:table/rows', requireDevOrAdmin, validateTable, async (req, res) => {
  const table = req.validTableName;
  const body = req.body;
  
  try {
    const columns = Object.keys(body);
    if (columns.length === 0) {
      return res.status(400).json({ error: 'No fields provided for insertion.' });
    }
    
    const values = Object.values(body);
    const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.map(c => `"${c}"`).join(', ');

    const queryText = `
      INSERT INTO "${table}" (${columnNames})
      VALUES (${valuePlaceholders})
      RETURNING *;
    `;

    const result = await db.query(queryText, values);
    res.json({ message: 'Row inserted successfully', row: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update row
router.put('/tables/:table/rows', requireDevOrAdmin, validateTable, async (req, res) => {
  const table = req.validTableName;
  const { primaryKeys, data } = req.body;

  if (!primaryKeys || Object.keys(primaryKeys).length === 0) {
    return res.status(400).json({ error: 'Primary key query constraints are required for updating.' });
  }
  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No data payload fields provided for update.' });
  }

  try {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [col, val] of Object.entries(data)) {
      setClauses.push(`"${col}" = $${paramIndex++}`);
      values.push(val);
    }

    const whereClauses = [];
    for (const [col, val] of Object.entries(primaryKeys)) {
      whereClauses.push(`"${col}" = $${paramIndex++}`);
      values.push(val);
    }

    const queryText = `
      UPDATE "${table}"
      SET ${setClauses.join(', ')}
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *;
    `;

    const result = await db.query(queryText, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No row matched the supplied primary key criteria.' });
    }
    res.json({ message: 'Row updated successfully', row: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to cascade-delete a user and all child/related DB records safely
const cascadeDeleteUser = async (userId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Clean up tokens & session logs
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM fcm_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);

    // 2. Clean up notifications & support
    await client.query('DELETE FROM notifications WHERE target_user = $1 OR sent_by = $1', [userId]);
    await client.query('DELETE FROM support_replies WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM support_tickets WHERE user_id = $1', [userId]);

    // 3. Clean up live classes, attendance, participants, polls
    await client.query('DELETE FROM class_poll_responses WHERE student_id = $1', [userId]);
    await client.query('DELETE FROM class_polls WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM class_participants WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM attendance WHERE student_id = $1 OR teacher_id = $1', [userId]);

    // 4. Clean up parent/student links, ratings, chats, observations, reports
    await client.query('DELETE FROM parent_student_links WHERE parent_id = $1 OR student_id = $1', [userId]);
    await client.query('DELETE FROM parent_teacher_chats WHERE parent_id = $1 OR teacher_id = $1 OR student_id = $1 OR sender_id = $1', [userId]);
    await client.query('DELETE FROM teacher_ratings WHERE teacher_id = $1 OR parent_id = $1 OR student_id = $1', [userId]);
    await client.query('DELETE FROM student_observations WHERE student_id = $1 OR teacher_id = $1', [userId]);
    await client.query('DELETE FROM monthly_reports WHERE student_id = $1 OR teacher_id = $1', [userId]);

    // 5. Clean up assignments & submissions
    await client.query('DELETE FROM assignment_submissions WHERE student_id = $1 OR graded_by = $1', [userId]);
    await client.query('DELETE FROM assignments WHERE teacher_id = $1', [userId]);

    // 6. Clean up batches, batch_students, study materials
    await client.query('DELETE FROM batch_students WHERE student_id = $1', [userId]);
    await client.query('DELETE FROM study_materials WHERE teacher_id = $1', [userId]);

    // 7. Clean up financial records, payouts, wallets
    await client.query('DELETE FROM teacher_wallet_ledger WHERE teacher_id = $1 OR referred_user_id = $1', [userId]);
    await client.query('DELETE FROM teacher_wallet WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM teacher_payouts WHERE teacher_id = $1 OR processed_by = $1', [userId]);
    await client.query('DELETE FROM teacher_rewards WHERE teacher_id = $1 OR processed_by = $1', [userId]);
    await client.query('DELETE FROM teacher_allowances WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM teacher_certificates WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM refunds WHERE student_id = $1 OR processed_by = $1', [userId]);
    await client.query('DELETE FROM payments WHERE student_id = $1 OR teacher_id = $1 OR referral_teacher_id = $1', [userId]);

    // 8. Clean up teacher SOP, docs, levels
    await client.query('DELETE FROM teacher_documents WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM teacher_sop WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM teacher_levels WHERE teacher_id = $1', [userId]);

    // 9. Nullify self-referrals / recycle bin / audit logs references
    await client.query('UPDATE users SET referred_by = NULL WHERE referred_by = $1', [userId]);
    await client.query('DELETE FROM recycle_bin WHERE requested_by = $1 OR processed_by = $1', [userId]);
    await client.query('DELETE FROM email_campaigns WHERE sent_by = $1', [userId]);
    await client.query('DELETE FROM audit_logs WHERE actor_id = $1', [userId]);

    // 10. Nullify teacher_id on batches / live_classes / courses if any remain
    await client.query('UPDATE batches SET teacher_id = NULL WHERE teacher_id = $1', [userId]);
    await client.query('DELETE FROM live_classes WHERE teacher_id = $1', [userId]);

    // 11. Finally delete the user row!
    const deleteRes = await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    return deleteRes.rowCount;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// 6. Delete row (with automatic foreign-key cascading for users table)
router.delete('/tables/:table/rows', requireDevOrAdmin, validateTable, async (req, res) => {
  const table = req.validTableName;
  const { primaryKeys } = req.body;

  if (!primaryKeys || Object.keys(primaryKeys).length === 0) {
    return res.status(400).json({ error: 'Primary key query constraints are required for deletion.' });
  }

  try {
    if (table === 'users' && primaryKeys.id) {
      const userId = primaryKeys.id;
      const deletedCount = await cascadeDeleteUser(userId);
      if (deletedCount === 0) {
        return res.status(404).json({ error: 'User not found in database.' });
      }
      return res.json({ message: 'User and all associated database records permanently deleted', count: deletedCount });
    }

    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [col, val] of Object.entries(primaryKeys)) {
      whereClauses.push(`"${col}" = $${paramIndex++}`);
      values.push(val);
    }

    const queryText = `
      DELETE FROM "${table}"
      WHERE ${whereClauses.join(' AND ')};
    `;

    const result = await db.query(queryText, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No row matched the supplied primary key criteria.' });
    }
    res.json({ message: 'Row deleted successfully', count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
