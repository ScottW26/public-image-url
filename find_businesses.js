#!/usr/bin/env node
/* ===========================================================================
   find_businesses.js — the perfect-fit BUSINESS engine.

   We are not job-chasing. For each candidate this finds the BUSINESSES where
   they are the obvious answer, scores the fit, writes the reasoning-why, and
   excludes their own past employers — filling candidate.targetBusinesses[].

   Search backends (no paid Vibe; pick whichever you have):
     1. BRAVE_API_KEY            → Brave Search API (free tier). Fully automated.
     2. --results <file.json>    → ingest businesses an agent/you collected
                                    (e.g. from a Claude web-search session).
     3. (nothing)                → writes research_queries.json: the exact
                                    searches to run per candidate, so a Claude
                                    session can run them and hand results back.

   Usage:
     BRAVE_API_KEY=xxx node find_businesses.js bench.local.json
     node find_businesses.js bench.local.json --results search_results.json
     node find_businesses.js bench.local.json            # -> research_queries.json
     (add --force to overwrite candidates that already have targetBusinesses)

   Runs locally; reads/writes your gitignored bench file only.
   =========================================================================== */
const fs = require('fs');
const https = require('https');

const FILE = process.argv[2] || 'bench.local.json';
const FORCE = process.argv.includes('--force');
const RESULTS = (() => { const i = process.argv.indexOf('--results'); return i > -1 ? process.argv[i + 1] : null; })();
const BRAVE = process.env.BRAVE_API_KEY;
const TOP_N = 6;        // businesses kept per candidate
const MIN_FIT = 58;     // drop weaker fits

if (!fs.existsSync(FILE)) { console.error('✗ File not found:', FILE); process.exit(1); }

/* ---------- profile → targeting brief ---------- */
const CHANNEL_WORDS = ['club','grocery','retail','mass','foodservice','broadline','distributor','e-commerce','ecommerce','convenience','wholesale','private label','private-label','food service'];
const US_STATES = { /* a few helpers; full name passes through */ };

function brief(c) {
  const tags = (c.sectorTags && c.sectorTags.length ? c.sectorTags : [c.primarySector]).filter(Boolean);
  const anchorsText = (c.anchorSkills || []).join(' ').toLowerCase() + ' ' + (c.anonRef || '').toLowerCase();
  const channels = CHANNEL_WORDS.filter(w => anchorsText.includes(w));
  const state = (c.geography || '').split(',').pop().trim() || c.geography || '';
  return { sector: c.primarySector || tags[0] || 'food', tags, channels, state,
           roles: c.targetRoles || [], anchors: c.anchorSkills || [] };
}

