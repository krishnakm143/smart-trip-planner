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
 * The table of contents, list of figures and list of tables are static text so that they
 * render identically in Word, LibreOffice and PDF. Page numbers are resolved in two passes:
 * pass 1 builds the document with placeholder numbers, converts it to PDF and reads the page
 * of every heading/caption with `pdftotext`; pass 2 rebuilds with the real numbers.
 * Anything written as [[LIKE THIS]] is an unfilled placeholder and is highlighted in yellow.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, PageNumber, NumberFormat,
  PageOrientation, LevelFormat, VerticalAlign, LineRuleType, TabStopType, LeaderType, SectionType,
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
const BODY = { size: 24, font: FONT }; // 12 pt
const LINE_15 = { line: 360, lineRule: LineRuleType.AUTO };
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
  spacing: { ...LINE_15, after: opts.after ?? 160, before: opts.before ?? 0 },
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
  spacing: { ...LINE_15, after: 60 },
  children: runs(text, { size: BODY.size }),
});

const codeBlock = (lines) => lines.map((l, i) => new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { line: 260, lineRule: LineRuleType.AUTO, after: i === lines.length - 1 ? 200 : 0 },
  indent: { left: 567 },
  keepNext: i < lines.length - 1,
  shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' },
  children: [new TextRun({ text: l || ' ', font: MONO, size: 19 })],
}));

const caption = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: opts.before ?? 80, after: opts.after ?? 200 },
  keepNext: opts.keepNext,
  children: [new TextRun({ text, font: FONT, size: 22, bold: true })],
});

function cell(text, width, { header = false, size = 20 } = {}) {
  const lines = Array.isArray(text) ? text : [String(text)];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    verticalAlign: header ? VerticalAlign.CENTER : VerticalAlign.TOP,
    shading: header ? { type: ShadingType.CLEAR, fill: ACCENT_FILL, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: lines.map((l) => new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 250, lineRule: LineRuleType.AUTO, after: lines.length > 1 ? 40 : 0 },
      children: runs(l, { size, bold: header }),
    })),
  });
}

function table({ headers, rows, widths, fontSize }, pageW = TEXT_W) {
  const sum = widths.reduce((a, b) => a + b, 0);
  const w = widths.map((x) => Math.round((x / sum) * pageW));
  w[w.length - 1] += pageW - w.reduce((a, b) => a + b, 0);
  const size = fontSize || 20;
  return new Table({
    width: { size: pageW, type: WidthType.DXA },
    columnWidths: w,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, w[i], { header: true, size })) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, w[i], { size })) })),
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

/* ---------- static TOC-style line with dot leader ---------- */
const tocLine = (text, page, { indent = 0, bold = false } = {}) => new Paragraph({
  spacing: { line: 300, lineRule: LineRuleType.AUTO, after: 40 },
  indent: { left: indent },
  tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W, leader: LeaderType.DOT }],
  children: [new TextRun({ text: `${text}\t${page}`, font: FONT, size: BODY.size, bold })],
});

const frontHeading = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  pageBreakBefore: true,
  spacing: { after: 300 },
  children: [new TextRun({ text, font: FONT, size: 32, bold: true })],
});

/* ---------- header / footer ---------- */
const rightTab = (landscape) => [{ type: TabStopType.RIGHT, position: landscape ? TEXT_W_LANDSCAPE : TEXT_W }];

const makeHeader = (landscape) => new Header({
  children: [new Paragraph({
    tabStops: rightTab(landscape),
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '555555', space: 4 } },
    children: [
      new TextRun({ text: team.projectTitle, font: FONT, size: 20, bold: true }),
      new TextRun({ text: '\tProject Document \u2014 Presentation 1', font: FONT, size: 20 }),
    ],
  })],
});

const makeFooter = (landscape) => new Footer({
  children: [new Paragraph({
    style: 'FooterText',
    tabStops: rightTab(landscape),
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: '555555', space: 4 } },
    children: [
      new TextRun({ text: 'SVIT, Vasad \u2014 MCA Semester III\tPage ', font: FONT, size: 20 }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 }),
    ],
  })],
});

