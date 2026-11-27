/* ------------------------------------------------------------------
   One place for the settings every page shares.

   contactEmail  Leave empty until the mailbox really works. While it is
                 empty, every contact spot points to LinkedIn instead.
   linkedin      The founder's public profile.
   waitlist      Where the signup form saves. The key is a publishable key:
                 it can add a row to the waitlist and nothing else.
------------------------------------------------------------------- */
window.EXILE = {
  contactEmail: "",
  linkedin: "https://www.linkedin.com/in/everett-rosauer-70479b1b5/",
  waitlist: {
    url: "https://vyjgpqpinjgxgyseasdq.supabase.co/rest/v1/waitlist",
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
