/* Home page. Settings shared by every page (contact, LinkedIn, waitlist) live in config.js. */

/* The sample traders, the year long record and the Social boards live in data.js,
   so this page and the sample report always show the same numbers. Index 100 = season start. */
const {LINE, DAY0, TRADERS, YEAR, HIGHLIGHTS, SOCIAL} = window.EXILE_SAMPLE;
const FOOT = {
  pro:"Score is season return divided by the worst drop from peak. Risk control counts as much as profit. The bar shows how close each trader is to the line right now.",
  best:"Best single trade posted this week. A Highlights profile shows only the trades its owner chose to post.",
  worst:"Worst single trade posted this week. Traders post these by choice.",
  bold:"Biggest payoff from a long shot this week."
};

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
  values: YEAR, start: DAY0, range: "1Y",
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
  return `<tr class="row" data-h="${t.h}" style="--n:${n}">
    <td class="rank">${t.rank}</td>
    <td><button class="who" type="button" data-h="${t.h}">${t.h}</button><span class="sub">${markets(t)}</span></td>
    <td class="num big ${cls(s.ret)}">${pct(s.ret)}</td>
    <td class="num hide-s">${pct(-s.maxdd)}</td>
    <td class="num big">${sc(s.score)}</td>
    <td class="num hide-s"><span class="gauge${fill>=75?" gauge--hot":""}" aria-hidden="true"><i style="width:${fill.toFixed(0)}%"></i></span>${left.toFixed(1)} pts</td>
  </tr>`;
}
const cutRow = (span, n) => `<tr class="cut" style="--n:${n}"><td colspan="${span}"><div class="cut__bar"></div><div class="cut__label"><b>The line</b><span>Fall 15% from your peak and your season ends</span></div></td></tr>`;

function renderPro(){
  const a = ACTIVE.length;
  return `<thead><tr><th scope="col"><span class="sr">Rank</span></th><th scope="col">Trader</th><th scope="col" class="num">Return</th><th scope="col" class="num hide-s">Worst drop</th><th scope="col" class="num">Score</th><th scope="col" class="num hide-s">Room to the line</th></tr></thead>
  <tbody>${ACTIVE.map((t,i) => proRow(t,i,i)).join("")}${cutRow(6,a)}${OUT.map((t,i) => proRow(t,i,a+1+i)).join("")}</tbody>`;
}
function renderSocial(key){
  const rows = SOCIAL[key].map((r,i) => {
    const [h, what, mkt, res] = r;
    const full = !!byHandle[h];
    return `<tr class="row" data-h="${h}" style="--n:${i}">
      <td class="rank">${i+1}</td>
      <td><button class="who" type="button" data-h="${h}">${h}</button><span class="sub">${what}</span></td>
      <td class="hide-s">${mkt}</td>
      <td class="num big ${cls(res)}">${pct(res,0)}</td>
      <td class="num hide-s"><span class="stamp ${full?"stamp--ok":"stamp--plain"}">${full?"Full record":"Highlights"}</span></td>
    </tr>`;
  }).join("");
  return `<thead><tr><th scope="col"><span class="sr">Rank</span></th><th scope="col">Trader and trade</th><th scope="col" class="hide-s">Market</th><th scope="col" class="num">Result</th><th scope="col" class="num hide-s">Profile</th></tr></thead><tbody>${rows}</tbody>`;
}

const table = document.getElementById("board-table");
const foot = document.getElementById("board-foot");
const panel = document.getElementById("board-panel");
const tabs = [...document.querySelectorAll(".tab")];
function showTab(key, focus){
  tabs.forEach(b => { const on = b.dataset.tab === key; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  table.innerHTML = key === "pro" ? renderPro() : renderSocial(key);
  table.setAttribute("aria-label", key === "pro" ? "Sample Pro board" : "Sample Social board");
  foot.textContent = FOOT[key];
  panel.setAttribute("aria-labelledby", "tab-" + key);
}
tabs.forEach((b,i) => {
  b.addEventListener("click", () => showTab(b.dataset.tab));
  b.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length-1)) % tabs.length];
    showTab(n.dataset.tab, true);
  });
});
showTab("pro");

/* ---------- profile ---------- */
const SEASON_RANGES = [
  {key:"1W", label:"1W", days:7, say:"past week"},
  {key:"2W", label:"2W", days:14, say:"past two weeks"},
  {key:"S", label:"Season", days:999, say:"this season"}
];
const tradeRows = list => list.map(([d,what,mkt,res]) => `<tr><td>${d}</td><td><b>${what}</b><span class="sub">${mkt}</span></td><td class="${cls(res)}">${pct(res, Math.abs(res) < 10 && res % 1 ? 1 : 0)}</td></tr>`).join("");

