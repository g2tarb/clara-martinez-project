'use strict';

/* ================================================
   CLARA MÉNDEZ — main.js (Vanilla ES2026+)
   ================================================ */

/* ================================================
   GENTLE WAVE — effet lumineux doux (gradient radial)
   Aucune manipulation de pixels, très léger sur le CPU
   ================================================ */
class GentleWave {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.t   = 0;

    // Position souris courante (lissée) et cible
    this.mx = null; this.my = null;
    this.tx = null; this.ty = null;

    this._resize();
    this._setupEvents();
    this._loop();
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
  }

  _setupEvents() {
    window.addEventListener('resize', () => this._resize(), { passive: true });
    document.addEventListener('mousemove', (e) => {
      this.tx = e.clientX;
      this.ty = e.clientY;
    }, { passive: true });
  }

  _loop() {
    this.t += 0.006;
    const { ctx, t, W, H } = this;

    // Lissage souris (lerp doux)
    if (this.tx !== null) {
      if (this.mx === null) { this.mx = this.tx; this.my = this.ty; }
      this.mx += (this.tx - this.mx) * 0.045;
      this.my += (this.ty - this.my) * 0.045;
    }

    // Fond
    ctx.fillStyle = '#08080F';
    ctx.fillRect(0, 0, W, H);

    // Blob ambiant 1 — dérive lentement (vague de fond)
    this._drawBlob(
      W * 0.5 + Math.sin(t * 0.55) * W * 0.28,
      H * 0.5 + Math.cos(t * 0.42) * H * 0.22,
      W * 0.72,
      [[0,   'rgba(80, 55, 180, 0.18)'],
       [0.6, 'rgba(40, 25, 110, 0.08)'],
       [1,   'rgba(0,  0,  0,  0)'   ]]
    );

    // Blob ambiant 2 — contre-phase douce
    this._drawBlob(
      W * 0.35 + Math.cos(t * 0.48) * W * 0.22,
      H * 0.55 + Math.sin(t * 0.65) * H * 0.18,
      W * 0.55,
      [[0,   'rgba(50, 90, 200, 0.14)'],
       [0.6, 'rgba(25, 50, 140, 0.06)'],
       [1,   'rgba(0,  0,  0,  0)'   ]]
    );

    // Lueur souris — suit le curseur avec douceur
    if (this.mx !== null) {
      this._drawBlob(
        this.mx, this.my,
        Math.min(W, H) * 0.42,
        [[0,   'rgba(180, 150, 255, 0.22)'],
         [0.35,'rgba(110,  85, 210, 0.10)'],
         [1,   'rgba(0,    0,   0,  0)'   ]]
      );
    }

    requestAnimationFrame(() => this._loop());
  }

  _drawBlob(cx, cy, r, stops) {
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    stops.forEach(([pos, color]) => g.addColorStop(pos, color));
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }
}

// Démarrage de l'effet doux
new GentleWave('water-canvas');

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

  // Hover states — liens & boutons
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

  // Hover texte — rond négatif sur les titres et paragraphes
  const textEls = document.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, label, .section-label');
  textEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('text-hovered');
      cursorFollow.classList.add('text-hovered');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('text-hovered');
      cursorFollow.classList.remove('text-hovered');
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
   BOTTOM NAV — état actif selon la page courante
   ================================================ */
const currentFile = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.bnav-link').forEach(link => {
  if (link.getAttribute('href') === currentFile) link.classList.add('active');
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
   SMOOTH ANCHOR SCROLL — easing cubic doux
   ================================================ */
const smoothScrollTo = (targetY, duration = 900) => {
  const startY = window.scrollY;
  const dist   = targetY - startY;
  let start = null;
  const ease = t => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease-in-out cubic
  const step = ts => {
    if (!start) start = ts;
    const elapsed  = Math.min((ts - start) / duration, 1);
    window.scrollTo(0, startY + dist * ease(elapsed));
    if (elapsed < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = header.offsetHeight + 16;
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    smoothScrollTo(top);
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
