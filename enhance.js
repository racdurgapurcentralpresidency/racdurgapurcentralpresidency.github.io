/* ============================================================================
   RAC DCP — ACCESSIBILITY & INTERACTION LAYER (enhance.js)
   ============================================================================
   
   WHAT THIS FILE DOES:
   This file is an enhancement layer loaded AFTER `script.js`. It adds:
     1. Complete Keyboard & Screen-Reader Accessibility (ARIA dialog roles,
        focus trapping so keyboard users don't get lost behind popups, and focus
        restoration when closing modals).
     2. Seamless Retrofits: Enhances the existing image lightboxes without
        rewriting their core code, preserving 3D animations in motion.js.
     3. Project Filtering System: Instant category filtering buttons (Community
        Service, Club Service, etc.) and deep-link URL sharing (#project-name).
     4. Interactive Project Detail Modal: Shows project photos, description, date,
        avenue badge, and supports touch swipe on mobile phones!
     5. Dark / Light Theme System: Persists user preference across page reloads
        and synchronizes theme switches instantly across open browser tabs.
   
   SAFETY ARCHITECTURE:
   Wrapped inside a single self-executing function (IIFE) with 'use strict'.
   Zero top-level global variables are declared to prevent naming collisions
   with `script.js` or `motion.js`.
   ============================================================================ */

