/* Kept as a classic script inside an IIFE rather than a module. A module
   would make the wrapper unnecessary, but modules are blocked by CORS over
   file://, so opening index.html straight from disk would silently lose the
   reveals and the FAQ scroll. The IIFE costs one line and keeps that working. */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  /* ------------------------------------------------------------------
     Entrance reveals. Only ever run once per element, and only when the
     browser both supports IntersectionObserver and the visitor has not
     asked for reduced motion.
     ------------------------------------------------------------------ */
  const setupReveals = () => {
    const targets = [...document.querySelectorAll('.reveal')];
    if (!targets.length) return;

    /* Set before either branch. Both used to do it separately, which meant
       the same line appearing twice for no reason. */
    root.setAttribute('data-anim', 'on');

    if (reduced.matches || !('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach(el => io.observe(el));

    // The negative rootMargin means anything sitting in the last slice of a
    // fully-scrolled page would never trigger. Once the visitor reaches the
    // bottom, reveal whatever is still waiting.
    const revealRemainder = () => {
      const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2;
      if (!atBottom) return;
      targets.forEach(el => {
        if (el.classList.contains('is-revealed')) return;
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
      window.removeEventListener('scroll', revealRemainder);
    };

    window.addEventListener('scroll', revealRemainder, { passive: true });
    window.addEventListener('load', revealRemainder);
    revealRemainder();
  };

  /* ------------------------------------------------------------------
     The accordion is exclusive, so opening one answer closes another and
     the page can shift under the reader. After an answer settles, bring it
     back into view if it ended up off the top or past the fold.
     ------------------------------------------------------------------ */
  const setupFaq = () => {
    const faq = document.querySelector('[data-faq]');
    if (!faq) return;

    faq.querySelectorAll('details').forEach(item => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;

        const settle = () => {
          /* Was the sticky header's height plus 16. With no fixed chrome
             over the page, 24 is just breathing room above the answer. */
          const offset = 24;
          const box = item.getBoundingClientRect();
          const hiddenAbove = box.top < offset;
          const hiddenBelow = box.bottom > window.innerHeight
                           && box.height < window.innerHeight - offset;
          if (!hiddenAbove && !hiddenBelow) return;

          window.scrollTo({
            top: box.top + window.scrollY - offset,
            behavior: reduced.matches ? 'auto' : 'smooth'
          });
        };

        // wait out the height transition before measuring
        if (reduced.matches) settle();
        else window.setTimeout(settle, 380);
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setupReveals(); setupFaq(); });
  } else {
    setupReveals();
    setupFaq();
  }
})();
