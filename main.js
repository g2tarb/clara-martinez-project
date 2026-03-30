'use strict';

/* ================================================
   CLARA MÉNDEZ — main.js (Vanilla ES2026+)
   ================================================ */

/* ================================================
   WATER RIPPLE EFFECT
   Simulation physique en 2 tampons (wave equation)
   Rendu par manipulation de pixels sur canvas offscreen
   ================================================ */
class WaterRipple {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    if (!this.canvas) return;

    // Canvas offscreen à résolution réduite (gain perf majeur)
    this.off     = document.createElement('canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.octx    = this.off.getContext('2d', { willReadFrequently: true });

    this.SCALE   = 3;          // 1 pixel sim = 3px écran
    this.DAMP    = 0.972;      // amortissement fort → ondes courtes et légères
    this.MOUSE_R = 10;         // rayon du drop souris (en px écran)
    this.MOUSE_F = 0.28;       // force réduite → sillage discret
    this.CLICK_R = 40;         // rayon click
    this.CLICK_F = 800;        // force click

    this._mx = -999; this._my = -999;
    this._lx = -999; this._ly = -999;
    this._pending = [];        // { x, y, r, f }

    this._resize();
    this._setupEvents();
    this._scheduleRandomDrops();
    this._loop();
  }

  /* ---- taille ---- */
  _resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.canvas.width  = W;
    this.canvas.height = H;
    const w = Math.ceil(W / this.SCALE);
    const h = Math.ceil(H / this.SCALE);
    this.off.width  = w;
    this.off.height = h;
    this.W = W; this.H = H;
    this.w = w; this.h = h;
    // Deux tampons float pour l'équation des ondes
    this.A = new Float32Array(w * h); // courant
    this.B = new Float32Array(w * h); // précédent
    this.imgData = this.octx.createImageData(w, h);
  }

  /* ---- événements ---- */
  _setupEvents() {
    window.addEventListener('resize', () => this._resize(), { passive: true });

    document.addEventListener('mousemove', (e) => {
      this._mx = e.clientX;
      this._my = e.clientY;
    }, { passive: true });

    document.addEventListener('click', (e) => {
      const x = e.clientX, y = e.clientY;
      this._pending.push({ x, y, r: 18, f: 1400 });
      setTimeout(() => this._pending.push({ x, y, r: 42, f: 700 }), 70);
      setTimeout(() => this._pending.push({ x, y, r: 68, f: 320 }), 170);
    }, { passive: true });

    // Touch support
    document.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      this._pending.push({ x: t.clientX, y: t.clientY, r: this.MOUSE_R, f: 120 });
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this._pending.push({ x: t.clientX, y: t.clientY, r: this.CLICK_R, f: this.CLICK_F });
    }, { passive: true });
  }


  /* ---- gouttes aléatoires périodiques (légères et espacées) ---- */
  _scheduleRandomDrops() {
    const drop = () => {
      const x = Math.random() * this.W;
      const y = Math.random() * this.H;
      const r = 6 + Math.random() * 12;
      const f = 60 + Math.random() * 100;
      this._pending.push({ x, y, r, f });
      setTimeout(drop, 2000 + Math.random() * 4000);
    };
    setTimeout(drop, 1200);
  }

  /* ---- ajouter une ondulation dans le tampon ---- */
  _addDrop(x, y, radiusPx, force) {
    const gx = Math.floor(x / this.SCALE);
    const gy = Math.floor(y / this.SCALE);
    const gr = Math.max(1, Math.ceil(radiusPx / this.SCALE));
    const { w, h, A } = this;

    for (let dy = -gr; dy <= gr; dy++) {
      for (let dx = -gr; dx <= gr; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > gr * gr) continue;
        const nx = gx + dx, ny = gy + dy;
        if (nx < 1 || nx >= w - 1 || ny < 1 || ny >= h - 1) continue;
        const d  = Math.sqrt(d2);
        A[ny * w + nx] += force * (1 - d / gr);
      }
    }
  }

  /* ---- propagation des ondes (équation des ondes 2D) ---- */
  _update() {
    const { w, h, DAMP } = this;
    let { A, B } = this;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i   = y * w + x;
        const val = (A[i - 1] + A[i + 1] + A[i - w] + A[i + w]) * 0.5 - B[i];
        B[i] = val * DAMP;
      }
    }
    // swap buffers
    this.A = B;
    this.B = A;
  }

  /* ---- rendu pixel par pixel ---- */
  _render() {
    const { w, h, A, imgData } = this;
    const px = imgData.data;

    // Couleurs de base du design (#08080F = r8 g8 b15)
    const BR = 8, BG = 9, BB = 18;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i  = y * w + x;
        const v  = A[i];

        // Gradient (normale de surface) = refraction + lumière
        const gx = x > 0 && x < w - 1 ? (A[i + 1] - A[i - 1]) : 0;
        const gy = y > 0 && y < h - 1 ? (A[i + w] - A[i - w]) : 0;

        // Lumière directionnelle — très douce
        const light = (gx - gy) * 0.10;

        // Crête → reflet doré très subtil
        const crest = Math.max(0, v) * 0.012;
        const goldR = crest * (201 - BR);
        const goldG = crest * (168 - BG);
        const goldB = crest * ( 76 - BB);

        // Creux → légère teinte bleue
        const trough  = Math.max(0, -v) * 0.008;
        const deepB   = trough * 20;

        // Accumulation
        const r = BR + light * 18 + goldR;
        const g = BG + light * 14 + goldG;
        const b = BB + light * 24 + goldB + deepB;

        const pi = i * 4;
        px[pi]     = r < 0 ? 0 : r > 255 ? 255 : r;
        px[pi + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        px[pi + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        px[pi + 3] = 255;
      }
    }

    this.octx.putImageData(imgData, 0, 0);
    // Upscale vers le canvas principal (lissage bilinéaire par défaut)
    this.ctx.drawImage(this.off, 0, 0, this.W, this.H);
  }

  /* ---- boucle principale RAF ---- */
  _loop() {
    // Drops en attente
    for (const d of this._pending) this._addDrop(d.x, d.y, d.r, d.f);
    this._pending.length = 0;

    // Souris — drop proportionnel à la vitesse
    const dx = this._mx - this._lx;
    const dy = this._my - this._ly;
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > 2) {
      this._addDrop(this._mx, this._my, this.MOUSE_R, speed * this.MOUSE_F);
      this._lx = this._mx;
      this._ly = this._my;
    }

    this._update();
    this._render();
    requestAnimationFrame(() => this._loop());
  }
}

