/* christophdoering.de — eine Bibliothek (Lenis), der Rest ist CSS und ein paar Zeilen hier. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* E-Mail erst im Browser zusammensetzen */
const mail = $(".email-link");
if (mail) {
  const a = new TextDecoder().decode(Uint8Array.of(99,111,110,116,97,99,116,64,107,98,100,107,102,46,100,101));
  mail.textContent = a;
  mail.href = "mailto:" + a;
}

/* Weiches Scrollen */
if (!reduce && typeof Lenis !== "undefined") {
  const lenis = new Lenis({ autoRaf: true });
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); lenis.scrollTo(a.getAttribute("href")); })
  );
}

/* Cursor */
const cursor = $(".cursor");
if (fine && cursor) {
  addEventListener("pointermove", (e) => {
    cursor.classList.add("is-on");
    cursor.style.setProperty("--x", e.clientX + "px");
    cursor.style.setProperty("--y", e.clientY + "px");
  });
  document.addEventListener("pointerover", (e) => cursor.classList.toggle("is-link", !!e.target.closest("a, .handle")));
}

/* Intro: einmal pro Sitzung, Ablauf komplett in CSS */
const intro = $(".intro");
if (intro && (reduce || sessionStorage.getItem("intro"))) intro.remove();
else intro?.addEventListener("animationend", (e) => {
  if (e.animationName === "intro-out") { intro.remove(); sessionStorage.setItem("intro", "1"); }
});

/* Lesetext: Wörter, Wortanfang in <b>, Aktivierung nach Scrollfortschritt */
const reading = $(".reading");
if (reading) {
  const p = $("p", reading);
  p.innerHTML = p.textContent.split(/(\s+)/).map((t) => {
    if (!t.trim()) return t;
    const n = t.replace(/[^\p{L}\p{N}]/gu, "").length;
    const k = n <= 3 ? 1 : Math.ceil(n * 0.42);
    return `<span class="word"><b>${t.slice(0, k)}</b>${t.slice(k)}</span>`;
  }).join("");
  const words = $$(".word", p);
  const update = () => {
    const r = reading.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    const on = Math.floor(t * (words.length + 2));
    words.forEach((w, i) => w.classList.toggle("is-on", i < on));
  };
  if (!reduce) { addEventListener("scroll", update, { passive: true }); update(); }
  else words.forEach((w) => w.classList.add("is-on"));
}

/* Lauftexte: Inhalt verdoppeln für die nahtlose Schleife */
if (!reduce) $$(".track").forEach((track) => {
  const copy = track.cloneNode(true);
  copy.querySelectorAll("a").forEach((a) => { a.tabIndex = -1; a.setAttribute("aria-hidden", "true"); });
  track.append(...copy.childNodes);
});

/* Raster im Hero: leise Welle über die Fläche, darin ein großer ↓ aus denselben Punkten.
   Nur die Punkte des Pfeils wachsen zur Maus hin (nach Subframe „Halftone sculpture“). */
const canvas = $(".hero canvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  const ROWS = [ // Pixelmaske des ↓, 9 Spalten breit
    "...###...", "...###...", "...###...", "...###...",
    "#########", ".#######.", "..#####..", "...###...", "....#....",
  ];
  const STEP = 18, m = { x: -1e4, y: -1e4 };
  let w, h, k, ax, ay, raf, t0 = performance.now();
  const inArrow = (gx, gy) => {
    const cx = Math.floor((gx - ax) / k), cy = Math.floor((gy - ay) / k);
    return ROWS[cy]?.[cx] === "#";
  };
  const draw = (now) => {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas).color;
    for (let gy = 0, y = STEP / 2; y < h; gy++, y += STEP)
      for (let gx = 0, x = STEP / 2; x < w; gx++, x += STEP) {
        let r;
        if (inArrow(gx, gy)) {
          const wave = reduce ? 1 : 0.7 + 0.3 * Math.sin(t * 2.2 - gy * 0.35); // läuft nach unten
          const near = Math.exp(-((x - m.x) ** 2 + (y - m.y) ** 2) / 40000);
          r = STEP * 0.2 * wave + near * 6;
        } else {
          const wave = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(x * 0.01 + y * 0.013 + t);
          r = 1.2 * (0.4 + 0.6 * wave);
        }
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    if (!reduce) raf = requestAnimationFrame(draw);
  };
  const size = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Pfeil: jede Maskenzelle ist k×k Rasterpunkte, mittig im Raum über der Headline
    const top = 90, bottom = $(".hero h1").offsetTop;
    k = Math.max(1, Math.min(Math.round((bottom - top) * 1.05 / ROWS.length / STEP), Math.floor(w * 0.1 / STEP)));
    ax = Math.round(w / 2 / STEP) - Math.floor(9 * k / 2);
    ay = Math.round((top + bottom) / 2 / STEP) - Math.floor(ROWS.length * k / 2);
    if (reduce) draw(performance.now());
  };
  size();
  document.fonts.ready.then(size); // Headline-Position erst nach dem Laden der Schrift endgültig
  addEventListener("resize", size);
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const b = canvas.getBoundingClientRect(); m.x = e.clientX - b.left; m.y = e.clientY - b.top;
  });
  canvas.parentElement.addEventListener("pointerleave", () => { m.x = m.y = -1e4; });
  if (!reduce) new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    if (e.isIntersecting) raf = requestAnimationFrame(draw);
  }).observe(canvas);
}

