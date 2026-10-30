/* ===== WOLF MMA – motion.js ===== */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const NAV_H = 84;

  /* ---------- 1. LIVE OPEN / CLOSED BADGE (always IST) ---------- */
  function gymStatus() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const day = get('weekday'), mins = (+get('hour') % 24) * 60 + +get('minute');
    const open = day !== 'Sun' && ((mins >= 300 && mins < 660) || (mins >= 1020 && mins < 1380));
    let note;
    if (open) note = mins < 660 ? 'till 11 AM' : 'till 11 PM';
    else if (day === 'Sun' || (day === 'Sat' && mins >= 1380)) note = 'opens Mon 5 AM';
    else if (mins < 300) note = 'opens 5 AM';
    else if (mins < 1020) note = 'opens 5 PM';
    else note = 'opens 5 AM tomorrow';
    return { open, note };
  }
  function renderBadges() {
    const { open, note } = gymStatus();
    document.querySelectorAll('.open-badge').forEach(b => {
      b.style.color = open ? '#ffffff' : '#8A94A8';
      b.innerHTML = `<span class="pulse"></span>${open ? 'OPEN NOW' : 'CLOSED'} · ${note.toUpperCase()}`;
    });
  }
  document.querySelector('#home .inline-block').insertAdjacentHTML('afterend', '<div class="open-badge hero-badge"></div>');
  document.querySelector('#schedule h2').insertAdjacentHTML('afterend', '<div class="open-badge sched-badge"></div>');
  renderBadges();
  setInterval(renderBadges, 60000);

  if (reduceMotion || !window.gsap || !window.Lenis) return;   // no motion for these users
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- 2. SMOOTH SCROLL + NAV ---------- */
  const lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const menu = document.getElementById('mobile-menu');
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    menu.classList.add('hidden');
    lenis.scrollTo(target, { offset: -NAV_H, duration: 1.4 });
  }));

  document.body.insertAdjacentHTML('afterbegin', '<div id="scroll-progress"></div>');
  gsap.to('#scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  const nav = document.querySelector('nav');
  let navHidden = false;
  lenis.on('scroll', ({ scroll, direction }) => {
    const hide = direction === 1 && scroll > 300 && menu.classList.contains('hidden');
    if (hide !== navHidden) {
      navHidden = hide;
      gsap.to(nav, { yPercent: hide ? -100 : 0, duration: 0.35, ease: 'power2.out' });
    }
  });

  /* ---------- 3. SCROLL ANIMATIONS (after fonts load so text splits correctly) ---------- */
  document.fonts.ready.then(() => {
    const mm = gsap.matchMedia();

    // HERO intro
    const heroContent = document.querySelector('#home > .relative.z-10');
    gsap.set(heroContent, { visibility: 'visible' });
    const h1 = new SplitText('#home h1', { type: 'words,chars' });
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .from('#home .w-40', { scale: 0, rotate: -25, duration: 0.9, ease: 'back.out(1.8)' })
      .from('#home .inline-block, #home .hero-badge', { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.4')
      .from(h1.chars, { yPercent: 110, rotate: 6, opacity: 0, stagger: 0.025, duration: 0.7 }, '-=0.2')
      .from('#home h1 + p, #home h1 ~ div > a', { y: 30, opacity: 0, stagger: 0.12, duration: 0.6 }, '-=0.4');

    // HERO scroll-out
    const heroST = { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('#home video', { scale: 1.25, ease: 'none', scrollTrigger: heroST });
    gsap.to(heroContent, { yPercent: 30, opacity: 0, ease: 'none', scrollTrigger: { ...heroST } });

    // GALLERY – pinned horizontal scroll (desktop only; phones keep the marquee)
    mm.add('(min-width: 1024px)', () => {
      const track = document.querySelector('.animate-marquee');
      const viewport = track.parentElement;
      const block = viewport.parentElement;                 // "INSIDE THE GYM" block
      const clones = [...track.children].slice(10);         // duplicate set not needed here
      clones.forEach(c => c.remove());
      track.style.animation = 'none';
      gsap.to(track, {
        x: () => -(track.scrollWidth - viewport.clientWidth + 24),
        ease: 'none',
        scrollTrigger: { trigger: block, start: 'center center', end: () => '+=' + track.scrollWidth,
          pin: true, scrub: 1, invalidateOnRefresh: true }
      });
      return () => { clones.forEach(c => track.appendChild(c)); track.style.animation = ''; };
    });

    // STATS counters
    gsap.from('#stats .stat', { y: 40, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: '#stats', start: 'top 85%' } });
    document.querySelectorAll('.count').forEach(el => {
      const o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, { v: +el.dataset.to, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => (el.textContent = Math.round(o.v)) });
    });

    // Section headings – wipe in
    gsap.utils.toArray('section h2').forEach(h => {
      gsap.fromTo(h, { clipPath: 'inset(0 100% 0 0)', x: -30 },
        { clipPath: 'inset(0 0% 0 0)', x: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: h, start: 'top 85%' } });
    });

    // ABOUT – paragraph lights up word by word
    const aboutP = new SplitText('#about h2 + p', { type: 'words' });
    gsap.from(aboutP.words, { opacity: 0.12, stagger: 0.05, ease: 'none',
      scrollTrigger: { trigger: '#about h2 + p', start: 'top 85%', end: 'bottom 45%', scrub: true } });
    gsap.from('#about .grid-cols-2 > div, #about li', { y: 40, opacity: 0, stagger: 0.1, duration: 0.6,
      ease: 'power3.out', scrollTrigger: { trigger: '#about .grid-cols-2', start: 'top 85%' } });

    // Head coach card – slide in + image parallax
    const amirCard = document.querySelector('#about img[alt="Mohd Amir"]').closest('.border-4');
    gsap.from(amirCard, { x: 120, rotate: 4, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: amirCard, start: 'top 80%' } });
    gsap.fromTo(amirCard.querySelector('img'), { yPercent: -10, scale: 1.2 },
      { yPercent: 10, scale: 1.2, ease: 'none', scrollTrigger: { trigger: amirCard, scrub: true } });

    // CARDS – programs, plans, timings, coaches rise in
    const cardSel = '#programs-grid > div, #plans .grid > div, #schedule .grid > div, #trainers .grid > div';
    gsap.set(cardSel, { opacity: 0, y: 60 });
    ScrollTrigger.batch(cardSel, { start: 'top 90%', once: true,
      onEnter: b => gsap.to(b, { opacity: 1, y: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out' }) });
    gsap.from('#schedule .bg-fightRed', { scaleX: 0, duration: 0.8, ease: 'power4.out',
      scrollTrigger: { trigger: '#schedule .bg-fightRed', start: 'top 90%' } });

    // POPULAR / ELITE glow
    document.querySelectorAll('#plans .grid > div.border-fightRed').forEach(c => c.classList.add('wolf-glow'));

    // Single / Couple price flip
    ['toggle-single', 'toggle-couple'].forEach(id =>
      document.getElementById(id).addEventListener('click', () =>
        gsap.fromTo('.price-display', { yPercent: -50, rotateX: 90, opacity: 0 },
          { yPercent: 0, rotateX: 0, opacity: 1, stagger: 0.06, duration: 0.45, ease: 'back.out(2)' })));

    window.addEventListener('load', () => ScrollTrigger.refresh());   // recalc once images load
  });

  /* ---------- 4. CURSOR, CLAWS, MAGNETIC BUTTONS, TILT (mouse only) ---------- */
  if (!finePointer) return;

  document.documentElement.classList.add('has-cursor');
  document.body.insertAdjacentHTML('beforeend', '<div class="c-ring"><span></span></div><div class="c-dot"></div>');
  const dot = document.querySelector('.c-dot'), ring = document.querySelector('.c-ring'), label = ring.querySelector('span');
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });
  const dX = gsap.quickTo(dot, 'x', { duration: 0.08 }), dY = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rX = gsap.quickTo(ring, 'x', { duration: 0.4, ease: 'power3' }), rY = gsap.quickTo(ring, 'y', { duration: 0.4, ease: 'power3' });
  let shown = false;
  const show = v => { if (shown !== v) { shown = v; gsap.to([dot, ring], { opacity: v ? 1 : 0, duration: 0.2 }); } };

  addEventListener('mousemove', e => { show(true); dX(e.clientX); dY(e.clientY); rX(e.clientX); rY(e.clientY); });
  document.addEventListener('mouseleave', () => show(false));
  document.querySelectorAll('iframe').forEach(f => {          // Google Map swallows mouse events
    f.addEventListener('mouseenter', () => show(false));
    f.addEventListener('mouseleave', () => show(true));
  });
  addEventListener('mousedown', () => gsap.to(ring, { scale: 0.8, duration: 0.15 }));
  addEventListener('mouseup',   () => gsap.to(ring, { scale: 1, duration: 0.3, ease: 'back.out(3)' }));

  const labelFor = el => {
    const href = el.getAttribute('href') || '';
    if (el.type === 'submit' || href === '#contact') return 'BOOK';
    if (href.includes('wa.me')) return 'CHAT';
    if (href.startsWith('tel:')) return 'CALL';
    if (href.includes('maps')) return 'GO';
    if (href.includes('instagram') || href.includes('youtube')) return 'FOLLOW';
    return '';
  };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('a, button');
    const txt = el ? labelFor(el) : '';
    ring.classList.toggle('is-cta', !!txt);
    ring.classList.toggle('is-hover', !!el && !txt);
    label.textContent = txt;
  });

  // Wolf-claw slash on click
  addEventListener('click', e => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 60 60');
    s.setAttribute('class', 'claw');
    s.innerHTML = [0, 15, 30].map(o =>
      `<path d="M${18 + o} 4 Q${10 + o} 30 ${4 + o} 56" fill="none" stroke="#e60000" stroke-width="4" stroke-linecap="round"/>`).join('');
    s.style.left = e.clientX - 30 + 'px';
    s.style.top  = e.clientY - 30 + 'px';
    document.body.appendChild(s);
    gsap.timeline({ onComplete: () => s.remove() })
      .fromTo(s.querySelectorAll('path'), { strokeDasharray: 70, strokeDashoffset: 70 },
        { strokeDashoffset: 0, duration: 0.18, stagger: 0.04, ease: 'power2.in' })
      .to(s, { opacity: 0, y: 10, duration: 0.5, delay: 0.25 });
  });

  // Magnetic main buttons
  const clamp = gsap.utils.clamp(-14, 14);
  document.querySelectorAll('.fight-btn').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: clamp((e.clientX - r.left - r.width / 2) * 0.3),
                   y: clamp((e.clientY - r.top - r.height / 2) * 0.3), duration: 0.3 });
    });
    b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
  });

  // 3D tilt on plan + coach cards
  document.querySelectorAll('#plans .grid > div, #trainers .grid > div').forEach(c => {
    gsap.set(c, { transformPerspective: 900 });
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 10,
                   rotateX: -((e.clientY - r.top) / r.height - 0.5) * 10, duration: 0.4 });
    });
    c.addEventListener('mouseleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' }));
  });
})();
