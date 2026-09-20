#!/usr/bin/env node
// Builds docs/Smart_Trip_Planner_Presentation1.pptx
//
//   cd docs/tools && npm install && node build-presentation.js
//
// Inputs (re-run after changing any of them):
//   team.json            names, enrollment numbers, guide, date. [[PLACEHOLDERS]] are highlighted yellow.
//   status.json          module status for the "Implementation Status" slide.
//   ../diagrams/*.png    UML renders. A missing PNG becomes a labelled empty frame; it is
//                        picked up automatically the next time this script runs.
// All slide content follows docs/design.md.

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");
const L = require("./deck-lib");
const { W, MX, CW, SERIF, MONO, C, text, panel, stop, route, arrow, arrowDown, rich, richLines, table } = L;

const DOCS = path.resolve(__dirname, "..");
const DIAGRAMS = path.join(DOCS, "diagrams");
const OUT = path.join(DOCS, "Smart_Trip_Planner_Presentation1.pptx");

const team = JSON.parse(fs.readFileSync(path.join(__dirname, "team.json"), "utf8"));
const status = JSON.parse(fs.readFileSync(path.join(__dirname, "status.json"), "utf8"));
const [udit, hardik, vraj] = team.members.map((m) => m.name.split(" ")[0]);

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in, 16:9
pres.author = team.members.map((m) => m.name).join(", ");
pres.title = `${team.projectTitle} — Presentation-1`;

const state = { n: 0, titles: [], diagrams: [] };
const ACCENT_ON_DARK = "E39568";

const content = (o) => L.contentSlide(pres, state, o);
const say = (who, words) => `[${who}] ${words}`;

/** Rows of "small accent dot + text". */
function dotList(slide, items, x, y, w, step, o = {}) {
  items.forEach((it, i) => {
    const cy = y + i * step;
    L.dot(pres, slide, x + 0.07, cy + 0.13, 0.11, o.dotColor ?? C.accent);
    text(slide, it, x + 0.32, cy, w - 0.32, step, { fontSize: o.fontSize ?? 14, color: o.color ?? C.ink });
  });
}

// =========================================================== 1. Title

{
  const s = L.darkSlide(pres, state, {
    title: "Title — Smart Trip Planner",
    notes: say(vraj,
      `Good morning. We are presenting ${team.projectTitle}, our minor project for ${team.subject}. ` +
      `Introduce the three of us and our roles: ${udit} on backend, database and API; ${hardik} on the frontend; ` +
      `${vraj} on documentation, UML and system design. Name our guide. ` +
      "One line on the idea: you give a destination, dates and a budget tier, and the system returns a day-wise itinerary with a cost estimate."),
  });

  text(s, team.subject.toUpperCase(), MX, 0.7, CW, 0.3, { fontSize: 11, bold: true, color: ACCENT_ON_DARK, charSpacing: 3 });
  text(s, team.projectTitle, MX, 1.2, CW, 1.2, { fontFace: SERIF, fontSize: 60, color: C.onDark, valign: "middle" });
  text(s, "A web application that turns a destination, travel dates and a budget tier into a day-wise itinerary and a cost estimate.",
    MX, 2.5, 8.2, 0.8, { fontSize: 17, color: C.onDarkMuted });

  // Route motif: the four things the product does, as stops on a journey.
  const stops = ["Destination", "Day-wise itinerary", "Budget estimate", "My Trips"];
  const rx = MX + 0.23, rGap = 2.55, ry = 3.85;
  route(pres, s, rx, ry, rx + rGap * (stops.length - 1), ry, ACCENT_ON_DARK);
  stops.forEach((label, i) => {
    stop(pres, s, rx + i * rGap, ry, i + 1, { fill: ACCENT_ON_DARK, color: C.dark });
    text(s, label, rx + i * rGap - 0.23, ry + 0.35, rGap - 0.2, 0.3, { fontSize: 12, color: C.onDarkMuted });
  });

  // Team
  const ty = 4.85;
  text(s, "PRESENTED BY", MX, ty, 4, 0.25, { fontSize: 10, bold: true, color: C.onDarkMuted, charSpacing: 3 });
  team.members.forEach((m, i) => {
    const y = ty + 0.38 + i * 0.42;
    text(s, rich(m.name, { fontFace: SERIF, fontSize: 16, color: C.onDark }), MX, y, 2.7, 0.36, { valign: "middle" });
    text(s, rich(m.enrollment, { fontSize: 13, color: C.onDark }), MX + 2.75, y, 2.3, 0.36, { valign: "middle" });
    text(s, m.role, MX + 5.1, y, 3.2, 0.36, { fontSize: 12, color: C.onDarkMuted, valign: "middle" });
  });

  // Guide / team / date
  const gx = 9.35, gw = W - MX - gx;
  const facts = [["GUIDED BY", team.guide], ["TEAM", team.teamNo], ["PRESENTATION-1", team.presentationDate]];
  facts.forEach(([k, v], i) => {
    const y = ty + i * 0.56;
    text(s, k, gx, y, gw, 0.22, { fontSize: 10, bold: true, color: C.onDarkMuted, charSpacing: 3 });
    text(s, rich(v, { fontSize: 14, color: C.onDark }), gx, y + 0.23, gw, 0.3, {});
  });

  text(s, `${team.institute}  ·  ${team.program}`, MX, 6.8, CW, 0.3, { fontSize: 11.5, color: C.onDarkMuted });
}

// ========================================================== 2. Agenda

{
  const s = content({
    kicker: "Overview",
    title: "Presentation Agenda",
    notes: say(vraj,
      "Walk through the five parts, do not read every item. First we study how trips are planned today and define the problem. " +
      "Then the proposed system and its tools, the requirements, the UML design with the data dictionary, and finally what is already built with a live demo. " +
      `${vraj} covers the study and the structural diagrams, ${udit} the system internals and data, ${hardik} the requirements, user flows and implementation.`),
  });

  const parts = [
    ["Study", ["Existing System", "Need for the New System", "Objective of the New System", "Problem Definition", "Scope of the Project"]],
    ["Proposed system", ["Core Components", "Development Tools & Technologies", "Assumptions and Constraints"]],
    ["Requirements", ["Functional Requirements", "Targeted Users"]],
    ["Design", ["Use Case Diagram", "Activity Diagram", "Interaction Diagram", "Class Diagram", "Data Dictionary"]],
    ["Progress", ["Implementation Status", "Demo Flow", "Questions"]],
  ];
  const gap = 0.25, cw = (CW - gap * 4) / 5, y0 = 1.95, ph = 4.3;
  parts.forEach(([name, items], i) => {
    const x = MX + i * (cw + gap);
    panel(pres, s, x, y0, cw, ph);
    text(s, String(i + 1).padStart(2, "0"), x + 0.25, y0 + 0.22, 1, 0.5, { fontFace: SERIF, italic: true, fontSize: 26, color: C.accent });
    text(s, name, x + 0.25, y0 + 0.85, cw - 0.4, 0.35, { fontSize: 15, bold: true });
    text(s, items.map((t, k) => ({ text: t, options: { breakLine: k < items.length - 1, paraSpaceAfter: 11 } })),
      x + 0.25, y0 + 1.4, cw - 0.4, ph - 1.5, { fontSize: 13.5, color: C.inkSoft });
  });
}

// ================================================= 3. Existing System

