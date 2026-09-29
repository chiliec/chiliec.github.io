// Motion for Home / About / Apps. Pages render complete without this file;
// it only animates *from* hidden states. Reduced motion → exit untouched.
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.SplitText || !window.Lenis) {
    root.classList.remove('js-motion');
    return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // --- One smooth-scroll engine: Lenis, driven by GSAP's ticker ---
  var lenis = new Lenis({ autoRaf: false });
  window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  // ponytail: no teardown — full page loads, nothing outlives the document.

  var ease = 'power3.out';

  function words(el) {
    // aria: 'auto' puts the full text in aria-label and hides word spans.
    return SplitText.create(el, { type: 'words', aria: 'auto' }).words;
  }

  // --- Hero intro ---
  var heroTitle = document.querySelector('[data-split][data-hero]');
  var heroBits = gsap.utils.toArray('[data-hero]').filter(function (el) {
    return el !== heroTitle && !el.classList.contains('fan-card');
  });
  var cards = gsap.utils.toArray('.fan-card');
  var tl = gsap.timeline({ defaults: { ease: ease } });
  gsap.set('[data-hero]', { visibility: 'visible' });
  if (heroTitle) {
    tl.from(words(heroTitle), { yPercent: 70, autoAlpha: 0, duration: 0.8, stagger: 0.06 });
  }
  if (heroBits.length) {
    tl.from(heroBits, { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, heroTitle ? '-=0.45' : 0);
  }
  if (cards.length) {
    // Deal the cards out of a single stack at the middle position.
    tl.from(cards, {
      x: function (i) { return (1 - i) * 120; },
      rotation: 0, autoAlpha: 0, y: 40, duration: 0.9, stagger: 0.08
    }, '-=0.5');
  }
  root.classList.remove('js-motion'); // GSAP inline styles own visibility now

  // --- Pointer-reactive fan (fine pointers only) ---
  var fan = document.querySelector('.fan');
  if (fan && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var set = gsap.utils.toArray('.fan-card img').map(function (img) {
      return {
        x: gsap.quickTo(img, 'x', { duration: 0.6, ease: 'power3' }),
        r: gsap.quickTo(img, 'rotation', { duration: 0.6, ease: 'power3' })
      };
    });
    var reset = function () { set.forEach(function (s) { s.x(0); s.r(0); }); };
    fan.addEventListener('pointermove', function (e) {
      var b = fan.getBoundingClientRect();
      var px = (e.clientX - b.left) / b.width - 0.5; // -0.5..0.5
      set.forEach(function (s, i) {
        s.x(px * 18 * (i + 1));   // outer cards travel further → fan spreads
        s.r(px * 8);              // ≤ 4°
      });
    });
    fan.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
  }

  // --- Section titles: word reveal once on enter ---
  gsap.utils.toArray('[data-split]:not([data-hero])').forEach(function (el) {
    gsap.from(words(el), {
      yPercent: 70, autoAlpha: 0, duration: 0.8, stagger: 0.05, ease: ease,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    });
  });

  // --- Lists: children rise in sequence ---
  gsap.utils.toArray('[data-stagger]').forEach(function (list) {
    gsap.from(list.children, {
      y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: ease, clearProps: 'transform',
      scrollTrigger: { trigger: list, start: 'top 85%', once: true }
    });
  });

  // --- Apps page: gentle scrubbed parallax on alternating screenshots (desktop only) ---
  gsap.matchMedia().add('(min-width: 801px)', function () {
    gsap.utils.toArray('[data-parallax]').forEach(function (el, i) {
      var d = i % 2 ? 6 : -6;
      gsap.fromTo(el, { yPercent: -d }, {
        yPercent: d, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  });

  document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
