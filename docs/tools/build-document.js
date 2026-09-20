/*
 * Smart Trip Planner — Project Document generator (chapters 1–3).
 *
 *   node docs/tools/build-document.js
 *
 * Inputs : docs/tools/team.json            (team / guide / enrollment details — edit here only)
 *          docs/tools/document-content.js  (all prose, tables and figure references)
 *          docs/diagrams/*.png             (rendered PlantUML diagrams)
 * Outputs: docs/Smart_Trip_Planner_Project_Document.docx
 *          docs/Smart_Trip_Planner_Project_Document.pdf   (needs LibreOffice `soffice`)
 *
 * Format: SVIT MCA Sem-III project guidelines 2026-27 (A4, 1" margins, Times New Roman,
 * headings 16/14/12 pt bold, body 10 pt, single spacing, header = project title, footer =
 * enrollment numbers + page number, roman page numbers before Chapter 1) and, where the
 * guidelines are silent, the department's reference report. Front matter: title page
 * (Annexure-2) -> Acknowledgement -> Abstract -> INDEX (CH.NO | CONTENT | PAGE NO).
 *
 * The INDEX is a static table so that it renders identically in Word, LibreOffice and PDF.
 * Page numbers are resolved in two passes: pass 1 builds the document with placeholder
 * numbers, converts it to PDF and reads the page of every heading with `pdftotext`;
 * pass 2 rebuilds with the real numbers.
 * Anything written as [[LIKE THIS]] is an unfilled placeholder and is highlighted in yellow.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, PageNumber, NumberFormat,
  PageOrientation, LevelFormat, VerticalAlign, LineRuleType, TabStopType, SectionType,
  PageBorderDisplay, PageBorderOffsetFrom, PageBorderZOrder,
} = require('docx');

const DOCS = path.resolve(__dirname, '..');
const DIAGRAMS = path.join(DOCS, 'diagrams');
const OUT_BASENAME = 'Smart_Trip_Planner_Project_Document';
const team = JSON.parse(fs.readFileSync(path.join(__dirname, 'team.json'), 'utf8'));
const content = require('./document-content.js')(team);

/* ---------- layout constants (DXA: 1440 = 1 inch) ---------- */
const FONT = 'Times New Roman';
const MONO = 'Courier New';
const A4 = { width: 11906, height: 16838 };
const MARGIN = 1440;
const TEXT_W = A4.width - 2 * MARGIN; // 9026
const TEXT_W_LANDSCAPE = A4.height - 2 * MARGIN; // 13958
const PORTRAIT_IMG = { w: 6.2, h: 8.3 }; // inches available for a figure
const LANDSCAPE_IMG = { w: 9.6, h: 5.2 };
const BODY = { size: 20, font: FONT }; // 10 pt (guidelines)
const SINGLE = { line: 240, lineRule: LineRuleType.AUTO }; // single line spacing (guidelines)
const TABLE_SIZE = 20; // 10 pt; sample-record tables pass their own (9 pt)
const ACCENT_FILL = 'DCE9EC';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '555555' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

/* ---------- inline markup: **bold**, `code`, [[PLACEHOLDER]] ---------- */
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m;
  const push = (t, extra = {}) => t && out.push(new TextRun({ font: FONT, ...base, ...extra, text: t }));
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      // allow a placeholder inside bold text
      out.push(...runs(tok.slice(2, -2), { ...base, bold: true }));
    } else if (tok.startsWith('`')) {
      push(tok.slice(1, -1), { font: MONO, size: (base.size || BODY.size) - 2 });
    } else {
      push(tok, { highlight: 'yellow' });
    }
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

/* ---------- block builders ---------- */
const para = (text, opts = {}) => new Paragraph({
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { ...SINGLE, after: opts.after ?? 120, before: opts.before ?? 0 },
  indent: opts.indent,
  keepNext: opts.keepNext,
  children: runs(text, { size: BODY.size, ...(opts.run || {}) }),
});

const heading = (level, text) => new Paragraph({
  heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1],
  pageBreakBefore: level === 1,
  keepNext: true,
  children: [new TextRun({ text, font: FONT })],
});

const listItem = (text, ref) => new Paragraph({
  numbering: { reference: ref, level: 0 },
  alignment: AlignmentType.LEFT, // LibreOffice lets justified hanging-indent lines overrun the margin
  spacing: { ...SINGLE, after: 50 },
  children: runs(text, { size: BODY.size }),
});

const codeBlock = (lines) => lines.map((l, i) => new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { line: 240, lineRule: LineRuleType.AUTO, after: i === lines.length - 1 ? 160 : 0 },
  indent: { left: 567 },
  keepNext: i < lines.length - 1,
  shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' },
  children: [new TextRun({ text: l || ' ', font: MONO, size: 17 })],
}));