function profileHTML(h){
  const close = `<div class="profile__bar"><span class="cap">Sample trader</span><button class="btn btn--ghost btn--small" type="button" id="profile-close">Close</button></div>`;
  const fine = `<p class="profile__fine">This is a sample trader made for this page. Not a real person or real results.</p>`;
  const t = byHandle[h];
  if (!t){
    const posts = [];
    for (const k of ["best","worst","bold"]) SOCIAL[k].forEach(r => { if (r[0]===h) posts.push(["Jan "+(k==="best"?28:k==="worst"?27:25), r[1], r[2], r[3]]); });
    return `${close}<h2 id="profile-name">${h}</h2>
      <div class="profile__tags"><span class="stamp stamp--plain">Highlights</span></div>
      <p class="profile__style">${HIGHLIGHTS[h].style}</p>
      <p class="profile__since">Linked Jan 4, 2027. Posts are verified one trade at a time.</p>
      <p class="hidden-totals"><b>Totals are hidden.</b> This trader shares highlights, not a full record. Exile shows no return, win rate or rank for a Highlights profile.</p>
      <h3>Posted trades</h3>
      <table class="trades"><tbody>${tradeRows(posts)}</tbody></table>${fine}`;
  }
  const s = t.s;
  const tags = `<span class="stamp stamp--ok">Full record</span>` + (s.out ? `<span class="stamp stamp--out">Exiled ${dayLabel(s.day)}</span>` : "");
  const cap = s.out
    ? `Fell ${s.nowdd.toFixed(1)}% from the peak on ${dayLabel(s.day)} and crossed the line. The season ended there, ${s.ret>=0?"while still up":"down"} ${Math.abs(s.ret).toFixed(1)}% overall.`
    : `The red line trails 15% below the highest point so far. Right now this trader has ${(LINE-s.nowdd).toFixed(1)} points of room. Drag across the chart to read any day.`;
  return `${close}<h2 id="profile-name">${h}</h2>
    <div class="profile__tags">${tags}</div>
    <p class="profile__style">${t.style}</p>
    <p class="profile__since">Record starts Jan 4, 2027. Nothing is backfilled.</p>
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
    <p class="mix__key">${t.mix.map(m => m[0]+" "+m[1]+"%").join(", ")}. ${t.trades} trades this season.</p>
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
  if (t && slot) ExileChart.mount(slot, {values:t.curve, start:DAY0, ranges:SEASON_RANGES, range:"S", line:LINE, height:230, out:t.s.out});
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
  if (!row) return;
  openProfile(row.dataset.h, row.querySelector(".who"));
});

/* ---------- photo stack ---------- */
const PHOTOS = [
  {t:"Everett Rosauer", c:"The official one. The next few are more accurate."},
  {t:"Hole in one", v:true, c:"Hole 11 at Solmar Golf Links, Cabo San Lucas. 119 yards with a 52 degree wedge, December 29, 2025. The head pro signed the flag."},
  {t:"Queenstown, New Zealand", c:"April 2026."},
  {t:"Above Queenstown", c:"April 2026."},
  {t:"Wakesurfing", c:"Behind the boat."},
  {t:"Dirt bike", c:"In the pines."}
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
  if (dir < 0){ order.unshift(order.pop()); layStack(); return; }
  const top = prints[order[0]];
  const land = () => { order.push(order.shift()); top.classList.remove("is-leaving"); layStack(); turning = false; };
  if (still) return land();
  turning = true;
  top.classList.add("is-leaving");
  setTimeout(land, 280);
}
document.getElementById("stack-next").addEventListener("click", () => turn(1));
document.getElementById("stack-back").addEventListener("click", () => turn(-1));
document.getElementById("stack-tap").addEventListener("click", () => turn(1));
layStack();

/* ---------- founder email button (the address in the page is the fallback) ---------- */
const founderMail = document.getElementById("founder-mail");
if (window.EXILE.founderEmail){
  founderMail.href = "mailto:" + window.EXILE.founderEmail + "?subject=" + encodeURIComponent("Exile");
  founderMail.textContent = window.EXILE.founderEmail;
}

/* ---------- waitlist ---------- */
const form = document.getElementById("waitlist");
const statusEl = document.getElementById("wl-status");
const emailEl = document.getElementById("wl-email");
const submitEl = document.getElementById("wl-submit");
const FRAMED = window.self !== window.top;   /* true inside a preview frame, where outside requests are blocked */
function say(html, bad){ statusEl.innerHTML = html; statusEl.classList.toggle("is-error", !!bad); }
function syncRole(){ submitEl.textContent = form.role.value === "firm" ? "Ask for a call" : "Join the waitlist"; }
form.addEventListener("change", syncRole);

/* "Talk to us about the pilot" lands on the form with Trading firm already picked. */
function firmMode(){
  document.getElementById("wl-role-firm").checked = true;
  syncRole();
  document.getElementById("join").scrollIntoView({behavior: still ? "auto" : "smooth"});
  emailEl.focus({preventScroll:true});
}
document.querySelectorAll('a[href="#join-firm"]').forEach(a => a.addEventListener("click", e => { e.preventDefault(); firmMode(); }));
if (location.hash === "#join-firm") firmMode();

form.addEventListener("submit", async e => {
  e.preventDefault();
  const email = emailEl.value.trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ say("Enter a full email address, like you@email.com.", true); emailEl.focus(); return; }
  const role = form.role.value;
  const done = role === "firm" ? "Got it. We will write to you about the pilot." : "You're on the list. We will email you before Season Zero opens.";
  if (document.getElementById("wl-hp").value){ form.reset(); syncRole(); say(done); return; }   /* a bot filled the hidden box */
  const data = {email, role, markets: [...form.querySelectorAll('input[name="markets"]:checked')].map(i => i.value)};
  const wl = window.EXILE.waitlist;
  submitEl.disabled = true;
  say("Saving.");
  try {
    const res = await fetch(wl.url, {method:"POST", headers:{"Content-Type":"application/json", "apikey":wl.key, "Prefer":"return=minimal"}, body:JSON.stringify(data)});
    if (res.status === 409){ form.reset(); syncRole(); say("That email is already on the list. You're set."); return; }
    if (!res.ok) throw new Error(String(res.status));
    form.reset(); syncRole();
    say(done);
  } catch (err) {
    say(FRAMED
      ? "This private preview can't reach the list, so nothing was saved. The form works on the live site."
      : `That did not go through, so nothing was saved. Try again, or message ${window.EXILE.contactHTML("Season Zero waitlist")}.`, true);
  } finally { submitEl.disabled = false; }
});