// Démarrage de l'effet eau
new WaterRipple('water-canvas');

// -------- LUCIDE ICONS --------
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});

/* ================================================
   CUSTOM CURSOR
   ================================================ */
const cursor       = document.getElementById('cursor');
const cursorFollow = document.getElementById('cursor-follower');

if (cursor && cursorFollow && window.matchMedia('(pointer: fine)').matches) {
  let mouseX = -100, mouseY = -100;
  let followX = -100, followY = -100;
  let raf;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const animateCursor = () => {
    cursor.style.left       = mouseX + 'px';
    cursor.style.top        = mouseY + 'px';
    followX += (mouseX - followX) * 0.1;
    followY += (mouseY - followY) * 0.1;
    cursorFollow.style.left = followX + 'px';
    cursorFollow.style.top  = followY + 'px';
    raf = requestAnimationFrame(animateCursor);
  };
  raf = requestAnimationFrame(animateCursor);

  // Hover states
  const hoverEls = document.querySelectorAll('a, button, .faq-btn, .pricing-card, .testi-card, input, textarea');
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovered');
      cursorFollow.classList.add('hovered');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovered');
      cursorFollow.classList.remove('hovered');
    });
  });

  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    cursorFollow.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    cursorFollow.style.opacity = '1';
  });
}

/* ================================================
   MAGNETIC BUTTONS
   ================================================ */
document.querySelectorAll('.magnetic').forEach(btn => {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  btn.addEventListener('mousemove', (e) => {
    const rect   = btn.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = (e.clientX - cx) * 0.3;
    const dy     = (e.clientY - cy) * 0.3;
    btn.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ================================================
   HEADER SCROLL
   ================================================ */
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const current = window.scrollY;
  header.classList.toggle('scrolled', current > 60);
  lastScroll = current;
}, { passive: true });

/* ================================================
   BURGER / MOBILE MENU
   ================================================ */
const burger     = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
const mobileClose = document.getElementById('mobile-close');
const mobileLinks = document.querySelectorAll('.mobile-link');

const toggleMenu = (open) => {
  burger.classList.toggle('active', open);
  mobileMenu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
};

burger?.addEventListener('click', () => toggleMenu(!mobileMenu.classList.contains('open')));
mobileClose?.addEventListener('click', () => toggleMenu(false));
mobileLinks.forEach(l => l.addEventListener('click', () => toggleMenu(false)));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu?.classList.contains('open')) {
    toggleMenu(false);
    burger?.focus();
  }
});

/* ================================================
   INTERSECTION OBSERVER — SCROLL ANIMATIONS
   ================================================ */
const animEls = document.querySelectorAll('.animate');

const animObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animObs.unobserve(entry.target);
      // Trigger bar fills on method cards when visible
      if (entry.target.classList.contains('method-card')) {
        const fill = entry.target.querySelector('.method-bar-fill');
        if (fill) fill.style.width = fill.style.width; // trigger reflow
      }
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