const caption = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: opts.before ?? 80, after: opts.after ?? 160 },
  keepNext: opts.keepNext,
  children: [new TextRun({ text, font: FONT, size: 20, bold: true })],
});

const DD_HEADER_FILL = '4BACC6';

function cell(text, width, { header = false, size = TABLE_SIZE, dd = false } = {}) {
  const lines = Array.isArray(text) ? text : [String(text)];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    verticalAlign: header || dd ? VerticalAlign.CENTER : VerticalAlign.TOP,
    shading: header ? { type: ShadingType.CLEAR, fill: dd ? DD_HEADER_FILL : ACCENT_FILL, color: 'auto' } : undefined,
    margins: size < TABLE_SIZE ? { top: 40, bottom: 40, left: 60, right: 60 } : { top: 40, bottom: 40, left: 90, right: 90 },
    children: lines.map((l) => new Paragraph({
      alignment: dd ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { line: 240, lineRule: LineRuleType.AUTO, after: lines.length > 1 ? 20 : 0 },
      children: runs(l, { size, bold: header, color: header && dd ? 'FFFFFF' : undefined }),
    })),
  });
}

function table({ headers, rows, widths, fontSize, style }, pageW = TEXT_W) {
  const dd = style === 'dd';
  const sum = widths.reduce((a, b) => a + b, 0);
  const w = widths.map((x) => Math.round((x / sum) * pageW));
  w[w.length - 1] += pageW - w.reduce((a, b) => a + b, 0);
  const size = fontSize || TABLE_SIZE;
  return new Table({
    width: { size: pageW, type: WidthType.DXA },
    columnWidths: w,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, w[i], { header: true, size, dd })) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, w[i], { size, dd })) })),
    ],
  });
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), data: b };
}

function figure({ file, caption: cap, landscape, maxH }) {
  const { w, h, data } = pngSize(path.join(DIAGRAMS, file));
  const box = landscape ? LANDSCAPE_IMG : PORTRAIT_IMG;
  const limitH = maxH || box.h;
  const scale = Math.min(box.w / w, limitH / h);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 120, after: 0 },
      children: [new ImageRun({ type: 'png', data, transformation: { width: Math.round(w * scale * 96), height: Math.round(h * scale * 96) } })],
    }),
    caption(cap),
  ];
}

/* ---------- front matter: headings and the INDEX table ---------- */
const frontHeading = (text, { pageBreak = true } = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  pageBreakBefore: pageBreak,
  spacing: { after: 280 },
  children: [new TextRun({ text, font: FONT, size: 32, bold: true })],
});

const INDEX_W = [1100, 6526, 1400]; // CH.NO | CONTENT | PAGE NO  (sum = TEXT_W)
const INDEX_BORDER = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const INDEX_BORDERS = { top: INDEX_BORDER, bottom: INDEX_BORDER, left: INDEX_BORDER, right: INDEX_BORDER };

function indexCell(text, width, { bold = false, align = AlignmentType.LEFT, indent = 0 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: INDEX_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: align,
      indent: indent ? { left: indent } : undefined,
      spacing: { ...SINGLE, after: 0 },
      children: [new TextRun({ text, font: FONT, size: 22, bold })],
    })],
  });
}

function indexTable(tocEntries, pg) {
  const C = AlignmentType.CENTER;
  const page = (e) => String(pg(`h:${e.text}`)).padStart(2, '0');
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: INDEX_W,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: ['CH.NO', 'CONTENT', 'PAGE NO'].map((h, i) => indexCell(h, INDEX_W[i], { bold: true, align: C })) }),
      ...tocEntries.map((e) => {
        const chapter = e.level === 1 ? e.text.match(/^(\d+)\.\s+(.*)$/) : null;
        return new TableRow({ cantSplit: true, children: [
          indexCell(chapter ? `${chapter[1]}.` : '', INDEX_W[0], { align: C, bold: !!chapter }),
          indexCell(chapter ? chapter[2] : e.text, INDEX_W[1], { bold: !!chapter, indent: chapter ? 0 : 300 }),
          indexCell(page(e), INDEX_W[2], { align: C }),
        ] });
      }),
    ],
  });
}

/* ---------- header / footer ---------- */
// Guidelines: header = project title; footer = page number and enrollment numbers.
const rightTab = (landscape) => [{ type: TabStopType.RIGHT, position: landscape ? TEXT_W_LANDSCAPE : TEXT_W }];
const ENROLLMENTS = team.members.map((m) => m.enrollment).join(', ');

const makeHeader = () => new Header({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '555555', space: 4 } },
    children: [new TextRun({ text: team.projectTitle, font: FONT, size: 20, bold: true })],
  })],
});

