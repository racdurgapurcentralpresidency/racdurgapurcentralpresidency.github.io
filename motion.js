/* ============================================================================
   RAC DCP — 3D CINEMATIC MOTION & CAMERA ENGINE (motion.js)
   ============================================================================
   
   WHAT THIS FILE DOES:
   This is the advanced 3D motion and physics engine for the website.
   It creates high-end visual effects on desktop and workstation displays:
     1. Unified Compositor Loop: Drives all transforms in a single 60fps/120fps
        `requestAnimationFrame` loop, preventing different scripts from fighting
        over element styles.
     2. Hardware Capability Detection: Checks CPU cores, RAM, and connection speed.
        Budget laptops, mobile phones, or users with "Reduced Motion" enabled
        automatically skip heavy 3D calculations to stay fast and battery-friendly.
     3. Smooth Momentum Scrolling: Glides page scrolling with physical momentum.
     4. Interactive 3D Card Tilting & Dynamic Glare: Cards physically tilt toward
        the user's mouse with a glossy spotlight glare following the cursor.
     5. Scroll Scenes:
        - 3D Project Corridor: Project cards fly past the camera in 3D space!
        - Sideways Photo Gallery: Horizontal scrolling track across 70+ photos.
        - Stacking Awards Deck: Achievement cards stack like a deck of playing cards.
        - Geared Rotary Wheel: The Rotary emblem spins in sync with your scroll.
     6. Odometer Counters: Numbers roll up like mechanical slot-machine reels.
     7. Split-Text Revealing: Headings tilt upward word-by-word into view.
     8. FLIP Lightbox Transitions: Smoothly expands clicked photos from their
        thumbnail position into full-screen view.
   
   SAFETY & ARCHITECTURE:
   Loaded BEFORE `script.js` so `window.MOTION3D` is available early.
   Everything is wrapped in a private self-executing function (IIFE) with
   ZERO global variable leaks to avoid conflicts with other scripts.
   ============================================================================ */

