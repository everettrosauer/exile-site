/* Home page. Settings shared by every page (contact, LinkedIn, the profile database) live in config.js. */

/* The sample traders and the year long record live in data.js,
   so this page and the sample report always show the same numbers. Index 100 = the start of the sample month. */
const {LINE, DAY0, TRADERS, YEAR} = window.EXILE_SAMPLE;
const TOP = 5;   /* ranks shown before "show the rest" */

/* ---------- maths ---------- */
function stat(t){
  let peak = t.curve[0], maxdd = 0;
  for (const v of t.curve){ peak = Math.max(peak, v); maxdd = Math.max(maxdd, (1 - v/peak)*100); }
  const last = t.curve[t.curve.length-1];
  const out = t.curve.length < 29;
  return {ret:last-100, maxdd, nowdd:(1-last/peak)*100, out, day:t.curve.length-1, score:(last-100)/Math.max(maxdd,1)};
}
TRADERS.forEach(t => t.s = stat(t));
const ACTIVE = TRADERS.filter(t => !t.s.out).sort((a,b) => b.s.score - a.s.score);
const OUT = TRADERS.filter(t => t.s.out).sort((a,b) => b.s.day - a.s.day);
ACTIVE.forEach((t,i) => t.rank = i+1);
const byHandle = Object.fromEntries(TRADERS.map(t => [t.h, t]));

const M = "−";
const pct = (x,d=1) => (x<0?M:"+") + Math.abs(x).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}) + "%";
const sc = x => (x<0?M:"+") + Math.abs(x).toFixed(2);
const cls = x => x<0 ? "neg" : "pos";
const dayLabel = d => "Jan " + (3+d);
const markets = t => t.mix.map(m => m[0]).join(", ").replace(/^./, c => c.toUpperCase()).replace(/, (.)/g, (m,c) => ", " + c.toLowerCase());
const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- hero: one record, a year in ---------- */
ExileChart.mount(document.getElementById("hero-chart"), {
  values: YEAR, start: DAY0, range: "1Y", years: false,
  ranges: [
    {key:"1W", label:"1W", days:7, say:"past week"},
    {key:"1M", label:"1M", days:28, say:"past month"},
    {key:"3M", label:"3M", days:84, say:"past 3 months"},
    {key:"6M", label:"6M", days:168, say:"past 6 months"},
    {key:"1Y", label:"1Y", days:364, say:"past year"}
  ]
});

/* ---------- board ---------- */
function proRow(t, i, n){
  const s = t.s;
  if (s.out){
    return `<tr class="row row--out" data-h="${t.h}" style="--n:${n}">
      <td class="rank">${M}</td>
      <td><button class="who" type="button" data-h="${t.h}">${t.h}</button><span class="sub">${markets(t)}</span></td>
      <td class="num">${pct(s.ret)}</td>
      <td class="num hide-s">${pct(-s.maxdd)}</td>
      <td class="num" colspan="2"><span class="stamp stamp--out">Exiled</span> <span class="hide-s">&nbsp;${dayLabel(s.day)}</span></td>
    </tr>`;
  }
  const left = Math.max(0, LINE - s.nowdd);
  const fill = Math.min(100, s.nowdd / LINE * 100);
  return `<tr class="row${t.rank > TOP ? " row--more" : ""}" data-h="${t.h}" style="--n:${Math.min(n, TOP + 1)}"${t.rank > TOP ? " hidden" : ""}>
    <td class="rank">${t.rank}</td>
    <td><button class="who" type="button" data-h="${t.h}">${t.h}</button><span class="sub">${markets(t)}</span></td>
    <td class="num big ${cls(s.ret)}">${pct(s.ret)}</td>
    <td class="num hide-s">${pct(-s.maxdd)}</td>
    <td class="num big">${sc(s.score)}</td>
    <td class="num hide-s"><span class="gauge${fill>=75?" gauge--hot":""}" aria-hidden="true"><i style="width:${fill.toFixed(0)}%"></i></span>${left.toFixed(1)} pts</td>
  </tr>`;
}
const cutRow = (span, n) => `<tr class="cut" style="--n:${n}"><td colspan="${span}"><div class="cut__bar"></div><div class="cut__label"><b>The line</b><span>Fall 15% from your peak and you are off the board until next month</span></div></td></tr>`;

