'use strict';

/* ================================================
   CLARA MARTINEZ — main.js (Vanilla ES2026+)
   Scripts interactifs du site : aurora, curseur,
   magnétisme, scroll, animations, formulaire, etc.
   ================================================ */

/* ================================================
   AURORA BOREALIS
   Fond animé interactif en canvas : rubans ondulants
   colorés qui réagissent aux mouvements de la souris.
   Utilise des courbes de Bézier quadratiques et des
   dégradés canvas pour un rendu organique et léger.
   ================================================ */
class AuroraBorealis {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.t   = 0;

    // Souris normalisée [0-1] — cible + lissée
    this.tx = 0.5; this.ty = 0.38;
    this.mx = 0.5; this.my = 0.38;

    /* Rubans aurora — chaque bande a :
       y    : position verticale de base (fraction de H)
       amp  : amplitude des vagues (fraction de H)
       freq : fréquence spatiale
       spd  : vitesse temporelle
       ph   : déphasage initial
       thk  : épaisseur du ruban (fraction de H)
       c1   : couleur bord supérieur  [r,g,b]
       c2   : couleur bord inférieur  [r,g,b]        */
    this.bands = [
      { y:0.32, amp:0.10, freq:0.70, spd:0.42, ph:0,              thk:0.20, c1:[80,55,180],   c2:[30,160,150]  },
      { y:0.44, amp:0.08, freq:1.05, spd:0.30, ph:Math.PI*0.8,    thk:0.16, c1:[50,90,210],   c2:[130,60,215]  },
      { y:0.24, amp:0.07, freq:0.55, spd:0.25, ph:Math.PI*1.4,    thk:0.13, c1:[201,168,76],  c2:[100,55,185]  },
      { y:0.52, amp:0.06, freq:1.30, spd:0.55, ph:Math.PI*0.4,    thk:0.10, c1:[60,110,220],  c2:[30,170,155]  },
    ];

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
      this.tx = e.clientX / window.innerWidth;
      this.ty = e.clientY / window.innerHeight;
    }, { passive: true });
  }

  _loop() {
    this.t += 0.006;
    const { ctx, W, H, t } = this;

    // Lerp souris (inertie douce)
    this.mx += (this.tx - this.mx) * 0.032;
    this.my += (this.ty - this.my) * 0.032;

    // Fond uni
    ctx.fillStyle = '#08080F';
    ctx.fillRect(0, 0, W, H);

    // Ruban aurora — du fond vers l'avant
    this.bands.forEach(b => this._drawBand(b));

    // Lueur souris — halo or/violet qui suit le curseur
    const gx = this.mx * W;
    const gy = this.my * H * 0.7;
    const gr = Math.min(W, H) * 0.50;
    const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    halo.addColorStop(0,    'rgba(201,168, 76, 0.10)');
    halo.addColorStop(0.40, 'rgba( 80, 55,180, 0.07)');
    halo.addColorStop(1,    'rgba(  0,  0,  0, 0)'   );
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(() => this._loop());
  }

  _drawBand(b) {
    const { ctx, W, H, t, mx, my } = this;
    const N       = 64;                               // échantillons horizontaux
    const step    = W / N;
    const yBase   = (b.y + (my - 0.5) * 0.06) * H;  // décalage vertical souris
    const amp     = b.amp * H;
    const thk     = b.thk * H;
    const phShift = (mx - 0.5) * 0.45;               // décalage de phase horizontal souris

    // Bord supérieur du ruban (ondes composées)
    const top = Array.from({ length: N + 1 }, (_, i) => {
      const x  = i * step;
      const w1 = Math.sin(i * b.freq * 0.12 + t * b.spd + b.ph + phShift);
      const w2 = Math.sin(i * b.freq * 0.07 + t * b.spd * 0.6 + b.ph * 0.5) * 0.38;
      return { x, y: yBase + (w1 + w2) * amp };
    });

    // Bord inférieur (épaisseur variable — ruban organique)
    const bot = top.map((p, i) => ({
      x: p.x,
      y: p.y + thk * (0.55 + 0.45 * Math.sin(i * 0.19 + t * 0.48 + b.ph * 1.1))
    }));

    // Tracé du chemin
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let i = 1; i <= N; i++) {
      const mid = { x: (top[i-1].x + top[i].x) / 2, y: (top[i-1].y + top[i].y) / 2 };
      ctx.quadraticCurveTo(top[i-1].x, top[i-1].y, mid.x, mid.y);
    }
    for (let i = N; i >= 0; i--) ctx.lineTo(bot[i].x, bot[i].y);
    ctx.closePath();

    // Dégradé vertical : c1 → c2 avec transparence aux bords
    let minY = top[0].y, maxY = bot[0].y;
    for (let i = 1; i <= N; i++) {
      if (top[i].y < minY) minY = top[i].y;
      if (bot[i].y > maxY) maxY = bot[i].y;
    }
    const grad = ctx.createLinearGradient(0, minY, 0, maxY);
    const [r1,g1,bl1] = b.c1;
    const [r2,g2,bl2] = b.c2;
    grad.addColorStop(0,    `rgba(${r1},${g1},${bl1},0)`   );
    grad.addColorStop(0.22, `rgba(${r1},${g1},${bl1},0.20)`);
    grad.addColorStop(0.60, `rgba(${r2},${g2},${bl2},0.16)`);
    grad.addColorStop(1,    `rgba(${r2},${g2},${bl2},0)`   );

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}

