#!/bin/bash
# ---------------------------------------------------------------
# Shelf — run it locally with your real bench.
# Mac:   double-click this file in Finder.
# Linux: run  ./start.command
# It serves the app on your machine only. Nothing is uploaded.
# ---------------------------------------------------------------
cd "$(dirname "$0")" || exit 1
PORT=8000
URL="http://localhost:$PORT"

if [ ! -f bench.local.json ] && [ ! -f per_candidate.json ]; then
  echo "ℹ  No local bench found — you'll see the anonymised SAMPLE."
  echo "   To go live with your real data, drop your per_candidate.json"
  echo "   into this folder (rename it bench.local.json) and run again."
  echo ""
fi

# Open the browser a moment after the server is up.
( sleep 1
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi ) &

echo "▶  Shelf running at $URL"
echo "   (keep this window open; close it to stop the app)"
echo ""

# Prefer Node (enables in-app Reoon email verification via the local proxy).
# Fall back to Python (serves fine, but in-app Verify needs Node — use verify_emails.js instead).
if command -v node >/dev/null 2>&1; then exec node server.js
elif command -v python3 >/dev/null 2>&1; then echo "ℹ  Running with Python — in-app email Verify needs Node; use verify_emails.js for that."; exec python3 -m http.server "$PORT"
elif command -v python  >/dev/null 2>&1; then exec python  -m http.server "$PORT"
else
  echo "✗  Couldn't find node or python to run a local server."
  echo "   Install Node from https://nodejs.org then try again."
  read -r -p "Press Enter to close..." _
  exit 1
fi
