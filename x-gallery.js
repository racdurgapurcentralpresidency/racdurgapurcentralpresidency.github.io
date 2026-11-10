/* =========================================================
   Idea F — 3D photo wall (Rotary Year pages)
   Built from the page's own event cards. Tapping a photo opens that
   event's existing photo gallery.
   - Wide screens: the wall pins and turns as you scroll (a 3D ring).
   - Phones: a swipeable 3D cover-flow row (no pinning).
   - "Reduce motion": a flat swipeable row.
   ========================================================= */
(function () {
    'use strict';
    var cards = Array.prototype.slice.call(document.querySelectorAll('.archive-event-card'));
    if (cards.length < 4) { return; }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var items = cards.map(function (card) {
        var banner = card.querySelector('.archive-event-banner');
        var img = banner && banner.querySelector('img');
        var title = card.querySelector('.archive-event-title');
        var date = card.querySelector('.archive-event-meta-item.date span:last-child');
        return img ? { banner: banner, src: img.getAttribute('src'), title: title ? title.textContent.trim() : '', date: date ? date.textContent.trim() : '' } : null;
    }).filter(Boolean);

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
        b.addEventListener('click', function () { it.banner.click(); });
        ring.appendChild(b);
    });

    // Put the wall just before the events section.
    var grid = document.getElementById('archiveEventsGrid') || cards[0].parentNode;
    var host = grid.closest('section') || grid;
    host.parentNode.insertBefore(section, host);

    var hint = section.querySelector('.x-wall-hint');
    var wide = window.matchMedia('(min-width: 900px)');
    var tiles = Array.prototype.slice.call(ring.children);
    var ticking = false, perRow = 0, step = 0, radius = 0;

    function layout() {
        if (reduce || !wide.matches) {
            section.classList.remove('x-wall-on');
            section.style.height = '';
            ring.style.transform = '';
            tiles.forEach(function (t) { t.style.transform = ''; });
            hint.textContent = 'Swipe through the year. Tap any photo to open its gallery.';
            return;
        }
        section.classList.add('x-wall-on');
        hint.textContent = 'Keep scrolling to turn the wall. Click any photo to open its gallery.';
        var n = tiles.length;
        var rows = n > 18 ? 2 : 1;
        perRow = Math.ceil(n / rows);
        step = 360 / perRow;
        var tileW = 250;
        radius = Math.round((perRow * (tileW + 26)) / (2 * Math.PI));
        tiles.forEach(function (t, i) {
            var row = Math.floor(i / perRow), col = i % perRow;
            var y = rows === 2 ? (row === 0 ? -98 : 98) : 0;
            var angle = col * step + (row ? step / 2 : 0);
            t.style.transform = 'translateY(' + y + 'px) rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
        });
        section.style.height = (innerHeight * 3.2) + 'px';
        update();
    }

    function update() {
        ticking = false;
        if (!section.classList.contains('x-wall-on')) { return; }
        var r = section.getBoundingClientRect();
        var total = section.offsetHeight - innerHeight;
        var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
        // One full turn over the pinned distance, seen from slightly above.
        ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateX(-7deg) rotateY(' + (-p * 360).toFixed(2) + 'deg)';
    }

    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', layout);
    if (wide.addEventListener) { wide.addEventListener('change', layout); }
    layout();
})();
