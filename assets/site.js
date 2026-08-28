(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;

  /* ------------------------------------------------------------------
     Entrance reveals. Only ever run once per element, and only when the
     browser both supports IntersectionObserver and the visitor has not
     asked for reduced motion.
     ------------------------------------------------------------------ */
  function setupReveals() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (reduced.matches || !('IntersectionObserver' in window)) {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-revealed');
      root.setAttribute('data-anim', 'on');
      return;
    }

    root.setAttribute('data-anim', 'on');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach(function (el) { io.observe(el); });

    // The negative rootMargin means anything sitting in the last slice of a
    // fully-scrolled page would never trigger. Once the visitor reaches the
    // bottom, reveal whatever is still waiting.
    function revealRemainder() {
      var atBottom = window.innerHeight + window.scrollY >=
                     document.documentElement.scrollHeight - 2;
      if (!atBottom) return;
      targets.forEach(function (el) {
        if (el.classList.contains('is-revealed')) return;
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
      window.removeEventListener('scroll', revealRemainder);
    }

    window.addEventListener('scroll', revealRemainder, { passive: true });
    window.addEventListener('load', revealRemainder);
    revealRemainder();
  }

  /* ------------------------------------------------------------------
     The accordion is exclusive, so opening one answer closes another and
     the page can shift under the reader. After an answer settles, bring it
     back into view if it ended up under the header or past the fold.
     ------------------------------------------------------------------ */
  function setupFaq() {
    var faq = document.querySelector('[data-faq]');
    if (!faq) return;

    var items = [].slice.call(faq.querySelectorAll('details'));

    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;

        var settle = function () {
          /* Was the sticky header's height plus 16. With no fixed chrome
             over the page, 24 is just breathing room above the answer. */
          var offset = 24;
          var box = item.getBoundingClientRect();
          var hiddenAbove = box.top < offset;
          var hiddenBelow = box.bottom > window.innerHeight && box.height < window.innerHeight - offset;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setupReveals(); setupFaq(); });
  } else {
    setupReveals();
    setupFaq();
  }
}());
