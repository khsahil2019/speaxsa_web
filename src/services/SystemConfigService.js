/**
 * System Config Service — Reads/writes platform_settings table
 */
const db = require('../db');

let cache = null;
let cacheExpiry = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getConfig() {
  if (cache && cacheExpiry && Date.now() < cacheExpiry) {
    return cache;
  }
  const res = await db.query('SELECT key, value FROM platform_settings');
  const settings = {};
  for (const row of res.rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  cache = settings;
  cacheExpiry = Date.now() + CACHE_TTL;
  return settings;
}

async function updateConfig(key, value) {
  const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await db.query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, strValue]
  );
  cache = null; // Invalidate cache
}

async function getSetting(key, defaultValue = null) {
  const config = await getConfig();
  return config[key] ?? defaultValue;
}

module.exports = { getConfig, updateConfig, getSetting };
