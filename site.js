/* Shared by every page: bricks rise in as they enter the screen. */
(function(){
  "use strict";
  window.__exileReveal = true;
  const bricks = [...document.querySelectorAll(".brick")];
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = b => { if (!b.classList.contains("is-in")) b.classList.add("is-in"); };
  if (still || !("IntersectionObserver" in window)){ bricks.forEach(show); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting){ show(e.target); io.unobserve(e.target); } });
  }, {rootMargin:"0px 0px -8% 0px", threshold:.03});
  bricks.forEach(b => io.observe(b));
  /* Printing and very tall jumps: never leave a brick hidden. */
  window.addEventListener("beforeprint", () => bricks.forEach(show));
})();