/* ---------- title page ---------- */
function titlePage() {
  const c = (text, size, o = {}) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: o.before || 0, after: o.after ?? 120 },
    children: runs(text, { size, bold: o.bold, italics: o.italics, allCaps: o.caps }),
  });
  const colW = [3300, 2600, 3126];
  const members = new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: colW,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ children: ['Name', 'Enrollment No.', 'Role'].map((h, i) => cell(h, colW[i], { header: true, size: 22 })) }),
      ...team.members.map((m) => new TableRow({ children: [m.name, m.enrollment, m.role].map((t, i) => cell(t, colW[i], { size: 22 })) })),
    ],
  });
  return [
    c('A', 24, { before: 200 }),
    c('Project Document', 28, { bold: true }),
    c('on', 24),
    c(team.projectTitle, 52, { bold: true, caps: true, before: 120, after: 200 }),
    c('Project Document — Presentation 1', 28, { bold: true, after: 320 }),
    c('Submitted in partial fulfilment of the requirements of the subject', 24),
    c(team.subject, 26, { bold: true }),
    c(team.program, 24, { after: 360 }),
    c(`Submitted by (Team No. ${team.teamNo})`, 24, { bold: true, after: 140 }),
    members,
    c('Under the guidance of', 24, { before: 360 }),
    c(team.guide, 26, { bold: true, after: 480 }),
    c('Master of Computer Applications', 26, { bold: true }),
    c(team.institute, 28, { bold: true }),
    c('Academic Year 2026-27', 24, { after: 60 }),
    c(`Presentation date: ${team.presentationDate}`, 24),
  ];
}

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
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'TABLE OF CONTENTS', font: FONT, size: 32, bold: true })] }),
    tocLine('List of Figures', pg('front:List of Figures'), { bold: true }),
    tocLine('List of Tables', pg('front:List of Tables'), { bold: true }),
    ...tocEntries.map((e) => tocLine(e.text, pg(`h:${e.text}`), { indent: e.level === 1 ? 0 : 400, bold: e.level === 1 })),
    frontHeading('LIST OF FIGURES'),
    ...figures.map((f) => tocLine(f, pg(`c:${f}`))),
    frontHeading('LIST OF TABLES'),
    ...tables.map((t) => tocLine(t, pg(`c:${t}`))),
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
          run: { font: FONT, size: 32, bold: true, color: '000000', allCaps: true },
          paragraph: { spacing: { before: 0, after: 320 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 28, bold: true, color: '000000' },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
        { id: 'FooterText', name: 'Footer Text', basedOn: 'Normal', run: { font: FONT, size: 20 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 24, bold: true, color: '000000' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
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
      { properties: pageProps(false), children: titlePage() },
      { properties: { type: SectionType.NEXT_PAGE, ...pageProps(false, { pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } }) },
        headers: { default: makeHeader(false) }, footers: { default: makeFooter(false) }, children: front },
      ...bodySections.map((s, i) => ({
        properties: { type: SectionType.NEXT_PAGE, ...pageProps(s.landscape, i === 0 ? { pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } : { pageNumbers: { formatType: NumberFormat.DECIMAL } }) },
        headers: { default: makeHeader(s.landscape) }, footers: { default: makeFooter(s.landscape) }, children: s.children,
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
const toRoman = (n) => ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][n] || String(n);

function resolvePages(pdfPath, { tocEntries, figures, tables }) {
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
  const captionMatch = (l, n) => l === n || l.startsWith(n.split(':')[0] + ':');
  for (const e of tocEntries) {
    const i = find(norm(e.text), bodyStart, pageLines.length, headingMatch);
    if (i < 0) throw new Error(`Heading not found in PDF: ${e.text}`);
    pages[`h:${e.text}`] = i - bodyStart + 1;
  }
  for (const c of [...figures, ...tables]) {
    const i = find(norm(c), bodyStart, pageLines.length, captionMatch);
    if (i < 0) throw new Error(`Caption not found in PDF: ${c}`);
    pages[`c:${c}`] = i - bodyStart + 1;
  }
  for (const f of ['List of Figures', 'List of Tables']) {
    const i = find(norm(f), 1, bodyStart, (l, n) => l === n);
    pages[`front:${f}`] = toRoman(i); // pdf page index 1 = roman i (title page is index 0)
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
    console.warn(`! Page numbers could not be resolved (${err.message}); TOC will show 0.`);
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
  console.log(`${pass2.figures.length} figures, ${pass2.tables.length} tables, ${pass2.tocEntries.length} TOC entries`);
})();