/* Bezier mit Griffen: zwei Kontrollpunkte formen die Kurve (nach Subframe „Vector handles“) */
const svg = $(".skills .bezier");
if (svg) {
  const pts = { a: [60, 340], c1: [120, 60], c2: [280, 340], b: [340, 60] };
  const path = $(".path", svg), arms = $$(".arm", svg), handles = $$(".handle", svg);
  const render = () => {
    const { a, c1, c2, b } = pts;
    path.setAttribute("d", `M${a} C${c1} ${c2} ${b}`);
    arms[0].setAttribute("x2", c1[0]); arms[0].setAttribute("y2", c1[1]);
    arms[1].setAttribute("x2", c2[0]); arms[1].setAttribute("y2", c2[1]);
    handles.forEach((hd) => { const p = pts[hd.dataset.p]; hd.setAttribute("cx", p[0]); hd.setAttribute("cy", p[1]); });
  };
  const toSvg = (e) => {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [Math.round(pt.x), Math.round(pt.y)];
  };
  handles.forEach((hd) => {
    hd.addEventListener("pointerdown", (e) => { hd.setPointerCapture(e.pointerId); hd.classList.add("drag"); });
    hd.addEventListener("pointermove", (e) => { if (hd.hasPointerCapture(e.pointerId)) { pts[hd.dataset.p] = toSvg(e); render(); } });
    hd.addEventListener("pointerup", (e) => hd.releasePointerCapture(e.pointerId));
    hd.addEventListener("keydown", (e) => {
      const d = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
      if (d) { e.preventDefault(); const p = pts[hd.dataset.p]; pts[hd.dataset.p] = [p[0] + d[0], p[1] + d[1]]; render(); }
    });
  });
  render();
}

/* Zeichenraster: Punkte verbinden, Klick auf eine Ecke macht einen Bogen, Papierkorb löscht */
const grid = $(".skills .grid");
if (grid) {
  const N = 5, STEP = 27, ns = "http://www.w3.org/2000/svg";
  const el = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++)
    grid.append(el("rect", { class: "cell", x: x * STEP, y: y * STEP, width: STEP, height: STEP }));
  const stroke = el("path", { class: "stroke" });
  grid.append(stroke);
  const pts = []; // { x, y, arc }
  const dots = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = el("circle", { class: "dot", cx: x * STEP, cy: y * STEP });
    d.addEventListener("click", () => {
      const i = pts.findIndex((p) => p.x === x && p.y === y);
      if (i < 0) pts.push({ x, y, arc: false });
      else if (i > 0 && i < pts.length - 1) pts[i].arc = !pts[i].arc;
      render();
    });
    dots.push(d); grid.append(d);
  }
  const clear = $(".skills .clear");
  clear.addEventListener("click", () => { pts.length = 0; render(); });
  const P = (p) => `${p.x * STEP} ${p.y * STEP}`;
  const render = () => {
    let d = "";
    pts.forEach((p, i) => {
      if (i === 0) { d = `M${P(p)}`; return; }
      const prev = pts[i - 1], next = pts[i + 1];
      if (!p.arc || !next) { d += ` L${P(p)}`; return; }
      // Ecke durch Bogen ersetzen: Radius = kürzerer Schenkel
      const a = { x: prev.x - p.x, y: prev.y - p.y }, b = { x: next.x - p.x, y: next.y - p.y };
      const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
      // Teilen sich zwei Bögen eine Strecke, bekommt jeder höchstens die Hälfte
      const r = Math.min(prev.arc && i > 1 ? la / 2 : la, next.arc && pts[i + 2] ? lb / 2 : lb);
      const theta = Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (la * lb))));
      if (theta > 3.1) { d += ` L${P(p)}`; return; } // fast gerade: kein Bogen
      const p1 = { x: p.x + a.x / la * r, y: p.y + a.y / la * r }, p2 = { x: p.x + b.x / lb * r, y: p.y + b.y / lb * r };
      const ra = r * Math.tan(theta / 2); // Tangentenradius, bei 90° gleich r
      // Mittelpunkt liegt auf der Winkelhalbierenden; daraus die Drehrichtung
      const bx = a.x / la + b.x / lb, by = a.y / la + b.y / lb, lbis = Math.hypot(bx, by);
      const c = { x: p.x + bx / lbis * ra / Math.sin(theta / 2), y: p.y + by / lbis * ra / Math.sin(theta / 2) };
      const sweep = (p1.x - c.x) * (p2.y - c.y) - (p1.y - c.y) * (p2.x - c.x) > 0 ? 1 : 0;
      d += ` L${P(p1)} A${ra * STEP} ${ra * STEP} 0 0 ${sweep} ${P(p2)}`;
    });
    stroke.setAttribute("d", d);
    dots.forEach((dot, k) => {
      const p = pts.find((q) => q.x === k % N && q.y === (k / N | 0));
      dot.classList.toggle("on", !!p); dot.classList.toggle("arc", !!p?.arc);
    });
    clear.hidden = !pts.length;
  };
}

/* Leistungen: Wörter als Tabs, genau ein Beispiel sichtbar */
$$(".skills [role=tab]").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".skills [role=tab]").forEach((t) => t.setAttribute("aria-selected", t === tab));
    $$(".skills .panel").forEach((p) => (p.hidden = p.id !== tab.getAttribute("aria-controls")));
  })
);
