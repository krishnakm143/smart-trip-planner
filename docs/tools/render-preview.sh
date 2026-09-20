#!/bin/sh
# Rebuild the deck, export the PDF backup, and write per-slide JPGs to docs/tools/.preview/
set -e
cd "$(dirname "$0")"
node build-presentation.js
SKILL_SOFFICE="$HOME/.claude/skills/synced/3aebbfad-eff0-42cc-8ec3-0580c4311f9d_b9fa1144-8189-4de3-aa16-de4950cf0907/pptx/scripts/office/soffice.py"
if [ -f "$SKILL_SOFFICE" ]; then
  python3 "$SKILL_SOFFICE" --headless --convert-to pdf --outdir .. ../Smart_Trip_Planner_Presentation1.pptx >/dev/null
else
  soffice --headless --convert-to pdf --outdir .. ../Smart_Trip_Planner_Presentation1.pptx >/dev/null
fi
mkdir -p .preview && rm -f .preview/slide-*.jpg
pdftoppm -jpeg -r "${DPI:-80}" ../Smart_Trip_Planner_Presentation1.pdf .preview/slide
ls .preview | wc -l