/* companies the candidate has worked at — never spec them back there */
function ownEmployers(c) {
  const text = [c.scaleHandled, c.anonRef, ...(c.pitchHooks || [])].filter(Boolean).join('  ');
  const out = new Set();
  let m; const re = /\bat ([A-Z][A-Za-z0-9&.'\- ]{2,40}?)(?:[.,;]|\s(?:with|where|across|in|for|including)\b|$)/g;
  while ((m = re.exec(text))) out.add(m[1].trim().replace(/\s+/g, ' ').toLowerCase());
  return out;
}

/* ---------- search queries per candidate ---------- */
function queriesFor(c) {
  const b = brief(c);
  const ch = b.channels.slice(0, 2).join(' ') || 'retail grocery';
  const region = b.state || 'United States';
  return [
    `mid-sized ${b.tags[0]} companies ${region} selling to ${ch}`,
    `${b.tags.slice(0, 2).join(' ')} manufacturers ${region}`,
    `${b.sector} ${ch} companies private equity owned ${region}`,
    `${b.tags[0]} brands national ${b.channels[0] || 'retail'}`,
  ];
}

/* ---------- fit scoring + reasoning ---------- */
const BLOCK_DOMAINS = ['wikipedia.org','linkedin.com','indeed.com','yelp.com','glassdoor.com','ziprecruiter.com','facebook.com','crunchbase.com','dnb.com','zoominfo.com','rocketreach.co','bbb.org','potatopro.com','comanufacturers.com','inven.ai','keychain.com','privsource.com','reddit.com','youtube.com','amazon.com'];

function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
function tokenize(s) { return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2); }

function scoreFit(c, biz) {
  const b = brief(c);
  const text = `${biz.company} ${biz.sector || ''} ${biz.text || ''} ${biz.location || ''}`.toLowerCase();
  let score = 0; const why = [];

  const tagHit = b.tags.find(t => text.includes(t.toLowerCase()));
  if (tagHit) { score += 46; why.push(`${tagHit} business — squarely their category`); }
  else if (tokenize(b.sector).some(t => text.includes(t))) { score += 30; why.push(`${b.sector} business — on-sector`); }

  const chHit = b.channels.find(ch => text.includes(ch));
  if (chHit) { score += 24; why.push(`sells into ${chHit} — where they own the buyer relationships`); }

  if (b.state && text.includes(b.state.toLowerCase())) { score += 16; why.push(`${b.state} — their home turf`); }
  else if (biz.location) { score += 6; }

  if (biz.revenueBand) { score += 8; why.push(`${biz.revenueBand} — their P&L weight class`); }

  // top anchor as the closing line of reasoning
  if (b.anchors[0]) why.push(`brings ${b.anchors[0].replace(/\s*\([^)]*\)/, '')} they don't have today`);

  score = Math.min(100, score);
  const fit = score >= 85 ? 'strong' : score >= 70 ? 'good' : 'stretch';
  return { score, fit, reasoning: why.slice(0, 4) };
}

/* ---------- search backends ---------- */
function brave(query) {
  return new Promise((resolve) => {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&country=us`;
    const rq = https.get(url, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve((JSON.parse(d).web || {}).results || []); } catch (e) { resolve([]); } });
    });
    rq.on('error', () => resolve([]));
    rq.setTimeout(10000, () => { rq.destroy(); resolve([]); });
  });
}

// Turn raw search hits into candidate business objects.
function businessesFromHits(hits) {
  const seen = new Set(); const out = [];
  for (const h of hits) {
    const dom = domainOf(h.url);
    if (!dom || BLOCK_DOMAINS.some(b => dom.endsWith(b))) continue;
    if (seen.has(dom)) continue; seen.add(dom);
    const name = (h.title || '').split(/[|\-–—:]/)[0].trim() || dom.split('.')[0];
    out.push({ company: name, domain: dom, text: h.description || h.title || '' });
  }
  return out;
}

/* ---------- main ---------- */
(async () => {
  const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const cands = db.candidates || [];
  const supplied = RESULTS && fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, 'utf8')) : null;

  // Mode 3: no search backend → emit the queries to run and stop.
  if (!BRAVE && !supplied) {
    const plan = cands.map(c => ({ candidateId: c.candidateId || c.name, queries: queriesFor(c), exclude: [...ownEmployers(c)] }));
    fs.writeFileSync('research_queries.json', JSON.stringify(plan, null, 2));
    console.log(`No search backend set. Wrote research_queries.json (${plan.length} candidates).`);
    console.log('→ Run these searches (Brave key, or a Claude web-search session) and feed results back with --results, or set BRAVE_API_KEY.');
    return;
  }

  let filled = 0;
  for (const c of cands) {
    const id = c.candidateId || c.name;
    if (!FORCE && (c.targetBusinesses || []).length) continue;
    const exclude = ownEmployers(c);

    // gather candidate businesses
    let pool = [];
    if (supplied) {
      const entry = supplied.find(s => (s.candidateId || s.name) === id);
      pool = (entry && entry.businesses) || [];
    } else {
      for (const q of queriesFor(c)) pool.push(...businessesFromHits(await brave(q)));
    }

    // dedupe, exclude own employers, score, rank
    const byDom = new Map();
    for (const biz of pool) {
      const key = (biz.domain || biz.company || '').toLowerCase();
      if (!key || byDom.has(key)) continue;
      if ([...exclude].some(e => (biz.company || '').toLowerCase().includes(e) || e.includes((biz.company || '').toLowerCase()))) continue;
      byDom.set(key, biz);
    }
    const scored = [...byDom.values()].map(biz => {
      const s = scoreFit(c, biz);
      return { company: biz.company, domain: biz.domain, location: biz.location || '', sector: biz.sector || '',
               revenueBand: biz.revenueBand || '', fit: s.fit, fitScore: s.score, reasoning: s.reasoning,
               contact: { name: '', role: '', email: biz.domain ? `sales@${biz.domain}` : '', emailType: 'role', emailStatus: 'format_valid' } };
    }).filter(b => b.fitScore >= MIN_FIT).sort((a, b) => b.fitScore - a.fitScore).slice(0, TOP_N);

    if (scored.length) { c.targetBusinesses = scored; filled++; console.log(`  ${c.name}: ${scored.length} fit businesses`); }
    else console.log(`  ${c.name}: none cleared the fit bar`);
  }

  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  console.log(`\n✓ Filled ${filled} candidates. Updated ${FILE}. Reload Shelf (↻ Refresh) to see them.`);
  console.log('  Next: run verify_emails.js (or the in-app Verify) to confirm the contact emails.');
})();
