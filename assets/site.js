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
     The header only grows a border and shadow once the page has moved,
     so it sits flush against the hero at rest.
     ------------------------------------------------------------------ */
  function setupHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var ticking = false;

    function update() {
      ticking = false;
      header.setAttribute('data-stuck', window.scrollY > 12 ? 'true' : 'false');
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    update();

    /* Hamburger panel, same behaviour as the home's nav: the button toggles
       it, and a tap on a link, a click outside, Escape, or growing back to
       desktop all close it. */
    var toggle = header.querySelector('.nav-toggle');
    var links = header.querySelector('.nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setOpen(!header.classList.contains('nav-open'));
    });

    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', function (event) {
      if (header.classList.contains('nav-open') && !header.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024) setOpen(false);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     The nav's dropdowns. Pointing at a top-level item opens it and
     closes the others; leaving waits a moment first, so crossing the gap
     between the button and the panel does not shut it. The button also
     answers a click and a focus, so the run works from the keyboard.

     Below the breakpoint the panels are unfolded in place by CSS, and
     the buttons are left alone — there is nothing to open.
     ------------------------------------------------------------------ */
  function setupMenu() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.menu__item[data-menu]')
    );
    if (!items.length) return;

    var stacked = window.matchMedia('(max-width: 1024px)');
    var timer = null;

    function closeAll() {
      items.forEach(function (item) {
        item.classList.remove('is-open');
        var btn = item.querySelector('.menu__link');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    items.forEach(function (item) {
      var btn = item.querySelector('.menu__link');
      if (!btn) return;

      function open() {
        if (stacked.matches) return;
        window.clearTimeout(timer);
        closeAll();
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }

      item.addEventListener('pointerenter', open, { passive: true });
      item.addEventListener('pointerleave', function () {
        if (stacked.matches) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(closeAll, 140);
      }, { passive: true });

      btn.addEventListener('focus', open);
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        if (stacked.matches) return;
        if (item.classList.contains('is-open')) closeAll(); else open();
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.menu__item')) closeAll();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });
    // a panel left open behind the hamburger would sit on top of the page
    stacked.addEventListener('change', closeAll);
  }

  /* ------------------------------------------------------------------
     The accordion is exclusive, so opening one answer closes another and
     the page can shift under the reader. After an answer settles, bring it
     back into view if it ended up under the header or past the fold.
     ------------------------------------------------------------------ */
  function setupFaq() {
    var faq = document.querySelector('[data-faq]');
    if (!faq) return;

    var header = document.querySelector('.site-header');
    var items = [].slice.call(faq.querySelectorAll('details'));

    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;

        var settle = function () {
          var offset = (header ? header.offsetHeight : 0) + 16;
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
    document.addEventListener('DOMContentLoaded', function () { setupReveals(); setupHeader(); setupMenu(); setupFaq(); });
  } else {
    setupReveals();
    setupHeader();
    setupMenu();
    setupFaq();
  }
}());