const makeFooter = (landscape) => new Footer({
  children: [new Paragraph({
    style: 'FooterText',
    tabStops: rightTab(landscape),
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: '555555', space: 4 } },
    children: [
      new TextRun({ text: `${ENROLLMENTS}\t`, font: FONT, size: 20 }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 }),
    ],
  })],
});

/* ---------- title page (guidelines, Annexure-2) ---------- */
const LOGO = path.join(__dirname, 'assets', 'svit-logo.png');

function titlePage() {
  const c = (children, o = {}) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...SINGLE, before: o.before || 0, after: o.after ?? 80 },
    children,
  });
  const t = (text, size, o = {}) => new TextRun({ text, font: FONT, size, bold: o.bold ?? true, italics: o.italics, superScript: o.sup });
  const logo = fs.existsSync(LOGO) ? pngSize(LOGO) : null;
  const logoH = 1.75; // inches
  return [
    c([t('A PROJECT REPORT ON', 32, { bold: false })], { before: 700, after: 200 }),
    c([t(`“${team.projectTitle}”`, 44)], { after: 200 }),
    c([t('Submitted By,', 32)], { after: 200 }),
    ...team.members.map((m, i) => c([t(`${m.name} (${m.enrollment})${i < team.members.length - 1 ? ',' : ''}`, 32)], { after: 60 })),
    c([t('Guided By,', 32)], { before: 200, after: 120 }),
    c([t(team.guide.toUpperCase(), 32)], { after: 900 }),
    logo
      ? c([new ImageRun({ type: 'png', data: logo.data, transformation: { width: Math.round((logo.w / logo.h) * logoH * 96), height: Math.round(logoH * 96) } })], { after: 700 })
      : c([], { before: Math.round(logoH * 1440), after: 400 }),
    c([t('In partial fulfillment of the requirements of the', 32)], { after: 60 }),
    c([t('3', 32), t('rd', 32, { sup: true }), t(' Semester of Master of Computer Applications', 32)], { after: 60 }),
    c([t('Subject Name : Minor Project (MC03094171)', 32, { italics: true })], { after: 700 }),
    c([t('SARDAR VALLABHBHAI PATEL INSTITUTE', 32)], { after: 60 }),
    c([t('OF TECHNOLOGY, VASAD', 32)], { after: 60 }),
    c([t(team.reportMonth || 'September 2026', 32)], { after: 0 }),
  ];
}

const TITLE_BORDER = { style: BorderStyle.THICK_THIN_MEDIUM_GAP, size: 36, color: '00008B', space: 24 };
const titlePageBorders = {
  pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE, zOrder: PageBorderZOrder.FRONT },
  pageBorderTop: TITLE_BORDER, pageBorderBottom: TITLE_BORDER, pageBorderLeft: TITLE_BORDER, pageBorderRight: TITLE_BORDER,
};

