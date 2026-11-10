/* =========================================================
   anim3d.js — drives the homepage 3D animations (see anim3d.css)
   Loaded after script.js and enhance.js.
   ========================================================= */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 4. Award cards: tap, Enter or Space flips them (with or without motion) */
    document.querySelectorAll('.flip-card').forEach(function (card) {
        var btn = card.querySelector('.flip-btn');
        var titleEl = card.querySelector('.flip-front .proof-award-title');
        if (!btn) { return; }
        var title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : 'award';
        btn.addEventListener('click', function () {
            var flipped = card.classList.toggle('is-flipped');
            btn.setAttribute('aria-expanded', flipped ? 'true' : 'false');
            btn.setAttribute('aria-label', (flipped ? 'Flip back: ' : 'Show details: ') + title);
        });
    });

    if (reduceMotion || !('IntersectionObserver' in window)) { return; }
    root.classList.add('anim3d');

    /* 3. Impact cards: the tip-up replaces the generic fade-in on these cards */
    var impactGrid = document.querySelector('.impact-grid');
    if (impactGrid) {
        impactGrid.querySelectorAll('.impact-card').forEach(function (card, i) {
            card.classList.remove('scroll-reveal-3d');
            card.style.setProperty('--tip-delay', (i * 0.12) + 's');
        });
    }

    /* 1 + 3. Play once when the impact cards / bookshelf scroll into view */
    var once = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                once.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    ['.impact-grid', '.book-shelf'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) { once.observe(el); }
    });

    /* 2. Map tilts up with the scroll, then the pin drops */
    var stage = document.querySelector('.map-stage');
    if (stage) {
        var plane = stage.querySelector('.map-plane');
        var ticking = false;
        var listening = false;

        var update = function () {
            ticking = false;
            var rect = stage.getBoundingClientRect();
            var vh = window.innerHeight || 800;
            // 0 when the map's top is at the bottom of the screen,
            // 1 when it has risen to 35% from the top.
            var progress = (vh - rect.top) / (vh * 0.65);
            progress = Math.max(0, Math.min(1, progress));
            var eased = 1 - Math.pow(1 - progress, 3);
            plane.style.setProperty('--map-tilt', (58 * (1 - eased)).toFixed(2));
            if (progress >= 0.85 && !stage.classList.contains('pin-dropped')) {
                stage.classList.add('pin-dropped');
            }
        };
        var onScroll = function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        };

        // Only listen to scrolling while the map is on screen.
        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !listening) {
                    listening = true;
                    window.addEventListener('scroll', onScroll, { passive: true });
                    update();
                } else if (!entry.isIntersecting && listening) {
                    listening = false;
                    window.removeEventListener('scroll', onScroll);
                    update();
                }
            });
        }).observe(stage);
        update();
    }

    /* 6. Magnetic buttons — mouse devices only */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.hero-buttons .btn-rebel-primary, .join-button').forEach(function (btn) {
            var frame = 0;
            btn.classList.add('magnetic');
            btn.addEventListener('pointermove', function (ev) {
                var r = btn.getBoundingClientRect();
                var dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
                var dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(function () {
                    var strength = Math.min(1, Math.sqrt(dx * dx + dy * dy));
                    btn.style.translate = (dx * 8).toFixed(1) + 'px ' + (dy * 6).toFixed(1) + 'px';
                    // Tilt so the side under the pointer presses in.
                    btn.style.rotate = (-dy).toFixed(3) + ' ' + dx.toFixed(3) + ' 0 ' + (strength * 12).toFixed(1) + 'deg';
                });
            });
            btn.addEventListener('pointerleave', function () {
                cancelAnimationFrame(frame);
                btn.style.translate = '';
                btn.style.rotate = '';
            });
        });
    }
})();