{
  const s = content({
    kicker: "Part 1 · Study",
    title: "Existing System",
    notes: say(vraj,
      "There is no single existing system; planning today is a manual process spread over four kinds of tools. " +
      "You research on blogs and videos, check each place on a maps app, look up prices on booking portals, and finally assemble everything in notes or a spreadsheet. " +
      "Point at the strip: it takes hours, days are not grouped by distance, the budget is guesswork, and any change means redoing the work."),
  });

  const steps = [
    ["Research", "Blogs and videos", "Scattered opinions. No single list of what is worth visiting and for how long."],
    ["Locate", "Maps application", "Places are checked one at a time. Nothing groups nearby places into the same day."],
    ["Price", "Booking portals", "Built to sell rooms and tickets. They do not give a whole-trip estimate."],
    ["Assemble", "Notes / spreadsheet", "The plan is typed by hand and reworked whenever dates or group size change."],
  ];
  const gap = 0.3, cw = (CW - gap * 3) / 4, sy = 2.2, cy = 2.65, ch = 2.55;
  route(pres, s, MX + 0.23, sy, MX + 3 * (cw + gap) + 0.23, sy);
  steps.forEach(([h, src, body], i) => {
    const x = MX + i * (cw + gap);
    stop(pres, s, x + 0.23, sy, i + 1);
    panel(pres, s, x, cy, cw, ch);
    text(s, h, x + 0.25, cy + 0.22, cw - 0.5, 0.4, { fontFace: SERIF, fontSize: 20 });
    text(s, src.toUpperCase(), x + 0.25, cy + 0.7, cw - 0.5, 0.25, { fontSize: 9.5, bold: true, color: C.accent, charSpacing: 2 });
    text(s, body, x + 0.25, cy + 1.12, cw - 0.5, ch - 1.2, { fontSize: 14, color: C.inkSoft });
  });

  panel(pres, s, MX, 5.55, CW, 0.95, { fill: C.sand, line: null });
  text(s, "Result", MX + 0.3, 5.55, 1.2, 0.95, { fontFace: SERIF, italic: true, fontSize: 18, color: C.accent, valign: "middle" });
  text(s, "Hours of effort   ·   no distance-aware day plan   ·   budget is a guess   ·   nothing saved in one place",
    MX + 1.5, 5.55, CW - 1.8, 0.95, { fontSize: 14, valign: "middle" });
}

// ======================================== 4. Need for the New System

{
  const s = content({
    kicker: "Part 1 · Study",
    title: "Need for the New System",
    notes: say(vraj,
      "Compare row by row. Today information is scattered; we keep a curated catalogue of destinations and activities. " +
      "Today the day plan is made by hand; we generate it and order stops by distance. Today budget is guesswork; we break it into stay, food, transport and activities. " +
      "A change means starting again versus regenerating in one click, and the plan finally lives in one place, My Trips."),
  });

  const rows = [
    ["Information", "Spread over blogs, maps and portals", "One curated catalogue: destinations with activities, fees, timings"],
    ["Day plan", "Made by hand, distance ignored", "Generated day-wise, stops ordered to cut travel"],
    ["Budget", "A rough guess, often only the hotel", "Stay, food, transport and activities; total and per person"],
    ["Changes", "Rework the whole plan", "Change an input and regenerate"],
    ["Record", "Screenshots and loose notes", "Saved in My Trips with notes and status"],
  ];
  const lx = MX, lw = 1.9, ax = lx + lw, aw = 4.6, bx = ax + aw + 0.25, bw = CW - lw - aw - 0.25;
  const hy = 1.95, ry = 2.5, rh = 0.78;

  panel(pres, s, ax, hy, aw, 0.55 + rh * rows.length, { fill: C.sand, line: null });
  panel(pres, s, bx, hy, bw, 0.55 + rh * rows.length, { fill: C.white });
  text(s, "EXISTING WAY", ax + 0.3, hy, aw - 0.6, 0.55, { fontSize: 10.5, bold: true, color: C.muted, charSpacing: 3, valign: "middle" });
  text(s, "SMART TRIP PLANNER", bx + 0.3, hy, bw - 0.6, 0.55, { fontSize: 10.5, bold: true, color: C.accent, charSpacing: 3, valign: "middle" });

  rows.forEach(([k, a, b], i) => {
    const y = ry + i * rh;
    text(s, k, lx, y, lw - 0.2, rh, { fontFace: SERIF, fontSize: 17, valign: "middle" });
    text(s, a, ax + 0.3, y, aw - 0.6, rh, { fontSize: 13.5, color: C.inkSoft, valign: "middle" });
    text(s, b, bx + 0.3, y, bw - 0.6, rh, { fontSize: 13.5, bold: true, valign: "middle" });
  });
}

// ===================================== 5. Objective of the New System

{
  const s = content({
    kicker: "Part 1 · Study",
    title: "Objective of the New System",
    notes: say(vraj,
      "Six objectives. One form should give a complete plan. Stops inside a day should be close to each other. The budget must show where the money goes. " +
      "A visitor can try the planner before creating an account. The demo must not depend on the internet, so seeded data and a local distance calculation are the default. " +
      "And the API must be secure and covered by automated tests."),
  });

  const cards = [
    ["Plan in one step", "One form in, a complete day-wise itinerary out."],
    ["Less time on the road", "Each day groups nearby places; stops are ordered by distance."],
    ["A budget you can read", "Stay, food, transport and activities, with total and per-person cost in INR."],
    ["Try before sign-up", "Anyone can preview a plan. Login is needed only to save it."],
    ["Works without the internet", "Seeded data and a local distance provider by default; OpenStreetMap and Google are optional."],
    ["Secure and tested", "JWT authentication, validated input, trips visible only to their owner, automated tests."],
  ];
  const gap = 0.3, cw = (CW - gap * 2) / 3, ch = 2.1, y0 = 1.95;
  cards.forEach(([h, b], i) => {
    const x = MX + (i % 3) * (cw + gap), y = y0 + Math.floor(i / 3) * (ch + gap);
    panel(pres, s, x, y, cw, ch);
    text(s, String(i + 1).padStart(2, "0"), x + 0.28, y + 0.22, 1, 0.5, { fontFace: SERIF, italic: true, fontSize: 26, color: C.accent });
    text(s, h, x + 0.28, y + 0.82, cw - 0.56, 0.35, { fontSize: 15.5, bold: true });
    text(s, b, x + 0.28, y + 1.2, cw - 0.56, 0.8, { fontSize: 13.5, color: C.inkSoft });
  });
}

// ============================================== 6. Problem Definition

{
  const s = content({
    kicker: "Part 1 · Study",
    title: "Problem Definition",
    notes: say(vraj,
      "Read the statement once, slowly. Then point right: the six inputs the traveller gives, and the two outputs the system must produce. " +
      "Stress the word feasible: a day has a limit of 6, 8 or 10 visiting hours depending on pace, and travel time between stops counts against it."),
  });

  text(s, [
    { text: "Given a destination, travel dates, group size, budget tier, interests and pace, ", options: {} },
    { text: "produce a feasible day-wise itinerary that keeps travel between stops low, together with a transparent cost estimate", options: { color: C.accent } },
    { text: " — in one step, and keep it for later.", options: {} },
  ], MX, 2.0, 6.3, 3.4, { fontFace: SERIF, fontSize: 24, lineSpacingMultiple: 1.18 });
  text(s, "Feasible = visit time + travel time fits the day: 6 h relaxed, 8 h balanced, 10 h packed.",
    MX, 5.55, 6.3, 0.7, { fontSize: 13.5, color: C.muted });

  const px = 7.75, pw = W - MX - px;
  panel(pres, s, px, 1.95, pw, 2.35);
  text(s, "THE TRAVELLER GIVES", px + 0.3, 2.15, pw - 0.6, 0.25, { fontSize: 10, bold: true, color: C.muted, charSpacing: 3 });
  const inputs = ["Destination", "Start and end date", "Travellers (1–12)", "Budget tier", "Interests", "Pace"];
  inputs.forEach((t, i) => {
    const cx = px + 0.3 + (i % 2) * ((pw - 0.6) / 2), cy = 2.58 + Math.floor(i / 2) * 0.52;
    L.dot(pres, s, cx + 0.07, cy + 0.13, 0.11, C.accent);
    text(s, t, cx + 0.3, cy, (pw - 0.6) / 2 - 0.3, 0.3, { fontSize: 13.5 });
  });

  arrowDown(pres, s, px + pw / 2, 4.38, 4.82, C.accent);

  panel(pres, s, px, 4.9, pw, 1.6, { fill: C.ink, line: null });
  text(s, "THE SYSTEM RETURNS", px + 0.3, 5.08, pw - 0.6, 0.25, { fontSize: 10, bold: true, color: C.onDarkMuted, charSpacing: 3 });
  text(s, [
    { text: "Day-wise itinerary with start and end times", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "Budget: stay · food · transport · activities", options: {} },
  ], px + 0.3, 5.45, pw - 0.6, 0.95, { fontSize: 14, bold: true, color: C.onDark });
}

// ============================================ 7. Scope of the Project

