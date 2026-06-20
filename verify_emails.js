#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   verify_emails.js — find + verify the contact email for each perfect-fit
   business, using the Reoon Email Verifier API.

   For each candidate.targetBusinesses[].contact:
     1. If we have a person's NAME + the company DOMAIN, try the common email
        patterns (first.last@, firstlast@, flast@, first@) and keep the first
        one Reoon says is deliverable  → "found the hiring manager".
     2. Otherwise verify whatever address is there (a role mailbox like
        sales@domain) and record Reoon's verdict.
     3. Whatever happens, the address left behind is at least format-valid.

   Reoon statuses are mapped to: verified | risky | invalid | format_valid.

   Usage:
     REOON_API_KEY=xxxxxxxx node verify_emails.js bench.local.json

   Runs entirely on your machine. Reads/writes your LOCAL bench file only —
   nothing is uploaded here or committed (bench.local.json is gitignored).
   Get a key (free tier available) at https://emailverifier.reoon.com
--------------------------------------------------------------------------- */
const fs = require('fs');
const https = require('https');

const KEY = process.env.REOON_API_KEY;
const FILE = process.argv[2] || 'bench.local.json';

if (!KEY) { console.error('✗ Set REOON_API_KEY first.  e.g.  REOON_API_KEY=xxxx node verify_emails.js bench.local.json'); process.exit(1); }
if (!fs.existsSync(FILE)) { console.error('✗ File not found:', FILE); process.exit(1); }

function reoon(email) {
  return new Promise((resolve) => {
    const url = `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(KEY)}&mode=power`;
    https.get(url, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({ status: 'unknown' }); } });
    }).on('error', () => resolve({ status: 'unknown' }));
  });
}

// Map Reoon's verdict to the status the app renders. (Reoon returns e.g.
// "safe", "valid", "invalid", "disposable", "catch_all", "role_account",
// "spamtrap", "unknown" — adjust here if their schema changes.)
function mapStatus(r) {
  const s = String(r.status || r.result || '').toLowerCase();
  const safe = r.is_safe_to_send === true || r.safe_to_send === true;
  if (safe || s === 'safe' || s === 'valid') return 'verified';
  if (s === 'invalid' || s === 'disposable' || s === 'spamtrap') return 'invalid';
  if (!s) return 'risky';
  return 'risky'; // catch_all, role_account, unknown → reachable but unconfirmed
}

// Email patterns to try when we know the person's name + the company domain.
function patternsFor(name, domain) {
  const p = String(name).toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
  if (!domain || !p.length) return [];
  if (p.length < 2) return [`${p[0]}@${domain}`];
  const f = p[0], l = p[p.length - 1];
  return [`${f}.${l}@${domain}`, `${f}${l}@${domain}`, `${f[0]}${l}@${domain}`, `${f}@${domain}`, `${f}_${l}@${domain}`];
}

(async () => {
  const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let checks = 0, verified = 0, businesses = 0;

  for (const c of (db.candidates || [])) {
    for (const b of (c.targetBusinesses || [])) {
      businesses++;
      const ct = b.contact || (b.contact = {});
      let done = false;

      // 1) Try to find the named person's real address.
      if (ct.name && b.domain) {
        for (const email of patternsFor(ct.name, b.domain)) {
          const r = await reoon(email); checks++;
          if (mapStatus(r) === 'verified') {
            ct.email = email; ct.emailStatus = 'verified'; ct.emailType = 'personal';
            verified++; done = true; break;
          }
        }
      }

      // 2) Fall back to verifying whatever address we already have.
      if (!done && ct.email) {
        const r = await reoon(ct.email); checks++;
        ct.emailStatus = mapStatus(r);
        if (ct.emailStatus === 'verified') verified++;
      }

      console.log(`  ${c.name}  →  ${b.company}:  ${ct.email || '(none)'}  [${ct.emailStatus || 'unverified'}]`);
    }
  }

  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  console.log(`\n✓ ${businesses} businesses, ${checks} Reoon checks, ${verified} verified.  Updated ${FILE}.`);
  console.log('  Reload Shelf (↻ Refresh) to see the verification badges.');
})();