/* ---------- assemble ---------- */
function build(pages) {
  const pg = (key) => (pages && pages[key] !== undefined ? pages[key] : '0');
  const tocEntries = []; // { level, text }
  const figures = [];
  const tables = [];

  // Body: split into sections whenever orientation changes.
  const bodySections = [];
  let current = { landscape: false, children: [] };
  const flush = () => { if (current.children.length) bodySections.push(current); };
  const switchTo = (landscape) => {
    if (current.landscape !== landscape) { flush(); current = { landscape, children: [] }; }
  };

  for (const b of content.body) {
    switch (b.type) {
      case 'h1': case 'h2': case 'h3': {
        const level = Number(b.type[1]);
        switchTo(false);
        if (level <= 2) tocEntries.push({ level, text: b.text });
        current.children.push(heading(level, b.text));
        break;
      }
      case 'p': current.children.push(para(b.text, b.opts)); break;
      case 'bullets': b.items.forEach((t) => current.children.push(listItem(t, 'bullets'))); current.children.push(para('', { after: 60 })); break;
      case 'numbered': b.items.forEach((t) => current.children.push(listItem(t, b.ref))); current.children.push(para('', { after: 60 })); break;
      case 'code': current.children.push(...codeBlock(b.lines)); break;
      case 'table':
        tables.push(b.caption);
        current.children.push(caption(b.caption, { keepNext: true, before: 160, after: 100 }));
        current.children.push(table(b));
        current.children.push(para('', { after: 120 }));
        break;
      case 'figure':
        figures.push(b.caption);
        if (b.landscape) {
          switchTo(true);
          current.children.push(...figure(b));
          switchTo(false);
        } else {
          current.children.push(...figure(b));
        }
        break;
      default: throw new Error(`Unknown block type ${b.type}`);
    }
  }
  flush();

  const front = [
    frontHeading('ACKNOWLEDGEMENT', { pageBreak: false }),
    ...content.front.acknowledgement.map((t) => para(t, { after: 200 })),
    ...team.members.map((m, i) => para(`${m.name} (${m.enrollment})`, { align: AlignmentType.RIGHT, before: i === 0 ? 400 : 0, after: 40, run: { bold: true } })),
    frontHeading('ABSTRACT'),
    ...content.front.abstract.map((t) => para(t, { after: 200 })),
    frontHeading('INDEX'),
    indexTable(tocEntries, pg),
  ];

  const pageProps = (landscape, extra = {}) => ({
    page: {
      size: { width: A4.width, height: A4.height, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
      margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 708, footer: 708 },
      ...extra,
    },
  });

  const doc = new Document({
    creator: team.members.map((m) => m.name.replace(/\s*\[\[.*?\]\]/, '')).join(', '),
    title: `${team.projectTitle} — Project Document (Presentation 1)`,
    styles: {
      default: { document: { run: { font: FONT, size: BODY.size } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 32, bold: true, color: '000000' }, // 16 pt
          paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 28, bold: true, color: '000000' },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } }, // 14 pt
        { id: 'FooterText', name: 'Footer Text', basedOn: 'Normal', run: { font: FONT, size: 20 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 24, bold: true, color: '000000' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }, // 12 pt
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        ...content.numberedRefs.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })),
      ],
    },
    sections: [
      // Title page counts as roman page i (not printed); the front matter therefore starts at ii.
      { properties: pageProps(false, { borders: titlePageBorders }), children: titlePage() },
      { properties: { type: SectionType.NEXT_PAGE, ...pageProps(false, { pageNumbers: { start: 2, formatType: NumberFormat.LOWER_ROMAN } }) },
        headers: { default: makeHeader() }, footers: { default: makeFooter(false) }, children: front },
      ...bodySections.map((s, i) => ({
        properties: { type: SectionType.NEXT_PAGE, ...pageProps(s.landscape, i === 0 ? { pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } : { pageNumbers: { formatType: NumberFormat.DECIMAL } }) },
        headers: { default: makeHeader() }, footers: { default: makeFooter(s.landscape) }, children: s.children,
      })),
    ],
  });
  return { doc, tocEntries, figures, tables };
}

/* ---------- PDF helpers ---------- */
function toPdf(docxPath, outDir) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stp-lo-'));
  execFileSync('soffice', [`-env:UserInstallation=file://${profile}`, '--headless', '--convert-to', 'pdf', '--outdir', outDir, docxPath], { stdio: 'ignore' });
  fs.rmSync(profile, { recursive: true, force: true });
  return path.join(outDir, path.basename(docxPath).replace(/\.docx$/, '.pdf'));
}

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

function resolvePages(pdfPath, { tocEntries }) {
  const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const pageLines = text.split('\f').map((p) => p.split('\n').map(norm).filter(Boolean));
  const firstH1 = norm(tocEntries[0].text);
  const bodyStart = pageLines.findIndex((ls) => ls.includes(firstH1));
  if (bodyStart < 0) throw new Error('Could not locate the first chapter in the PDF');
  const pages = {};
  const find = (needle, from, to, matcher) => {
    for (let i = from; i < to; i += 1) if (pageLines[i].some((l) => matcher(l, needle))) return i;
    return -1;
  };
  const headingMatch = (l, n) => l === n || (l.length > 25 && n.startsWith(l));
    for (const e of tocEntries) {
    const i = find(norm(e.text), bodyStart, pageLines.length, headingMatch);
    if (i < 0) throw new Error(`Heading not found in PDF: ${e.text}`);
    pages[`h:${e.text}`] = i - bodyStart + 1;
  }
  return pages;
}

/* ---------- main ---------- */
(async () => {
  const outDocx = path.join(DOCS, `${OUT_BASENAME}.docx`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stp-doc-'));
  const draft = path.join(tmp, `${OUT_BASENAME}.docx`);

  const pass1 = build(null);
  fs.writeFileSync(draft, await Packer.toBuffer(pass1.doc));
  let pages = null;
  try {
    pages = resolvePages(toPdf(draft, tmp), pass1);
  } catch (err) {
    console.warn(`! Page numbers could not be resolved (${err.message}); INDEX will show 00.`);
  }

  const pass2 = build(pages);
  fs.writeFileSync(outDocx, await Packer.toBuffer(pass2.doc));
  console.log(`Wrote ${outDocx}`);
  try {
    console.log(`Wrote ${toPdf(outDocx, DOCS)}`);
  } catch (err) {
    console.warn(`! PDF export skipped: ${err.message}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${pass2.figures.length} figures, ${pass2.tables.length} tables, ${pass2.tocEntries.length} INDEX entries`);
})();
