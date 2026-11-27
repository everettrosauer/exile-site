/* Sign in and edit your own profile.
   The database decides what a signed in person may touch: their own profile row and their own photo folder.
   Everything a person types is shown back with textContent, never as HTML. */
(function(){
  "use strict";
  const cfg = window.EXILE.supabase;
  const $ = id => document.getElementById(id);
  const vLoad = $("view-load"), vOut = $("view-out"), vIn = $("view-in");
  const show = v => { vLoad.hidden = true; vOut.hidden = v !== "out"; vIn.hidden = v !== "in"; };

  if (!window.supabase || !cfg){ vLoad.textContent = "Profiles could not load. Reload the page, or write to hello@joinexile.com."; return; }
  const sb = window.supabase.createClient(cfg.url, cfg.key);
  const photoURL = path => cfg.url + "/storage/v1/object/public/avatars/" + path;
  const HANDLE = /^[a-z0-9_]{3,20}$/;
  const LINKEDIN = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]{3,100}\/?$/;

  let me = null, profile = null, newPhoto = null, dropPhoto = false, previewURL = null;

  /* ---------- sign in or create an account ---------- */
  const auth = $("auth"), auEmail = $("au-email"), auPass = $("au-pass"), auAdult = $("au-adult"), auStatus = $("au-status"), auSubmit = $("au-submit");
  let mode = "up";
  const say = (el, text, bad) => { el.textContent = text; el.classList.toggle("is-error", !!bad); };
  function setMode(m){
    mode = m;
    $("mode-up").setAttribute("aria-pressed", m === "up");
    $("mode-in").setAttribute("aria-pressed", m === "in");
    $("au-adult-row").hidden = m !== "up";
    auPass.autocomplete = m === "up" ? "new-password" : "current-password";
    auSubmit.textContent = m === "up" ? "Create account" : "Sign in";
    say(auStatus, "");
  }
  $("mode-up").addEventListener("click", () => setMode("up"));
  $("mode-in").addEventListener("click", () => setMode("in"));

  const authError = msg => {
    const m = String(msg || "").toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Choose Sign in.";
    if (m.includes("invalid login")) return "Wrong email or password.";
    if (m.includes("not confirmed")) return "Confirm your email first. Check your inbox for the link, then sign in.";
    if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a minute and try again.";
    if (m.includes("password")) return "That password was not accepted. Use at least 8 characters.";
    if (m.includes("signups not allowed") || m.includes("disabled")) return "New accounts are closed right now. Write to hello@joinexile.com.";
    if (m.includes("not authorized") || m.includes("sending confirmation") || m.includes("error sending")) return "New accounts are not switched on yet. Try again soon.";
    return "That did not work. Try again, or write to hello@joinexile.com.";
  };

  auth.addEventListener("submit", async e => {
    e.preventDefault();
    const email = auEmail.value.trim().toLowerCase(), password = auPass.value;
    if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ say(auStatus, "Enter a full email address, like you@email.com.", true); auEmail.focus(); return; }
    if (password.length < 8){ say(auStatus, "Use a password with at least 8 characters.", true); auPass.focus(); return; }
    if (mode === "up" && !auAdult.checked){ say(auStatus, "Tick the box to confirm you are 18 or older and agree to the terms.", true); auAdult.focus(); return; }
    auSubmit.disabled = true; say(auStatus, mode === "up" ? "Creating your account." : "Signing in.");
    try {
      const res = mode === "up" ? await sb.auth.signUp({email, password}) : await sb.auth.signInWithPassword({email, password});
      if (res.error){ say(auStatus, authError(res.error.message), true); return; }
      if (!res.data.session){ say(auStatus, "Almost there. Check your email for a confirmation link, then come back and sign in."); setMode("in"); return; }
      auPass.value = "";
    } catch (err) {
      say(auStatus, "Could not reach the server. Check your connection and try again.", true);
    } finally { auSubmit.disabled = false; }
  });

  /* ---------- the editor ---------- */
  const ed = $("editor"), edName = $("ed-name"), edHandle = $("ed-handle"), edHeadline = $("ed-headline"), edAbout = $("ed-about"), edLinked = $("ed-linkedin");
  const edStatus = $("ed-status"), edSave = $("ed-save"), edAvatar = $("ed-avatar"), edFile = $("ed-file"), edNoPhoto = $("ed-nophoto"), viewLink = $("view-link");
  const initials = name => (name || "").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("") || "?";

  function paintAvatar(){
    edAvatar.textContent = "";
    const src = previewURL || (!dropPhoto && profile && profile.avatar_path ? photoURL(profile.avatar_path) : null);
    if (src){ const img = new Image(); img.alt = ""; img.src = src; edAvatar.appendChild(img); }
    else edAvatar.textContent = initials(edName.value);
    edNoPhoto.hidden = !src;
  }
  const counter = (input, out, max) => { const f = () => { out.textContent = input.value.length + " of " + max; }; input.addEventListener("input", f); return f; };
  const countHeadline = counter(edHeadline, $("ed-headline-n"), 120), countAbout = counter(edAbout, $("ed-about-n"), 1500);
  edName.addEventListener("input", () => { if (!previewURL && !(profile && profile.avatar_path && !dropPhoto)) paintAvatar(); });
  edHandle.addEventListener("input", () => { const v = edHandle.value.toLowerCase().replace(/[^a-z0-9_]/g, ""); if (v !== edHandle.value) edHandle.value = v; });

  function fill(){
    const p = profile || {};
    edName.value = p.display_name || "";
    edHandle.value = p.handle || "";
    edHeadline.value = p.headline || "";
    edAbout.value = p.about || "";
    edLinked.value = p.linkedin_url || "";
    ed.querySelectorAll('input[name="markets"]').forEach(c => { c.checked = (p.markets || []).includes(c.value); });
    newPhoto = null; dropPhoto = false;
    if (previewURL){ URL.revokeObjectURL(previewURL); previewURL = null; }
    countHeadline(); countAbout(); paintAvatar();
    $("who-line").textContent = profile
      ? (profile.listed ? "Your profile is live and shown on the home page." : "Your profile is live at its own link. It shows on the home page once it has been approved.")
      : "Signed in as " + me.email + ". Fill this in and save to make your profile.";
    viewLink.hidden = !profile;
    if (profile) viewLink.href = "/t/" + profile.handle;
    $("danger").hidden = !profile;
    edSave.textContent = profile ? "Save changes" : "Create profile";
  }

  /* Crop to a square and shrink to 512 px. Drawing to a canvas also drops the location data a phone adds to photos. */
  async function squareJPEG(file){
    if (!/^image\//.test(file.type) || file.size > 20 * 1024 * 1024) throw new Error("type");
    let src;
    if (window.createImageBitmap){ try { src = await createImageBitmap(file, {imageOrientation:"from-image"}); } catch (_) { src = null; } }
    if (!src){
      src = await new Promise((ok, no) => { const i = new Image(), u = URL.createObjectURL(file); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => { URL.revokeObjectURL(u); no(new Error("decode")); }; i.src = u; });
    }
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, side = Math.min(w, h);
    if (!side) throw new Error("decode");
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
    g.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 512, 512);
    return new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error("encode")), "image/jpeg", .86));
  }
  edFile.addEventListener("change", async () => {
    const f = edFile.files && edFile.files[0]; edFile.value = "";
    if (!f) return;
    try {
      newPhoto = await squareJPEG(f); dropPhoto = false;
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(newPhoto);
      paintAvatar(); say(edStatus, "Photo ready. Save to keep it.");
    } catch (err) { say(edStatus, "That file could not be read as a picture. Try a JPG or PNG.", true); }
  });
  edNoPhoto.addEventListener("click", () => { newPhoto = null; dropPhoto = true; if (previewURL){ URL.revokeObjectURL(previewURL); previewURL = null; } paintAvatar(); say(edStatus, "Photo removed. Save to keep the change."); });

  function cleanLinkedIn(raw){
    let v = raw.trim();
    if (!v) return {ok:true, value:null};
    v = v.replace(/^http:\/\//i, "https://");
    if (!/^https:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    v = v.split(/[?#]/)[0].replace(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com/i, "https://www.linkedin.com");
    return LINKEDIN.test(v) ? {ok:true, value:v} : {ok:false};
  }

  ed.addEventListener("submit", async e => {
    e.preventDefault();
    const display_name = edName.value.trim(), handle = edHandle.value.trim().toLowerCase();
    if (!display_name){ say(edStatus, "Add your name.", true); edName.focus(); return; }
    if (!HANDLE.test(handle)){ say(edStatus, "Pick a handle of 3 to 20 small letters, numbers or underscores.", true); edHandle.focus(); return; }
    const li = cleanLinkedIn(edLinked.value);
    if (!li.ok){ say(edStatus, "That LinkedIn link does not look right. It should look like linkedin.com/in/yourname.", true); edLinked.focus(); return; }
    const row = {display_name, handle, headline: edHeadline.value.trim(), about: edAbout.value.trim(), linkedin_url: li.value,
      markets: [...ed.querySelectorAll('input[name="markets"]:checked')].map(c => c.value)};
    edSave.disabled = true; say(edStatus, "Saving.");
    const old = profile && profile.avatar_path;
    let uploaded = null;
    try {
      if (newPhoto){
        const path = me.id + "/" + Date.now() + ".jpg";
        const up = await sb.storage.from("avatars").upload(path, newPhoto, {contentType:"image/jpeg", cacheControl:"31536000", upsert:false});
        if (up.error) throw {where:"photo", error:up.error};
        uploaded = path; row.avatar_path = path;
      } else if (dropPhoto) row.avatar_path = null;

      const q = profile
        ? sb.from("profiles").update(row).eq("id", me.id)
        : sb.from("profiles").insert(Object.assign({id: me.id}, row));
      const res = await q.select("id,handle,display_name,headline,about,linkedin_url,markets,avatar_path,listed").single();
      if (res.error) throw {where:"row", error:res.error};
      profile = res.data;
      if (old && (uploaded || dropPhoto)) sb.storage.from("avatars").remove([old]);   /* tidy up the old photo; fine if it fails */
      fill();
      say(edStatus, "Saved. Your profile is at joinexile.com/t/" + profile.handle);
    } catch (x) {
      if (uploaded) sb.storage.from("avatars").remove([uploaded]);
      const code = x && x.error && x.error.code, msg = String((x && x.error && x.error.message) || "");
      if (x && x.where === "photo") say(edStatus, "The photo did not upload, so nothing was saved. Try a different picture.", true);
      else if (code === "23505") { say(edStatus, "That handle is taken. Try another.", true); edHandle.focus(); }
      else if (code === "23514" && msg.includes("handle")) { say(edStatus, "That handle is not allowed. Try another.", true); edHandle.focus(); }
      else if (code === "23514") say(edStatus, "Something in the form is too long or not in the right shape. Check the fields and try again.", true);
      else say(edStatus, "That did not save. Check your connection and try again.", true);
    } finally { edSave.disabled = false; }
  });

  /* ---------- delete, in two steps, with no pop up ---------- */
  const delAsk = $("del-ask"), delYes = $("del-yes"), delNo = $("del-no"), delStatus = $("del-status");
  const delStep = armed => { delAsk.hidden = armed; delYes.hidden = !armed; delNo.hidden = !armed; if (armed) delNo.focus(); };
  delAsk.addEventListener("click", () => { say(delStatus, "This cannot be undone."); delStep(true); });
  delNo.addEventListener("click", () => { say(delStatus, ""); delStep(false); });
  delYes.addEventListener("click", async () => {
    delYes.disabled = true; say(delStatus, "Deleting.");
    const old = profile && profile.avatar_path;
    const res = await sb.from("profiles").delete().eq("id", me.id);
    delYes.disabled = false;
    if (res.error){ say(delStatus, "That did not work. Try again.", true); return; }
    if (old) sb.storage.from("avatars").remove([old]);
    profile = null; delStep(false); fill();
    say(edStatus, "Your profile and photo are deleted.");
  });

  $("signout").addEventListener("click", async () => { await sb.auth.signOut(); });

  /* ---------- which view ---------- */
  async function enter(session){
    if (!session){ me = null; profile = null; show("out"); return; }
    if (me && me.id === session.user.id && !vIn.hidden) return;
    me = session.user;
    const res = await sb.from("profiles").select("id,handle,display_name,headline,about,linkedin_url,markets,avatar_path,listed").eq("id", me.id).maybeSingle();
    profile = res.error ? null : res.data;
    fill(); show("in");
    if (res.error) say(edStatus, "Your profile could not be loaded. Reload the page before you edit.", true);
  }
  sb.auth.onAuthStateChange((event, session) => { setTimeout(() => enter(session), 0); });
  sb.auth.getSession().then(({data}) => enter(data.session)).catch(() => show("out"));
  setMode("up");
})();