// Démarrage de l'aurora sur le canvas #water-canvas
new AuroraBorealis('water-canvas');

/* ================================================
   LUCIDE ICONS
   Initialisation de la bibliothèque d'icônes Lucide
   après chargement du DOM. Remplace les attributs
   data-lucide="..." par les SVG correspondants.
   ================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});

/* ================================================
   CUSTOM CURSOR
   Curseur personnalisé double-calque (point or +
   anneau suiveur) qui remplace le curseur système
   sur les appareils à pointeur précis (souris).
   Change de forme au survol des liens, boutons
   et textes pour améliorer l'expérience visuelle.
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
   Effet magnétique sur les boutons avec la classe
   .magnetic : ils se déplacent légèrement vers la
   souris lors du survol, créant un effet d'attraction.
   Actif uniquement sur les dispositifs à souris fine.
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
   Le header devient opaque et réduit en padding
   dès que l'utilisateur scrolle de plus de 60px.
   La classe .scrolled est ajoutée/retirée en temps réel.
   ================================================ */
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const current = window.scrollY;
  header.classList.toggle('scrolled', current > 60);
  lastScroll = current;
}, { passive: true });

/* ================================================
   BOTTOM NAV — ÉTAT ACTIF SELON LA PAGE COURANTE
   Lit le nom du fichier actuel dans l'URL et ajoute
   la classe .active au lien correspondant dans la
   barre de navigation mobile en bas de page.
   ================================================ */
const currentFile = window.location.pathname.split('/').pop() || 'index.html';

document.querySelectorAll('.bnav-link').forEach(link => {
  if (link.getAttribute('href') === currentFile) link.classList.add('active');
});

/* ================================================
   INTERSECTION OBSERVER — ANIMATIONS AU SCROLL
   Déclenche les animations d'apparition (.animate)
   lorsque les éléments entrent dans le viewport.
   Ajoute la classe .visible pour activer la transition
   CSS. Chaque élément n'est observé qu'une fois.
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
   BENTO PROGRESS BAR
   Anime la barre de progression dans la carte bento
   du hero (taux de satisfaction 94%) dès qu'elle
   devient visible à l'écran, avec un délai de 600ms.
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
   METHOD BAR FILLS
   Anime les barres de progression des cartes méthode
   (Positionnement 92%, Pricing 86%, Acquisition 78%)
   dès que chaque barre entre dans le viewport.
   La largeur cible est lue depuis le style inline HTML.
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
   Anime les compteurs numériques (.counter) de 0
   jusqu'à leur valeur cible (data-target) en 1800ms
   avec un easing ease-out cubique. Déclenché dès
   que le compteur entre dans le viewport (60% visible).
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
   Met en surbrillance le lien de navigation qui
   correspond à la section actuellement visible.
   Utilise un IntersectionObserver avec des marges
   calibrées pour détecter la section centrale.
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
   Remplace le scroll natif du navigateur pour les
   liens ancres (#section) par un défilement fluide
   avec easing ease-in-out cubique sur 900ms.
   Prend en compte la hauteur du header fixe.
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
   Gère l'ouverture/fermeture des items de FAQ.
   Un seul item peut être ouvert à la fois (accordion).
   Ajoute/retire la classe .open et met à jour
   l'attribut aria-expanded pour l'accessibilité.
   ================================================ */
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-btn');
  btn?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Ferme tous les items
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-btn')?.setAttribute('aria-expanded', 'false');
    });
    // Ouvre l'item courant s'il était fermé
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ================================================
   CONTACT FORM — VALIDATION + ENVOI
   Validation en temps réel et à la soumission du
   formulaire de contact. Affiche les erreurs inline,
   désactive le bouton pendant l'envoi (animation
   spinner), puis affiche un message de succès après
   simulation d'envoi asynchrone (1600ms).
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

  // État de chargement
  submitBtn.disabled = true;
  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 11-6.22-8.56"/>
    </svg>
    Envoi en cours…
  `;

  // Injection de l'animation spinner (une seule fois)
  if (!document.getElementById('__spin')) {
    const s = document.createElement('style');
    s.id = '__spin';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  // Simulation d'envoi asynchrone
  setTimeout(() => {
    form.style.display = 'none';
    formSuccess.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 1600);
});

/* ================================================
   PARALLAX HERO
   Léger effet de profondeur sur la bento grid du hero
   en réponse aux mouvements de la souris. La carte
   pivote subtilement sur les axes X et Y.
   Actif uniquement sur les dispositifs à souris fine.
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
   MARQUEE — PAUSE ON HOVER
   Met en pause l'animation de défilement du bandeau
   presse (.marquee-track) lorsque l'utilisateur
   survole la zone, permettant de lire les noms.
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
