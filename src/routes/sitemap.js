const express = require('express');
const router = express.Router();
const db = require('../db');

// List of official policy document URLs from specification
const policyPages = [
  'artificial-intelligence-ai-academic-integrity-responsible-technology-policy.html',
  'children-s-privacy-parent-consent-safe-learning-policy.html',
  'community-guidelines-code-of-conduct-digital-classroom-behaviour-policy.html',
  'copyright-intellectual-property-content-usage-policy.html',
  'data-collection-usage-data-protection-policy.html',
  'grievance-redressal-user-support-dispute-resolution-policy.html',
  'information-security-cybersecurity-business-continuity-policy.html',
  'live-class-recording-digital-consent-online-examination-policy.html',
  'privacy-policy.html',
  'refund-cancellation-payment-policy.html',
  'speaxa-teacher-partnership-governance-agreement-part-1.html',
  'speaxa-teacher-partnership-governance-agreement-part-2.html',
  'speaxa-teacher-partnership-governance-agreement-part-3.html',
  'speaxa-teacher-partnership-governance-agreement-part-4.html',
  'speaxa-teacher-partnership-governance-agreement-part-5.html',
  'teacher-standards-performance-evaluation-academic-quality-assurance-policy.html',
  'terms-of-use-terms-and-conditions.html'
];

async function generateSitemapXml(baseUrl) {
  const staticUrls = [
    '/',
    '/about.html',
    '/courses.html',
    '/teachers.html',
    '/blog.html',
    '/faq.html',
    '/contact.html',
    '/student/',
    '/parent/',
    '/teacher/',
    '/policies/'
  ];

  const policyUrls = policyPages.map(p => `/policies/${p}`);

  let dynamicBlogUrls = [];
  let dynamicCourseUrls = [];

  try {
    const blogsRes = await db.query("SELECT slug, created_at FROM blogs ORDER BY created_at DESC");
    blogsRes.rows.forEach(b => dynamicBlogUrls.push(`/blog/${b.slug}`));

    const coursesRes = await db.query("SELECT id FROM courses WHERE status = 'active'");
    coursesRes.rows.forEach(c => dynamicCourseUrls.push(`/courses/${c.id}`));
  } catch (e) {
    console.error('Error querying dynamic sitemap URLs:', e.message);
  }

  const allUrls = [...staticUrls, ...policyUrls, ...dynamicBlogUrls, ...dynamicCourseUrls];
  const currentDate = new Date().toISOString().split('T')[0];

  const urlElements = allUrls.map(url => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/' ? '1.0' : (url.startsWith('/courses') ? '0.9' : '0.8')}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`.trim();
}

// ── GET /sitemap.xml ──────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const xml = await generateSitemapXml(baseUrl);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// ── GET /sitemap_index.xml ────────────────────────────────────
router.get('/sitemap_index.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const currentDate = new Date().toISOString().split('T')[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`.trim();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap index');
  }
});

// ── GET /robots.txt ───────────────────────────────────────────
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const robots = `User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap_index.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(robots.trim());
});

module.exports = router;