{
  const s = content({
    kicker: "Part 1 · Study",
    title: "Scope of the Project",
    notes: say(vraj,
      "Left is what Phase-1 delivers: twelve Indian destinations with curated activities, search and filter, the plan generator, the three-tier budget, accounts with My Trips, and nearby-place discovery. " +
      "Right is what we deliberately left out. We do not take payments or make bookings, there is no chatbot and no mobile app, prices are estimates and not live. " +
      "Saying this clearly avoids questions about features we never promised."),
  });

  const lw = 7.1, rx = MX + lw + 0.3, rw = CW - lw - 0.3, y0 = 1.95, ph = 4.55;
  panel(pres, s, MX, y0, lw, ph);
  text(s, "In scope", MX + 0.35, y0 + 0.25, 3, 0.45, { fontFace: SERIF, fontSize: 22 });
  dotList(s, [
    "12 Indian destinations, 8–10 curated activities each",
    "Destination search, category filter and details page",
    "Day-wise itinerary from dates, interests and pace",
    "Budget estimate in three tiers: economy, standard, luxury",
    "Register, login, and My Trips: save, notes, status, delete",
    "Discover nearby places through the Places provider",
  ], MX + 0.35, y0 + 0.95, lw - 0.7, 0.56, { fontSize: 14 });

  panel(pres, s, rx, y0, rw, ph, { fill: C.sand, line: null });
  text(s, "Out of scope", rx + 0.35, y0 + 0.25, 3, 0.45, { fontFace: SERIF, fontSize: 22, color: C.inkSoft });
  dotList(s, [
    "Online payments",
    "Hotel, ticket or cab booking",
    "Chatbot or AI assistant",
    "Native mobile application",
    "Live prices and availability",
    "Admin screens (role field is reserved)",
  ], rx + 0.35, y0 + 0.95, rw - 0.7, 0.56, { fontSize: 14, color: C.inkSoft, dotColor: C.muted });
}

// ================================================= 8. Core Components

{
  const s = content({
    kicker: "Part 2 · Proposed system",
    title: "Core Components",
    notes: say(udit,
      "Three tiers. The React client talks only to our REST API under /api/v1; the API is layered as routes, controllers and services; MongoDB holds four collections. " +
      "The six blocks below are the services where the logic lives. Controllers only handle HTTP, so itinerary and budget are pure functions that we can unit test. " +
      "Providers hide where distance and places come from: local by default, OpenStreetMap/OSRM or Google by configuration."),
  });

  const tiers = [
    ["React client", "Vite · React Router", "Pages, AuthContext, apiClient"],
    ["Express REST API", "/api/v1 · JSON · JWT", "routes → controllers → services"],
    ["MongoDB", "Mongoose models", "users · destinations · activities · trips"],
  ];
  const tg = 0.8, tw = (CW - tg * 2) / 3, ty = 1.95, th = 1.5;
  tiers.forEach(([h, sub, body], i) => {
    const x = MX + i * (tw + tg);
    panel(pres, s, x, ty, tw, th, i === 1 ? { fill: C.ink, line: null } : {});
    const onDark = i === 1;
    text(s, h, x + 0.28, ty + 0.18, tw - 0.56, 0.4, { fontFace: SERIF, fontSize: 19, color: onDark ? C.onDark : C.ink });
    text(s, sub.toUpperCase(), x + 0.28, ty + 0.62, tw - 0.56, 0.25, { fontSize: 9.5, bold: true, charSpacing: 2, color: onDark ? ACCENT_ON_DARK : C.accent });
    text(s, body, x + 0.28, ty + 0.95, tw - 0.56, 0.4, { fontSize: 12.5, color: onDark ? C.onDarkMuted : C.inkSoft });
    if (i < 2) arrow(pres, s, x + tw + 0.12, ty + th / 2, x + tw + tg - 0.12, C.accent);
  });

  text(s, "SERVICES INSIDE THE API", MX, 3.9, CW, 0.25, { fontSize: 10, bold: true, color: C.muted, charSpacing: 3 });
  const services = [
    ["Auth", "Register, login, JWT issue and verify, bcrypt hashing."],
    ["Destination", "Catalogue search, category filter, details with activities."],
    ["Itinerary", "Scores activities, builds days by nearest stop, schedules times."],
    ["Budget", "Tier-based estimate: stay, food, transport, activities."],
    ["Trip", "Saves plans, enforces ownership, updates notes and status."],
    ["Providers", "Route and Places adapters: local, OpenStreetMap (free) or Google."],
  ];
  const sg = 0.2, sw = (CW - sg * 5) / 6, sy = 4.3, sh = 2.15;
  services.forEach(([h, b], i) => {
    const x = MX + i * (sw + sg);
    panel(pres, s, x, sy, sw, sh);
    text(s, h, x + 0.2, sy + 0.2, sw - 0.4, 0.35, { fontSize: 14.5, bold: true });
    text(s, b, x + 0.2, sy + 0.65, sw - 0.4, sh - 0.8, { fontSize: 12.5, color: C.inkSoft });
  });
}

// ===================================================== diagram slides

/**
 * Diagram(s) on a white panel, as large as the slide allows, aspect ratio preserved.
 *
 *   file   the canonical PNG in docs/diagrams/
 *   parts  optional: the same diagram split into readable parts (shown side by side at one
 *          common scale). Used when every part exists; otherwise `file` is used.
 *   aside  optional companion PNG for a tall diagram; fills the right-hand column.
 *
 * If the fitted diagram leaves >= 3" of free width, the panel hugs the diagram and the
 * "what to notice" points go on the right; otherwise the panel spans the slide with a
 * one-line caption underneath. A PNG that does not exist yet becomes a labelled empty frame
 * and is picked up automatically on the next run.
 */
function diagramSlide({ kicker, title, file, parts, aside, caption, notice, notes }) {
  const s = content({ kicker, title, notes, compact: true });
  const at = (f) => path.join(DIAGRAMS, f);
  const names = parts && parts.every((f) => fs.existsSync(at(f))) ? parts : [file];
  const exists = names.every((f) => fs.existsSync(at(f)));
  state.diagrams.push({ file: names.join(" + "), exists });

  const top = 1.45, bottom = 6.75, pad = 0.14, between = 0.35;

  if (!exists) {
    const ph = bottom - top - 0.42;
    panel(pres, s, MX, top, CW, ph, { dash: "dash", line: C.accent, lineW: 1.25 });
    text(s, [
      { text: "Diagram pending", options: { fontFace: SERIF, fontSize: 24, color: C.inkSoft, breakLine: true } },
      { text: `docs/diagrams/${file}`, options: { fontFace: MONO, fontSize: 14, color: C.ink, highlight: C.flag, breakLine: true } },
      { text: "Add the PNG and re-run  node build-presentation.js", options: { fontSize: 12, color: C.muted } },
    ], MX, top, CW, ph, { align: "center", valign: "middle" });
    text(s, caption, MX, bottom - 0.32, CW, 0.3, { fontSize: 12.5, color: C.inkSoft, italic: true });
    return;
  }

  // Every part is scaled to the full panel height (parts are separate diagrams, so they
  // need not share a scale); if the row is then too wide, all parts shrink together.
  const imgs = names.map((f) => ({ f, ...L.pngSize(at(f)) }));
  const gaps = between * (imgs.length - 1);
  const layout = (boxW, boxH) => {
    const sized = imgs.map((im) => ({ ...im, dh: boxH - pad * 2, dw: ((boxH - pad * 2) * im.w) / im.h }));
    const rowW = sized.reduce((a, i) => a + i.dw, 0);
    const shrink = Math.min(1, (boxW - pad * 2 - gaps) / rowW);
    return sized.map((i) => ({ ...i, dw: i.dw * shrink, dh: i.dh * shrink }));
  };
  const rowWidth = (row) => row.reduce((a, i) => a + i.dw, 0) + gaps;

  // Try the side layout first: full height, panel hugs the diagram.
  let ph = bottom - top;
  let row = layout(CW, ph);
  let pw = rowWidth(row) + pad * 2;
  const side = CW - pw >= 3.0;
  if (side) {
    pw = Math.max(pw, 4.2);
  } else {
    ph = bottom - top - 0.42;
    row = layout(CW, ph);
    pw = CW;
  }

  panel(pres, s, MX, top, pw, ph);
  const rowH = Math.max(...row.map((i) => i.dh));
  let x = MX + (pw - rowWidth(row)) / 2;
  row.forEach((im, i) => {
    s.addImage({ path: at(im.f), x, y: top + (ph - rowH) / 2, w: im.dw, h: im.dh, altText: `${title} (${im.f})` });
    if (i < row.length - 1) {
      s.addShape(pres.shapes.LINE, { x: x + im.dw + between / 2, y: top + 0.3, w: 0, h: ph - 0.6, line: { color: C.line, width: 0.75, dashType: "dash" } });
    }
    x += im.dw + between;
  });

  if (side && aside && fs.existsSync(at(aside))) {
    state.diagrams.push({ file: aside, exists: true });
    const nx = MX + pw + 0.3, nw = W - MX - nx;
    const a = L.pngSize(at(aside));
    const ah = Math.min(3.3, ((nw - pad * 2) * a.h) / a.w);
    panel(pres, s, nx, top, nw, ah + pad * 2);
    s.addImage({ path: at(aside), ...L.fit(a, { x: nx + pad, y: top + pad, w: nw - pad * 2, h: ah }), altText: `${title} (${aside})` });
    const cy = top + ah + pad * 2 + 0.22;
    text(s, caption, nx, cy, nw, 0.6, { fontFace: SERIF, fontSize: 15 });
    const cw3 = (nw - 0.6) / 3;
    notice.forEach((t, i) => {
      const x3 = nx + i * (cw3 + 0.3);
      stop(pres, s, x3 + 0.15, cy + 0.9, i + 1, { d: 0.3, fontSize: 10 });
      text(s, t, x3 + 0.42, cy + 0.74, cw3 - 0.42, 0.9, { fontSize: 11.5, color: C.inkSoft });
    });
  } else if (side) {
    const nx = MX + pw + 0.5, nw = W - MX - nx;
    text(s, "WHAT TO NOTICE", nx, top + 0.1, nw, 0.25, { fontSize: 10, bold: true, color: C.accent, charSpacing: 3 });
    text(s, caption, nx, top + 0.5, nw, 1.5, { fontFace: SERIF, fontSize: nw > 5 ? 19 : 17 });
    notice.forEach((t, i) => {
      const y = top + 2.1 + i * 0.95;
      stop(pres, s, nx + 0.17, y + 0.17, i + 1, { d: 0.34, fontSize: 11 });
      text(s, t, nx + 0.55, y, nw - 0.55, 0.85, { fontSize: nw > 5 ? 14 : 12.5, color: C.inkSoft });
    });
  } else {
    text(s, caption, MX, bottom - 0.32, CW, 0.3, { fontSize: 12.5, color: C.inkSoft, italic: true });
  }
}

