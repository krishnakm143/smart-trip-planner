// Theme + drawing helpers for the Presentation-1 deck.
// Everything here is layout plumbing; slide content lives in build-presentation.js.

const fs = require("fs");

// 16:9 "wide" canvas, inches.
const W = 13.333;
const H = 7.5;
const MX = 0.75; // left/right margin
const CW = W - MX * 2; // content width

// Fonts present on both Windows + Office and this Mac, so the LibreOffice
// preview has the same line breaks as PowerPoint on the college PCs.
const SERIF = "Georgia";
const SANS = "Arial";
const MONO = "Courier New";

const C = {
  bg: "F6F1E7", // warm off-white
  ink: "1F2A33", // deep ink
  inkSoft: "3D4852",
  muted: "6A6F73",
  accent: "B4532A", // terracotta / saffron-rust — the only accent
  accentSoft: "F1DDD0",
  sand: "ECE4D4",
  line: "D8CDB9",
  white: "FFFFFF",
  dark: "18222A",
  darkLine: "3A4650",
  onDark: "F6F1E7",
  onDarkMuted: "AEB6BC",
  flag: "FFE066", // highlight behind [[PLACEHOLDER]] text
};

const FOOTER = "Smart Trip Planner · Presentation-1";

// ---------------------------------------------------------------- text

/** Split "[[LIKE THIS]]" placeholders into highlighted runs so the team spots them. */
function rich(str, opts = {}) {
  return String(str)
    .split(/(\[\[[^\]]+\]\])/)
    .filter((p) => p !== "")
    .map((p) => ({
      text: p,
      options: p.startsWith("[[")
        ? { ...opts, highlight: C.flag, color: C.ink, bold: true }
        : { ...opts },
    }));
}

/** Several lines, each run through rich(); `lines` = [{ text, ...runOpts }]. */
function richLines(lines) {
  const runs = [];
  lines.forEach((ln, i) => {
    const { text, ...o } = ln;
    const parts = rich(text, o);
    if (i < lines.length - 1) parts[parts.length - 1].options.breakLine = true;
    runs.push(...parts);
  });
  return runs;
}

function text(slide, content, x, y, w, h, opts = {}) {
  slide.addText(content, {
    x, y, w, h,
    fontFace: SANS,
    fontSize: 14,
    color: C.ink,
    margin: 0,
    valign: "top",
    isTextBox: true,
    ...opts,
  });
}

// -------------------------------------------------------------- shapes

function panel(pres, slide, x, y, w, h, o = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    rectRadius: o.radius ?? 0.06,
    fill: { color: o.fill ?? C.white },
    line: o.line === null ? { type: "none" } : { color: o.line ?? C.line, width: o.lineW ?? 0.75, dashType: o.dash },
  });
}

function dot(pres, slide, cx, cy, d, fill, line) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - d / 2, y: cy - d / 2, w: d, h: d,
    fill: { color: fill },
    line: line ? { color: line, width: 1.25 } : { type: "none" },
  });
}

/** Numbered stop marker: filled circle with a serif numeral. The deck's motif. */
function stop(pres, slide, cx, cy, n, o = {}) {
  const d = o.d ?? 0.46;
  dot(pres, slide, cx, cy, d, o.fill ?? C.accent);
  text(slide, String(n), cx - d / 2, cy - d / 2, d, d, {
    fontFace: SERIF, fontSize: o.fontSize ?? 14, bold: true, color: o.color ?? C.white,
    align: "center", valign: "middle",
  });
}

/** Dashed route line between stops. */
function route(pres, slide, x1, y1, x2, y2, color) {
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipV: y2 < y1,
    line: { color: color ?? C.accent, width: 1.25, dashType: "dash" },
  });
}

function arrow(pres, slide, x1, y, x2, color) {
  slide.addShape(pres.shapes.LINE, {
    x: x1, y, w: x2 - x1, h: 0,
    line: { color: color ?? C.ink, width: 1.25, endArrowType: "triangle" },
  });
}

