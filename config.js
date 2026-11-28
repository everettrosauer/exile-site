/* ------------------------------------------------------------------
   One place for the settings every page shares.

   contactEmail  The public contact address. If it is ever emptied, every
                 contact spot points to LinkedIn instead.
   founderEmail  Shown as a button in "Who is behind this". Empty hides it.
                 Both addresses forward to Everett's inbox through ImprovMX
                 (catch-all on joinexile.com). Receiving only, no sending.
   linkedin      The founder's public profile.
   supabase      Sign in and trader profiles. The key is a publishable key:
                 on its own it can read public profiles and nothing else.
                 What a signed in person may change is enforced in the
                 database: only their own profile row and their own photo.
------------------------------------------------------------------- */
window.EXILE = {
  contactEmail: "hello@joinexile.com",
  founderEmail: "everett@joinexile.com",
  linkedin: "https://www.linkedin.com/in/everett-rosauer-70479b1b5/",
  supabase: {
    url: "https://vyjgpqpinjgxgyseasdq.supabase.co",
    key: "sb_publishable_oVHFGG3GlPmlSsQB_kwXAw_SFSaccyR"
  }
};

/* Fill every contact spot on the page. */
window.EXILE.contactHTML = function (subject) {
  var c = window.EXILE;
  if (c.contactEmail) {
    return '<a href="mailto:' + c.contactEmail + (subject ? "?subject=" + encodeURIComponent(subject) : "") + '">' + c.contactEmail + "</a>";
  }
  return '<a href="' + c.linkedin + '" rel="noopener">Everett Rosauer on LinkedIn</a>';
};
document.querySelectorAll("[data-contact]").forEach(function (el) {
  el.innerHTML = window.EXILE.contactHTML(el.getAttribute("data-contact") || "Exile");
});
