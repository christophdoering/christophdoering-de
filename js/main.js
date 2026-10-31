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
  document.addEventListener("pointerover", (e) => cursor.classList.toggle("is-link", !!e.target.closest("a, button, label, input, select, .handle, .dot")));
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
  const hero = canvas.closest(".hero");
  const STEP = 18, m = { x: -1e4, y: -1e4 };
  let w, h, k, cx, ay, raf, t0 = performance.now();
  // Pfeil wie das Zeichen ↓: Schaft k+2 breit, Spitze aus zwei Diagonalen gleicher Stärke, Arme 4k lang,
  // darunter drei Zeilen, die auf einen Punkt zulaufen (drei, drei, einer)
  const inArrow = (gx, gy) => {
    const u = Math.abs(gx - cx), v = gy - ay;
    if (v < 0 || v > 9 * k + 3) return false;
    if (v > 9 * k) return u <= Math.min(1, 9 * k + 2 - v);
    return u <= k / 2 + 1.01 || (v >= 5 * k && Math.abs(u - (9 * k - v)) <= 0.71 * k);
  };
  const draw = (now) => {
    const t = (now - t0) / 1000;
    // Scrollfortschritt über eine Bildschirmhöhe: Punkte schrumpfen von der untersten Reihe nach oben weg.
    // Bei der Hälfte löst sich die Bühne, die nächste Sektion kommt ins Bild, der Rest wandert mit hinaus.
    const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / innerHeight));
    const rows = h / STEP, soft = 0.3;
    ctx.clearRect(0, 0, w, h);
    if (p >= 1) { if (!reduce) raf = requestAnimationFrame(draw); return; }
    ctx.fillStyle = getComputedStyle(canvas).color;
    for (let gy = 0, y = STEP / 2; y < h; gy++, y += STEP) {
      const keep = 1 - Math.min(1, Math.max(0, (p * (1 + soft) - (1 - gy / rows)) / soft));
      if (keep <= 0) continue;
      for (let gx = 0, x = STEP / 2; x < w; gx++, x += STEP) {
        let r;
        if (inArrow(gx, gy)) {
          // Ein Puls, so lang wie der Pfeil, läuft nach unten durch
          const p = reduce ? 0.5 : (1 + Math.sin(t * 2.4 - (gy - ay) / (9 * k) * 6.3)) / 2;
          const near = Math.exp(-((x - m.x) ** 2 + (y - m.y) ** 2) / 40000);
          r = STEP * (0.1 + 0.2 * p * p * p) + near * 6; // in Ruhe kaum mehr als das Raster
        } else {
          const wave = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(x * 0.01 + y * 0.013 + t);
          r = 1.2 * (0.4 + 0.6 * wave);
        }
        ctx.beginPath(); ctx.arc(x, y, r * keep, 0, 7); ctx.fill();
      }
    }
    if (!reduce) raf = requestAnimationFrame(draw);
  };
  const size = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Größe nur aus dem Viewport, der Pfeil darf die Headline berühren
    const top = 90, bottom = h - 40, rows = (bottom - top) / STEP;
    k = Math.max(1, Math.min(Math.round((rows - 3) / 9), Math.floor(w * 0.1 / STEP)));
    cx = Math.round(w / 2 / STEP);
    ay = Math.round(top / STEP) + Math.floor((rows - 9 * k - 3) / 2);
    if (reduce) draw(performance.now());
  };
  size();
  addEventListener("resize", size);
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const b = canvas.getBoundingClientRect(); m.x = e.clientX - b.left; m.y = e.clientY - b.top;
  });
  canvas.parentElement.addEventListener("pointerleave", () => { m.x = m.y = -1e4; });
  if (reduce) addEventListener("scroll", () => draw(performance.now()), { passive: true });
  else new IntersectionObserver(([e]) => {
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

/* Zeichenraster: Punkte verbinden, Klick auf eine Ecke macht einen Bogen, Klick auf den Anfang schließt den Pfad, Papierkorb löscht */
const grid = $(".skills .grid");
if (grid) {
  const N = 5, STEP = 27, ns = "http://www.w3.org/2000/svg";
  const el = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++)
    grid.append(el("rect", { class: "cell", x: x * STEP, y: y * STEP, width: STEP, height: STEP }));
  const stroke = el("path", { class: "stroke" });
  grid.append(stroke);
  const paths = [[]]; // Pfade aus { x, y, arc }; der letzte ist offen, geschlossene tragen .closed
  const dots = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = el("circle", { class: "dot", cx: x * STEP, cy: y * STEP, r: 2.2 }); // r als Attribut: Safari kennt r nicht als CSS
    d.addEventListener("click", () => {
      const cur = paths.at(-1);
      const path = paths.find((pp) => pp.some((p) => p.x === x && p.y === y));
      const i = path?.findIndex((p) => p.x === x && p.y === y);
      if (!path) cur.push({ x, y, arc: false });
      else if (path === cur && i === 0 && cur.length > 2) { cur.closed = true; paths.push([]); }
      else if (path.closed || (i > 0 && i < path.length - 1)) path[i].arc = !path[i].arc;
      render();
    });
    dots.push(d); grid.append(d);
  }
  const clear = $(".skills .clear");
  clear.addEventListener("click", () => { paths.splice(0, paths.length, []); render(); });
  const P = (p) => `${p.x * STEP} ${p.y * STEP}`;
  // Ein Eckpunkt als Pfadstück: Linie zur Ecke oder, bei Bogen, Linie zum Tangentenpunkt und Bogen
  const corner = (pts, i) => {
    const n = pts.length, p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    if (!p.arc) return { d: ` L${P(p)}`, out: p };
    const a = { x: prev.x - p.x, y: prev.y - p.y }, b = { x: next.x - p.x, y: next.y - p.y };
    const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
    // Teilen sich zwei Bögen eine Strecke, bekommt jeder höchstens die Hälfte
    const r = Math.min(prev.arc ? la / 2 : la, next.arc ? lb / 2 : lb);
    const theta = Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (la * lb))));
    if (theta > 3.1) return { d: ` L${P(p)}`, out: p }; // fast gerade: kein Bogen
    const p1 = { x: p.x + a.x / la * r, y: p.y + a.y / la * r }, p2 = { x: p.x + b.x / lb * r, y: p.y + b.y / lb * r };
    const ra = r * Math.tan(theta / 2); // Tangentenradius, bei 90° gleich r
    // Mittelpunkt liegt auf der Winkelhalbierenden; daraus die Drehrichtung
    const bx = a.x / la + b.x / lb, by = a.y / la + b.y / lb, lbis = Math.hypot(bx, by);
    const c = { x: p.x + bx / lbis * ra / Math.sin(theta / 2), y: p.y + by / lbis * ra / Math.sin(theta / 2) };
    const sweep = (p1.x - c.x) * (p2.y - c.y) - (p1.y - c.y) * (p2.x - c.x) > 0 ? 1 : 0;
    return { d: ` L${P(p1)} A${ra * STEP} ${ra * STEP} 0 0 ${sweep} ${P(p2)}`, out: p2 };
  };
  const render = () => {
    const d = paths.map((pts) => {
      if (!pts.length) return "";
      const n = pts.length, inner = Array.from({ length: n - 2 }, (_, k) => corner(pts, k + 1).d).join("");
      if (!pts.closed) return `M${P(pts[0])}${inner}${n > 1 ? ` L${P(pts[n - 1])}` : ""}`;
      // Geschlossen: am Ausgang der ersten Ecke beginnen, einmal herum, zuletzt die erste Ecke selbst
      return `M${P(corner(pts, 0).out)}${inner}${corner(pts, n - 1).d}${corner(pts, 0).d} Z`;
    }).join("");
    stroke.setAttribute("d", d);
    dots.forEach((dot, k) => {
      const p = paths.flat().find((q) => q.x === k % N && q.y === (k / N | 0));
      dot.classList.toggle("on", !!p); dot.classList.toggle("arc", !!p?.arc);
    });
    clear.hidden = !paths[0].length;
  };
}

