/* ============================================================================
   RAC DCP — HOMEPAGE 3D MICRO-INTERACTIONS ENGINE (anim3d.js)
   ============================================================================
   
   WHAT THIS FILE DOES:
   Coordinates interactive 3D animations on the homepage (paired with anim3d.css):
     1. 3D Bookshelves: Report Books & Club Bulletins swing in when scrolled into view.
     2. District Map Reveal: Tilts upward smoothly during scroll, then drops a red pin.
     3. Impact Cards Tip-Up: Highlights statistics cards sequentially on entry.
     4. Flippable Award Cards: Tap, click, or press Space/Enter to flip award plaques.
     5. Magnetic CTA Buttons: Buttons gently lean toward the cursor on desktop hover.
   
   PERFORMANCE & ACCESSIBILITY:
   - Flip cards work for ALL users (even with Reduce Motion enabled).
   - Low-end PCs and mobile phones skip scroll-based tilt math & pointer listeners
     so scrolling remains locked at 60 FPS.
   ============================================================================ */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ------------------------------------------------------------------------
    // 1. FLIPPABLE AWARD CARDS (Works for everyone, with or without motion)
    // ------------------------------------------------------------------------
    document.querySelectorAll('.flip-card').forEach(function (card) {
        var btn = card.querySelector('.flip-btn');
        var titleEl = card.querySelector('.flip-front .proof-award-title');
        if (!btn) { return; }

        var title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : 'award';
        btn.addEventListener('click', function () {
            var flipped = card.classList.toggle('is-flipped');
            // Keep screen reader state synchronized with visual flip state
            btn.setAttribute('aria-expanded', flipped ? 'true' : 'false');
            btn.setAttribute('aria-label', (flipped ? 'Flip back: ' : 'Show details: ') + title);
        });
    });

    // Stop heavy 3D animations if visitor requested "Reduce Motion"
    if (reduceMotion || !('IntersectionObserver' in window)) { return; }
    root.classList.add('anim3d');

    // ------------------------------------------------------------------------
    // 2. IMPACT CARDS SEQUENTIAL STAGGER DELAY
    // ------------------------------------------------------------------------
    var impactGrid = document.querySelector('.impact-grid');
    if (impactGrid) {
        impactGrid.querySelectorAll('.impact-card').forEach(function (card, i) {
            card.classList.remove('scroll-reveal-3d'); // Replace generic fade with 3D tip-up
            card.style.setProperty('--tip-delay', (i * 0.12) + 's'); // 120ms stagger per card
        });
    }

    // ------------------------------------------------------------------------
    // 3. PLAY ONCE OBSERVER FOR IMPACT CARDS & 3D BOOKSHELVES
    // ------------------------------------------------------------------------
    // Adds `.in-view` once when the grid/shelf reaches 30% visibility, then stops watching
    var once = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                once.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.impact-grid, .book-shelf').forEach(function (el) {
        if (el) { once.observe(el); }
    });

    // Check hardware capability / narrow mobile screen to scale back expensive effects
    var isLowEnd = root.classList.contains('low-spec') ||
                   (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                   (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                   window.innerWidth < 1024;

    // ------------------------------------------------------------------------
    // 4. DISTRICT 3240 MAP SCROLL TILT & PIN DROP
    // ------------------------------------------------------------------------
    var stage = document.querySelector('.map-stage');
    if (stage) {
        var plane = stage.querySelector('.map-plane');
        if (isLowEnd) {
            // Low-spec & mobile optimization: keep map flat, drop pin when in view without scroll-listener reflows
            if (plane) { plane.style.setProperty('--map-tilt', '0'); }
            new IntersectionObserver(function (entries, observer) {
                if (entries[0].isIntersecting) {
                    stage.classList.add('pin-dropped');
                    observer.disconnect();
                }
            }, { threshold: 0.2 }).observe(stage);
        } else {
            var ticking = false;
            var listening = false;

            var update = function () {
                ticking = false;
                var rect = stage.getBoundingClientRect();
                var vh = window.innerHeight || 800;
                // Map rises from 58° backward tilt (bottom of viewport) to 0° flat (35% from top)
                var progress = (vh - rect.top) / (vh * 0.65);
                progress = Math.max(0, Math.min(1, progress));
                var eased = 1 - Math.pow(1 - progress, 3); // Ease-out curve
                plane.style.setProperty('--map-tilt', (58 * (1 - eased)).toFixed(2));
                // Trigger pin drop animation once map has mostly flattened
                if (progress >= 0.85 && !stage.classList.contains('pin-dropped')) {
                    stage.classList.add('pin-dropped');
                }
            };
            var onScroll = function () {
                if (!ticking) { ticking = true; requestAnimationFrame(update); }
            };

            // Attach scroll listener ONLY while the map stage is visible on screen
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
    }

    // ------------------------------------------------------------------------
    // 5. MAGNETIC BUTTONS (High-end desktop mice only)
    // ------------------------------------------------------------------------
    if (!isLowEnd && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.hero-buttons .btn-rebel-primary, .join-button').forEach(function (btn) {
            var frame = 0;
            btn.classList.add('magnetic');
            btn.addEventListener('pointermove', function (ev) {
                var r = btn.getBoundingClientRect();
                // Normalize cursor position relative to button center (-1.0 to +1.0)
                var dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
                var dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(function () {
                    var strength = Math.min(1, Math.sqrt(dx * dx + dy * dy));
                    // Shift button slightly toward cursor & tilt the edge under the cursor inward
                    btn.style.translate = (dx * 8).toFixed(1) + 'px ' + (dy * 6).toFixed(1) + 'px';
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
