/* =========================================================
   RAC DCP — ACCESSIBILITY + INTERACTION LAYER
   =========================================================

   Loaded AFTER script.js so it can wrap the functions script.js
   declares on window (openLightbox / closeLightbox).

   ONE IIFE, ZERO top-level declarations — script.js declares 26
   top-level `const`s in the global declarative record and
   re-declaring any of them is a SyntaxError that kills the file.

   Contents:
     1. Modal helper   dialog semantics, focus trap + restore, and a
                       STACK so body.lightbox-open is only released
                       when the last dialog closes.
     2. Retrofits      the two existing lightboxes gain the above
                       without their internals being rewritten, so
                       motion.js's FLIP wrap keeps working.
     3. Keyboard       70 gallery tiles and 17 award images are divs
                       and imgs with click handlers - mouse-only today.
     4. Project filter + detail modal.
   ========================================================= */

(function () {
    'use strict';

    var MODAL_STACK = [];

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    /* =====================================================
       1. MODAL HELPER
       ===================================================== */

    var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea,' +
                    '[tabindex]:not([tabindex="-1"])';

    function focusablesIn(el) {
        return qsa(FOCUSABLE, el).filter(function (n) {
            return n.offsetParent !== null || n === document.activeElement;
        });
    }

    function topModal() {
        return MODAL_STACK.length ? MODAL_STACK[MODAL_STACK.length - 1] : null;
    }

    function registerModal(el, label) {
        if (!el || el.__modalReady) { return; }
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('tabindex', '-1');
        if (label) { el.setAttribute('aria-label', label); }
        el.__modalReady = true;
    }

    /* Hide the rest of the page from assistive tech while a dialog is up. */
    function setBackgroundHidden(hidden) {
        qsa('body > *').forEach(function (node) {
            if (node.__isModal || node.tagName === 'SCRIPT') { return; }
            if (hidden) {
                if (!node.hasAttribute('aria-hidden')) {
                    node.setAttribute('aria-hidden', 'true');
                    node.__ariaHiddenByModal = true;
                }
            } else if (node.__ariaHiddenByModal) {
                node.removeAttribute('aria-hidden');
                node.__ariaHiddenByModal = false;
            }
        });
    }

    function focusInto(el) {
        var f = focusablesIn(el);
        try { (f.length ? f[0] : el).focus({ preventScroll: true }); } catch (e) {}
    }

    function openModal(el) {
        if (!el) { return; }
        // Already open (a stuck stack entry, or a re-open): still re-focus
        // rather than silently doing nothing.
        if (MODAL_STACK.indexOf(el) !== -1) { focusInto(el); return; }
        el.__isModal = true;
        el.__restoreFocus = document.activeElement;
        if (!MODAL_STACK.length) {
            setBackgroundHidden(true);
            document.body.classList.add('lightbox-open');
        }
        MODAL_STACK.push(el);

        // Focus SYNCHRONOUSLY. Callers add .active before calling this, so
        // the overlay is already visible and .focus() lands. Deferring to
        // requestAnimationFrame looked equivalent but is not: rAF is frozen
        // whenever the tab is hidden or throttled, and focus would then
        // never move into the dialog at all. A 0ms retry covers the case
        // where a caller sets .active after us.
        focusInto(el);
        setTimeout(function () {
            if (MODAL_STACK.indexOf(el) !== -1 && !el.contains(document.activeElement)) {
                focusInto(el);
            }
        }, 0);
    }

    function closeModal(el) {
        var i = MODAL_STACK.indexOf(el);
        if (i === -1) { return; }
        MODAL_STACK.splice(i, 1);

        if (!MODAL_STACK.length) {
            setBackgroundHidden(false);
            document.body.classList.remove('lightbox-open');
        }
        var r = el.__restoreFocus;
        if (r && document.contains(r) && r.offsetParent !== null) {
            r.focus({ preventScroll: true });
        }
        el.__restoreFocus = null;
        if (window.MOTION3D && window.MOTION3D.remeasure) { window.MOTION3D.remeasure(); }
    }

    // One trap for every dialog, capture phase so it beats page handlers.
    document.addEventListener('keydown', function (ev) {
        var m = topModal();
        if (!m || ev.key !== 'Tab') { return; }
        var f = focusablesIn(m);
        if (!f.length) { ev.preventDefault(); m.focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && (document.activeElement === first || document.activeElement === m)) {
            ev.preventDefault(); last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
            ev.preventDefault(); first.focus();
        }
    }, true);


    /* =====================================================
       2. RETROFIT THE TWO EXISTING LIGHTBOXES
       Wrap rather than rewrite: script.js's openLightbox must stay a
       top-level function declaration on window, because motion.js
       wraps it for the FLIP zoom. Replacing it would silently kill
       that effect with no error.
       ===================================================== */

    function retrofitGalleryLightbox() {
        var lb = qs('.gallery-lightbox');
        if (!lb) { return; }
        registerModal(lb, 'Image viewer');
        var closeBtn = qs('.lightbox-close', lb);
        if (closeBtn) { closeBtn.setAttribute('aria-label', 'Close image viewer'); }

        var origOpen = window.openLightbox;
        if (typeof origOpen === 'function') {
            window.openLightbox = function () {
                var r = origOpen.apply(this, arguments);
                openModal(lb);
                return r;
            };
        }
        var origClose = window.closeLightbox;
        if (typeof origClose === 'function') {
            window.closeLightbox = function () {
                closeModal(lb);
                return origClose.apply(this, arguments);
            };
        }
    }

    function retrofitAchievementLightbox() {
        var lb = qs('.achievement-lightbox');
        if (!lb) { return; }
        registerModal(lb, 'Award viewer');
        var closeBtn = qs('.achievement-lightbox-close', lb);
        if (closeBtn) { closeBtn.setAttribute('aria-label', 'Close award viewer'); }

        // It has no opener function to wrap, so follow its .active class.
        new MutationObserver(function () {
            if (lb.classList.contains('active')) { openModal(lb); }
            else { closeModal(lb); }
        }).observe(lb, { attributes: true, attributeFilter: ['class'] });
    }


    /* =====================================================
       3. KEYBOARD ACCESS FOR THE CLICKABLE GRIDS
       Done at runtime so none of the 87 tags need editing.
       ===================================================== */

    function makeActivatable(el, label) {
        if (el.__activatable) { return; }
        el.__activatable = true;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        if (label) { el.setAttribute('aria-label', label); }
        el.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
                ev.preventDefault();
                el.click();
            }
        });
    }

    function enableGridKeyboard() {
        qsa('.gallery-item').forEach(function (it) {
            var img = qs('img', it);
            makeActivatable(it, img ? 'View photo: ' + img.alt : 'View photo');
        });
        qsa('.achievement-image img').forEach(function (img) {
            makeActivatable(img, 'View award: ' + img.alt);
        });
    }


    /* =====================================================
       4. NAV + HERO SEMANTICS
       ===================================================== */

    function enhanceNav() {
        var toggle = qs('.menu-toggle');
        var menu = qs('.nav-menu');
        if (!toggle || !menu) { return; }

        // script.js toggles .active and swaps the glyph but never updates
        // aria state, so a screen reader hears "Open navigation menu"
        // while the menu is already open.
        function sync() {
            var open = menu.classList.contains('active');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close navigation menu'
                                                   : 'Open navigation menu');
        }
        new MutationObserver(sync).observe(menu, {
            attributes: true, attributeFilter: ['class']
        });
        sync();
    }

    function enhanceHeroCarousel() {
        var carousel = qs('#heroCarousel');
        if (!carousel) { return; }
        var slides = qsa('.hero-slide', carousel);
        if (!slides.length) { return; }

        carousel.setAttribute('aria-live', 'polite');
        carousel.setAttribute('aria-atomic', 'true');

        // All four slides sit in the DOM at opacity 0, so without this a
        // screen reader reads all four slogans back to back.
        function sync() {
            slides.forEach(function (s) {
                var on = s.classList.contains('active');
                if (on) { s.removeAttribute('aria-hidden'); }
                else { s.setAttribute('aria-hidden', 'true'); }
            });
        }
        slides.forEach(function (s) {
            new MutationObserver(sync).observe(s, {
                attributes: true, attributeFilter: ['class']
            });
        });
        sync();

        qsa('.carousel-dot', carousel).forEach(function (d, i) {
            d.setAttribute('type', 'button');
            d.setAttribute('aria-label', 'Show statement ' + (i + 1));
        });
    }

    function fixFooterYear() {
        var el = document.getElementById('footerYear');
        if (el) { el.textContent = new Date().getFullYear(); }
    }


    /* =====================================================
       5. PROJECT FILTER + DETAIL MODAL
       ===================================================== */

    var projects = {};   // key -> { card, title, date, avenue, tag, body, photos[] }

    // "club-installation-14.jpg" -> "club-installation"
    // "7-days-rotaract.jpeg"     -> "7-days-rotaract"   (no trailing -N)
    function keyOf(src) {
        return src.split('/').pop()
                  .replace(/\.[a-z0-9]+$/i, '')
                  .replace(/-\d+$/, '');
    }

    function slug(s) {
        return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function buildProjectIndex() {
        // Photo sets already exist in the gallery, just unlinked.
        var photos = {};
        qsa('.gallery-item img').forEach(function (img) {
            var k = keyOf(img.getAttribute('src'));
            (photos[k] = photos[k] || []).push({
                src: img.getAttribute('src'),
                alt: img.alt || '',
                w: img.getAttribute('width'),
                h: img.getAttribute('height')
            });
        });

        qsa('.project-card').forEach(function (card) {
            var img = qs('.project-image img', card);
            if (!img) { return; }
            var k = keyOf(img.getAttribute('src'));
            var metas = qsa('.project-meta span', card);
            var avenue = metas.length > 1 ? metas[1].textContent.trim() : '';
            var tagEl = qs('.project-tag', card);

            card.dataset.project = k;
            if (avenue) { card.classList.add('pf-' + slug(avenue)); }

            projects[k] = {
                card: card,
                title: (qs('h3', card) || {}).textContent || '',
                date: metas.length ? metas[0].textContent.trim() : '',
                avenue: avenue,
                tag: tagEl ? tagEl.textContent.trim() : '',
                tagClass: tagEl ? tagEl.className : 'project-tag',
                body: (qs('.project-content p', card) || {}).textContent || '',
                hero: img.getAttribute('src'),
                photos: photos[k] || []
            };
        });
        return projects;
    }

    function buildFilterBar() {
        var grid = qs('.project-grid');
        if (!grid || qs('.project-filters')) { return; }

        var counts = {};
        qsa('.project-card').forEach(function (c) {
            var k = c.dataset.project;
            var a = projects[k] && projects[k].avenue;
            if (a) { counts[a] = (counts[a] || 0) + 1; }
        });
        var avenues = Object.keys(counts).sort();

        var bar = document.createElement('div');
        bar.className = 'project-filters';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', 'Filter projects by service avenue');

        function btn(label, filter, count, active) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'project-filter' + (active ? ' active' : '');
            b.setAttribute('data-filter', filter);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
            b.innerHTML = label + ' <span>' + count + '</span>';
            return b;
        }
        bar.appendChild(btn('ALL', 'all', qsa('.project-card').length, true));
        avenues.forEach(function (a) {
            bar.appendChild(btn(a, 'pf-' + slug(a), counts[a], false));
        });

        var status = document.createElement('p');
        status.className = 'project-filter-status sr-only';
        status.setAttribute('role', 'status');
        bar.appendChild(status);

        // motion.js may already have wrapped the grid in a scene track
        // (it loads first). Anchor to the outermost wrapper, or the bar
        // ends up INSIDE the sticky stage and pins with the corridor.
        var anchor = grid.closest('.fly-track') || grid;
        anchor.parentNode.insertBefore(bar, anchor);

        // NOTE: class is .project-filter, deliberately NOT .gallery-filter.
        // script.js and motion.js both bind handlers to .gallery-filter,
        // so sharing the class would re-filter the gallery and fire a
        // 70-element FLIP on every project-filter click.
        bar.addEventListener('click', function (ev) {
            var b = ev.target.closest && ev.target.closest('.project-filter');
            if (!b) { return; }
            var f = b.getAttribute('data-filter');

            qsa('.project-filter', bar).forEach(function (o) {
                var on = o === b;
                o.classList.toggle('active', on);
                o.setAttribute('aria-pressed', on ? 'true' : 'false');
            });

            var shown = 0;
            qsa('.project-card').forEach(function (c) {
                var vis = (f === 'all') || c.classList.contains(f);
                c.classList.toggle('hidden', !vis);
                if (vis) { shown++; }
            });
            status.textContent = shown + (shown === 1 ? ' project shown' : ' projects shown');
        });
    }

    /* --- the modal ------------------------------------------------- */

    var pm = null, pmIndex = 0, pmKey = null;

    function buildProjectModal() {
        if (pm) { return pm; }
        pm = document.createElement('div');
        pm.className = 'project-modal';
        pm.innerHTML =
            '<div class="project-modal-panel">' +
              '<button class="project-modal-close" type="button" aria-label="Close project details">&times;</button>' +
              '<div class="project-modal-hero">' +
                '<img src="" alt="">' +
                '<button class="pm-nav pm-prev" type="button" aria-label="Previous photo">&#10094;</button>' +
                '<button class="pm-nav pm-next" type="button" aria-label="Next photo">&#10095;</button>' +
                '<span class="pm-counter"></span>' +
              '</div>' +
              '<div class="project-modal-body">' +
                '<div class="project-modal-meta"><span class="pm-date"></span><span class="pm-avenue"></span></div>' +
                '<h3 class="pm-title"></h3>' +
                '<p class="pm-desc"></p>' +
                '<span class="pm-tag"></span>' +
                '<a class="pm-gallery-link" href="#gallery">See all photos in the gallery &rarr;</a>' +
              '</div>' +
            '</div>';
        // MUST be a child of <body>: the compositor writes a live transform
        // to every .project-card, and a transformed ancestor becomes the
        // containing block for position:fixed — a nested modal would tilt
        // and drift with the card every frame.
        document.body.appendChild(pm);
        registerModal(pm, 'Project details');

        qs('.project-modal-close', pm).addEventListener('click', closeProjectModal);
        qs('.pm-prev', pm).addEventListener('click', function () { pmPage(-1); });
        qs('.pm-next', pm).addEventListener('click', function () { pmPage(1); });
        pm.addEventListener('click', function (ev) {
            if (ev.target === pm) { closeProjectModal(); }
        });
        document.addEventListener('keydown', function (ev) {
            if (!pm.classList.contains('active')) { return; }
            if (ev.key === 'Escape') { closeProjectModal(); }
            else if (ev.key === 'ArrowLeft') { pmPage(-1); }
            else if (ev.key === 'ArrowRight') { pmPage(1); }
        });
        return pm;
    }

    function pmPhotos() {
        var p = projects[pmKey];
        if (!p) { return []; }
        return p.photos.length ? p.photos : [{ src: p.hero, alt: p.title, w: null, h: null }];
    }

    function pmRender() {
        var list = pmPhotos();
        var img = qs('.project-modal-hero img', pm);
        var ph = list[pmIndex];
        img.src = ph.src;
        img.alt = ph.alt || '';
        if (ph.w) { img.setAttribute('width', ph.w); img.setAttribute('height', ph.h); }
        qs('.pm-counter', pm).textContent = list.length > 1
            ? (pmIndex + 1) + ' / ' + list.length : '';
        var multi = list.length > 1;
        qs('.pm-prev', pm).style.display = multi ? '' : 'none';
        qs('.pm-next', pm).style.display = multi ? '' : 'none';
    }

    function pmPage(d) {
        var n = pmPhotos().length;
        if (n < 2) { return; }
        pmIndex = (pmIndex + d + n) % n;   // same wrap arithmetic as the gallery lightbox
        pmRender();
    }

    // Global so motion.js can wrap it for the FLIP zoom.
    window.openProjectModal = function (key) {
        var p = projects[key];
        if (!p) { return; }
        buildProjectModal();
        pmKey = key;
        pmIndex = 0;

        qs('.pm-title', pm).textContent = p.title.trim();
        qs('.pm-desc', pm).textContent = p.body.trim();
        qs('.pm-date', pm).textContent = p.date;
        qs('.pm-avenue', pm).textContent = p.avenue;
        var tag = qs('.pm-tag', pm);
        tag.textContent = p.tag;
        tag.className = 'pm-tag ' + p.tagClass;
        tag.style.display = p.tag ? '' : 'none';
        qs('.pm-gallery-link', pm).style.display = p.photos.length ? '' : 'none';

        pmRender();
        pm.classList.add('active');
        openModal(pm);
    };

    function closeProjectModal() {
        if (!pm) { return; }
        pm.classList.remove('active');
        closeModal(pm);
    }

    function wireProjectCards() {
        var grid = qs('.project-grid');
        if (!grid) { return; }
        qsa('.project-card').forEach(function (card) {
            makeActivatable(card, 'View project details: ' +
                ((qs('h3', card) || {}).textContent || '').trim());
            if (!qs('.project-open-hint', card)) {
                var hint = document.createElement('span');
                hint.className = 'project-open-hint';
                hint.textContent = 'VIEW PROJECT →';
                (qs('.project-content', card) || card).appendChild(hint);
            }
        });
        grid.addEventListener('click', function (ev) {
            var card = ev.target.closest && ev.target.closest('.project-card');
            if (!card || !card.dataset.project) { return; }
            window.openProjectModal(card.dataset.project);
        });
    }


    /* =====================================================
       6. BOOT
       ===================================================== */

    function init() {
        retrofitGalleryLightbox();
        retrofitAchievementLightbox();
        enableGridKeyboard();
        enhanceNav();
        enhanceHeroCarousel();
        fixFooterYear();

        buildProjectIndex();
        buildFilterBar();
        wireProjectCards();
        buildProjectModal();

        // Re-key keyboard access after a people tab switches.
        var origShow = window.showPeople;
        if (typeof origShow === 'function') {
            window.showPeople = function () {
                var r = origShow.apply(this, arguments);
                enableGridKeyboard();
                return r;
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