(function () {
    'use strict';

    /* ========================================================================
       1. HARDWARE & CAPABILITY DETECTION (Runs synchronously on page load)
       ========================================================================
       Checks whether the user's computer is powerful enough for 3D graphics.
       We check:
         - Reduced motion settings (prefers-reduced-motion).
         - Input type (fine pointer mouse vs. touch screen).
         - Device RAM (navigator.deviceMemory) & CPU cores (hardwareConcurrency).
         - Network connection type (Save-Data mode, 2G/3G).
       ======================================================================== */

    var docEl = document.documentElement;
    var params = new URLSearchParams(location.search);

    // Check if the user turned on "Reduce Motion" in their operating system
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Check if user has an accurate mouse pointer (not a mobile touchscreen)
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Detect low-spec devices: <=4 CPU cores, <=4GB RAM, slow networks, or narrow screens
    var lowSpec = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                  (navigator.connection && (navigator.connection.saveData || /2g|3g/.test(navigator.connection.effectiveType))) ||
                  (window.innerWidth < 1024);

    if (lowSpec) {
        docEl.classList.add('low-spec');
    }

    // High-end workstation qualification (requires >=6 CPU cores and >=8GB RAM)
    var isHighEnd = (!lowSpec) &&
                    (!navigator.hardwareConcurrency || navigator.hardwareConcurrency >= 6) &&
                    (!navigator.deviceMemory || navigator.deviceMemory >= 8);

    // 3D Motion is enabled ONLY if the device meets all performance criteria
    var enabled = !params.has('nomotion') &&
                  !prefersReduced &&
                  !lowSpec &&
                  !!window.requestAnimationFrame &&
                  !!window.Map;

    // Smooth momentum scrolling is reserved for verified high-end workstations with a mouse
    var useMomentum = enabled && finePointer && window.innerWidth >= 1200 && isHighEnd;

    // Public motion configuration object attached to window
    var MOTION = {
        enabled: enabled,
        momentum: useMomentum,
        hover: enabled && finePointer,
        tier: lowSpec ? 1 : 2,
        version: '1.0'
    };
    window.MOTION3D = MOTION;

    // Tag the <html> element so CSS can activate 3D styles
    docEl.classList.add(enabled ? 'motion-on' : 'motion-off');

    // If device is not capable, safely exit right now — zero battery or CPU waste!
    if (!enabled) { return; }


    /* ========================================================================
       2. MATH & EASING UTILITIES
       ======================================================================== */

    // Constrain a number between a minimum and maximum boundary
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    
    // Exponential deceleration curve: starts fast, lands very gently
    function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    
    // Quartic ease in-out curve: slow start, fast middle, gentle stop
    function easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    // Run callback as soon as DOM is ready
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }


    /* ========================================================================
       3. SHARED ANIMATION FRAME STATE & DIALS
       ======================================================================== */

    // Smooth Scroll Feel Tuning Parameters:
    var MOMENTUM_EASE = 0.075; // Lower number = heavier, more luxurious glide
    var WHEEL_GAIN = 0.9;      // Sensitivity scaling for mouse wheel notches
    var WHEEL_MAX = 160;       // Max travel clamped per single wheel tick

    var items = [];            // Registry of all 3D cards tracked on the page
    var triggers = [];         // Geometry triggers (e.g. section titles, odometers)
    var scenes = [];           // Pinned interactive scroll corridors & rails
    var geomDirty = true;      // Flag indicating page layout has changed and needs remeasuring
    var maxYCache = 0;         // Cached maximum scrollable page height
    var maxYDirty = true;

    var scrollY = window.scrollY || 0;
    var prevScrollY = scrollY;
    var velocity = 0;          // Instantaneous scrolling speed in pixels per frame
    var lastFrame = 0;
    var rafId = 0;             // requestAnimationFrame ID
    var idleFrames = 0;        // Counter of inactive frames (parks loop when page is idle)

    var ptrNX = 0, ptrNY = 0;  // Normalized mouse coordinates (-1 at left/top to +1 at right/bottom)
    var ptrX = 0, ptrY = 0;    // Raw mouse coordinates in pixels

    var hovered = null;        // The card currently directly underneath the mouse cursor

    // Tell the engine to re-measure card positions on the next animation frame
    function markGeomDirty() { geomDirty = true; maxYDirty = true; wake(); }

    // Calculate maximum distance the page can be scrolled down
    function maxScroll() {
        if (maxYDirty) {
            maxYCache = Math.max(0, docEl.scrollHeight - window.innerHeight);
            maxYDirty = false;
        }
        return maxYCache;
    }

    // Check if animation should pause (e.g. browser tab is in background or modal is open)
    function isPaused() {
        return document.hidden ||
               document.body.classList.contains('preloader-active') ||
               document.body.classList.contains('lightbox-open');
    }


    /* ========================================================================
       4. COMPOSITOR & CARD TRANSFORMS
       ========================================================================
       Instead of having 3 separate scripts all writing to `element.style.transform`
       at different times, this compositor calculates all channels together:
         1. Entry Reveal Channel (card floating up into position on scroll).
         2. Depth Conveyor Channel (perspective parallax as card passes through center screen).
         3. Velocity Pitch Channel (physical lean based on fast scrolling speed).
         4. Mouse Hover Channel (interactive 3D tilt towards mouse cursor).
       These channels are added together and written once per element per frame!
       ======================================================================== */

    // Motion presets defining travel distances, tilt intensity, and timings
    var PRESETS = {
        card: {
            entry: { y: 92, z: -430, rx: 24, ry: 0, s: 0.88 },
            dur: 900, stagger: 85,
            depth: { z: 140, rx: 7, s: 0.035, ry: 0 },
            vel: true, hover: true, hoverZ: 34, hoverTilt: 5
        },
        gallery: {
            entry: { y: 64, z: -280, rx: 16, ry: -20, s: 0.90 },
            dur: 780, stagger: 55,
            depth: { z: 165, rx: 5, s: 0.03, ry: 4 },
            vel: false, hover: true, hoverZ: 48, hoverTilt: 6
        },
        soft: {
            entry: { y: 54, z: -180, rx: 13, ry: 0, s: 0.94 },
            dur: 820, stagger: 70,
            depth: { z: 78, rx: 4, s: 0.02, ry: 0 },
            vel: false, hover: true, hoverZ: 24, hoverTilt: 4
        }
    };

    /**
     * Register an HTML card element into the 3D compositor
     */
    function register(el, presetName) {
        if (el.__mo) { return el.__mo; }
        var st = {
            el: el,
            cfg: PRESETS[presetName],
            top: 0, left: 0, w: 0, h: 0,
            col: 0, colPhase: 0,
            revealAt: -1, revealT: 0,
            hoverT: 0, tiltX: 0, tiltY: 0,
            active: false, measured: false,
            last: '', lastOp: -1
        };
        el.__mo = st;
        items.push(st);
        return st;
    }

    /**
     * Register all elements matching a selector
     */
    function registerAll(selector, presetName) {
        var list = document.querySelectorAll(selector);
        for (var i = 0; i < list.length; i++) { register(list[i], presetName); }
    }

    /**
     * One-shot trigger: Fires a callback once an element scrolls into view
     */
    function addTrigger(el, fn) {
        triggers.push({ el: el, fn: fn, top: 0, fired: false, measured: false });
    }

    /**
     * Register a pinned scroll scene (e.g. fly-through corridor or sideways gallery)
     */
    function registerScene(el, fn) {
        var sc = { el: el, fn: fn, top: 0, h: 0, measured: false, last: -1 };
        scenes.push(sc);
        return sc;
    }

    /**
     * Update progress on pinned scroll scenes
     */
    function updateScenes(y, vh) {
        for (var i = 0; i < scenes.length; i++) {
            var sc = scenes[i];
            if (!sc.measured) { continue; }

            var travel = sc.h - vh;
            if (travel <= 0) { continue; }

            var onScreen = (sc.top < y + vh) && (sc.top + sc.h > y);
            var p = clamp((y - sc.top) / travel, 0, 1);

            if (!onScreen && (sc.last === 0 || sc.last === 1)) { continue; }

            if (p !== sc.last) {
                sc.fn(p, onScreen);
                sc.last = p;
                idleFrames = 0;
            }
        }
    }

    /**
     * Check if any one-shot triggers (headings, odometers) have scrolled into view
     */
    function checkTriggers(y, vh) {
        for (var i = 0; i < triggers.length; i++) {
            var t = triggers[i];
            if (t.fired || !t.measured) { continue; }
            if (t.top < y + vh - 60) {
                t.fired = true;
                t.fn(t.el);
                idleFrames = 0;
            }
        }
    }

    /**
     * Batched Geometry Measurement Pass:
     * Reads element positions and dimensions all at once.
     * Doing all browser DOM reads together prevents "layout thrashing" and
     * keeps scrolling at a locked 60/120 frames per second!
     */
    function remeasure() {
        var y = window.scrollY;
        var groups = new Map();
        var i, st, r;

        // Measure all tracked cards
        for (i = 0; i < items.length; i++) {
            st = items[i];
            r = st.el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) { st.measured = false; continue; }
            st.top = r.top + y;
            st.left = r.left;
            st.w = r.width;
            st.h = r.height;
            st.measured = true;

            var p = st.el.parentNode;
            if (!groups.has(p)) { groups.set(p, []); }
            groups.get(p).push(st);
        }

        // Determine column position for each card based on its horizontal X coordinate
        groups.forEach(function (list) {
            var lefts = [];
            list.forEach(function (s) {
                var L = Math.round(s.left);
                if (lefts.indexOf(L) === -1) { lefts.push(L); }
            });
            lefts.sort(function (a, b) { return a - b; });
            var n = Math.max(lefts.length - 1, 1);
            list.forEach(function (s) {
                s.col = lefts.indexOf(Math.round(s.left));
                s.colPhase = (s.col / n) - 0.5; // -0.5 (left column) to +0.5 (right column)
            });
        });

        // Measure scroll scenes
        for (i = 0; i < scenes.length; i++) {
            var scn = scenes[i];
            var sr = scn.el.getBoundingClientRect();
            if (sr.height === 0) { scn.measured = false; continue; }
            scn.top = sr.top + y;
            scn.h = sr.height;
            scn.measured = true;
            scn.last = -1;
        }

        // Measure triggers
        for (i = 0; i < triggers.length; i++) {
            var t = triggers[i];
            if (t.fired) { continue; }
            var tr = t.el.getBoundingClientRect();
            if (tr.width === 0 && tr.height === 0) { t.measured = false; continue; }
            t.top = tr.top + y;
            t.measured = true;
        }

        geomDirty = false;
    }

    /**
     * Compute and apply the final 3D transform for a single card on this frame
     */
    function updateItem(st, y, vh, now) {
        if (st.sceneOwned) { return; } // Handled by fly-through scene if owned
        if (!st.measured) { return; }

        // Only compute if card is within or near the visible screen viewport
        var on = (st.top + st.h > y - vh * 0.35) && (st.top < y + vh * 1.35);
        if (on !== st.active) {
            st.active = on;
            st.el.style.willChange = on ? 'transform, opacity' : '';
        }
        if (!on) { return; }

        var cfg = st.cfg;

        // --- Channel 1: Scroll Reveal Entrance Animation ---
        if (st.revealAt < 0 && st.top < y + vh - 70) {
            st.revealAt = now + (st.col % 4) * cfg.stagger;
        }
        var rt = st.revealAt < 0 ? 0 : clamp((now - st.revealAt) / cfg.dur, 0, 1);
        var e = easeOutExpo(rt);
        st.revealT = e;

        var inv = 1 - e;
        var ty = inv * cfg.entry.y;
        var tz = inv * cfg.entry.z;
        var rx = inv * cfg.entry.rx;
        var ry = inv * cfg.entry.ry * (st.col % 2 ? -1 : 1);
        var sc = 1 + inv * (cfg.entry.s - 1);
        var op = e;

        // --- Channel 2: Parallax Depth Conveyor ---
        if (cfg.depth && e > 0.001) {
            var p = clamp((st.top + st.h / 2 - y - vh / 2) / (vh / 2), -1.4, 1.4);
            var w = e * (1 - st.hoverT);
            tz += -(p * p) * cfg.depth.z * w;
            rx += p * cfg.depth.rx * w;
            sc *= 1 - Math.abs(p) * cfg.depth.s * w;
            if (cfg.depth.ry) { ry += st.colPhase * p * cfg.depth.ry * 2 * w; }

            // --- Channel 3: Scroll Velocity Physical Pitch ---
            if (cfg.vel && MOTION.tier > 1) {
                rx += clamp(velocity * 0.5, -3, 3) * (1 - st.hoverT) * e;
            }
        }

        // --- Channel 4: Interactive Mouse Hover Tilt & Lift ---
        if (st.hoverT > 0.001) {
            var h = st.hoverT;
            ty += -8 * h;               // Lift card 8px forward
            tz += cfg.hoverZ * h;       // Push forward in 3D Z space
            sc *= 1 + 0.018 * h;        // Subtle 1.8% scale
            rx += -st.tiltY * cfg.hoverTilt * h; // Tilt X based on mouse Y
            ry += st.tiltX * cfg.hoverTilt * h;  // Tilt Y based on mouse X
        }

        // Compose all channels into ONE clean transform string
        var s = 'perspective(1100px) translate3d(0px,' + ty.toFixed(2) + 'px,' +
                tz.toFixed(1) + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
                ry.toFixed(2) + 'deg) scale3d(' + sc.toFixed(4) + ',' + sc.toFixed(4) + ',1)';

        // Only update DOM if the value has actually changed
        if (s !== st.last) { st.el.style.transform = s; st.last = s; idleFrames = 0; }
        if (Math.abs(op - st.lastOp) > 0.004) {
            st.el.style.opacity = op > 0.999 ? '' : op.toFixed(3);
            st.lastOp = op;
        }
    }


    /* ========================================================================
       5. DELEGATED MOUSE HOVER & SPECULAR GLARE
       ========================================================================
       Instead of binding 100+ separate mouse listeners, we use ONE single
       efficient window pointermove listener that detects which card is hovered!
       ======================================================================== */

    var HOVER_SEL = '.project-card, .board-card, .achievement-card, .publication-card,' +
                    '.contact-card, .impact-card, .website-creator-card, .rebel-menu-card,' +
                    '.gallery-item, .people-card, .event-card, .join-highlight';

    function setHover(st) {
        if (hovered === st) { return; }
        if (hovered) { hovered.hoverTarget = 0; removeGlare(hovered); }
        hovered = st;
        if (st) { st.hoverTarget = 1; addGlare(st); }
        wake();
    }

    // Create the reflective glare layer over the hovered card
    function addGlare(st) {
        if (!MOTION.hover || st.glare) { return; }
        var g = st.el.querySelector(':scope > .card-glare');
        if (!g) {
            g = document.createElement('div');
            g.className = 'card-glare';
            st.el.appendChild(g);
        }
        st.glare = g;
        requestAnimationFrame(function () { if (st.glare) { st.glare.style.opacity = '1'; } });
    }

    function removeGlare(st) {
        if (st.glare) { st.glare.style.opacity = '0'; }
    }

    // Pointer move listener: Tracks mouse position and calculates tilt angles
    function onPointerMove(ev) {
        ptrX = ev.clientX; ptrY = ev.clientY;
        ptrNX = (ptrX / window.innerWidth) * 2 - 1;   // -1 (left edge) to +1 (right edge)
        ptrNY = (ptrY / window.innerHeight) * 2 - 1;  // -1 (top edge) to +1 (bottom edge)

        if (MOTION.hover) {
            var el = ev.target && ev.target.closest ? ev.target.closest(HOVER_SEL) : null;
            var st = el && el.__mo ? el.__mo : null;
            setHover(st);

            if (st && st.measured) {
                var lx = ptrX - st.left;
                var ly = (ptrY + window.scrollY) - st.top;
                st.tiltX = clamp((lx / st.w) * 2 - 1, -1, 1);
                st.tiltY = clamp((ly / st.h) * 2 - 1, -1, 1);
                // Move specular light spotlight over mouse location
                if (st.glare) {
                    st.glare.style.background =
                        'radial-gradient(circle at ' + ((lx / st.w) * 100).toFixed(1) + '% ' +
                        ((ly / st.h) * 100).toFixed(1) + '%, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 62%)';
                }
            }
        }
        wake();
    }


    /* ========================================================================
       6. SMOOTH MOMENTUM SCROLLING (Lenis-Style Physical Lerp)
       ========================================================================
       Smoothly glides page scrolling. Unlike virtual scroll libraries that break
       page accessibility, native `window.scrollY` remains 100% authoritative!
       Find-in-page (Ctrl+F), browser scrollbars, and bookmarks all work seamlessly.
       ======================================================================== */

    var mm = { target: 0, cur: 0, lastApplied: 0, tween: null };

    // Prevent momentum scrolling if mouse is scrolling inside an internal scrollable box
    function canScrollInside(node, dir) {
        while (node && node !== document.body && node !== docEl) {
            if (node.scrollHeight > node.clientHeight + 1) {
                var cs = getComputedStyle(node).overflowY;
                if (cs === 'auto' || cs === 'scroll') {
                    if (dir > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) { return true; }
                    if (dir < 0 && node.scrollTop > 1) { return true; }
                }
            }
            node = node.parentElement;
        }
        return false;
    }

    // Sync state if user dragged the physical browser scrollbar with their mouse
    function syncFromActual() {
        var actual = window.scrollY;
        if (Math.abs(actual - mm.lastApplied) > 1.5) {
            mm.cur = mm.target = mm.lastApplied = actual;
            return true;
        }
        return false;
    }

    // Mouse wheel event listener
    function onWheel(ev) {
        if (!MOTION.momentum || isPaused() || ev.ctrlKey || ev.metaKey) { return; }
        if (canScrollInside(ev.target, ev.deltaY)) { return; }

        var d = ev.deltaY;
        if (ev.deltaMode === 1) { d *= 16; }
        else if (ev.deltaMode === 2) { d *= window.innerHeight; }

        // Clamp travel delta to prevent violent spikes on laptop trackpad flicks
        d = clamp(d, -WHEEL_MAX, WHEEL_MAX) * WHEEL_GAIN;

        syncFromActual();
        mm.tween = null;
        mm.target = clamp(mm.target + d, 0, maxScroll());
        ev.preventDefault();
        wake();
    }

    // Keyboard navigation keys (PageDown, PageUp, Space, Home, End)
    function onKeyScroll(ev) {
        if (!MOTION.momentum || isPaused() || mm.tween) { return; }
        var a = document.activeElement;
        if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { return; }

        var vh = window.innerHeight, d = null;
        if (ev.key === 'PageDown') { d = vh * 0.85; }
        else if (ev.key === 'PageUp') { d = -vh * 0.85; }
        else if (ev.key === ' ' && !ev.shiftKey && (!a || a === document.body)) { d = vh * 0.85; }
        else if (ev.key === 'End') { d = maxScroll() - mm.target; }
        else if (ev.key === 'Home') { d = -mm.target; }
        if (d === null) { return; }

        mm.target = clamp(mm.target + d, 0, maxScroll());
        ev.preventDefault();
        wake();
    }

    // Interpolation step: Coast gently towards scroll target
    function momentumStep(dt) {
        if (!MOTION.momentum) { return; }

        if (mm.tween) { stepTween(); return; }
        if (isPaused()) { mm.cur = mm.target = window.scrollY; return; }

        if (syncFromActual()) { return; }

        if (Math.abs(mm.target - mm.cur) < 0.03) {
            mm.cur = mm.target;
            return;
        }

        // Frame-rate normalized so 60Hz and 120Hz displays feel identically smooth
        var k = 1 - Math.pow(1 - MOMENTUM_EASE, dt / 16.67);
        mm.cur += (mm.target - mm.cur) * k;
        window.scrollTo(0, mm.cur);
        mm.lastApplied = window.scrollY;
        idleFrames = 0;
    }

    // Smooth animated scroll to a specific pixel destination (e.g. clicking an anchor link)
    function scrollToY(dest, dur) {
        dest = clamp(dest, 0, maxScroll());
        if (!MOTION.momentum) {
            window.scrollTo({ top: dest, behavior: 'smooth' });
            return;
        }
        mm.tween = { from: window.scrollY, to: dest, start: performance.now(), dur: dur || 900 };
        wake();
    }

    function stepTween() {
        var t = mm.tween;
        var p = clamp((performance.now() - t.start) / t.dur, 0, 1);
        var v = t.from + (t.to - t.from) * easeInOutQuart(p);
        window.scrollTo(0, v);
        mm.cur = mm.target = v;
        mm.lastApplied = window.scrollY;
        idleFrames = 0;
        if (p >= 1) { mm.tween = null; }
    }

    // Handle clicks on internal anchor links (e.g. #about, #contact)
    function onAnchorClick(ev) {
        if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) { return; }
        var a = ev.target.closest && ev.target.closest('a[href^="#"], .scroll-top-dial');
        if (!a) { return; }

        var target = null;
        var owns = false;

        if (a.classList.contains('scroll-top-dial')) {
            target = 0;
            owns = true;
        } else {
            var href = a.getAttribute('href');
            if (!href || href === '#') { return; }
            var el = document.getElementById(href.slice(1));
            if (!el) { return; }
            target = el.getBoundingClientRect().top + window.scrollY - 94;
            owns = a.classList.contains('minimap-dot');
            history.replaceState(null, '', href);
        }

        ev.preventDefault();
        if (owns) { ev.stopPropagation(); }
        scrollToY(target, 950);
    }


    /* ========================================================================
       7. HERO SECTION LAYERED PARALLAX
       ======================================================================== */

    var hero = {};

    function initHero() {
        hero.sec = document.querySelector('.hero');
        if (!hero.sec) { return; }
        hero.content = document.querySelector('.hero-content');
        hero.backdrop = document.querySelector('.hero-backdrop-img');
        hero.overlay = document.querySelector('.hero-overlay');
        hero.meta = document.querySelector('.hero-meta');
        hero.h = hero.sec.offsetHeight || window.innerHeight;
    }

    function updateHero(y, now) {
        if (!hero.sec) { return; }
        if (y > hero.h + 200) { return; } // Skip calculations if scrolled well past hero

        var hp = clamp(y / (hero.h * 0.9), 0, 1);

        // Content tilts and fades gently backwards
        if (hero.content) {
            hero.content.style.transform =
                'perspective(1400px) translate3d(0px,' + (hp * -120).toFixed(1) + 'px,' +
                (hp * -190).toFixed(1) + 'px) rotateX(' + (hp * 9).toFixed(2) + 'deg)';
            hero.content.style.opacity = clamp(1 - hp * 1.15, 0, 1).toFixed(3);
        }

        if (hero.overlay) {
            hero.overlay.style.transform = 'translate3d(0px,' + (hp * 55).toFixed(1) + 'px,0px)';
        }

        // Bridge to CSS custom properties on backdrop
        if (hero.backdrop) {
            hero.backdrop.style.setProperty('--hb-y', (hp * 90).toFixed(1) + 'px');
            hero.backdrop.style.setProperty('--hb-x',
                (MOTION.hover ? ptrNX * -14 : 0).toFixed(1) + 'px');
        }

        if (hero.zoom) {
            hero.zoom.style.transform = 'scale(' + (1 + hp * 0.42).toFixed(3) + ')';
            hero.zoom.style.opacity = clamp(1 - hp * 0.5, 0, 1).toFixed(3);
        }

        if (hero.meta) {
            hero.meta.style.transform = 'translate3d(0px,' + (hp * -60).toFixed(1) + 'px,0px)';
            hero.meta.style.opacity = clamp(1 - hp * 1.4, 0, 1).toFixed(3);
        }
    }


    /* ========================================================================
       8. SITE CHROME & CSS CUSTOM-PROPERTY BRIDGES
       ========================================================================
       Updates CSS variables for floating background orbs, minimap tilt, and gear.
       ======================================================================== */

    var chrome = {};

    function initChrome() {
        chrome.orb1 = document.querySelector('.ambient-orb-1');
        chrome.orb2 = document.querySelector('.ambient-orb-2');
        chrome.dial = document.getElementById('scrollTopDial');
        chrome.minimap = document.getElementById('sectionMinimap');
        chrome.notif = document.querySelector('.notification-button');
        chrome.navbar = document.querySelector('.navbar');
    }

    function updateChrome(y) {
        // Ambient background glowing orbs parallax
        if (chrome.orb1) {
            chrome.orb1.style.setProperty('--my', (y * 0.10).toFixed(1) + 'px');
            chrome.orb1.style.setProperty('--mx', (ptrNX * 18).toFixed(1) + 'px');
        }
        if (chrome.orb2) {
            chrome.orb2.style.setProperty('--my', (-y * 0.08).toFixed(1) + 'px');
            chrome.orb2.style.setProperty('--mx', (-ptrNX * 22).toFixed(1) + 'px');
        }
        // Rotate Rotary gear emblem in sync with scroll position
        if (chrome.gear) {
            chrome.gear.style.setProperty('--wheel-rot', (y * 0.18).toFixed(1) + 'deg');
        }
        // Lean circular scroll dial toward mouse cursor
        if (chrome.dial) {
            chrome.dial.style.setProperty('--dry', (ptrNX * 12).toFixed(2) + 'deg');
            chrome.dial.style.setProperty('--drx', clamp(-velocity * 1.1, -14, 14).toFixed(2) + 'deg');
        }
        // Section minimap 3D tilt
        if (chrome.minimap) {
            chrome.minimap.style.setProperty('--mmry', (ptrNX * -8).toFixed(2) + 'deg');
            chrome.minimap.style.setProperty('--mmz', clamp(Math.abs(velocity) * 1.6, 0, 22).toFixed(1) + 'px');
        }
        if (chrome.notif) {
            chrome.notif.style.setProperty('--nry', (ptrNX * 14).toFixed(2) + 'deg');
        }
    }


    /* ========================================================================
       9. SPLIT-TEXT REVEAL ENGINE
       ========================================================================
       Splits heading sentences into individual words wrapped in invisible masks.
       As you scroll, each word rotates upright and slides smoothly into place.
       ======================================================================== */

    function wordSpan(text) {
        var outer = document.createElement('span');
        outer.className = 'mw';
        var inner = document.createElement('span');
        inner.className = 'mwi';
        inner.textContent = text;
        outer.appendChild(inner);
        return outer;
    }

    // Recursively walk text nodes so HTML tags (like <span class="highlight">) are preserved
    function walkSplit(node, out) {
        var kids = Array.prototype.slice.call(node.childNodes);
        for (var i = 0; i < kids.length; i++) {
            var c = kids[i];
            if (c.nodeType === 3) {
                var parts = c.data.split(/(\s+)/);
                for (var j = 0; j < parts.length; j++) {
                    if (!parts[j]) { continue; }
                    if (/^\s+$/.test(parts[j])) {
                        out.appendChild(document.createTextNode(parts[j]));
                    } else {
                        out.appendChild(wordSpan(parts[j]));
                    }
                }
            } else if (c.nodeType === 1) {
                if (c.tagName === 'BR') {
                    out.appendChild(c.cloneNode(false));
                } else {
                    var clone = c.cloneNode(false);
                    walkSplit(c, clone);
                    out.appendChild(clone);
                }
            }
        }
    }

    function splitHeading(h2) {
        if (!h2 || h2.dataset.msplit) { return []; }
        var frag = document.createDocumentFragment();
        walkSplit(h2, frag);
        h2.textContent = '';
        h2.appendChild(frag);
        h2.dataset.msplit = '1';
        return Array.prototype.slice.call(h2.querySelectorAll('.mw'));
    }

    function playWords(words, inbound, step) {
        step = step || 45;
        for (var i = 0; i < words.length; i++) {
            (function (w, d) {
                w.style.transitionDelay = d + 'ms';
                if (w.firstChild) { w.firstChild.style.transitionDelay = d + 'ms'; }
                if (inbound) { w.classList.remove('is-out'); w.classList.add('is-in'); }
                else { w.classList.remove('is-in'); w.classList.add('is-out'); }
            })(words[i], i * step);
        }
    }

    function initSplitHeadings() {
        var heads = document.querySelectorAll('.section-heading h2, .impact-heading h2');
        for (var i = 0; i < heads.length; i++) {
            heads[i].__words = splitHeading(heads[i]);
            addTrigger(heads[i], function (h) { playWords(h.__words || [], true, 45); });
        }
    }

    function initHeroRotator() {
        var slides = document.querySelectorAll('.hero-slide');
        if (!slides.length) { return; }

        slides.forEach(function (slide) {
            var h1 = slide.querySelector('.hero-slide-title, h1');
            if (!h1) { return; }
            slide.__words = splitHeading(h1);
            if (slide.classList.contains('active')) {
                playWords(slide.__words, true, 40);
            }
        });

        // Observe slide class changes to animate incoming and outgoing statements
        var mo = new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                var s = m.target;
                if (!s.__words) { return; }
                playWords(s.__words, s.classList.contains('active'), 40);
            });
        });
        slides.forEach(function (s) {
            mo.observe(s, { attributes: true, attributeFilter: ['class'] });
        });
    }


    /* ========================================================================
       10. MECHANICAL ODOMETER NUMBER COUNTERS
       ========================================================================
       Replaces static numbers with rolling mechanical odometer strips (0-9).
       ======================================================================== */

    function buildOdometer(el) {
        if (el.dataset.odo) { return; }
        var target = parseInt(el.getAttribute('data-target'), 10);
        if (isNaN(target)) { return; }

        var text = target.toLocaleString();
        el.dataset.odo = '1';
        el.setAttribute('aria-label', text); // Accessible for screen readers
        el.textContent = '';

        var odo = document.createElement('span');
        odo.className = 'odo';
        odo.setAttribute('aria-hidden', 'true');

        var digitSlots = [];
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (ch < '0' || ch > '9') {
                var sep = document.createElement('span');
                sep.className = 'odo-sep';
                sep.textContent = ch;
                odo.appendChild(sep);
                continue;
            }
            var col = document.createElement('span');
            col.className = 'odo-col';
            var strip = document.createElement('span');
            strip.className = 'odo-strip';

            var finalDigit = parseInt(ch, 10);
            var spins = 2 + (text.length - i) * 0.5 | 0;
            var stop = spins * 10 + finalDigit;
            for (var k = 0; k <= stop; k++) {
                var d = document.createElement('span');
                d.className = 'odo-digit';
                d.textContent = String(k % 10);
                strip.appendChild(d);
            }
            col.appendChild(strip);
            odo.appendChild(col);
            digitSlots.push({ strip: strip, stop: stop });
        }

        el.appendChild(odo);
        el.__odo = { odo: odo, slots: digitSlots };
    }

    function playOdometer(el) {
        var o = el.__odo;
        if (!o || o.played) { return; }
        o.played = true;

        o.odo.classList.add('is-in', 'is-rolling');
        o.slots.forEach(function (s, i) {
            var fromRight = o.slots.length - 1 - i;
            s.strip.style.setProperty('--odo-dur', (1.5 + fromRight * 0.22).toFixed(2) + 's');
            s.strip.style.transitionDelay = (fromRight * 70) + 'ms';
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    s.strip.style.transform = 'translateY(-' + s.stop + 'em)';
                });
            });
        });
    }

    function initOdometers() {
        var nums = document.querySelectorAll('.impact-number[data-target]');
        if (!nums.length) { return; }

        if (prefersReduced) {
            nums.forEach(function (n) {
                n.textContent = parseInt(n.getAttribute('data-target'), 10).toLocaleString();
            });
            return;
        }

        nums.forEach(function (n) {
            buildOdometer(n);
            addTrigger(n, playOdometer);
        });
    }


    /* ========================================================================
       11. FLIP LIGHTBOX EXPANSION & FILTER TRANSITIONS
       ========================================================================
       FLIP technique:
         1. First: Measure clicked thumbnail rect on screen.
         2. Last: Measure opened modal/image destination rect.
         3. Invert: Apply transform to start exactly over the thumbnail.
         4. Play: Animate transform to 0, creating a seamless zoom-in!
       ======================================================================== */

    var lastThumb = null;

    function initGalleryFlip() {
        document.addEventListener('click', function (ev) {
            var btn = ev.target.closest && ev.target.closest('.gallery-filter');
            if (!btn) { return; }

            var tiles = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
            var first = new Map();
            tiles.forEach(function (t) {
                var r = t.getBoundingClientRect();
                if (r.width) { first.set(t, r); }
            });

            setTimeout(function () {
                markGeomDirty();
                remeasure();
                var rt = document.querySelector('.rail-track');
                if (rt && rt.__recount) { rt.__recount(); }
                tiles.forEach(function (t) {
                    var st = t.__mo;
                    if (!st) { return; }
                    var r = t.getBoundingClientRect();
                    if (!r.width) { return; }

                    var f = first.get(t);
                    if (f) {
                        st.revealAt = performance.now() + (st.col % 4) * 40;
                    } else {
                        st.revealAt = performance.now() + (st.col % 4) * 55;
                        st.last = '';
                    }
                });
                wake();
            }, 0);
        }, true);

        // Record clicked thumbnail position
        document.addEventListener('click', function (ev) {
            var tile = ev.target.closest && ev.target.closest(
                '.gallery-item, .achievement-image, .project-card .project-image');
            if (!tile) { return; }
            var img = tile.querySelector('img');
            if (img) { lastThumb = img.getBoundingClientRect(); }
        }, true);
    }

    function flipIn(imgEl) {
        if (!imgEl || !lastThumb || !lastThumb.width) { return; }
        var from = lastThumb;

        requestAnimationFrame(function () {
            var to = imgEl.getBoundingClientRect();
            if (!to.width) { return; }

            var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
            var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
            var sx = from.width / to.width;
            var sy = from.height / to.height;

            imgEl.style.transition = 'none';
            imgEl.style.transformOrigin = '50% 50%';
            imgEl.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) +
                                    'px,-260px) scale(' + Math.max(sx, 0.05).toFixed(4) + ',' +
                                    Math.max(sy, 0.05).toFixed(4) + ') rotateY(10deg)';
            imgEl.style.opacity = '0.4';

            // Force reflow
            void imgEl.offsetWidth;

            imgEl.style.transition = 'transform .52s cubic-bezier(.16,1,.3,1), opacity .3s ease';
            imgEl.style.transform = 'translate3d(0px,0px,0px) scale(1,1) rotateY(0deg)';
            imgEl.style.opacity = '1';
        });
    }

    function initLightboxFlip() {
        var OPENERS = {
            openLightbox: '.gallery-lightbox .lightbox-content img',
            openProjectModal: '.project-modal .project-modal-hero img'
        };
        Object.keys(OPENERS).forEach(function (name) {
            var orig = window[name];
            if (typeof orig !== 'function') { return; }
            var sel = OPENERS[name];
            window[name] = function () {
                var r = orig.apply(this, arguments);
                flipIn(document.querySelector(sel));
                markGeomDirty();
                return r;
            };
        });

        var achv = document.querySelector('.achievement-lightbox');
        if (achv) {
            new MutationObserver(function () {
                if (achv.classList.contains('active')) {
                    flipIn(achv.querySelector('.achievement-lightbox-content img'));
                }
            }).observe(achv, { attributes: true, attributeFilter: ['class'] });
        }
    }

    function initProjectFlip() {
        document.addEventListener('click', function (ev) {
            var btn = ev.target.closest && ev.target.closest('.project-filter');
            if (!btn) { return; }

            if (docEl.classList.contains('fly-on')) {
                setTimeout(function () {
                    var tr = document.querySelector('.fly-track');
                    if (tr && tr.__recount) { tr.__recount(); }
                    wake();
                }, 0);
                return;
            }

            var cards = Array.prototype.slice.call(document.querySelectorAll('.project-card'));
            var wasVisible = new Map();
            cards.forEach(function (c) {
                var r = c.getBoundingClientRect();
                if (r.width) { wasVisible.set(c, true); }
            });

            requestAnimationFrame(function () {
                markGeomDirty();
                remeasure();
                cards.forEach(function (c) {
                    var st = c.__mo;
                    if (!st || !c.getBoundingClientRect().width) { return; }
                    var fresh = !wasVisible.has(c);
                    st.revealAt = performance.now() + (st.col % 3) * (fresh ? 60 : 45);
                    if (fresh) { st.last = ''; }
                });
                wake();
            });
        }, true);
    }


    /* ========================================================================
       11b. SCROLL SCENES (Camera Fly-Through, Horizontal Rails, Card Decks)
       ======================================================================== */

    var SCENE_OFF = (params.get('no') || '').split(',');

    function sceneOn(name) {
        return SCENE_OFF.indexOf(name) === -1 &&
               window.innerWidth >= 1025 && finePointer;
    }

    function wrapScene(el, trackCls, stageCls) {
        if (!el || el.__wrapped) { return null; }
        var track = document.createElement('div');
        track.className = trackCls;
        var stage = document.createElement('div');
        stage.className = stageCls;
        el.parentNode.insertBefore(track, el);
        track.appendChild(stage);
        stage.appendChild(el);
        el.__wrapped = true;
        return { track: track, stage: stage };
    }

    /* --- Scene 1: 3D Project Corridor Camera Fly-Through --- */
    function initFlythrough() {
        var grid = document.querySelector('.project-grid');
        if (!grid || !sceneOn('fly')) { return; }

        var w = wrapScene(grid, 'fly-track', 'fly-stage');
        if (!w) { return; }

        var counter = document.createElement('div');
        counter.className = 'fly-counter';
        counter.setAttribute('aria-hidden', 'true');
        counter.innerHTML = '<span class="fly-n">01</span>' +
                            '<span class="fly-bar"><i></i></span>' +
                            '<span class="fly-t">11</span>';
        w.stage.appendChild(counter);

        docEl.classList.add('fly-on');
        counter.style.display = 'flex';

        var cards = Array.prototype.slice.call(grid.querySelectorAll('.project-card'));
        cards.forEach(function (c) { if (c.__mo) { c.__mo.sceneOwned = true; } });

        var visible = cards.slice();

        function recount() {
            visible = cards.filter(function (c) {
                return !c.classList.contains('hidden');
            });
            w.track.style.setProperty('--fly-h',
                (window.innerHeight + visible.length * 260) + 'px');
            counter.querySelector('.fly-t').textContent = ('0' + visible.length).slice(-2);
            markGeomDirty();
        }
        recount();
        w.track.__recount = recount;

        registerScene(w.track, function (p) {
            var n = visible.length;
            if (!n) { return; }

            cards.forEach(function (c) {
                if (visible.indexOf(c) === -1) {
                    c.style.opacity = '0';
                    c.style.pointerEvents = 'none';
                }
            });

            var head = 1.2 + p * (n + 0.48);
            var front = -1, frontD = 1e9;

            visible.forEach(function (c, i) {
                var local = head - i;
                var z = -2000 + local * 820; // 3D depth position along corridor
                var op = clamp((z + 2000) / 700, 0, 1) * clamp((500 - z) / 300, 0, 1);

                var side = (i % 2 ? 1 : -1);
                var dist = clamp(-z / 2000, 0, 1);
                var x = side * dist * 300;
                var y = -dist * 46;

                c.style.transform =
                    'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,' +
                    y.toFixed(1) + 'px,' + z.toFixed(0) + 'px) rotateY(' +
                    (-side * dist * 17).toFixed(1) + 'deg)';
                c.style.opacity = op.toFixed(3);
                c.style.zIndex = String(500 + Math.round(z / 8));
                c.style.pointerEvents = op > 0.72 ? 'auto' : 'none';

                var d = Math.abs(z - 200);
                if (op > 0.5 && d < frontD) { frontD = d; front = i; }
            });

            counter.querySelector('.fly-n').textContent = ('0' + clamp(front + 1, 1, n)).slice(-2);
            counter.style.setProperty('--fly-p', (p * 100).toFixed(1) + '%');
        });
    }

    /* --- Scene 2: Gallery Runs Sideways on Horizontal Rail --- */
    function initRail() {
        var grid = document.querySelector('.gallery-grid');
        if (!grid || !sceneOn('rail')) { return; }

        var w = wrapScene(grid, 'rail-track', 'rail-stage');
        if (!w) { return; }
        docEl.classList.add('rail-on');

        function resize() {
            var travel = Math.max(grid.scrollWidth - window.innerWidth, 0);
            w.track.style.setProperty('--rail-h', (window.innerHeight + travel * 0.55) + 'px');
            markGeomDirty();
        }
        resize();
        w.track.__recount = resize;

        registerScene(w.track, function (p) {
            var travel = Math.max(grid.scrollWidth - window.innerWidth, 0);
            grid.style.transform = 'translate3d(' + (-p * travel).toFixed(0) + 'px,0,0)';
        });
    }

    /* --- Scene 3: Awards Stack Into a Physical Deck --- */
    function initDeck() {
        var grid = document.querySelector('.achievement-grid');
        if (!grid || !sceneOn('stack')) { return; }

        docEl.classList.add('stack-on');
        grid.classList.add('is-deck');

        var cards = Array.prototype.slice.call(grid.querySelectorAll('.achievement-card'));
        cards.forEach(function (c, i) {
            c.style.setProperty('--deck-i', i);
            if (c.__mo) { c.__mo.sceneOwned = true; }
            c.style.transform = '';
            c.style.opacity = '';
        });
        markGeomDirty();

        registerScene(grid, function () {
            var i, tops = [];
            for (i = 0; i < cards.length; i++) {
                tops.push(cards[i].getBoundingClientRect().top);
            }
            for (i = 0; i < cards.length; i++) {
                var gap = (i < cards.length - 1) ? tops[i + 1] - tops[i] : 999;
                var buried = clamp((158 - gap) / 144, 0, 1);
                cards[i].style.transform = 'scale(' + (1 - buried * 0.07).toFixed(3) + ')';
                cards[i].style.filter = buried > 0.01
                    ? 'brightness(' + (1 - buried * 0.22).toFixed(3) + ')'
                    : '';
            }
        });
    }

    /* --- Scene 4: Hero Backdrop Zoom-Through --- */
    function initHeroZoom() {
        var backdrop = document.querySelector('.hero-backdrop');
        if (!backdrop || !sceneOn('hero')) { return; }
        docEl.classList.add('herozoom-on');
        hero.zoom = backdrop;
    }

    /* --- Scene 5: Geared Rotary Wheel SVG Emblem --- */
    function initRotaryGear() {
        var dial = document.getElementById('scrollTopDial');
        if (!dial || SCENE_OFF.indexOf('gear') !== -1) { return; }
        if (dial.querySelector('.rotary-gear')) { return; }

        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'rotary-gear');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('aria-hidden', 'true');

        var g = document.createElementNS(NS, 'g');
        g.setAttribute('fill', 'currentColor');

        // Draw 24 gear teeth and 6 spokes matching official Rotary emblem
        var i, el;
        for (i = 0; i < 24; i++) {
            el = document.createElementNS(NS, 'rect');
            el.setAttribute('x', '47.4');
            el.setAttribute('y', '2');
            el.setAttribute('width', '5.2');
            el.setAttribute('height', '9');
            el.setAttribute('rx', '1.4');
            el.setAttribute('transform', 'rotate(' + (i * 15) + ' 50 50)');
            g.appendChild(el);
        }
        for (i = 0; i < 6; i++) {
            el = document.createElementNS(NS, 'rect');
            el.setAttribute('x', '47');
            el.setAttribute('y', '22');
            el.setAttribute('width', '6');
            el.setAttribute('height', '56');
            el.setAttribute('transform', 'rotate(' + (i * 30) + ' 50 50)');
            g.appendChild(el);
        }

        var ring = document.createElementNS(NS, 'circle');
        ring.setAttribute('cx', '50'); ring.setAttribute('cy', '50'); ring.setAttribute('r', '38');
        ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', 'currentColor'); ring.setAttribute('stroke-width', '9');
        g.appendChild(ring);

        var hub = document.createElementNS(NS, 'circle');
        hub.setAttribute('cx', '50'); hub.setAttribute('cy', '50'); hub.setAttribute('r', '12');
        hub.setAttribute('fill', 'none'); hub.setAttribute('stroke', 'currentColor'); hub.setAttribute('stroke-width', '7');
        g.appendChild(hub);

        svg.appendChild(g);
        dial.insertBefore(svg, dial.firstChild);
        chrome.gear = svg;
    }


    /* ========================================================================
       12. INTEGRATION WITH script.js STATE CHANGES
       ======================================================================== */

    function initIntegration() {
        // Tab switching: Re-measure geometry when switching people tabs
        var origShow = window.showPeople;
        if (typeof origShow === 'function') {
            window.showPeople = function () {
                var r = origShow.apply(this, arguments);
                registerAll('.people-card', 'soft');
                markGeomDirty();
                requestAnimationFrame(function () {
                    remeasure();
                    document.querySelectorAll('.people-display.active .people-card')
                        .forEach(function (c) {
                            if (c.__mo) { c.__mo.revealAt = -1; }
                        });
                    wake();
                });
                return r;
            };
        }

        // When site preloader finishes, play intro entrance animation
        var body = document.body;
        if (body.classList.contains('preloader-active')) {
            var mo = new MutationObserver(function () {
                if (!body.classList.contains('preloader-active')) {
                    mo.disconnect();
                    docEl.classList.add('motion-intro');
                    initHero();
                    markGeomDirty();
                    setTimeout(function () { docEl.classList.remove('motion-intro'); }, 1400);
                    wake();
                }
            });
            mo.observe(body, { attributes: true, attributeFilter: ['class'] });
        }

        // Calculate scrollbar width so dialogs don't shift layout
        docEl.style.setProperty('--sbw', (window.innerWidth - docEl.clientWidth) + 'px');

        if (window.ResizeObserver) {
            new ResizeObserver(markGeomDirty).observe(docEl);
        }
        document.addEventListener('load', markGeomDirty, true);
        window.addEventListener('resize', function () {
            ['.fly-track', '.rail-track'].forEach(function (sel) {
                var el = document.querySelector(sel);
                if (el && el.__recount) { el.__recount(); }
            });
            hero.h = hero.sec ? hero.sec.offsetHeight : window.innerHeight;
            docEl.style.setProperty('--sbw', (window.innerWidth - docEl.clientWidth) + 'px');
            markGeomDirty();
        }, { passive: true });
        window.addEventListener('pageshow', function () {
            mm.cur = mm.target = mm.lastApplied = window.scrollY;
            markGeomDirty();
        });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(markGeomDirty);
        }
    }


    /* ========================================================================
       13. THE UNIFIED REQUESTANIMATIONFRAME RENDER LOOP
       ========================================================================
       This is the central heartbeat of the motion layer.
       Runs at display refresh rate (60Hz / 120Hz).
       Parks automatically when there is no user input or movement to conserve power!
       ======================================================================== */

    function wake() {
        idleFrames = 0;
        if (!rafId) { lastFrame = performance.now(); rafId = requestAnimationFrame(frame); }
    }

    function frame(now) {
        var dt = clamp(now - lastFrame, 8, 50);
        lastFrame = now;

        // Step 1: Smooth momentum scrolling
        momentumStep(dt);

        // Step 2: Read current scroll position and remeasure if needed
        scrollY = window.scrollY;
        if (geomDirty) { remeasure(); }

        var vh = window.innerHeight;
        var dy = scrollY - prevScrollY;
        prevScrollY = scrollY;
        velocity = velocity * 0.88 + (dy / dt * 16.67) * 0.12;
        if (Math.abs(velocity) < 0.02) { velocity = 0; }

        // Step 3: Update hover easing and all 3D cards
        if (hovered || velocity) { idleFrames = 0; }
        for (var i = 0; i < items.length; i++) {
            var st = items[i];
            var tgt = st.hoverTarget || 0;
            if (st.hoverT !== tgt) {
                var k = tgt > st.hoverT ? 0.14 : 0.08;
                st.hoverT += (tgt - st.hoverT) * (1 - Math.pow(1 - k, dt / 16.67));
                if (Math.abs(tgt - st.hoverT) < 0.002) { st.hoverT = tgt; }
                idleFrames = 0;
            }
            updateItem(st, scrollY, vh, now);
        }

        // Step 4: Update scenes, triggers, hero, and chrome
        updateScenes(scrollY, vh);
        checkTriggers(scrollY, vh);
        updateHero(scrollY, now);
        updateChrome(scrollY);

        // Step 5: Power conservation — park loop when user has stopped moving
        idleFrames++;
        if (idleFrames > 90 && !mm.tween && Math.abs(mm.target - mm.cur) < 0.1) {
            rafId = 0;
            return;
        }
        rafId = requestAnimationFrame(frame);
    }


    /* ========================================================================
       14. BOOT & INITIALIZATION
       ======================================================================== */

    function init() {
        registerAll('.project-card, .board-card, .achievement-card, .publication-card,' +
                    '.contact-card, .impact-card, .website-creator-card, .rebel-menu-card', 'card');
        registerAll('.gallery-item', 'gallery');
        registerAll('.people-card, .event-card, .join-highlight', 'soft');

        initHero();
        initChrome();
        initSplitHeadings();
        initHeroRotator();
        initOdometers();
        initGalleryFlip();
        initProjectFlip();
        initLightboxFlip();

        initRotaryGear();
        initHeroZoom();
        initFlythrough();
        initRail();
        initDeck();
        initIntegration();

        remeasure();

        window.addEventListener('scroll', wake, { passive: true });
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('keydown', onKeyScroll);
        document.addEventListener('click', onAnchorClick, true);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                mm.cur = mm.target = mm.lastApplied = window.scrollY;
                wake();
            }
        });

        mm.cur = mm.target = mm.lastApplied = window.scrollY;
        wake();
    }

    onReady(init);


    /* ========================================================================
       15. PUBLIC API & DEBUG SURFACE
       ======================================================================== */

    MOTION.stats = function () {
        var active = 0;
        for (var i = 0; i < items.length; i++) { if (items[i].active) { active++; } }
        return {
            tier: MOTION.tier,
            tracked: items.length,
            active: active,
            momentum: MOTION.momentum,
            target: Math.round(mm.target),
            current: Math.round(mm.cur),
            lastApplied: Math.round(mm.lastApplied),
            velocity: +velocity.toFixed(2),
            looping: !!rafId
        };
    };
    MOTION.remeasure = markGeomDirty;
    MOTION.scrollToY = scrollToY;

})();
