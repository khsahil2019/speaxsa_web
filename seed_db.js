const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function seed() {
  console.log('Starting Speaxa database seeding using SQL files...');
  try {
    // 1. Truncate all tables cascadingly to start fresh
    console.log('Truncating tables...');
    await db.query(`
      TRUNCATE TABLE 
        audit_logs,
        support_replies,
        support_tickets,
        study_materials,
        coupons,
        platform_settings,
        commission_config,
        refresh_tokens,
        otp_tokens,
        fcm_tokens,
        notifications,
        parent_student_links,
        teacher_payouts,
        teacher_wallet,
        refunds,
        payments,
        monthly_reports,
        student_observations,
        assignment_submissions,
        assignments,
        class_poll_responses,
        class_polls,
        recordings,
        attendance,
        class_participants,
        live_classes,
        batch_students,
        batches,
        courses,
        teacher_levels,
        teacher_sop,
        teacher_documents,
        users
      CASCADE
    `);
    console.log('Tables truncated successfully.');

    // 2. Read and execute seed.sql
    console.log('Executing database/seed.sql...');
    const seedSqlPath = path.join(__dirname, 'database', 'seed.sql');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
    await db.query(seedSql);
    console.log('database/seed.sql executed successfully.');

    // 3. Read and execute seed_extended.sql
    console.log('Executing database/seed_extended.sql...');
    const seedExtendedSqlPath = path.join(__dirname, 'database', 'seed_extended.sql');
    const seedExtendedSql = fs.readFileSync(seedExtendedSqlPath, 'utf8');
    await db.query(seedExtendedSql);
    console.log('database/seed_extended.sql executed successfully.');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
