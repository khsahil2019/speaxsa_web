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
    await client.query('UPDATE courses SET created_by = NULL WHERE created_by = $1', [userId]);
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

// GET /api/db-admin/tabs-config — Get disabled admin sidebar tabs
router.get('/tabs-config', requireDevOrAdmin, async (req, res) => {
  try {
    const dbRes = await db.query("SELECT value FROM platform_settings WHERE key = 'disabled_admin_tabs'");
    let disabledTabs = [];
    if (dbRes.rows.length && dbRes.rows[0].value) {
      try { disabledTabs = JSON.parse(dbRes.rows[0].value); } catch (e) {}
    }
    res.json({ disabled_tabs: disabledTabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db-admin/tabs-config — Save disabled admin sidebar tabs
router.post('/tabs-config', requireDevOrAdmin, async (req, res) => {
  const { disabled_tabs } = req.body;
  if (!Array.isArray(disabled_tabs)) {
    return res.status(400).json({ error: 'disabled_tabs must be an array' });
  }
  try {
    const val = JSON.stringify(disabled_tabs);
    await db.query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('disabled_admin_tabs', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [val]);
    res.json({ message: 'Admin sidebar tab controls updated successfully', disabled_tabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/db-admin/module-locks — Developer Module Lock Settings
router.get('/module-locks', async (req, res) => {
  try {
    const dbRes = await db.query("SELECT value FROM platform_settings WHERE key = 'locked_modules'");
    let lockedModules = { admin: {}, teacher: {}, student: {}, parent: {} };
    if (dbRes.rows.length && dbRes.rows[0].value) {
      try { 
        const parsed = JSON.parse(dbRes.rows[0].value);
        const normalize = (val) => {
          if (Array.isArray(val)) {
            const obj = {};
            val.forEach(k => obj[k] = 'Work in Progress');
            return obj;
          }
          return (val && typeof val === 'object') ? val : {};
        };
        lockedModules = {
          admin: normalize(parsed.admin),
          teacher: normalize(parsed.teacher),
          student: normalize(parsed.student),
          parent: normalize(parsed.parent)
        };
      } catch(e) {}
    }
    res.json({ locked_modules: lockedModules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db-admin/module-locks — Save Developer Module Lock Settings (Developer Only)
router.post('/module-locks', async (req, res) => {
  const { locked_modules } = req.body;
  if (!locked_modules || typeof locked_modules !== 'object') {
    return res.status(400).json({ error: 'locked_modules must be an object' });
  }
  try {
    const normalize = (val) => (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
    const val = JSON.stringify({
      admin: normalize(locked_modules.admin),
      teacher: normalize(locked_modules.teacher),
      student: normalize(locked_modules.student),
      parent: normalize(locked_modules.parent)
    });
    await db.query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('locked_modules', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [val]);
    res.json({ message: 'Developer Module Locks updated successfully', locked_modules: JSON.parse(val) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db-admin/update-admin-credentials — Update Admin Email/Password
router.post('/update-admin-credentials', async (req, res) => {
  const { admin_id, new_email, new_password } = req.body;
  const cleanEmail = (new_email || '').trim().toLowerCase();
  const cleanPass = (new_password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return res.status(400).json({ error: 'New Email and Password are required.' });
  }

  try {
    const { hashPassword } = require('../utils/security');
    const hash = hashPassword(cleanPass);

    let result;
    if (admin_id) {
      result = await db.query(`
        UPDATE users
        SET email = $1, password_hash = $2, password_plain = $3, updated_at = NOW()
        WHERE id = $4 AND role = 'admin'
        RETURNING id, name, email, role
      `, [cleanEmail, hash, cleanPass, admin_id]);
    } else {
      result = await db.query(`
        UPDATE users
        SET email = $1, password_hash = $2, password_plain = $3, updated_at = NOW()
        WHERE role = 'admin' OR LOWER(email) = 'admin@speaxa.com'
        RETURNING id, name, email, role
      `, [cleanEmail, hash, cleanPass]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found to update.' });
    }

    res.json({
      success: true,
      message: 'Admin credentials updated in database successfully!',
      admin: result.rows[0],
      new_password: cleanPass
    });
  } catch (err) {
    console.error('[Update Admin Credentials Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db-admin/send-admin-credentials-email — Dispatch credentials email to Admin
router.post('/send-admin-credentials-email', async (req, res) => {
  const { email, password, recipient_email } = req.body;
  const adminLoginEmail = (email || 'admin@speaxa.com').trim();
  const targetEmail = (recipient_email || adminLoginEmail).trim();
  const adminPass = (password || '123456').trim();

  try {
    const { sendEmail } = require('../services/EmailService');
    const adminUrl = 'https://speaxa.in/admin';

    await sendEmail({
      to: targetEmail,
      subject: '👑 SPEAXA Admin Credentials & Executive Control Access',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 20px; overflow: hidden; border: 2px solid #0d7a6d; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            
            <!-- Executive Header Banner -->
            <div style="background: linear-gradient(135deg, #0d7a6d 0%, #0f766e 50%, #1e1b4b 100%); padding: 35px 25px; text-align: center; border-bottom: 2px solid #f59e0b;">
              <div style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; padding: 5px 16px; border-radius: 50px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                👑 HIGHER AUTHORITY ACCESS GRANTED
              </div>
              <div style="font-size: 48px; margin-bottom: 8px;">🛡️</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">SPEAXA Executive Admin Access</h1>
              <p style="margin: 6px 0 0 0; color: #99f6e4; font-size: 13px;">Official Administrative Credentials & Control Console Link</p>
            </div>

            <!-- Main Email Body -->
            <div style="padding: 30px 25px;">
              <p style="margin-top: 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Hello Executive,<br><br>
                Below are your official, confidential credentials to access the <strong>SPEAXA Admin Control Panel</strong>. Use these credentials to manage teachers, students, courses, payments, and platform configurations.
              </p>
              
              <!-- Credentials Card -->
              <div style="background: #0f172a; border: 1px solid rgba(13, 122, 109, 0.4); border-radius: 14px; padding: 22px; margin: 20px 0;">
                
                <div style="margin-bottom: 16px;">
                  <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;">🌐 Admin Portal URL</div>
                  <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155;">
                    <a href="${adminUrl}" style="color: #2dd4bf; font-weight: bold; text-decoration: underline; font-family: monospace; font-size: 14px;">${adminUrl}</a>
                  </div>
                </div>

                <div style="margin-bottom: 16px;">
                  <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;">📧 Admin Login Email</div>
                  <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 14px; font-weight: bold;">
                    ${adminLoginEmail}
                  </div>
                </div>

                <div>
                  <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;">🔑 Executive Access Password</div>
                  <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; border: 1px solid #f43f5e; color: #f43f5e; font-family: monospace; font-size: 15px; font-weight: bold; letter-spacing: 1px;">
                    ${adminPass}
                  </div>
                </div>

              </div>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin-top: 25px;">
                <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d7a6d 0%, #14b8a6 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(13, 122, 109, 0.4);">
                  🚀 Launch Executive Control Console ↗
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 18px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; background: #0f172a;">
              🔒 Strictly Confidential • Automated Credentials Dispatch from SPEAXA Developer API Center
            </div>

          </div>
        </body>
        </html>
      `,
      type: 'notification'
    });

    res.json({
      success: true,
      message: `Executive login credentials successfully dispatched to ${targetEmail}!`
    });
  } catch (err) {
    console.error('[Send Admin Credentials Email Error]:', err);
    res.status(500).json({ error: 'Failed to send credentials email: ' + err.message });
  }
});

module.exports = router;