function arrowDown(pres, slide, x, y1, y2, color) {
  slide.addShape(pres.shapes.LINE, {
    x, y: y1, w: 0, h: y2 - y1,
    line: { color: color ?? C.ink, width: 1.25, endArrowType: "triangle" },
  });
}

// --------------------------------------------------------------- frame

/** Standard content slide: background, kicker, title, footer, slide number, notes. */
function contentSlide(pres, state, { kicker, title, notes, compact }) {
  const slide = pres.addSlide();
  state.n += 1;
  slide.background = { color: C.bg };

  text(slide, kicker.toUpperCase(), MX, compact ? 0.42 : 0.5, CW, 0.28, {
    fontSize: 10.5, bold: true, color: C.accent, charSpacing: 3,
  });
  text(slide, title, MX, compact ? 0.7 : 0.82, CW, compact ? 0.6 : 0.75, {
    fontFace: SERIF, fontSize: compact ? 28 : 34, color: C.ink, valign: "middle",
  });

  text(slide, FOOTER, MX, 6.98, 6, 0.25, { fontSize: 10, color: C.muted });
  text(slide, String(state.n).padStart(2, "0"), W - MX - 1, 6.98, 1, 0.25, {
    fontFace: SERIF, fontSize: 11, color: C.muted, align: "right",
  });

  slide.addNotes(notes);
  state.titles.push(title);
  return slide;
}

function darkSlide(pres, state, { title, notes }) {
  const slide = pres.addSlide();
  state.n += 1;
  slide.background = { color: C.dark };
  slide.addNotes(notes);
  state.titles.push(title);
  return slide;
}

// --------------------------------------------------------------- table

/**
 * Editorial table: ink header row, hairline row rules, no vertical rules.
 * rows: array of arrays; a cell is a string or { text, mono, bold, color, fill }.
 */
function table(slide, header, rows, x, y, colW, o = {}) {
  const fs = o.fontSize ?? 11;
  const rule = { type: "solid", pt: 0.75, color: C.line };
  const none = { type: "none" };
  const pad = o.pad ?? [4, 7, 4, 7];

  const head = header.map((h) => ({
    text: h,
    options: {
      bold: true, color: C.white, fill: { color: C.ink }, fontFace: SANS, fontSize: fs,
      valign: "middle", margin: pad, border: [none, none, none, none],
    },
  }));

  const body = rows.map((r, ri) =>
    r.map((cell, ci) => {
      const c = typeof cell === "string" ? { text: cell } : cell;
      return {
        text: c.text,
        options: {
          fontFace: c.mono ? MONO : SANS,
          fontSize: fs,
          bold: c.bold ?? (ci === 0 && o.boldFirst !== false),
          color: c.color ?? (ci === 0 ? C.ink : C.inkSoft),
          fill: { color: c.fill ?? (ri % 2 === 0 ? C.white : "FBF8F2") },
          valign: "middle",
          margin: pad,
          border: [none, none, rule, none],
        },
      };
    })
  );

  slide.addTable([head, ...body], {
    x, y, w: colW.reduce((a, b) => a + b, 0), colW,
    rowH: o.rowH ?? 0.3,
    autoPage: false,
  });
}

// --------------------------------------------------------------- image

/** Pixel size of a PNG from its IHDR chunk — no external tools needed. */
function pngSize(file) {
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Largest rectangle with the image's aspect ratio that fits the box, centred. */
function fit(img, box) {
  const s = Math.min(box.w / img.w, box.h / img.h);
  const w = img.w * s;
  const h = img.h * s;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

module.exports = {
  W, H, MX, CW, SERIF, SANS, MONO, C,
  rich, richLines, text, panel, dot, stop, route, arrow, arrowDown,
  contentSlide, darkSlide, table, pngSize, fit,
};