// ===================================== 9. Core Components — architecture

diagramSlide({
  kicker: "Part 2 · Proposed system",
  title: "Core Components — System Architecture",
  file: "architecture.png",
  caption: "Browser → REST API → MongoDB. External map services are optional; every call falls back to the local provider.",
  notice: [
    "The client never touches the database; everything goes through /api/v1.",
    "Controllers are thin. Itinerary and budget logic sit in services.",
    "Providers pick local, OpenStreetMap or Google from configuration, with a 4-second timeout.",
  ],
  notes: say(udit,
    "Same three tiers, now as deployed for the demo: Vite dev server on 5173 proxies /api to Express on 4100, MongoDB 7 runs in Docker on 27017. " +
    "Follow one request: page, apiClient, route, validate middleware, controller, service, model. " +
    "When the provider is set to OpenStreetMap or Google the providers call the external places and distance services with a timeout, otherwise, or on any failure, the local provider answers."),
});

// ================================ 10. How itinerary + budget are computed

{
  const s = content({
    kicker: "Part 2 · Proposed system",
    title: "Core Components — How the Plan Is Computed",
    notes: say(udit,
      "This is the heart of the project. Each activity gets a score: its rating plus 1.5 if it matches an interest. Pace sets the hours per day. " +
      "Each day starts from the best unassigned activity, then keeps adding the nearest one from the top half of the pool while visit plus travel time fits. " +
      "Morning places move to the front, evening ones to the end, and the day is timed from 9 am with a lunch hour. It is deterministic, same input gives the same plan. " +
      "Budget on the right: two people share a room, nights are days minus one, everything is in whole rupees."),
  });

  const lw = 6.0;
  text(s, "Itinerary", MX, 1.9, 3, 0.45, { fontFace: SERIF, fontSize: 22 });
  const steps = [
    ["Score", "rating + 1.5 when the type matches an interest"],
    ["Capacity", "hours per day: relaxed 6 · balanced 8 · packed 10"],
    ["Build the day", "start at the best activity, keep adding the nearest one that still fits"],
    ["Order", "morning places first, evening places last"],
    ["Schedule", "from 09:00, travel time between stops, 60-minute lunch after 13:00"],
  ];
  const sy = 2.75, sg = 0.76;
  route(pres, s, MX + 0.2, sy, MX + 0.2, sy + sg * (steps.length - 1));
  steps.forEach(([h, b], i) => {
    const y = sy + i * sg;
    stop(pres, s, MX + 0.2, y, i + 1, { d: 0.4, fontSize: 12 });
    text(s, h, MX + 0.65, y - 0.3, 1.5, 0.6, { fontSize: 14, bold: true, valign: "middle" });
    text(s, b, MX + 2.15, y - 0.3, lw - 2.15, 0.6, { fontSize: 12.5, color: C.inkSoft, valign: "middle" });
  });

  const px = MX + lw + 0.45, pw = CW - lw - 0.45;
  panel(pres, s, px, 1.9, pw, 4.6);
  text(s, "Budget", px + 0.3, 2.05, 3, 0.45, { fontFace: SERIF, fontSize: 22 });
  const formula = [
    "nights     = max(days − 1, 1)",
    "rooms      = ceil(travellers ÷ 2)",
    "stay       = rate.stay × rooms × nights",
    "food       = rate.food × travellers × days",
    "transport  = rate.transport × travellers × days",
    "activities = entry fees × travellers",
    "total      = sum of the four",
    "perPerson  = round(total ÷ travellers)",
  ];
  text(s, formula.map((t, i) => ({ text: t, options: { breakLine: i < formula.length - 1 } })),
    px + 0.3, 2.65, pw - 0.5, 2.7, { fontFace: MONO, fontSize: 12, bold: true, color: C.inkSoft, lineSpacingMultiple: 1.45 });
  panel(pres, s, px + 0.3, 5.45, pw - 0.6, 0.8, { fill: C.accentSoft, line: null });
  text(s, [
    { text: "4 days, 2 travellers  →  3 nights, 1 room. ", options: { bold: true } },
    { text: "rate = the destination's daily cost for the chosen tier.", options: {} },
  ], px + 0.45, 5.45, pw - 0.9, 0.8, { fontSize: 11.5, valign: "middle" });
}

// ================================ 11. Development Tools & Technologies

{
  const s = content({
    kicker: "Part 2 · Proposed system",
    title: "Development Tools & Technologies",
    notes: say(hardik,
      "The stack is MERN with JavaScript end to end. On the client React 18 with Vite and React Router, and hand-written CSS with design tokens, no UI kit. " +
      "On the server Node 20 and Express, with Zod for validation and JWT plus bcrypt for security. MongoDB 7 with Mongoose, run through Docker Compose. " +
      "OpenStreetMap Overpass and OSRM are the free map services; Google Places and Distance Matrix are optional. Vitest and Supertest for tests, Git for version control."),
  });

  table(s, ["Layer", "Technology", "Role in the project"], [
    ["Frontend", "React 18, Vite, React Router", "Single-page client, routing, protected pages"],
    ["Styling", "HTML5, hand-written CSS3, design tokens", "Responsive from 360 px, accessible forms, no UI kit"],
    ["Backend", "Node.js 20+, Express.js (ES modules)", "REST API under /api/v1 with a uniform response envelope"],
    ["Security", "JWT, bcrypt, Zod, helmet, cors, rate limit", "Login tokens, password hashing, input validation, hardening"],
    ["Database", "MongoDB 7, Mongoose", "Four collections; itinerary and budget embedded in a trip"],
    ["External APIs", "Overpass (OpenStreetMap), OSRM; optional Google Places, Distance Matrix", "Place discovery and road distance; local fallback"],
    ["Testing", "Vitest, Supertest, mongodb-memory-server", "Unit tests for services, API tests on an in-memory database"],
    ["Tooling", "Git, Docker Compose, npm", "Version control, one-command database, scripts and seed"],
  ], MX, 1.95, [1.9, 4.5, CW - 6.4], { fontSize: 12.5, rowH: 0.5 });
}

