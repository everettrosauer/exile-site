/* Exile record chart.
   Percent only, never dollars. Pick a time range, then move across the chart with a mouse,
   a finger or the arrow keys to read any day. The big number is the return since the record began.
   The line under it is the change over the range on screen.

   ExileChart.mount(el, {
     values: [100, 100.4, ...],        one value a day, 100 = the day the record began
     start:  Date.UTC(2027, 0, 3),     the day of values[0]
     ranges: [{key:"1M", label:"1M", days:28, say:"past month"}, ...],
     range:  "1M",                     range shown first
     line:   15,                       optional: draw the Exile line this many percent under the peak
     out:    true                      optional: the record ended at the line, so the last point is drawn red
   }) */
(function(){
  "use strict";
  const MINUS = "−";
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAY = 864e5;
  const K = 140;                                   /* points used while one range morphs into the next */
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pct = (x, d = 1) => (x < 0 ? MINUS : "+") + Math.abs(x).toLocaleString("en-US", {minimumFractionDigits:d, maximumFractionDigits:d}) + "%";
  let uid = 0;

  function mount(el, opt){
    const vals = opt.values, n = vals.length, id = "rc" + (++uid);
    const longRecord = n > 200;
    const dateAt = (i, year) => { const d = new Date(opt.start + i * DAY); return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + (year ? ", " + d.getUTCFullYear() : ""); };
    const since = i => (vals[i] / vals[0] - 1) * 100;

    /* The Exile line trails the highest point so far. */
    let trail = null;
    if (opt.line){ trail = []; let pk = vals[0]; for (const v of vals){ pk = Math.max(pk, v); trail.push(pk * (1 - opt.line / 100)); } }

    el.classList.add("rc");
    el.innerHTML = `
      <div class="rc__head">
        <div>
          <div class="cap">Return since day one</div>
          <div class="rc__val num" data-val></div>
          <div class="rc__chg num"><b data-chg></b> <span data-when></span></div>
        </div>
      </div>
      <div class="rc__plot" tabindex="0" role="slider" aria-label="Record chart. Use the left and right arrow keys to read each day." aria-valuemin="0" aria-valuemax="${n - 1}">
        <svg class="rc__svg" aria-hidden="true" focusable="false">
          <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rc__g0"/><stop offset="1" class="rc__g1"/></linearGradient></defs>
          <line class="rc__base"/>
          <path class="rc__trail"/>
          <path class="rc__area" fill="url(#${id})"/>
          <path class="rc__line"/>
          <line class="rc__cur"/>
          <circle class="rc__end" r="4.5"/>
          <circle class="rc__dot" r="5.5"/>
        </svg>
        <div class="rc__tip num" data-tip aria-hidden="true"></div>
        ${trail ? `<div class="rc__linetag" data-linetag>The line</div>` : ""}
      </div>
      <div class="rc__axis cap" aria-hidden="true"><span data-a0></span><span data-a1></span><span data-a2></span></div>
      <div class="rc__ranges" role="group" aria-label="Time range">
        ${opt.ranges.map(r => `<button type="button" class="rc__range" data-key="${r.key}" aria-pressed="false">${r.label}<span class="sr"> ${r.say}</span></button>`).join("")}
      </div>`;

    const $ = s => el.querySelector(s);
    const plot = $(".rc__plot"), svg = $(".rc__svg");
    const pLine = $(".rc__line"), pArea = $(".rc__area"), pTrail = $(".rc__trail"), base = $(".rc__base");
    const cur = $(".rc__cur"), dot = $(".rc__dot"), end = $(".rc__end"), tip = $("[data-tip]");
    const lineTag = $("[data-linetag]");
    if (opt.out) el.classList.add("rc--out");
    const tVal = $("[data-val]"), tChg = $("[data-chg]"), tWhen = $("[data-when]");
    const buttons = [...el.querySelectorAll(".rc__range")];

    const PAD = {t:16, b:14, l:3, r:9};
    let W = 0, H = 0, range = null, i0 = 0, i1 = n - 1, lo = 0, hi = 1, at = null;
    let shown = null, raf = 0;

    const X = i => PAD.l + (W - PAD.l - PAD.r) * (i1 === i0 ? 1 : (i - i0) / (i1 - i0));
    const Y = v => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - lo) / (hi - lo));

    function frame(key){
      range = opt.ranges.find(r => r.key === key) || opt.ranges[0];
      i1 = n - 1;
      i0 = Math.max(0, i1 - range.days);
      let a = Infinity, b = -Infinity;
      for (let i = i0; i <= i1; i++){ a = Math.min(a, vals[i]); b = Math.max(b, vals[i]); }
      if (trail && i0 === 0) for (let i = i0; i <= i1; i++) a = Math.min(a, trail[i]);
      const pad = Math.max((b - a) * .08, .4);
      lo = a - pad; hi = b + pad;
      buttons.forEach(bn => bn.setAttribute("aria-pressed", bn.dataset.key === range.key));
      el.classList.toggle("rc--down", vals[i1] < vals[i0]);
      $("[data-a0]").textContent = dateAt(i0, longRecord);
      $("[data-a1]").textContent = dateAt(Math.round((i0 + i1) / 2), false);
      $("[data-a2]").textContent = dateAt(i1, longRecord);
    }

    /* The line on screen as K evenly spaced heights, so any two ranges can blend. */
    function sample(){
      const out = new Array(K);
      for (let k = 0; k < K; k++){
        const f = i0 + (i1 - i0) * k / (K - 1), a = Math.floor(f), b = Math.min(i1, a + 1);
        out[k] = Y(vals[a] + (vals[b] - vals[a]) * (f - a));
      }
      return out;
    }
    const pathFrom = ys => ys.map((y, k) => (k ? "L" : "M") + (PAD.l + (W - PAD.l - PAD.r) * k / (K - 1)).toFixed(1) + " " + y.toFixed(1)).join("");
    function exactPath(){
      let d = "";
      for (let i = i0; i <= i1; i++) d += (i > i0 ? "L" : "M") + X(i).toFixed(1) + " " + Y(vals[i]).toFixed(1);
      return d;
    }
    function put(d){
      pLine.setAttribute("d", d);
      pArea.setAttribute("d", d + `L${(W - PAD.r).toFixed(1)} ${H}L${PAD.l} ${H}Z`);
    }
    function statics(){
      const by = Y(vals[i0]);
      base.setAttribute("x1", 0); base.setAttribute("x2", W); base.setAttribute("y1", by); base.setAttribute("y2", by);
      if (trail){
        let d = "";
        for (let i = i0; i <= i1; i++) d += i > i0 ? `H${X(i).toFixed(1)}V${Y(trail[i]).toFixed(1)}` : `M${X(i).toFixed(1)} ${Y(trail[i]).toFixed(1)}`;
        pTrail.setAttribute("d", d);
        const ty = Y(trail[i0]);
        lineTag.style.top = Math.min(H - 20, ty + 5) + "px";
        lineTag.hidden = ty > H - 6;
      }
      end.setAttribute("cx", X(i1)); end.setAttribute("cy", Y(vals[i1]));
    }
    function draw(animate){
      cancelAnimationFrame(raf);
      const target = sample();
      statics();
      if (!animate || still || !shown){ put(exactPath()); shown = target; el.classList.add("is-drawn"); return; }
      const from = shown, t0 = performance.now(), dur = 520;
      el.classList.add("is-drawn");
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        const ys = target.map((y, k) => from[k] + (y - from[k]) * e);
        if (p < 1){ put(pathFrom(ys)); shown = ys; raf = requestAnimationFrame(step); }
        else { put(exactPath()); shown = target; }
      };
      raf = requestAnimationFrame(step);
    }

    function read(i){
      const scrub = i !== null;
      const j = scrub ? i : i1;
      tVal.textContent = pct(since(j));
      const ch = (vals[j] / vals[i0] - 1) * 100;
      tChg.textContent = pct(ch);
      tChg.className = ch < 0 ? "neg" : "pos";
      tWhen.textContent = scrub ? "since " + dateAt(i0, false) : range.say;
      plot.setAttribute("aria-valuenow", j);
      plot.setAttribute("aria-valuetext", `${dateAt(j, true)}. ${pct(since(j))} since day one.`);
      el.classList.toggle("is-scrub", scrub);
      if (!scrub) return;
      const x = X(j), y = Y(vals[j]);
      cur.setAttribute("x1", x); cur.setAttribute("x2", x); cur.setAttribute("y1", 0); cur.setAttribute("y2", H);
      dot.setAttribute("cx", x); dot.setAttribute("cy", y);
      tip.textContent = dateAt(j, longRecord);
      const half = tip.offsetWidth / 2;
      tip.style.left = Math.max(half, Math.min(W - half, x)) + "px";
    }
    function setAt(i){ at = i === null ? null : Math.max(i0, Math.min(i1, i)); read(at); }
    const indexAt = clientX => {
      const r = plot.getBoundingClientRect();
      return Math.round(i0 + (clientX - r.left - PAD.l) / (W - PAD.l - PAD.r) * (i1 - i0));
    };

    function size(animate){
      const w = Math.round(plot.clientWidth);
      if (!w) return;
      W = w; H = opt.height || (w < 460 ? 190 : 250);
      svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      plot.style.height = H + "px";
      if (!animate) shown = null;
      draw(animate);
      read(at);
    }

    plot.addEventListener("pointermove", e => { if (e.pointerType === "mouse" || plot.hasPointerCapture(e.pointerId)) setAt(indexAt(e.clientX)); });
    plot.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse"){ try { plot.setPointerCapture(e.pointerId); } catch (_) {} } setAt(indexAt(e.clientX)); });
    ["pointerup","pointercancel","pointerleave"].forEach(ev => plot.addEventListener(ev, e => { if (ev === "pointerleave" && plot.hasPointerCapture(e.pointerId)) return; setAt(null); }));
    plot.addEventListener("keydown", e => {
      const j = at === null ? i1 : at;
      const big = Math.max(1, Math.round((i1 - i0) / 10));
      const move = {ArrowLeft:-1, ArrowRight:1, PageDown:-big, PageUp:big}[e.key];
      if (move !== undefined){ e.preventDefault(); setAt(j + move); }
      else if (e.key === "Home"){ e.preventDefault(); setAt(i0); }
      else if (e.key === "End"){ e.preventDefault(); setAt(i1); }
      else if (e.key === "Escape" && at !== null){ e.preventDefault(); e.stopPropagation(); setAt(null); }
    });
    plot.addEventListener("blur", () => setAt(null));
    buttons.forEach(bn => bn.addEventListener("click", () => { if (bn.dataset.key === range.key) return; at = null; frame(bn.dataset.key); draw(true); read(null); }));

    frame(opt.range || opt.ranges[0].key);
    /* First paint: start flat at the opening value, then rise into the real line. */
    const w0 = Math.round(plot.clientWidth);
    if (w0 && !still){ W = w0; H = opt.height || (w0 < 460 ? 190 : 250); shown = new Array(K).fill(Y(vals[i0])); }
    size(true);
    if (window.ResizeObserver){
      let first = true;
      new ResizeObserver(() => { if (first){ first = false; return; } if (Math.round(plot.clientWidth) !== W) size(false); }).observe(plot);
    }
    return {setRange(key){ at = null; frame(key); draw(true); read(null); }};
  }

  window.ExileChart = {mount, pct};
})();