/* Top ranks first. One row opens the rest, then the line, then the exiled. */
function renderBoard(){
  const a = ACTIVE.length, rest = a - TOP;
  const more = rest > 0 ? `<tr class="more" style="--n:${TOP}"><td colspan="6"><button type="button" id="board-more">Show ranks ${TOP + 1} to ${a}</button></td></tr>` : "";
  return `<thead><tr><th scope="col"><span class="sr">Rank</span></th><th scope="col">Trader</th><th scope="col" class="num">Return</th><th scope="col" class="num hide-s">Worst drop</th><th scope="col" class="num">Score</th><th scope="col" class="num hide-s">Room to the line</th></tr></thead>
  <tbody>${ACTIVE.map((t,i) => proRow(t,i,i)).join("")}${more}${cutRow(6,TOP+2)}${OUT.map((t,i) => proRow(t,i,TOP+3+i)).join("")}</tbody>`;
}
const table = document.getElementById("board-table");
table.innerHTML = renderBoard();
table.addEventListener("click", e => {
  if (e.target.id !== "board-more") return;
  const rows = [...table.querySelectorAll(".row--more")];
  rows.forEach(r => { r.hidden = false; });
  e.target.closest("tr").remove();
  const first = rows[0] && rows[0].querySelector(".who");
  if (first) first.focus();
});

/* ---------- profile ---------- */
const MONTH_RANGES = [
  {key:"1W", label:"1W", days:7, say:"past week"},
  {key:"2W", label:"2W", days:14, say:"past two weeks"},
  {key:"M", label:"Month", days:999, say:"this month"}
];
const tradeRows = list => list.map(([d,what,mkt,res]) => `<tr><td>${d}</td><td><b>${what}</b><span class="sub">${mkt}</span></td><td class="${cls(res)}">${pct(res, Math.abs(res) < 10 && res % 1 ? 1 : 0)}</td></tr>`).join("");

function profileHTML(h){
  const close = `<div class="profile__bar"><span class="cap">Sample trader</span><button class="btn btn--ghost btn--small" type="button" id="profile-close">Close</button></div>`;
  const fine = `<p class="profile__fine">This is a sample trader made for this page. Not a real person or real results.</p>`;
  const t = byHandle[h];
  const s = t.s;
  const tags = s.out ? `<div class="profile__tags"><span class="stamp stamp--out">Exiled ${dayLabel(s.day)}</span></div>` : "";
  const cap = s.out
    ? `Fell ${s.nowdd.toFixed(1)}% from the peak on ${dayLabel(s.day)} and crossed the line. Off the board for the rest of the month, ${s.ret>=0?"while still up":"down"} ${Math.abs(s.ret).toFixed(1)}% overall.`
    : `The red line trails 15% below the highest point so far. Right now this trader has ${(LINE-s.nowdd).toFixed(1)} points of room. Drag across the chart to read any day.`;
  return `${close}<h2 id="profile-name">${h}</h2>
    ${tags}
    <p class="profile__style">${t.style}</p>
    <p class="profile__since">One month of a sample record. A real record starts the day you link, and nothing is backfilled.</p>
    <dl class="stats">
      <div><dt class="cap">Return</dt><dd class="${cls(s.ret)}">${pct(s.ret)}</dd></div>
      <div><dt class="cap">Worst drop</dt><dd>${pct(-s.maxdd)}</dd></div>
      <div><dt class="cap">${s.out?"Lasted":"Score"}</dt><dd>${s.out ? s.day+" days" : sc(s.score)}</dd></div>
      <div><dt class="cap">Win rate</dt><dd>${t.win}%</dd></div>
    </dl>
    <div class="chart" id="profile-chart"></div>
    <p class="chart__cap">${cap}</p>
    <h3>Where the trades were</h3>
    <div class="mix" aria-hidden="true">${t.mix.map(m => `<i style="width:${m[1]}%"></i>`).join("")}</div>
    <p class="mix__key">${t.mix.map(m => m[0]+" "+m[1]+"%").join(", ")}. ${t.trades} trades this month.</p>
    <h3>Latest verified trades</h3>
    <table class="trades"><tbody>${tradeRows(t.recent)}</tbody></table>${fine}`;
}