// =================================== 12. Assumptions and Constraints

{
  const s = content({
    kicker: "Part 2 · Proposed system",
    title: "Assumptions and Constraints",
    notes: say(udit,
      "Assumptions are what the estimate takes for granted: two travellers share a room, nights are days minus one, costs are daily averages per tier, " +
      "and with the local provider the road distance is straight-line times 1.3 at 25 km per hour. " +
      "Constraints are hard limits in the code: twelve destinations, up to fourteen days, up to twelve travellers, a four-second timeout on external route calls, and twenty auth requests per fifteen minutes per IP."),
  });

  const lw = 5.6;
  text(s, "Assumptions", MX, 1.9, 4, 0.45, { fontFace: SERIF, fontSize: 22 });
  dotList(s, [
    "Two travellers share one room",
    "Nights = days − 1, never less than one",
    "Costs are daily averages per tier, in whole INR",
    "Local road distance = straight line × 1.3 at 25 km/h",
    "Sightseeing starts at 09:00 with a one-hour lunch",
    "Figures are estimates, not quotations",
  ], MX, 2.6, lw, 0.62, { fontSize: 14 });

  const gx = MX + lw + 0.5, gw = CW - lw - 0.5;
  text(s, "Constraints", gx, 1.9, 4, 0.45, { fontFace: SERIF, fontSize: 22 });
  const tiles = [
    ["12", "seeded Indian destinations"],
    ["1–14", "days per trip"],
    ["1–12", "travellers per trip"],
    ["4 s", "External API timeout, then local fallback"],
    ["20 / 15 min", "auth requests allowed per IP"],
    ["Node 20+", "and MongoDB 7 to run the system"],
  ];
  const tg = 0.25, tw = (gw - tg) / 2, th = 1.15;
  tiles.forEach(([big, label], i) => {
    const x = gx + (i % 2) * (tw + tg), y = 2.55 + Math.floor(i / 2) * (th + tg);
    panel(pres, s, x, y, tw, th);
    text(s, big, x + 0.22, y + 0.12, tw - 0.44, 0.55, { fontFace: SERIF, fontSize: 24, color: C.accent, valign: "middle" });
    text(s, label, x + 0.22, y + 0.7, tw - 0.44, 0.4, { fontSize: 11.5, color: C.inkSoft });
  });
}

// ===================================== 13–14. Functional Requirements

{
  const colW = [1.0, CW - 1.0 - 2.4, 2.4];
  const head = ["ID", "The system shall…", "Module"];
  const fr = [
    ["FR-01", "register a user with name, email and password (min. 8 characters); reject a duplicate email", "Auth"],
    ["FR-02", "log a user in with email and password and issue a JWT", "Auth"],
    ["FR-03", "restore the session on reload; send a protected page to login and return afterwards", "Auth"],
    ["FR-04", "list destinations with keyword search, category filter and pagination", "Destinations"],
    ["FR-05", "show destination details: overview, best season, daily cost table, activities", "Destinations"],
    ["FR-06", "discover nearby places for a destination, optionally by type", "Destinations · Providers"],
    ["FR-07", "accept a plan: destination, dates, travellers, budget tier, interests, pace", "Planner"],
    ["FR-08", "validate a plan: end ≥ start, at most 14 days, start not in the past, 1–12 travellers", "Planner"],
    ["FR-09", "generate a day-wise itinerary with timings, ordered to reduce travel between stops", "Itinerary"],
    ["FR-10", "estimate the budget: stay, food, transport, activities, total and per person", "Budget"],
    ["FR-11", "let a guest preview the generated plan without an account", "Planner"],
    ["FR-12", "save a plan to My Trips after login; keep the pending plan across the login step", "Trips"],
    ["FR-13", "recompute itinerary and budget on the server when saving; never trust client totals", "Trips"],
    ["FR-14", "list the user's saved trips, newest first, with a status filter", "Trips"],
    ["FR-15", "show trip details and allow editing of title, notes and status", "Trips"],
    ["FR-16", "delete a trip; one user can never read or change another user's trip", "Trips"],
  ].map((r) => [{ text: r[0], color: C.accent, bold: true }, r[1], { text: r[2], color: C.muted }]);

  const s1 = content({
    kicker: "Part 3 · Requirements",
    title: "Functional Requirements (1 of 2)",
    notes: say(hardik,
      "Sixteen functional requirements, grouped by module; each maps to a page and an API route. " +
      "FR-01 to 03 are accounts. FR-04 to 06 are the destination catalogue. FR-07 and 08 are the plan form and its validation rules: end date not before start, at most fourteen days, not in the past. " +
      "Do not read all rows; pick one from each group."),
  });
  table(s1, head, fr.slice(0, 8), MX, 1.95, colW, { fontSize: 12.5, rowH: 0.5, boldFirst: false });

  const s2 = content({
    kicker: "Part 3 · Requirements",
    title: "Functional Requirements (2 of 2)",
    notes: say(hardik,
      "FR-09 and 10 are the two outputs, itinerary and budget. FR-11 is important for usability: a guest can preview without an account. " +
      "FR-12: if the guest presses Save, we keep the plan in session storage, send them to login, and restore it. " +
      "FR-13 is a security point: the server regenerates the numbers on save. FR-14 to 16 are trip management, with strict ownership: another user's trip simply returns not found."),
  });
  table(s2, head, fr.slice(8), MX, 1.95, colW, { fontSize: 12.5, rowH: 0.5, boldFirst: false });
}

// =================================================== 15. Targeted Users

{
  const s = content({
    kicker: "Part 3 · Requirements",
    title: "Targeted Users",
    notes: say(hardik,
      "Our users are people planning a domestic leisure trip on their own. Three typical cases: a student group watching every rupee, a family that wants a relaxed pace, and a first-time visitor who does not know the place. " +
      "Inside the system there are only two roles that matter in Phase-1: a guest, who can browse and preview, and a registered traveller, who can save and manage trips. " +
      "The role field also allows admin, but there are no admin screens in this phase."),
  });

  const people = [
    ["Student group", "Economy tier · packed pace", "Needs the per-person cost before committing.", "Budget split per person; up to 12 travellers."],
    ["Family on holiday", "Standard tier · relaxed pace", "Wants short days and little road time.", "6-hour days, nearby stops grouped together."],
    ["First-time visitor", "Any tier · balanced pace", "Does not know what to see or how long it takes.", "Curated activities with duration, fee and best time."],
  ];
  const gap = 0.3, cw = (CW - gap * 2) / 3, y0 = 1.95, ch = 3.0;
  people.forEach(([h, tag, need, help], i) => {
    const x = MX + i * (cw + gap);
    panel(pres, s, x, y0, cw, ch);
    text(s, h, x + 0.28, y0 + 0.22, cw - 0.56, 0.42, { fontFace: SERIF, fontSize: 20 });
    text(s, tag.toUpperCase(), x + 0.28, y0 + 0.7, cw - 0.56, 0.25, { fontSize: 9.5, bold: true, color: C.accent, charSpacing: 2 });
    text(s, "NEED", x + 0.28, y0 + 1.15, 0.9, 0.25, { fontSize: 9.5, bold: true, color: C.muted, charSpacing: 2 });
    text(s, need, x + 1.1, y0 + 1.12, cw - 1.38, 0.7, { fontSize: 12.5 });
    text(s, "GETS", x + 0.28, y0 + 2.0, 0.9, 0.25, { fontSize: 9.5, bold: true, color: C.muted, charSpacing: 2 });
    text(s, help, x + 1.1, y0 + 1.97, cw - 1.38, 0.8, { fontSize: 12.5 });
  });

  const ry = 5.25, rh = 1.25, rw = (CW - gap) / 2;
  const roles = [
    ["Guest", "No account. Browses destinations, opens details, generates and previews a plan."],
    ["Registered traveller", "Logged in. Everything a guest can do, plus save to My Trips, add notes, change status, delete."],
  ];
  roles.forEach(([h, b], i) => {
    const x = MX + i * (rw + gap);
    panel(pres, s, x, ry, rw, rh, { fill: C.sand, line: null });
    text(s, `ROLE ${i + 1}`, x + 0.28, ry + 0.17, 1.2, 0.22, { fontSize: 9.5, bold: true, color: C.accent, charSpacing: 2 });
    text(s, h, x + 0.28, ry + 0.42, 2.2, 0.7, { fontFace: SERIF, fontSize: 17 });
    text(s, b, x + 2.5, ry, rw - 2.8, rh, { fontSize: 12.5, color: C.inkSoft, valign: "middle" });
  });
}