animEls.forEach(el => animObs.observe(el));

/* ================================================
   BENTO PROGRESS BAR — animate on load
   ================================================ */
const progressFill = document.querySelector('.bento-progress-fill');
if (progressFill) {
  const progressObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => { progressFill.style.width = '94%'; }, 600);
        progressObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  progressObs.observe(progressFill);
}

/* ================================================
   METHOD BAR FILLS — animate on intersection
   ================================================ */
document.querySelectorAll('.method-bar-fill').forEach(fill => {
  const targetW = fill.style.width;
  fill.style.width = '0';

  const barObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => { fill.style.width = targetW; }, 300);
        barObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  barObs.observe(fill);
});

/* ================================================
   COUNTER ANIMATION
   ================================================ */
const counters = document.querySelectorAll('.counter');

const countObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el     = entry.target;
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start  = performance.now();

    const step = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    countObs.unobserve(el);
  });
}, { threshold: 0.6 });

counters.forEach(c => countObs.observe(c));

/* ================================================
   ACTIVE NAV LINK HIGHLIGHT
   ================================================ */
const sections  = document.querySelectorAll('main section[id]');
const navLinks  = document.querySelectorAll('.nav-link');

const navObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', active);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => navObs.observe(s));

/* ================================================
   SMOOTH ANCHOR SCROLL
   ================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = header.offsetHeight + 16;
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ================================================
   FAQ ACCORDION
   ================================================ */
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-btn');
  btn?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-btn')?.setAttribute('aria-expanded', 'false');
    });
    // Open current if was closed
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ================================================
   CONTACT FORM — Real-time validation + Submit
   ================================================ */
const validators = {
  firstname: v => v.trim().length >= 2,
  lastname:  v => v.trim().length >= 2,
  email:     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  activity:  v => v.trim().length >= 3,
  message:   v => v.trim().length >= 20,
};

const validateField = (field) => {
  const id      = field.id;
  const isValid = validators[id]?.(field.value) ?? true;
  const errEl   = document.getElementById(`err-${id}`);
  const touched = field.value !== '';

  field.classList.toggle('error', !isValid && touched);
  field.classList.toggle('valid', isValid && touched);
  errEl?.classList.toggle('show', !isValid && touched);

  return isValid;
};

Object.keys(validators).forEach(id => {
  const field = document.getElementById(id);
  if (!field) return;
  field.addEventListener('blur', () => validateField(field));
  field.addEventListener('input', () => {
    if (field.classList.contains('error') || field.classList.contains('valid')) {
      validateField(field);
    }
  });
});

const form        = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');
const submitBtn   = document.getElementById('form-submit');

form?.addEventListener('submit', (e) => {
  e.preventDefault();

  let allValid = true;
  Object.keys(validators).forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;
    if (!validateField(field)) {
      allValid = false;
      const errEl = document.getElementById(`err-${id}`);
      errEl?.classList.add('show');
      field.classList.add('error');
    }
  });

  if (!allValid) {
    form.querySelector('.form-control.error')?.focus();
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 11-6.22-8.56"/>
    </svg>
    Envoi en cours…
  `;

  // Inject spinner keyframe once
  if (!document.getElementById('__spin')) {
    const s = document.createElement('style');
    s.id = '__spin';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  // Simulate async send
  setTimeout(() => {
    form.style.display = 'none';
    formSuccess.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 1600);
});

/* ================================================
   PARALLAX — subtle hero depth on mouse
   ================================================ */
const heroBento = document.querySelector('.hero-bento');
if (heroBento && window.matchMedia('(pointer: fine)').matches) {
  document.addEventListener('mousemove', (e) => {
    const { innerWidth: w, innerHeight: h } = window;
    const dx = ((e.clientX / w) - 0.5) * 12;
    const dy = ((e.clientY / h) - 0.5) * 8;
    heroBento.style.transform = `perspective(1000px) rotateY(${-dx * 0.4}deg) rotateX(${dy * 0.3}deg) translateZ(10px)`;
  });

  document.querySelector('#hero')?.addEventListener('mouseleave', () => {
    heroBento.style.transform = '';
  });
}

/* ================================================
   MARQUEE — pause on hover
   ================================================ */
const marqueeTrack = document.querySelector('.marquee-track');
if (marqueeTrack) {
  marqueeTrack.addEventListener('mouseenter', () => {
    marqueeTrack.style.animationPlayState = 'paused';
  });
  marqueeTrack.addEventListener('mouseleave', () => {
    marqueeTrack.style.animationPlayState = 'running';
  });
}
