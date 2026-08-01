#!/usr/bin/env bash
# Renders resources/portfolio to out/VladimirBabin_Portfolio.pdf and enforces hard limits.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out

if [ ! -d build-tools/node_modules ]; then
  echo "Installing build dependencies (one-time, downloads Chromium)…"
  (cd build-tools && npm install)
fi

node build-tools/print-portfolio.js

PDF=out/VladimirBabin_Portfolio.pdf

SIZE=$(stat -f%z "$PDF")
if [ "$SIZE" -ge 10485760 ]; then
  echo "FAIL: portfolio is $((SIZE / 1048576)) MB (max 10). Compress images." >&2
  exit 1
fi

PAGES=$(node -e "
const fs = require('fs');
const buf = fs.readFileSync('$PDF');
const m = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
console.log(m ? m.length : 0);
")
if [ "$PAGES" -gt 5 ]; then
  echo "FAIL: portfolio is $PAGES pages (max 5). Cut a section." >&2
  exit 1
fi
if [ "$PAGES" -lt 1 ]; then
  echo "FAIL: could not count pages — PDF may be corrupt." >&2
  exit 1
fi

echo "OK: portfolio $PAGES page(s) · $((SIZE / 1024)) KB"