// ================================================== 16–21. UML diagrams

diagramSlide({
  kicker: "Part 4 · Design",
  title: "Use Case Diagram",
  file: "use-case.png",
  caption: "A guest can browse and preview a plan; saving and managing trips require a registered traveller.",
  notice: [
    "Registered Traveller inherits every use case of the Guest.",
    "Plan trip includes Generate itinerary and Estimate budget.",
    "Save trip extends Plan trip only when logged in. The Places and Route APIs are external actors.",
  ],
  notes: say(vraj,
    "Two human actors. A guest can browse destinations, view details, discover nearby places and generate a plan preview. " +
    "A registered traveller does all of that and also saves trips, views My Trips, updates notes and status, and deletes. " +
    "Generating a plan always includes building the itinerary and estimating the budget. The map services appear as external, optional actors."),
});

diagramSlide({
  kicker: "Part 4 · Design",
  title: "Activity Diagram — Plan a Trip",
  file: "activity-plan-trip.png",
  parts: ["activity-plan-trip-part1-preview.png", "activity-plan-trip-part2-save.png"],
  caption: "From choosing a destination to a saved trip, including validation and the login detour on Save.",
  notice: [
    "Invalid input loops back to the form with field-level messages.",
    "Itinerary and budget are produced together for the preview.",
    "Save while logged out: plan is kept, user logs in, plan is restored.",
  ],
  notes: say(hardik,
    "This is the main flow you will see in the demo. The traveller picks a destination, fills the plan form, and the input is validated: dates in order, not in the past, at most fourteen days. " +
    "The server builds the itinerary and the budget and the client shows the preview. On Save there is one decision: logged in or not. " +
    "If not, the plan is kept in session storage, the user logs in or registers, comes back to the same preview and saves."),
});

diagramSlide({
  kicker: "Part 4 · Design",
  title: "Activity Diagram — Register and Login",
  file: "activity-auth.png",
  caption: "Registration and login share one outcome: a JWT stored on the client and a return to the page the user came from.",
  notice: [
    "Duplicate email ends in a conflict message, not a crash.",
    "Wrong credentials give one generic error.",
    "After success the user returns to the page that asked for login.",
  ],
  notes: say(hardik,
    "Register checks the input, rejects an email that already exists with a 409 conflict, hashes the password with bcrypt and returns a token. " +
    "Login verifies the password and returns the same kind of token; wrong email or wrong password give the same 401 message. " +
    "The client stores the token, loads the user, and sends them back to where they were, for example the plan preview."),
});

diagramSlide({
  kicker: "Part 4 · Design",
  title: "Interaction Diagram — Plan and Save (Sequence)",
  file: "sequence-plan-and-save.png",
  parts: ["sequence-plan-preview.png", "sequence-save-trip.png"],
  caption: "Preview is public; on Save the server recomputes the itinerary and budget before writing the trip.",
  notice: [
    "POST /planner/preview needs no token.",
    "POST /trips carries the Bearer token and the same plan input.",
    "The server regenerates the plan; client totals are never trusted.",
  ],
  notes: say(udit,
    "Read it top to bottom. The client posts the plan input to /planner/preview. The controller calls the itinerary service, which asks the route provider for distances, then the budget service, and returns both. " +
    "When the user saves, the client posts the same input to /trips with the JWT. The auth middleware verifies the token, the trip service regenerates itinerary and budget, and only then writes the trip document. " +
    "So a tampered total from the browser can never reach the database."),
});

diagramSlide({
  kicker: "Part 4 · Design",
  title: "Interaction Diagram — Login (Sequence)",
  file: "sequence-login.png",
  caption: "Credentials go in once; every later request carries the JWT in the Authorization header.",
  notice: [
    "The password hash is read only for comparison and never returned.",
    "The token is kept in localStorage; /auth/me restores the session.",
    "A 401 on any later call logs the user out and redirects to login.",
  ],
  notes: say(udit,
    "The login page posts email and password. The auth service loads the user with the password hash, compares with bcrypt, signs a JWT and returns user plus token. The hash never leaves the server. " +
    "The client keeps the token in local storage and attaches it as a Bearer header. On reload it calls /auth/me to restore the session. " +
    "The auth routes are rate limited to twenty requests per fifteen minutes per IP."),
});

diagramSlide({
  kicker: "Part 4 · Design",
  title: "Class Diagram",
  file: "class-diagram.png",
  aside: "class-diagram-services.png",
  caption: "Left: four persistent classes, with a Trip composed of days, items and a budget. Above: the service classes and provider interfaces.",
  notice: [
    "User 1 — many Trip; Destination 1 — many Activity and Trip.",
    "ItineraryItem is a snapshot of an Activity, so a saved trip never changes.",
    "Route and Places providers are interfaces; OpenStreetMap and Google implementations fall back to local.",
  ],
  notes: say(vraj,
    "Four persistent classes that map one to one to MongoDB collections: User, Destination, Activity and Trip. " +
    "A user has many trips, a destination has many activities and many trips. Trip is composed of itinerary days, each with itinerary items, and one budget. " +
    "An itinerary item copies the activity's name, fee and location, so a saved trip stays stable even if the catalogue changes later. The service classes carry the behaviour."),
});

// ================================================= 22–26. Data Dictionary

const DD_HEAD = ["Field name", "Datatype", "Constrains", "Description"];
const DD_COLS = [1.8, 2.5, 4.2, CW - 8.5];
const mono = (t) => ({ text: t, mono: true, bold: true });

{
  const s = content({
    kicker: "Part 4 · Design",
    title: "Data Dictionary — Collections and users",
    compact: true,
    notes: say(udit,
      "The database is MongoDB with four collections. Every document has an ObjectId, createdAt and updatedAt. All money is whole rupees. " +
      "The users collection is small: name, unique lowercase email, a bcrypt password hash that is excluded from every query by default, and a role. " +
      "Below is how the collections relate: a user has many trips, a destination has many activities and many trips, and a trip embeds its itinerary and budget."),
  });

  table(s, DD_HEAD, [
    [mono("name"), "String", "required, 2–60 characters, trimmed", "Display name"],
    [mono("email"), "String", "required, unique, lowercase, valid email", "Login identifier"],
    [mono("passwordHash"), "String", "required, select: false", "bcrypt hash (cost 10); never sent in JSON"],
    [mono("role"), "String", "enum traveler | admin, default traveler", "Authorisation role"],
  ], MX, 1.55, DD_COLS, { fontSize: 12, rowH: 0.38 });

  // relationship strip
  const y = 4.2, bh = 0.95;
  text(s, "HOW THE FOUR COLLECTIONS RELATE", MX, 3.78, 6, 0.25, { fontSize: 10, bold: true, color: C.muted, charSpacing: 3 });
  const boxes = [["users", ""], ["trips", "embeds itinerary[ ] + budget"], ["destinations", ""], ["activities", ""]];
  const bw = 2.35, bg = (CW - bw * 4) / 3;
  boxes.forEach(([n, sub], i) => {
    const x = MX + i * (bw + bg);
    panel(pres, s, x, y, bw, bh, i === 1 ? { fill: C.ink, line: null } : {});
    text(s, n, x, y + (sub ? 0.12 : 0), bw, sub ? 0.45 : bh, { fontFace: MONO, bold: true, fontSize: 15, align: "center", valign: "middle", color: i === 1 ? C.onDark : C.ink });
    if (sub) text(s, sub, x, y + 0.52, bw, 0.3, { fontSize: 10.5, align: "center", color: C.onDarkMuted });
  });
  const links = [["1", "many", false], ["many", "1", true], ["1", "many", false]];
  links.forEach(([a, b], i) => {
    const x1 = MX + bw + i * (bw + bg), x2 = x1 + bg;
    s.addShape(pres.shapes.LINE, { x: x1 + 0.08, y: y + bh / 2, w: bg - 0.16, h: 0, line: { color: C.accent, width: 1.5 } });
    text(s, a, x1 + 0.1, y + bh / 2 - 0.32, 0.6, 0.25, { fontSize: 11, color: C.accent, bold: true });
    text(s, b, x2 - 0.7, y + bh / 2 - 0.32, 0.6, 0.25, { fontSize: 11, color: C.accent, bold: true, align: "right" });
  });

  const ny = 5.6, nw = (CW - 0.6) / 3;
  [
    ["Common fields", "_id: ObjectId, createdAt, updatedAt on every collection."],
    ["Money", "INR, stored as integer rupees. No decimals anywhere."],
    ["Indexes", "email unique · slug unique · { destination, name } unique · trips.user indexed."],
  ].forEach(([h, b], i) => {
    const x = MX + i * (nw + 0.3);
    text(s, h, x, ny, nw, 0.3, { fontSize: 13, bold: true });
    text(s, b, x, ny + 0.35, nw, 0.7, { fontSize: 12, color: C.inkSoft });
  });
}

