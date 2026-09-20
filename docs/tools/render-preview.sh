#!/bin/sh
# Rebuild the deck, export the PDF backup, and write per-slide JPGs to docs/tools/.preview/
set -e
cd "$(dirname "$0")"
node build-presentation.js
soffice --headless --convert-to pdf --outdir .. ../Smart_Trip_Planner_Presentation1.pptx >/dev/null
mkdir -p .preview && rm -f .preview/slide-*.jpg
pdftoppm -jpeg -r "${DPI:-80}" ../Smart_Trip_Planner_Presentation1.pdf .preview/slide
ls .preview | wc -l