/* Scroll-Timelines: nativ sofort freischalten, sonst Polyfill (flackr/scroll-timeline) laden und warten,
   bis er das Stylesheet umgeschrieben hat (neuer href → zweites load-Ereignis am <link>) */
const on = () => document.documentElement.classList.add("st");
if (CSS.supports("animation-timeline: view()")) on();
else if (!reduce && $(".rise")) {
  $('link[href^="css/style.css"]').addEventListener("load", on, { once: true });
  document.head.append(Object.assign(document.createElement("script"), { src: "https://cdn.jsdelivr.net/npm/scroll-timeline-polyfill@1.1.0/dist/scroll-timeline.js" }));
}

/* Leistungen: Wörter als Tabs, genau ein Beispiel sichtbar */
const selectTab = (tab) => {
  $$(".skills [role=tab]").forEach((t) => t.setAttribute("aria-selected", t === tab));
  $$(".skills .panel").forEach((p) => (p.hidden = p.id !== tab.getAttribute("aria-controls")));
};
$$(".skills [role=tab]").forEach((tab) => tab.addEventListener("click", () => {
  selectTab(tab);
  if (tab.dataset.mode) { ui.mode.checked = tab.dataset.mode === "ui"; ui.mode.dispatchEvent(new Event("input", { bubbles: true })); }
}));

/* Filterleiste: Schalter Web/UI folgt den Tabs und umgekehrt, Doppelschieber färben ihren Balken */
const ui = $(".skills .ui");
if (ui) {
  const fill = (pill) => {
    const [lo, hi] = $$("input", pill), outs = $$("output", pill);
    if (+lo.value > +hi.value) [lo.value, hi.value] = [hi.value, lo.value];
    const pct = (i) => `${((i.value - i.min) / (i.max - i.min)) * 100}%`;
    pill.style.setProperty("--a", pct(lo)); pill.style.setProperty("--b", pct(hi));
    outs[0].value = lo.value; outs[1].value = hi.value;
  };
  const sync = () => {
    ui.q.placeholder = ui.mode.checked ? "Interfaces durchsuchen" : "Websites durchsuchen";
    const tab = $(`.skills [data-mode="${ui.mode.checked ? "ui" : "web"}"]`);
    if (tab.getAttribute("aria-selected") !== "true") selectTab(tab);
    $$(".pill", ui).forEach(fill);
  };
  ui.addEventListener("input", sync);
  ui.addEventListener("reset", () => requestAnimationFrame(sync));
  ui.addEventListener("submit", (e) => e.preventDefault());
  sync();
}