{
  const s = content({
    kicker: "Part 4 · Design",
    title: "Data Dictionary — destinations",
    compact: true,
    notes: say(udit,
      "Destinations is the catalogue. The slug is the URL identifier, for example manali. Category is an enum of seven values and drives the filter. " +
      "The key field is dailyCost: for each tier it holds stay per room per night, and food and transport per person per day. That is exactly what the budget formula reads. " +
      "Twelve destinations are seeded."),
  });
  table(s, DD_HEAD, [
    [mono("name"), "String", "required", "Destination name, e.g. Manali"],
    [mono("slug"), "String", "required, unique, lowercase", "URL identifier, e.g. manali"],
    [mono("state"), "String", "required", "Indian state or union territory"],
    [mono("country"), "String", "default India", "Country"],
    [mono("category"), "String", "enum: hill-station, beach, heritage, spiritual, nature, desert, adventure", "Primary category, used by the filter"],
    [mono("tagline"), "String", "required, ≤ 90 characters", "One-line hook shown on cards"],
    [mono("description"), "String", "required", "Overview of 2–4 sentences"],
    [mono("heroImage"), "String", "required", "/images/destinations/<slug>.jpg"],
    [mono("location"), "{ lat, lng }", "required, Numbers", "City-centre coordinates"],
    [mono("bestSeason"), "String", "required", "e.g. October – February"],
    [mono("idealDays"), "{ min, max }", "required, Numbers", "Suggested trip length"],
    [mono("dailyCost"), "{ economy, standard, luxury } → { stay, food, transport }", "required, integers ≥ 0", "stay per room per night; food, transport per person per day"],
    [mono("rating"), "Number", "0–5", "Editorial rating"],
    [mono("tags"), "[String]", "optional", "Search keywords"],
  ], MX, 1.55, DD_COLS, { fontSize: 11.5, rowH: 0.31, pad: [3, 7, 3, 7] });
}

{
  const s = content({
    kicker: "Part 4 · Design",
    title: "Data Dictionary — activities",
    compact: true,
    notes: say(udit,
      "An activity is a place to visit or a thing to do. It points to its destination and carries everything the itinerary algorithm needs: type for interest matching, real coordinates for distance, " +
      "durationHours for the day capacity, entryFee for the budget, and bestTime for morning or evening ordering. " +
      "Source tells us whether the record came from our seed or from Google. Destination plus name is unique."),
  });
  table(s, DD_HEAD, [
    [mono("destination"), "ObjectId → destinations", "required, indexed", "Parent destination"],
    [mono("name"), "String", "required; unique with destination", "e.g. Solang Valley"],
    [mono("type"), "String", "enum: sightseeing, adventure, culture, nature, spiritual, food, shopping", "Used for interest matching"],
    [mono("description"), "String", "required", "1–2 sentences"],
    [mono("location"), "{ lat, lng }", "required", "Real-world coordinates"],
    [mono("durationHours"), "Number", "required, 0.5–8", "Typical visit time"],
    [mono("entryFee"), "Number", "integer ≥ 0, default 0", "Per person, INR"],
    [mono("rating"), "Number", "0–5", "Feeds the activity score"],
    [mono("bestTime"), "String", "enum: morning, afternoon, evening, any; default any", "Scheduling hint"],
    [mono("source"), "String", "enum: seed, google; default seed", "Where the record came from"],
    [mono("externalId"), "String", "optional", "Google place id when source = google"],
  ], MX, 1.55, DD_COLS, { fontSize: 12, rowH: 0.37 });
}

{
  const s = content({
    kicker: "Part 4 · Design",
    title: "Data Dictionary — trips",
    compact: true,
    notes: say(udit,
      "A trip belongs to one user and one destination. The first block is the plan input exactly as the traveller entered it, with the same limits as the form: one to fourteen days, one to twelve travellers. " +
      "Itinerary and budget are embedded, not referenced, so one read returns the whole trip. Status and notes are the only fields the user edits after saving."),
  });
  table(s, DD_HEAD, [
    [mono("user"), "ObjectId → users", "required, indexed", "Owner of the trip"],
    [mono("destination"), "ObjectId → destinations", "required", "Planned destination"],
    [mono("title"), "String", "required, ≤ 80 characters", "Default: \"<days> days in <destination>\""],
    [mono("startDate"), "Date", "required", "First day of the trip"],
    [mono("endDate"), "Date", "required, ≥ startDate", "Last day of the trip"],
    [mono("days"), "Number", "1–14", "Inclusive day count"],
    [mono("travelers"), "Number", "1–12", "Group size"],
    [mono("budgetTier"), "String", "enum: economy, standard, luxury", "Cost tier used for the estimate"],
    [mono("interests"), "[String]", "subset of activity type enum", "Boosts matching activities"],
    [mono("pace"), "String", "enum: relaxed, balanced, packed; default balanced", "Hours of sightseeing per day"],
    [mono("itinerary"), "[ItineraryDay]", "embedded", "Generated day-wise plan"],
    [mono("budget"), "Budget", "embedded", "Generated cost estimate"],
    [mono("status"), "String", "enum: planned, completed, cancelled; default planned", "Trip state"],
    [mono("notes"), "String", "≤ 1000 characters, default \"\"", "Traveller's own notes"],
  ], MX, 1.55, DD_COLS, { fontSize: 11.5, rowH: 0.31, pad: [3, 7, 3, 7] });
}

{
  const s = content({
    kicker: "Part 4 · Design",
    title: "Data Dictionary — Structures Embedded in a Trip",
    compact: true,
    notes: say(udit,
      "Three embedded structures. ItineraryDay is one day with its items and totals. ItineraryItem is a snapshot of an activity with its start and end time and the travel from the previous stop. " +
      "Budget stores rooms, nights, the four-part breakdown, total and per-person. Because these are snapshots, a saved trip reads the same even if we later edit the catalogue."),
  });
  const head = ["Field", "Type", "Description"];
  const gap = 0.35, lw = (CW - gap) / 2, cols = [1.75, 1.45, lw - 3.2];
  const o = { fontSize: 11.5, rowH: 0.3, pad: [3, 6, 3, 6] };

  text(s, "ItineraryDay", MX, 1.45, lw, 0.3, { fontFace: SERIF, fontSize: 16 });
  table(s, head, [
    [mono("day"), "Number", "Day number, from 1"],
    [mono("date"), "Date", "Calendar date"],
    [mono("items"), "[ItineraryItem]", "Ordered stops"],
    [mono("totalVisitHours"), "Number", "Sum of visit durations"],
    [mono("totalTravelKm"), "Number", "Sum of leg distances"],
    [mono("note"), "String", "e.g. free-day message"],
  ], MX, 1.8, cols, o);

  text(s, "Budget", MX, 4.05, lw, 0.3, { fontFace: SERIF, fontSize: 16 });
  table(s, head, [
    [mono("tier"), "String", "economy | standard | luxury"],
    [mono("currency"), "String", "Always \"INR\""],
    [mono("rooms, nights"), "Number", "Rooms and nights used for stay"],
    [mono("breakdown"), "Object", "stay, food, transport, activities"],
    [mono("total"), "Number", "Sum of the breakdown"],
    [mono("perPerson"), "Number", "round(total / travelers)"],
  ], MX, 4.4, cols, o);

  const rx = MX + lw + gap;
  text(s, "ItineraryItem  (snapshot of an activity)", rx, 1.45, lw, 0.3, { fontFace: SERIF, fontSize: 16 });
  table(s, head, [
    [mono("activity"), "ObjectId", "Source activity"],
    [mono("name"), "String", "Copied activity name"],
    [mono("type"), "String", "Copied activity type"],
    [mono("location"), "{ lat, lng }", "Copied coordinates"],
    [mono("startTime"), "String HH:mm", "Scheduled start"],
    [mono("endTime"), "String HH:mm", "Scheduled end"],
    [mono("durationHours"), "Number", "Visit time"],
    [mono("entryFee"), "Number", "Per person, INR"],
    [mono("travelKmFromPrev"), "Number", "Km from previous stop"],
    [mono("travelMinutesFromPrev"), "Number", "Minutes from previous stop"],
  ], rx, 1.8, [2.3, 1.35, lw - 3.65], o);
}