(function () {
    'use strict';

    // ------------------------------------------------------------------------
    // MODAL STACK TRACKER
    // ------------------------------------------------------------------------
    // Keeps a list of all currently open popups/dialogs in order.
    // If modal B opens on top of modal A, we only unlock the webpage scrollbar
    // when the very last modal is closed!
    var MODAL_STACK = [];

    // Helper shorthand for document.querySelector and querySelectorAll
    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }


    /* ========================================================================
       1. MODAL & ACCESSIBILITY HELPER FUNCTIONS
       ======================================================================== */

    // CSS selector matching all HTML elements that can receive keyboard focus
    var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea,' +
                    '[tabindex]:not([tabindex="-1"])';

    /**
     * Find all visible, interactive elements inside a container
     * (Ignores elements that are hidden with display:none)
     */
    function focusablesIn(el) {
        return qsa(FOCUSABLE, el).filter(function (n) {
            return n.offsetParent !== null || n === document.activeElement;
        });
    }

    /**
     * Get the topmost active modal from the stack
     */
    function topModal() {
        return MODAL_STACK.length ? MODAL_STACK[MODAL_STACK.length - 1] : null;
    }

    /**
     * Set up proper screen reader attributes on a dialog
     * Tells screen readers: "This is an interactive dialog window"
     */
    function registerModal(el, label) {
        if (!el || el.__modalReady) { return; }
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('tabindex', '-1');
        if (label) { el.setAttribute('aria-label', label); }
        el.__modalReady = true;
    }

    /**
     * Hide or unhide the rest of the webpage from screen readers.
     * When a modal is open, assistive tech should ONLY read the modal content,
     * not the background page behind it.
     */
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

    /**
     * Move keyboard focus smoothly into the modal
     */
    function focusInto(el) {
        var f = focusablesIn(el);
        try { (f.length ? f[0] : el).focus({ preventScroll: true }); } catch (e) {}
    }

    /**
     * Open a modal dialog
     * - Remembers which button originally had focus so we can return focus when closed.
     * - Locks page scrolling by adding the 'lightbox-open' class to <body>.
     * - Pushes modal onto MODAL_STACK.
     */
    function openModal(el) {
        if (!el) { return; }
        // If already open, just make sure keyboard focus stays inside
        if (MODAL_STACK.indexOf(el) !== -1) { focusInto(el); return; }
        el.__isModal = true;
        el.__restoreFocus = document.activeElement; // Remember where the user was
        
        if (!MODAL_STACK.length) {
            setBackgroundHidden(true);
            document.body.classList.add('lightbox-open');
        }
        MODAL_STACK.push(el);

        // Move focus into the modal immediately
        focusInto(el);
        setTimeout(function () {
            if (MODAL_STACK.indexOf(el) !== -1 && !el.contains(document.activeElement)) {
                focusInto(el);
            }
        }, 0);
    }

    /**
     * Close a modal dialog
     * - Removes from MODAL_STACK.
     * - If no more modals are open, re-enables background page scrolling.
     * - Returns keyboard focus back to the button that originally opened it.
     */
    function closeModal(el) {
        var i = MODAL_STACK.indexOf(el);
        if (i === -1) { return; }
        MODAL_STACK.splice(i, 1);

        if (!MODAL_STACK.length) {
            setBackgroundHidden(false);
            document.body.classList.remove('lightbox-open');
        }
        // Return keyboard focus to the triggering element
        var r = el.__restoreFocus;
        if (r && document.contains(r) && r.offsetParent !== null) {
            r.focus({ preventScroll: true });
        }
        el.__restoreFocus = null;
        
        // Notify motion.js to recalculate layout measurements
        if (window.MOTION3D && window.MOTION3D.remeasure) { window.MOTION3D.remeasure(); }
    }

    /**
     * Keyboard Focus Trap:
     * When pressing Tab or Shift+Tab inside an open modal, this guarantees
     * that focus cycles strictly between the modal's buttons/links and CANNOT
     * accidentally escape to the hidden background page.
     */
    document.addEventListener('keydown', function (ev) {
        var m = topModal();
        if (!m || ev.key !== 'Tab') { return; }
        var f = focusablesIn(m);
        if (!f.length) { ev.preventDefault(); m.focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && (document.activeElement === first || document.activeElement === m)) {
            ev.preventDefault(); last.focus(); // Shift+Tab on first element wraps to last
        } else if (!ev.shiftKey && document.activeElement === last) {
            ev.preventDefault(); first.focus(); // Tab on last element wraps to first
        }
    }, true);


    /* ========================================================================
       2. RETROFIT EXISTING LIGHTBOXES
       ========================================================================
       Instead of rewriting the gallery & achievement lightboxes from scratch,
       we gently "wrap" the existing open/close functions from script.js.
       This adds full accessibility while keeping motion.js's smooth FLIP zoom
       animations working 100%!
       ======================================================================== */

    function retrofitGalleryLightbox() {
        var lb = qs('.gallery-lightbox');
        if (!lb) { return; }
        registerModal(lb, 'Image viewer');
        var closeBtn = qs('.lightbox-close', lb);
        if (closeBtn) { closeBtn.setAttribute('aria-label', 'Close image viewer'); }

        // Wrap window.openLightbox
        var origOpen = window.openLightbox;
        if (typeof origOpen === 'function') {
            window.openLightbox = function () {
                var r = origOpen.apply(this, arguments);
                openModal(lb);
                return r;
            };
        }
        // Wrap window.closeLightbox
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

        // Observe class changes on the achievement lightbox (.active added/removed)
        new MutationObserver(function () {
            if (lb.classList.contains('active')) { openModal(lb); }
            else { closeModal(lb); }
        }).observe(lb, { attributes: true, attributeFilter: ['class'] });
    }


    /* ========================================================================
       3. KEYBOARD ACCESSIBILITY FOR IMAGE GRIDS
       ========================================================================
       Makes photo gallery tiles and achievement images fully operable via
       the keyboard (Tab to navigate, Enter or Space to open).
       ======================================================================== */

    function makeActivatable(el, label) {
        if (el.__activatable) { return; }
        el.__activatable = true;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0'); // Allows element to receive keyboard Tab focus
        if (label) { el.setAttribute('aria-label', label); }
        el.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
                ev.preventDefault();
                el.click(); // Trigger click event when Enter or Space is pressed
            }
        });
    }

    function enableGridKeyboard() {
        // Gallery items
        qsa('.gallery-item').forEach(function (it) {
            var img = qs('img', it);
            makeActivatable(it, img ? 'View photo: ' + img.alt : 'View photo');
        });
        // Achievement & Award cards
        qsa('.achievement-image img').forEach(function (img) {
            makeActivatable(img, 'View award: ' + img.alt);
        });
    }


    /* ========================================================================
       4. NAVIGATION & HERO ACCESSIBILITY
       ======================================================================== */

    function enhanceNav() {
        var toggle = qs('.menu-toggle');
        var menu = qs('.nav-menu');
        if (!toggle || !menu) { return; }

        // Sync aria-expanded state so screen readers announce whether menu is open or closed
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

        // Hide inactive slides from screen readers so they only hear the active slide
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

        // Label carousel indicator dots for screen readers
        qsa('.carousel-dot', carousel).forEach(function (d, i) {
            d.setAttribute('type', 'button');
            d.setAttribute('aria-label', 'Show statement ' + (i + 1));
        });
    }

    // Automatically keep the copyright year current
    function fixFooterYear() {
        var el = document.getElementById('footerYear');
        if (el) { el.textContent = new Date().getFullYear(); }
    }


    /* ========================================================================
       5. PROJECT FILTER & POPUP DETAIL MODAL
       ========================================================================
       Allows visitors to filter projects by Rotary Avenue of Service and click
       any project to see full high-res photos and detailed descriptions!
       ======================================================================== */

    var projects = {}; // In-memory index of all projects on the page

    // Extract a clean project key from an image URL (e.g., "club-installation-14.jpg" -> "club-installation")
    function keyOf(src) {
        return src.split('/').pop()
                  .replace(/\.[a-z0-9]+$/i, '')
                  .replace(/-\d+$/, '');
    }

    // Convert text string to a clean URL-friendly slug (e.g., "Community Service" -> "community-service")
    function slug(s) {
        return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // High-resolution photo catalog for project detail slideshows
    var projectPhotoCatalog = {
        'doctors-day': [
            { src: 'images/gallery/doctors-day-1.jpg', alt: "Doctor's Day", w: 900, h: 1600 },
            { src: 'images/gallery/doctors-day-2.jpeg', alt: "Doctor's Day", w: 1600, h: 1200 },
            { src: 'images/gallery/doctors-day-3.jpeg', alt: "Doctor's Day", w: 1600, h: 1200 }
        ],
        'club-installation': [
            { src: 'images/gallery/club-installation-1.jpg', alt: "4th Club Installation", w: 1600, h: 1067 },
            { src: 'images/gallery/club-installation-4.jpg', alt: "4th Club Installation", w: 1600, h: 1067 },
            { src: 'images/gallery/club-installation-7.jpg', alt: "4th Club Installation", w: 1600, h: 1067 },
            { src: 'images/gallery/club-installation-10.jpg', alt: "4th Club Installation", w: 1600, h: 1067 },
            { src: 'images/gallery/club-installation-14.jpg', alt: "4th Club Installation", w: 1600, h: 1067 }
        ],
        'unakoti': [
            { src: 'images/gallery/unakoti-1.jpeg', alt: "Trip to Unakoti", w: 963, h: 1280 },
            { src: 'images/gallery/unakoti-2.jpeg', alt: "Trip to Unakoti", w: 1280, h: 960 },
            { src: 'images/gallery/unakoti-3.jpeg', alt: "Trip to Unakoti", w: 1280, h: 960 }
        ],
        'boier-desh': [
            { src: 'images/gallery/boier-desh-1.jpeg', alt: "Boier Desh", w: 1280, h: 960 },
            { src: 'images/gallery/boier-desh-4.jpeg', alt: "Boier Desh", w: 1280, h: 960 },
            { src: 'images/gallery/boier-desh-7.jpeg', alt: "Boier Desh", w: 1600, h: 866 }
        ],
        'soul-circle': [
            { src: 'images/gallery/soul-circle-1.jpeg', alt: "Soul Circle", w: 1280, h: 960 },
            { src: 'images/gallery/soul-circle-2.jpeg', alt: "Soul Circle", w: 1280, h: 960 }
        ],
        'triva': [
            { src: 'images/gallery/triva-1.jpeg', alt: "TRIVA", w: 1600, h: 1200 },
            { src: 'images/gallery/triva-2.jpeg', alt: "TRIVA", w: 1448, h: 1086 },
            { src: 'images/gallery/triva-4.jpeg', alt: "TRIVA", w: 1600, h: 1204 },
            { src: 'images/gallery/triva-7.jpeg', alt: "TRIVA", w: 1600, h: 1200 },
            { src: 'images/gallery/triva-10.jpeg', alt: "TRIVA", w: 1280, h: 960 },
            { src: 'images/gallery/triva-12.jpeg', alt: "TRIVA", w: 1200, h: 1600 },
            { src: 'images/gallery/triva-23.jpeg', alt: "TRIVA", w: 1600, h: 1200 }
        ],
        'she-inspires': [
            { src: 'images/gallery/she-inspires.jpeg', alt: "She Inspires", w: 960, h: 1280 }
        ],
        'birthday-august': [
            { src: 'images/gallery/birthday-august-1.jpeg', alt: "August Birthday Celebration", w: 1600, h: 1200 },
            { src: 'images/gallery/birthday-august-2.jpeg', alt: "August Birthday Celebration", w: 1200, h: 1600 }
        ],
        'club-meetup': [
            { src: 'images/gallery/club-meetup-1.jpeg', alt: "Club Meetup", w: 1599, h: 1200 },
            { src: 'images/gallery/club-meetup-3.jpeg', alt: "Club Meetup", w: 1600, h: 1200 },
            { src: 'images/gallery/club-meetup-5.jpeg', alt: "Club Meetup", w: 1280, h: 960 },
            { src: 'images/gallery/club-meetup-7.jpeg', alt: "Club Meetup", w: 1280, h: 960 }
        ],
        '7-days-rotaract': [
            { src: 'images/gallery/7-days-rotaract.jpeg', alt: "7 Days of Rotaract", w: 1600, h: 736 }
        ],
        'autism-workshop': [
            { src: 'images/gallery/autism-workshop-1.png', alt: "Workshop on Autism Spectrum Disorder", w: 1600, h: 900 },
            { src: 'images/gallery/autism-workshop-3.png', alt: "Workshop on Autism Spectrum Disorder", w: 1600, h: 900 }
        ],
        'food-distribution': [
            { src: 'images/gallery/food-distribution-1.jpeg', alt: "Food Distribution Drive", w: 720, h: 1267 }
        ],
        'drr-visit': [
            { src: 'images/gallery/drr-visit-1.jpeg', alt: "DRR Connect - Official Club Visit", w: 1600, h: 1200 },
            { src: 'images/gallery/drr-visit-2.jpeg', alt: "DRR Connect - Official Club Visit", w: 1600, h: 1200 },
            { src: 'images/gallery/drr-visit-3.jpeg', alt: "DRR Connect - Official Club Visit", w: 1600, h: 1200 },
            { src: 'images/gallery/drr-visit-4.jpeg', alt: "DRR Connect - Official Club Visit", w: 1600, h: 1200 }
        ],
        'zonal-cricket': [
            { src: 'images/gallery/zonal-cricket-1.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 1500, h: 1125 },
            { src: 'images/gallery/zonal-cricket-2.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 1280, h: 960 },
            { src: 'images/gallery/zonal-cricket-3.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 1600, h: 1200 },
            { src: 'images/gallery/zonal-cricket-4.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 960, h: 1280 },
            { src: 'images/gallery/zonal-cricket-5.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 1280, h: 960 },
            { src: 'images/gallery/zonal-cricket-6.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 780, h: 1040 },
            { src: 'images/gallery/zonal-cricket-7.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 780, h: 1040 },
            { src: 'images/gallery/zonal-cricket-8.jpeg', alt: "Zone 1 Zonal Cricket Tournament", w: 1280, h: 960 }
        ],
        'unmute': [
            { src: 'images/gallery/unmute-1.jpeg', alt: "Unmute - Menstrual Hygiene Drive", w: 1599, h: 899 },
            { src: 'images/gallery/unmute-2.jpeg', alt: "Unmute - Menstrual Hygiene Drive", w: 1599, h: 899 },
            { src: 'images/gallery/unmute-3.jpeg', alt: "Unmute - Menstrual Hygiene Drive", w: 1280, h: 960 },
            { src: 'images/gallery/unmute-4.jpeg', alt: "Unmute - Menstrual Hygiene Drive", w: 1599, h: 899 }
        ]
    };

    /**
     * Scan the project cards on the page and build an in-memory database of projects
     */
    function buildProjectIndex() {
        var photos = projectPhotoCatalog;

        qsa('.project-card').forEach(function (card) {
            var img = qs('.project-image img', card);
            if (!img) { return; }
            var k = keyOf(img.getAttribute('src'));
            var metas = qsa('.project-meta span', card);
            var avenue = metas.length > 1 ? metas[1].textContent.trim() : '';
            var tagEl = qs('.project-tag', card);

            card.dataset.project = k;
            if (avenue) { card.classList.add('pf-' + slug(avenue)); }

            var pList = (photos[k] && photos[k].length)
                ? photos[k]
                : [{ src: img.getAttribute('src'), alt: img.alt || '', w: null, h: null }];

            projects[k] = {
                card: card,
                title: (qs('h3', card) || {}).textContent || '',
                date: metas.length ? metas[0].textContent.trim() : '',
                avenue: avenue,
                tag: tagEl ? tagEl.textContent.trim() : '',
                tagClass: tagEl ? tagEl.className : 'project-tag',
                body: (qs('.project-content p', card) || {}).textContent || '',
                hero: img.getAttribute('src'),
                photos: pList
            };
        });
        return projects;
    }

    /**
     * Build the Filter Buttons Bar above the project grid
     * (e.g. ALL, Community Service, Club Service, Professional Development, International Service)
     */
    function buildFilterBar() {
        var grid = qs('.project-grid');
        if (!grid || qs('.project-filters')) { return; }

        // Count how many projects belong to each avenue
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

        // Place the filter bar above the project grid (or its 3D fly-track wrapper)
        var anchor = grid.closest('.fly-track') || grid;
        anchor.parentNode.insertBefore(bar, anchor);

        // Handle filter clicks
        bar.addEventListener('click', function (ev) {
            var b = ev.target.closest && ev.target.closest('.project-filter');
            if (!b) { return; }
            var f = b.getAttribute('data-filter');

            // Update active styling on filter buttons
            qsa('.project-filter', bar).forEach(function (o) {
                var on = o === b;
                o.classList.toggle('active', on);
                o.setAttribute('aria-pressed', on ? 'true' : 'false');
            });

            // Show matching project cards, hide non-matching cards
            var shown = 0;
            qsa('.project-card').forEach(function (c) {
                var vis = (f === 'all') || c.classList.contains(f);
                c.classList.toggle('hidden', !vis);
                if (vis) { shown++; }
            });
            status.textContent = shown + (shown === 1 ? ' project shown' : ' projects shown');
        });
    }

    /* --- Project Detail Modal Component --- */
    var pm = null, pmIndex = 0, pmKey = null;

    /**
     * Create the Project Details Popup Modal element in the DOM
     */
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
              '</div>' +
            '</div>';
        
        // Append to <body> so fixed positioning isn't disrupted by transformed parents
        document.body.appendChild(pm);
        registerModal(pm, 'Project details');

        // Button clicks
        qs('.project-modal-close', pm).addEventListener('click', closeProjectModal);
        qs('.pm-prev', pm).addEventListener('click', function () { pmPage(-1); });
        qs('.pm-next', pm).addEventListener('click', function () { pmPage(1); });
        pm.addEventListener('click', function (ev) {
            if (ev.target === pm) { closeProjectModal(); }
        });

        // Touch swipe gestures on mobile phones (swipe left = next photo, swipe right = previous)
        var heroEl = qs('.project-modal-hero', pm);
        var touchStartX = 0;
        var touchStartY = 0;
        heroEl.addEventListener('touchstart', function (ev) {
            if (ev.touches && ev.touches[0]) {
                touchStartX = ev.touches[0].clientX;
                touchStartY = ev.touches[0].clientY;
            }
        }, { passive: true });
        heroEl.addEventListener('touchend', function (ev) {
            if (ev.changedTouches && ev.changedTouches[0]) {
                var dx = ev.changedTouches[0].clientX - touchStartX;
                var dy = ev.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                    if (dx < 0) { pmPage(1); }
                    else { pmPage(-1); }
                }
            }
        }, { passive: true });

        // Keyboard navigation (Escape to close, Left/Right arrow keys to switch photos)
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

    /**
     * Render the active photo and counter in the modal
     */
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

    /**
     * Move to the previous or next photo in the project slideshow
     */
    function pmPage(d) {
        var n = pmPhotos().length;
        if (n < 2) { return; }
        pmIndex = (pmIndex + d + n) % n; // Circular wrap (e.g. 1st photo wraps to last)
        pmRender();
    }

    /**
     * Open the Project Details Modal for a specific project
     * (Attached to window so motion.js or HTML links can invoke it directly)
     */
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

        pmRender();
        pm.classList.add('active');
        openModal(pm);
    };

    function closeProjectModal() {
        if (!pm) { return; }
        pm.classList.remove('active');
        closeModal(pm);
    }

    /**
     * Attach click listeners and accessibility hints to all project cards
     */
    function wireProjectCards() {
        var grid = qs('.project-grid');
        if (!grid) { return; }
        qsa('.project-card').forEach(function (card) {
            makeActivatable(card, 'View project details: ' +
                ((qs('h3', card) || {}).textContent || '').trim());
            if (!qs('.project-btn', card) && !qs('.project-open-hint', card)) {
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

    /**
     * Deep-link handling: If visitor arrives with "?project=unmute" or "#project-unmute"
     * in the browser address bar, automatically open that project's modal!
     */
    function handleUrlProjectParam() {
        var params = new URLSearchParams(window.location.search);
        var pKey = params.get('project');
        if (!pKey && window.location.hash) {
            var match = window.location.hash.match(/^#project-([a-z0-9-]+)$/i);
            if (match) { pKey = match[1]; }
        }
        if (pKey && projects[pKey]) {
            var card = projects[pKey].card;
            if (card && card.classList.contains('hidden')) {
                var allBtn = qs('.project-filter[data-filter="all"]');
                if (allBtn) { allBtn.click(); }
            }
            setTimeout(function () {
                if (card && card.scrollIntoView) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                window.openProjectModal(pKey);
            }, 300);
        }
    }

    /**
     * Wire up the WASH (Water, Sanitation, & Hygiene) Initiative modal
     */
    function wireWashModal() {
        var modal = qs('#washModal');
        if (!modal) { return; }
        registerModal(modal, 'Water, Sanitation, and Hygiene Initiatives');
        var openBtns = qsa('.wash-trigger-btn');
        var closeBtns = qsa('.wash-modal-close, .wash-modal-backdrop, .wash-modal-cta', modal);

        function openWash() {
            modal.classList.add('active');
            openModal(modal);
        }
        function closeWash() {
            modal.classList.remove('active');
            closeModal(modal);
        }

        openBtns.forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                openWash();
            });
            btn.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
                    ev.preventDefault();
                    openWash();
                }
            });
        });

        closeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                closeWash();
            });
        });

        modal.addEventListener('click', function (ev) {
            if (ev.target === modal || ev.target.classList.contains('wash-modal-backdrop')) {
                closeWash();
            }
        });

        document.addEventListener('keydown', function (ev) {
            if (modal.classList.contains('active') && ev.key === 'Escape') {
                closeWash();
            }
        });
    }

    /**
     * Make contact cards fully clickable
     */
    function wireContactCards() {
        var cards = qsa('.contact-card');
        cards.forEach(function (card) {
            var link = qs('a', card);
            if (!link) { return; }
            card.addEventListener('click', function (ev) {
                if (ev.target.closest('a')) { return; }
                if (link.target === '_blank') {
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                } else {
                    window.location.href = link.href;
                }
            });
        });
    }


    /* ========================================================================
       5b. DARK & LIGHT THEME ENGINE
       ========================================================================
       Controls the theme toggle button:
       - Remembers user selection in browser localStorage.
       - Respects OS dark/light mode preference if user hasn't explicitly chosen.
       - Synchronizes instantly across open browser tabs via storage events.
       ======================================================================== */

    function getSavedTheme() {
        try {
            var saved = localStorage.getItem('racdcp-theme');
            if (saved === 'dark' || saved === 'light') return saved;
        } catch (e) {}
        // Fallback to computer/phone system theme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    function applyTheme(theme, animate) {
        var isDark = theme === 'dark';
        var root = document.documentElement;

        // Briefly add transition class so background colors transition smoothly
        if (animate) {
            root.classList.add('theme-transitioning');
            setTimeout(function () {
                root.classList.remove('theme-transitioning');
            }, 300);
        }

        root.setAttribute('data-theme', theme);
        if (isDark) {
            root.classList.add('dark-theme');
        } else {
            root.classList.remove('dark-theme');
        }

        try {
            localStorage.setItem('racdcp-theme', theme);
        } catch (e) {}

        // Update mobile browser address bar color (<meta name="theme-color">)
        var metaTheme = qs('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', isDark ? '#09110e' : '#0b2e21');
        }

        // Update all toggle buttons on the page
        var toggles = qsa('.theme-toggle');
        toggles.forEach(function (btn) {
            btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            var label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);

            var statusEl = qs('.theme-toggle-status', btn);
            if (statusEl) {
                statusEl.textContent = isDark ? 'Light' : 'Dark';
            }
        });

        // Dispatch custom event in case external components want to respond
        try {
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
        } catch (e) {}
    }

    function initTheme() {
        var current = getSavedTheme();
        applyTheme(current, false); // Apply immediately without flash

        // Click handler for theme switch toggle buttons
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-toggle');
            if (!btn) return;
            e.preventDefault();
            var activeTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            var newTheme = activeTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme, true);
        });

        // Listen for OS dark mode changes (only if user hasn't explicitly set a preference)
        if (window.matchMedia) {
            try {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
                    try {
                        if (!localStorage.getItem('racdcp-theme')) {
                            applyTheme(e.matches ? 'dark' : 'light', true);
                        }
                    } catch (err) {}
                });
            } catch (err) {}
        }

        // Sync theme across different browser tabs simultaneously
        window.addEventListener('storage', function (e) {
            if (e.key === 'racdcp-theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
                applyTheme(e.newValue, false);
            }
        });
    }


    /* ========================================================================
       6. BOOT & INITIALIZATION
       ======================================================================== */

    function init() {
        initTheme();
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
        handleUrlProjectParam();
        wireWashModal();
        wireContactCards();

        window.addEventListener('popstate', handleUrlProjectParam);
        window.addEventListener('hashchange', handleUrlProjectParam);

        // Keep keyboard navigation working even after switching member tabs
        var origShow = window.showPeople;
        if (typeof origShow === 'function') {
            window.showPeople = function () {
                var r = origShow.apply(this, arguments);
                enableGridKeyboard();
                return r;
            };
        }
    }

    // Start everything as soon as the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