const dlg = document.getElementById("profile");
const dlgIn = document.getElementById("profile-in");
let opener = null;
function openProfile(h, from){
  opener = from || null;
  dlgIn.innerHTML = profileHTML(h);
  dlg.scrollTop = 0;
  if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open","");
  const t = byHandle[h], slot = document.getElementById("profile-chart");
  if (slot) ExileChart.mount(slot, {values:t.curve, start:DAY0, ranges:MONTH_RANGES, range:"M", line:LINE, height:230, out:t.s.out});
  document.getElementById("profile-close").focus();
}
function closeProfile(){ if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
dlg.addEventListener("close", () => { if (opener && document.contains(opener)) opener.focus(); });
dlg.addEventListener("click", e => {
  if (e.target.id === "profile-close") return closeProfile();
  const r = dlg.getBoundingClientRect();
  if (e.target === dlg && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) closeProfile();
});
document.addEventListener("click", e => {
  if (dlg.contains(e.target)) return;
  const row = e.target.closest("tr.row");
  if (!row || !byHandle[row.dataset.h]) return;
  openProfile(row.dataset.h, row.querySelector(".who"));
});

/* ---------- photo stack ---------- */
const PHOTOS = [
  {t:"Everett Rosauer", c:"The official one. The other is more accurate."},
  {t:"Hole in one", v:true, c:"Hole 11 at Solmar Golf Links, Cabo San Lucas. 119 yards with a 52 degree wedge, December 29, 2025. The head pro signed the flag."}
];
const prints = [...document.querySelectorAll(".print")];
const capEl = document.getElementById("stack-cap");
let order = prints.map((_,i) => i);   /* order[0] is the print on top */
let turning = false;
function layStack(){
  order.forEach((p,pos) => prints[p].dataset.pos = pos);
  const p = PHOTOS[order[0]];
  capEl.innerHTML = `<b>${p.t}${p.v ? ' <span class="stamp stamp--ok">Verified</span>' : ""}</b>${p.c}`;
  document.getElementById("stack-n").textContent = `Photo ${order[0]+1} of ${PHOTOS.length}`;
}
function turn(dir){
  if (turning) return;
  const top = prints[order[0]];
  const land = () => { order.push(order.shift()); top.classList.remove("is-leaving"); layStack(); turning = false; };
  if (still) return land();
  turning = true;
  top.classList.add("is-leaving");
  setTimeout(land, 280);
}
document.getElementById("stack-next").addEventListener("click", () => turn(1));
document.getElementById("stack-tap").addEventListener("click", () => turn(1));
layStack();

/* ---------- founder email button (the address in the page is the fallback) ---------- */
const founderMail = document.getElementById("founder-mail");
if (window.EXILE.founderEmail){
  founderMail.href = "mailto:" + window.EXILE.founderEmail + "?subject=" + encodeURIComponent("Exile");
  founderMail.textContent = window.EXILE.founderEmail;
}

const FRAMED = window.self !== window.top;   /* true inside a preview frame, where outside requests are blocked */

/* ---------- traders: real profiles, shown once approved ---------- */
(async function(){
  const list = document.getElementById("people"), empty = document.getElementById("people-empty"), sbc = window.EXILE.supabase;
  if (!list || !sbc || FRAMED) return;
  try {
    const r = await fetch(sbc.url + "/rest/v1/profiles?select=handle,display_name,headline,avatar_path&listed=is.true&order=created_at.desc&limit=12", {headers:{apikey: sbc.key}});
    if (!r.ok) return;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return;
    for (const p of rows){
      if (!/^[a-z0-9_]{3,20}$/.test(p.handle)) continue;
      const li = document.createElement("li"), a = document.createElement("a"), av = document.createElement("span"), tx = document.createElement("span"), b = document.createElement("b"), sub = document.createElement("span");
      a.className = "person"; a.href = "/t/" + p.handle; av.className = "avatar";
      if (p.avatar_path && /^[0-9a-f-]{36}\/[0-9]{10,14}\.jpg$/.test(p.avatar_path)){ const img = new Image(); img.alt = ""; img.loading = "lazy"; img.src = sbc.url + "/storage/v1/object/public/avatars/" + p.avatar_path; av.appendChild(img); }
      else av.textContent = String(p.display_name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("");
      b.textContent = p.display_name; sub.textContent = p.headline || "@" + p.handle;   /* text only, never HTML */
      tx.append(b, sub); a.append(av, tx); li.appendChild(a); list.appendChild(li);
    }
    if (list.children.length){ list.hidden = false; empty.hidden = true; }
  } catch (_) { /* the empty note stays */ }
})();