// ============================================ 27. Implementation Status

{
  const all = status.groups.flatMap((g) => g.modules);
  const done = all.filter((m) => m.status === "done").length;
  const pct = Math.round((done / all.length) * 100);

  const s = content({
    kicker: "Part 5 · Progress",
    title: "Implementation Status",
    notes: say(hardik,
      `${done} of ${all.length} planned modules are complete, about ${pct} percent, which is above the 50 percent asked for Presentation-1. ` +
      "The whole main flow works end to end: browse, plan, preview, login, save, manage. " +
      "What remains is listed as in progress; mention each in one line and say it is planned for the next phase. Then hand over to the demo."),
  });

  const sw = 2.55;
  panel(pres, s, MX, 1.95, sw, 4.55, { fill: C.ink, line: null });
  text(s, `${pct}%`, MX + 0.3, 2.25, sw - 0.6, 0.95, { fontFace: SERIF, fontSize: 54, color: C.onDark, valign: "middle" });
  text(s, `${done} of ${all.length} modules complete`, MX + 0.3, 3.3, sw - 0.6, 0.6, { fontSize: 13.5, color: C.onDark });
  text(s, "Main flow works end to end: browse → plan → preview → login → save → manage.", MX + 0.3, 4.35, sw - 0.6, 1.9, { fontSize: 12, color: C.onDarkMuted });

  const gx0 = MX + sw + 0.4, gGap = 0.4, gw = (W - MX - gx0 - gGap) / 2, rh = 0.49;
  status.groups.forEach((g, gi) => {
    const x = gx0 + gi * (gw + gGap);
    text(s, g.name, x, 1.9, gw, 0.4, { fontFace: SERIF, fontSize: 17 });
    g.modules.forEach((m, i) => {
      const y = 2.5 + i * rh;
      const isDone = m.status === "done";
      s.addShape(pres.shapes.LINE, { x, y: y + rh, w: gw, h: 0, line: { color: C.line, width: 0.75 } });
      text(s, m.name, x, y, gw - 1.2, rh, { fontSize: 11.5, valign: "middle" });
      panel(pres, s, x + gw - 1.08, y + 0.11, 1.08, 0.27, {
        radius: 0.13, fill: isDone ? C.ink : C.bg, line: isDone ? null : C.accent, lineW: 1,
      });
      text(s, isDone ? "DONE" : "IN PROGRESS", x + gw - 1.08, y + 0.11, 1.08, 0.27, {
        fontSize: 8.5, bold: true, charSpacing: 1, align: "center", valign: "middle", color: isDone ? C.onDark : C.accent,
      });
    });
  });
}

// ======================================================= 28. Demo flow

{
  const s = content({
    kicker: "Part 5 · Progress",
    title: "Implementation Status — Demo Flow",
    notes: say(hardik,
      `${hardik} drives the browser, ${udit} explains what the server does at each step. Keep the stack running before the presentation starts. ` +
      "Open Manali, plan four days for two travellers on the Standard tier with Adventure and Nature. Walk through one day of the itinerary and the budget breakdown. " +
      "Press Save while logged out to show the login detour and the restored plan. Finish in My Trips: mark completed, add a note, delete."),
  });

  const steps = [
    ["Start the stack", "docker compose up -d, npm run seed, then npm run dev for server and client."],
    ["Browse", "Home → Destinations → open Manali."],
    ["Plan", "Plan a trip here: 4 days, 2 travellers, Standard, Adventure + Nature → Generate plan."],
    ["Read the plan", "Day-wise itinerary with timings, then the budget breakdown."],
    ["Save", "Save → asked to log in → register → plan restored → Save → Trip Details."],
    ["Manage", "My Trips shows the trip: mark completed, add notes, delete."],
  ];
  const gap = 0.3, cw = (CW - gap * 2) / 3, ch = 1.75, rows = [2.3, 4.75];
  // route: along row 1, down the right side, back along row 2 is drawn as two straight legs
  route(pres, s, MX + 0.23, rows[0], MX + 2 * (cw + gap) + 0.23, rows[0]);
  route(pres, s, MX + 0.23, rows[1], MX + 2 * (cw + gap) + 0.23, rows[1]);
  steps.forEach(([h, b], i) => {
    const r = Math.floor(i / 3), x = MX + (i % 3) * (cw + gap), y = rows[r];
    stop(pres, s, x + 0.23, y, i + 1);
    panel(pres, s, x, y + 0.4, cw, ch);
    text(s, h, x + 0.28, y + 0.58, cw - 0.56, 0.4, { fontFace: SERIF, fontSize: 18 });
    text(s, b, x + 0.28, y + 1.05, cw - 0.56, ch - 0.75, { fontSize: 12.5, color: C.inkSoft });
  });
}

// ======================================================= 29. Thank you

{
  const s = L.darkSlide(pres, state, {
    title: "Thank You — Questions",
    notes: say("All",
      `Thank the panel and our guide. Questions on API, database and algorithms go to ${udit}; on screens and user flow to ${hardik}; on UML and documentation to ${vraj}. ` +
      "If asked what comes next: finish the in-progress modules, complete the test suite and the project document."),
  });
  text(s, "PRESENTATION-1  ·  " + team.presentationDate.toUpperCase(), MX, 0.7, CW, 0.3, { fontSize: 11, bold: true, color: ACCENT_ON_DARK, charSpacing: 3 });
  text(s, "Thank you", MX, 1.9, CW, 1.3, { fontFace: SERIF, fontSize: 66, color: C.onDark, valign: "middle" });
  text(s, "We would be glad to take your questions and suggestions.", MX, 3.3, 9, 0.5, { fontSize: 18, color: C.onDarkMuted });

  const y = 4.75;
  team.members.forEach((m, i) => {
    const x = MX + i * 3.2;
    text(s, rich(m.name, { fontFace: SERIF, fontSize: 16, color: C.onDark }), x, y, 3.0, 0.35, {});
    text(s, m.role, x, y + 0.38, 3.0, 0.3, { fontSize: 11.5, color: C.onDarkMuted });
  });
  text(s, richLines([
    { text: "GUIDED BY", fontSize: 10, bold: true, color: C.onDarkMuted, charSpacing: 3 },
    { text: team.guide, fontSize: 14, color: C.onDark },
  ]), MX + 9.75, y, W - MX - (MX + 9.75), 0.7, { lineSpacingMultiple: 1.2 });
  text(s, `${team.projectTitle}  ·  ${team.institute}`, MX, 6.8, CW, 0.3, { fontSize: 11.5, color: C.onDarkMuted });
}

// ================================================================ write

pres.writeFile({ fileName: OUT }).then(() => {
  console.log(`Wrote ${path.relative(process.cwd(), OUT)} — ${state.n} slides`);
  state.titles.forEach((t, i) => console.log(`${String(i + 1).padStart(2)}  ${t}`));
  const pending = state.diagrams.filter((d) => !d.exists).map((d) => d.file);
  console.log(`Diagrams embedded: ${state.diagrams.filter((d) => d.exists).map((d) => d.file).join(", ") || "none"}`);
  console.log(`Diagrams pending:  ${pending.join(", ") || "none"}`);
  const flags = JSON.stringify(team).match(/\[\[[^\]]+\]\]/g) || [];
  if (flags.length) console.log(`team.json still has ${flags.length} placeholder(s): ${[...new Set(flags)].join(" ")}`);
});
