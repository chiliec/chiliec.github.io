#!/usr/bin/env bash
# Renders both Academy application PDFs into application/out/ and enforces hard limits.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out

# --- CV: rendercv → rename → page-count gate (max 2) ---
.venv/bin/rendercv render Vladimir_Babin_CV_Academy.yaml
cp rendercv_output/Vladimir_Babin_CV.pdf out/VladimirBabin_CV_Academy.pdf
PAGES=$(.venv/bin/python -c "from pypdf import PdfReader; print(len(PdfReader('out/VladimirBabin_CV_Academy.pdf').pages))")
if [ "$PAGES" -gt 2 ]; then
  echo "FAIL: CV is $PAGES pages (max 2). Trim Vladimir_Babin_CV_Academy.yaml." >&2
  exit 1
fi

# --- Portfolio: puppeteer → size gate (<10 MB) ---
node portfolio/print.js
SIZE=$(stat -f%z out/VladimirBabin_Portfolio_Academy.pdf)
if [ "$SIZE" -ge 10485760 ]; then
  echo "FAIL: portfolio is $((SIZE / 1048576)) MB (max 10). Compress images." >&2
  exit 1
fi

echo "OK: CV $PAGES page(s) · portfolio $((SIZE / 1024)) KB"
ls -la out/
