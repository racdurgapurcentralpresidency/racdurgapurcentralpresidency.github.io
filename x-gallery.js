/* ============================================================================
   RAC DCP — 3D PHOTO RING WALL FOR ROTARY YEAR PAGES (x-gallery.js)
   ============================================================================
   
   WHAT THIS FILE DOES:
   Scans existing project event cards (.archive-event-card) on Rotary Year pages
   and builds an interactive "The Year in Photos" showcase right above them:
     - Wide desktop screens: Arranges photos into a floating 3D cylinder/ring
       that spins smoothly 360° as the visitor scrolls down.
     - Mobile phones: Switches to a fast, horizontal thumb-swipe carousel.
     - Clicking/tapping any tile opens that event's full photo lightbox.
   ============================================================================ */
(function () {
    'use strict';

    // Collect all event cards on the page; skip building the wall if fewer than 4 exist
    var cards = Array.prototype.slice.call(document.querySelectorAll('.archive-event-card'));
    if (cards.length < 4) { return; }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ------------------------------------------------------------------------
    // 1. EXTRACT PHOTO, TITLE & DATE FROM EACH EVENT CARD
    // ------------------------------------------------------------------------
    var items = cards.map(function (card) {
        var banner = card.querySelector('.archive-event-banner');
        var img = banner && banner.querySelector('img');
        var title = card.querySelector('.archive-event-title');
        var date = card.querySelector('.archive-event-meta-item.date span:last-child');
        return img ? { banner: banner, src: img.getAttribute('src'), title: title ? title.textContent.trim() : '', date: date ? date.textContent.trim() : '' } : null;
    }).filter(Boolean);

    // ------------------------------------------------------------------------
    // 2. BUILD THE GALLERY DOM SECTION
    // ------------------------------------------------------------------------
    var section = document.createElement('section');
    section.className = 'section x-wall x-skip-chapter';
    section.setAttribute('aria-labelledby', 'xWallTitle');
    section.innerHTML =
        '<div class="x-wall-stage">' +
        '<div class="x-wall-head"><p class="section-label">THE YEAR IN PHOTOS</p>' +
        '<h2 id="xWallTitle">Step <span>inside the year.</span></h2>' +
        '<p class="x-wall-hint"></p></div>' +
        '<div class="x-wall-view"><div class="x-wall-ring"></div></div>' +
        '</div>';

    var ring = section.querySelector('.x-wall-ring');
    items.forEach(function (it, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'x-wall-tile';
        b.setAttribute('aria-label', 'Open photos: ' + it.title);
        b.innerHTML = '<img src="' + it.src + '" alt="" loading="lazy" decoding="async">' +
            '<span class="x-wall-cap"><strong>' + it.title + '</strong><small>' + it.date + '</small></span>';
        // Clicking any photo triggers a click on the original event banner to open its gallery modal
        b.addEventListener('click', function () { it.banner.click(); });
        ring.appendChild(b);
    });

    // Insert the 3D photo wall directly above the main events archive section
    var grid = document.getElementById('archiveEventsGrid') || cards[0].parentNode;
    var host = grid.closest('section') || grid;
    host.parentNode.insertBefore(section, host);

    var hint = section.querySelector('.x-wall-hint');
    var wide = window.matchMedia('(min-width: 900px)');
    var tiles = Array.prototype.slice.call(ring.children);
    var ticking = false, perRow = 0, step = 0, radius = 0;

    // ------------------------------------------------------------------------
    // 3. ARRANGE TILES IN A 3D RING (DESKTOP) OR FLAT SWIPE ROW (MOBILE)
    // ------------------------------------------------------------------------
    function layout() {
        // Fallback to a standard horizontal scrollable row on phones or reduced-motion
        if (reduce || !wide.matches || document.documentElement.classList.contains('low-spec')) {
            section.classList.remove('x-wall-on');
            section.style.height = '';
            ring.style.transform = '';
            tiles.forEach(function (t) { t.style.transform = ''; });
            hint.textContent = 'Swipe through the year. Tap any photo to open its gallery.';
            return;
        }

        section.classList.add('x-wall-on');
        hint.textContent = 'Keep scrolling to turn the wall. Click any photo to open its gallery.';

        // Arrange in 2 staggered rows if there are more than 18 events
        var n = tiles.length;
        var rows = n > 18 ? 2 : 1;
        perRow = Math.ceil(n / rows);
        step = 360 / perRow;

        // Calculate circle radius from desired spacing: C = 2πr => r = C / 2π
        var tileW = 250;
        radius = Math.round((perRow * (tileW + 26)) / (2 * Math.PI));

        tiles.forEach(function (t, i) {
            var row = Math.floor(i / perRow), col = i % perRow;
            var y = rows === 2 ? (row === 0 ? -98 : 98) : 0;
            var angle = col * step + (row ? step / 2 : 0);
            t.style.transform = 'translateY(' + y + 'px) rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
        });

        // Give the section extra vertical height so the user can scroll through a full 360° spin
        section.style.height = (innerHeight * 3.2) + 'px';
        update();
    }

    // ------------------------------------------------------------------------
    // 4. SPIN THE 3D RING BASED ON SCROLL POSITION
    // ------------------------------------------------------------------------
    function update() {
        ticking = false;
        if (!section.classList.contains('x-wall-on')) { return; }
        var r = section.getBoundingClientRect();
        var total = section.offsetHeight - innerHeight;
        var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
        // Rotate full 360 degrees over the pinned scroll distance, tilted slightly downward
        ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateX(-7deg) rotateY(' + (-p * 360).toFixed(2) + 'deg)';
    }

    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', layout);
    if (wide.addEventListener) { wide.addEventListener('change', layout); }
    layout();
})();
