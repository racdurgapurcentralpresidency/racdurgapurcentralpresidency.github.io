/* ============================================================================
   RAC DCP — LIVE CLUB STATUS & DYNAMIC FOOTER SIGNALS (x-live.js)
   ============================================================================
   
   WHAT THIS FILE DOES:
   Displays real-time, authentic club metrics across the website:
     1. Current Rotary Year progress bar (calculated from July 1 – June 30).
     2. Live countdown to the next upcoming club event (configured below).
     3. Total days of service elapsed since the Charter Date (12 Oct 2023).
     4. Live Durgapur (IST) clock updated every 15 seconds.
     5. Automatic "Website updated" date stamp inside every page footer.
     6. Gentle spotlight glow that follows the visitor's cursor or finger.
   
   HOW TO UPDATE EVENTS:
   Simply add or edit entries inside the EVENTS array directly below.
   ============================================================================ */
(function () {
    'use strict';

    // Club Charter Date & Upcoming Events Schedule
    var CHARTER = new Date('2023-10-12T00:00:00+05:30');
    var EVENTS = [
        { name: 'Saksham prosthetic camp', start: '2026-12-04', end: '2026-12-06', href: 'our-work.html#events' }
    ];

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DAY = 86400000; // Milliseconds in 24 hours

    // ------------------------------------------------------------------------
    // 1. CALCULATE DATE & ROTARY YEAR IN DURGAPUR TIME (IST / UTC+5:30)
    // ------------------------------------------------------------------------
    // Ensures dates remain accurate regardless of which country the visitor is in
    var istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    var today = new Date(istDate + 'T00:00:00+05:30');
    var istYear = +istDate.slice(0, 4), istMonth = +istDate.slice(5, 7);
    function fmt(n) { return n.toLocaleString('en-IN'); }

    // Rotary International calendar runs from July 1 through June 30
    var y = istMonth >= 7 ? istYear : istYear - 1;
    var ryStart = new Date(y + '-07-01T00:00:00+05:30');
    var ryEnd = new Date((y + 1) + '-07-01T00:00:00+05:30');
    var ryPct = Math.max(0, Math.min(100, Math.round((today - ryStart) / (ryEnd - ryStart) * 100)));
    var ryLabel = 'RY ' + y + '–' + String(y + 1).slice(2);

    // Count total active days since charter
    var serviceDay = Math.floor((today - CHARTER) / DAY) + 1;

    // ------------------------------------------------------------------------
    // 2. FIND THE NEXT UPCOMING EVENT
    // ------------------------------------------------------------------------
    var next = null;
    EVENTS.forEach(function (ev) {
        var s = new Date(ev.start + 'T00:00:00+05:30'), e = new Date(ev.end + 'T00:00:00+05:30');
        if (e >= today && (!next || s < next.s)) { next = { ev: ev, s: s, e: e }; }
    });
    var nextText = '';
    if (next) {
        var days = Math.round((next.s - today) / DAY);
        nextText = days <= 0 ? '<strong>happening now</strong>' :
                   days === 1 ? '<strong>tomorrow</strong>' : 'in <strong>' + days + ' days</strong>';
    }

    // ------------------------------------------------------------------------
    // 3. RENDER LIVE STATUS PANEL IN HOMEPAGE HERO
    // ------------------------------------------------------------------------
    var heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        var panel = document.createElement('div');
        panel.className = 'x-live';
        panel.setAttribute('aria-label', 'Club status');
        panel.innerHTML =
            '<div class="x-live-row x-live-status"><span class="x-live-dot" aria-hidden="true"></span>' +
            '<strong>Active club</strong><span class="x-live-sep">·</span>' + ryLabel +
            '<span class="x-live-bar" aria-hidden="true"><span style="width:' + ryPct + '%"></span></span>' +
            '<span class="x-live-pct">' + ryPct + '% through the year</span></div>' +
            (next ? '<a class="x-live-row x-live-next" href="' + next.ev.href + '">Next: ' + next.ev.name + ' ' + nextText + ' <span aria-hidden="true">&rarr;</span></a>' : '') +
            '<div class="x-live-row">Day <strong>' + fmt(serviceDay) + '</strong>&nbsp;of service since our charter' +
            '<span class="x-live-sep">·</span>Durgapur <time class="x-live-clock"></time></div>';
        heroContent.appendChild(panel);

        // Refresh local time display every 15 seconds
        var clock = panel.querySelector('.x-live-clock');
        var tf = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
        var tick = function () { clock.textContent = tf.format(new Date()); };
        tick();
        setInterval(tick, 15000);
    }

    // ------------------------------------------------------------------------
    // 4. DISPLAY "WEBSITE UPDATED" STAMP IN FOOTER (ALL PAGES)
    // ------------------------------------------------------------------------
    var footerBottom = document.querySelector('.footer-bottom');
    var lm = new Date(document.lastModified);
    if (footerBottom && !isNaN(lm)) {
        var p = document.createElement('p');
        p.className = 'x-updated';
        p.innerHTML = '<span class="x-live-dot" aria-hidden="true"></span>Website updated ' +
            lm.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        footerBottom.appendChild(p);
    }

    // ------------------------------------------------------------------------
    // 5. SUBTLE CURSOR SPOTLIGHT GLOW (Skipped when Reduced Motion or low-spec)
    // ------------------------------------------------------------------------
    if (reduceMotion || root.classList.contains('low-spec')) { return; }
    var light = document.createElement('div');
    light.className = 'x-light';
    light.setAttribute('aria-hidden', 'true');
    document.body.appendChild(light);

    var lx = innerWidth / 2, ly = innerHeight / 3, tx = lx, ty = ly, raf = 0, shown = false;
    function loop() {
        // Smoothly glide spotlight toward cursor coordinates
        lx += (tx - lx) * 0.18; ly += (ty - ly) * 0.18;
        light.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
        // Stop requesting frames once the spotlight reaches the cursor
        raf = (Math.abs(tx - lx) + Math.abs(ty - ly) > 0.5) ? requestAnimationFrame(loop) : 0;
    }
    function move(x, y) {
        tx = x; ty = y;
        if (!shown) { shown = true; light.classList.add('on'); }
        if (!raf) { raf = requestAnimationFrame(loop); }
    }
    window.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('pointerleave', function () { shown = false; light.classList.remove('on'); });
    window.addEventListener('touchend', function () { setTimeout(function () { shown = false; light.classList.remove('on'); }, 900); }, { passive: true });
    root.classList.add('x-live-on');
})();
