const db = require('../src/db');

async function checkAvatars() {
  try {
    console.log("Checking users table for SVG or malformed avatars...");

    const res = await db.query("SELECT id, name, role, photo_url FROM users WHERE photo_url IS NOT NULL");
    console.log(`Found ${res.rows.length} users with photo_url.`);
    
    let count = 0;
    res.rows.forEach(u => {
      if (u.photo_url.includes('data:image/svg+xml') || u.photo_url.includes('"') || u.photo_url.includes("'")) {
        console.log(`[USER] ID: ${u.id}, Role: ${u.role}, Name: ${u.name}, URL starts with: ${u.photo_url.substring(0, 50)}...`);
        count++;
      }
    });
    console.log(`Found ${count} users with potentially problematic photo_urls.`);

  } catch (err) {
    console.error("Error checking avatars:", err);
  } finally {
    process.exit(0);
  }
}

checkAvatars();
