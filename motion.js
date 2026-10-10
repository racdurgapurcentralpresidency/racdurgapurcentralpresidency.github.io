/* =========================================================
   RAC DCP — 3D CINEMATIC MOTION LAYER
   =========================================================

   Loaded BEFORE script.js so that window.MOTION3D exists by the
   time script.js's guards are parsed.

   ONE IIFE, ZERO top-level declarations. script.js declares 26
   top-level `const`s (navbar, lightbox, counters, ...) in the
   global declarative record; re-declaring any of them here is a
   SyntaxError that would kill this entire file. Do not add
   anything outside this closure.

   Design: a single rAF loop owns every transform. The old code
   had three engines racing for element.style.transform (hover
   tilt, scroll-velocity pitch, orb parallax). Here effects are
   additive channels composed into one string per element per
   frame, so nothing needs to arbitrate.
   ========================================================= */

(function () {
    'use strict';

    /* =====================================================
       1. CAPABILITY DETECTION  (runs synchronously)
       ===================================================== */

    var docEl = document.documentElement;
    var params = new URLSearchParams(location.search);

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var lowSpec = (navigator.deviceMemory && navigator.deviceMemory < 4) ||
                  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

    var enabled = !params.has('nomotion') &&
                  !prefersReduced &&
                  !!window.requestAnimationFrame &&
                  !!window.Map;

    // Momentum scroll is desktop-only: touch devices keep native
    // overscroll / pull-to-refresh, which hijacking would break.
    var useMomentum = enabled && finePointer && window.innerWidth >= 1025 && !lowSpec;

    var MOTION = {
        enabled: enabled,
        momentum: useMomentum,
        hover: enabled && finePointer,
        tier: lowSpec ? 1 : 2,
        version: '1.0'
    };
    window.MOTION3D = MOTION;

    docEl.classList.add(enabled ? 'motion-on' : 'motion-off');

    if (!enabled) { return; }


    /* =====================================================
       2. UTILITIES
       ===================================================== */

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    function easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }


    /* =====================================================
       3. SHARED FRAME STATE
       ===================================================== */

    /* --- Scroll feel. These are the dials worth touching. ---
       MOMENTUM_EASE  lower = longer, heavier glide (0.12 was snappy)
       WHEEL_GAIN     scales each notch of wheel travel
       WHEEL_MAX      per-event clamp; without it a trackpad flick
                      injects one huge spike the lerp must absorb,
                      which reads as a lurch rather than a glide     */
    var MOMENTUM_EASE = 0.075;
    var WHEEL_GAIN = 0.9;
    var WHEEL_MAX = 160;

    var items = [];              // compositor registry
    var triggers = [];           // one-shot, geometry-driven (headings, odometers)
    var scenes = [];             // pinned sections driven by 0..1 progress
    var geomDirty = true;
    var maxYCache = 0;
    var maxYDirty = true;

    var scrollY = window.scrollY || 0;
    var prevScrollY = scrollY;
    var velocity = 0;            // normalised px per frame
    var lastFrame = 0;
    var rafId = 0;
    var idleFrames = 0;

    var ptrNX = 0, ptrNY = 0;    // pointer, -1..1 across the viewport
    var ptrX = 0, ptrY = 0;      // raw client coords

    var hovered = null;          // the one card under the pointer

    function markGeomDirty() { geomDirty = true; maxYDirty = true; wake(); }

    function maxScroll() {
        if (maxYDirty) {
            maxYCache = Math.max(0, docEl.scrollHeight - window.innerHeight);
            maxYDirty = false;
        }
        return maxYCache;
    }

    function isPaused() {
        return document.hidden ||
               document.body.classList.contains('preloader-active') ||
               document.body.classList.contains('lightbox-open');
    }


    /* =====================================================
       4. COMPOSITOR
       Channels (reveal / depth / velocity / hover) are additive
       and compose into ONE transform string per element.
       ===================================================== */

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

    function registerAll(selector, presetName) {
        var list = document.querySelectorAll(selector);
        for (var i = 0; i < list.length; i++) { register(list[i], presetName); }
    }

    /* One-shot reveals driven by cached geometry rather than an
       IntersectionObserver. IO callbacks are suspended entirely while
       a tab is hidden, and a split heading whose trigger never fires
       would stay at opacity 0 — i.e. invisible text. The frame loop
       is the safer owner: it cannot leave content stranded. */
    function addTrigger(el, fn) {
        triggers.push({ el: el, fn: fn, top: 0, fired: false, measured: false });
    }

    /* A scroll SCENE is a tall track with a sticky stage inside. While
       the track is on screen its callback runs every frame with a single
       number: how far through the track you are, 0..1. Everything the
       fly-through does is maths on that number. Scenes are measured in
       the same batched pass as everything else. */
    function registerScene(el, fn) {
        var sc = { el: el, fn: fn, top: 0, h: 0, measured: false, last: -1 };
        scenes.push(sc);
        return sc;
    }

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

    /* Batched geometry read — the only place rects are taken.
       Elements inside display:none tabs measure as 0 and are simply
       skipped until a remeasure after they become visible. */
    function remeasure() {
        var y = window.scrollY;
        var groups = new Map();
        var i, st, r;

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

        // Column index from measured x-position, not indexOf() — the
        // DOM order breaks as soon as the gallery is filtered.
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
                s.colPhase = (s.col / n) - 0.5;   // -0.5 .. +0.5
            });
        });

        for (i = 0; i < scenes.length; i++) {
            var scn = scenes[i];
            var sr = scn.el.getBoundingClientRect();
            if (sr.height === 0) { scn.measured = false; continue; }
            scn.top = sr.top + y;
            scn.h = sr.height;
            scn.measured = true;
            scn.last = -1;
        }

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

    function updateItem(st, y, vh, now) {
        // A scene owns its elements' transforms outright; the depth
        // conveyor and this writer must not both target them.
        if (st.sceneOwned) { return; }
        if (!st.measured) { return; }

        // Activity test is pure math against cached geometry.
        var on = (st.top + st.h > y - vh * 0.35) && (st.top < y + vh * 1.35);
        if (on !== st.active) {
            st.active = on;
            st.el.style.willChange = on ? 'transform, opacity' : '';
        }
        if (!on) { return; }

        var cfg = st.cfg;

        // --- reveal channel -------------------------------------
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

        // --- depth conveyor -------------------------------------
        if (cfg.depth && e > 0.001) {
            var p = clamp((st.top + st.h / 2 - y - vh / 2) / (vh / 2), -1.4, 1.4);
            var w = e * (1 - st.hoverT);
            tz += -(p * p) * cfg.depth.z * w;
            rx += p * cfg.depth.rx * w;
            sc *= 1 - Math.abs(p) * cfg.depth.s * w;
            if (cfg.depth.ry) { ry += st.colPhase * p * cfg.depth.ry * 2 * w; }

            // --- velocity pitch, same writer, no arbitration -----
            if (cfg.vel && MOTION.tier > 1) {
                rx += clamp(velocity * 0.5, -3, 3) * (1 - st.hoverT) * e;
            }
        }

        // --- hover channel --------------------------------------
        if (st.hoverT > 0.001) {
            var h = st.hoverT;
            ty += -8 * h;
            tz += cfg.hoverZ * h;
            sc *= 1 + 0.018 * h;
            rx += -st.tiltY * cfg.hoverTilt * h;
            ry += st.tiltX * cfg.hoverTilt * h;
        }

        // --- single write ---------------------------------------
        var s = 'perspective(1100px) translate3d(0px,' + ty.toFixed(2) + 'px,' +
                tz.toFixed(1) + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
                ry.toFixed(2) + 'deg) scale3d(' + sc.toFixed(4) + ',' + sc.toFixed(4) + ',1)';

        if (s !== st.last) { st.el.style.transform = s; st.last = s; idleFrames = 0; }
        if (Math.abs(op - st.lastOp) > 0.004) {
            st.el.style.opacity = op > 0.999 ? '' : op.toFixed(3);
            st.lastOp = op;
        }
    }


    /* =====================================================
       5. HOVER  (one delegated listener, not 154)
       ===================================================== */

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

    function onPointerMove(ev) {
        ptrX = ev.clientX; ptrY = ev.clientY;
        ptrNX = (ptrX / window.innerWidth) * 2 - 1;
        ptrNY = (ptrY / window.innerHeight) * 2 - 1;

        if (MOTION.hover) {
            var el = ev.target && ev.target.closest ? ev.target.closest(HOVER_SEL) : null;
            var st = el && el.__mo ? el.__mo : null;
            setHover(st);

            if (st && st.measured) {
                var lx = ptrX - st.left;
                var ly = (ptrY + window.scrollY) - st.top;
                st.tiltX = clamp((lx / st.w) * 2 - 1, -1, 1);
                st.tiltY = clamp((ly / st.h) * 2 - 1, -1, 1);
                if (st.glare) {
                    st.glare.style.background =
                        'radial-gradient(circle at ' + ((lx / st.w) * 100).toFixed(1) + '% ' +
                        ((ly / st.h) * 100).toFixed(1) + '%, rgba(255,255,255,.42) 0%, rgba(255,255,255,0) 62%)';
                }
            }
        }
        wake();
    }


    /* =====================================================
       6. MOMENTUM SCROLL
       Lenis-style: native scrollY stays authoritative, we just
       animate it. That keeps IntersectionObserver, position:fixed,
       keyboard, find-in-page and the scrollbar all working.
       ===================================================== */

    var mm = { target: 0, cur: 0, lastApplied: 0, tween: null };

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

    /* True if something other than this engine moved the page. */
    function syncFromActual() {
        var actual = window.scrollY;
        if (Math.abs(actual - mm.lastApplied) > 1.5) {
            mm.cur = mm.target = mm.lastApplied = actual;
            return true;
        }
        return false;
    }

    function onWheel(ev) {
        if (!MOTION.momentum || isPaused() || ev.ctrlKey || ev.metaKey) { return; }
        if (canScrollInside(ev.target, ev.deltaY)) { return; }

        var d = ev.deltaY;
        if (ev.deltaMode === 1) { d *= 16; }
        else if (ev.deltaMode === 2) { d *= window.innerHeight; }

        // Clamp first, then gain: a single trackpad flick can report
        // several hundred px, which the spring then has to swallow.
        d = clamp(d, -WHEEL_MAX, WHEEL_MAX) * WHEEL_GAIN;

        // Resync BEFORE accumulating. If anything else moved the page
        // since our last write (scrollbar, anchor, focus, find-in-page),
        // the next frame's resync would otherwise discard this delta.
        syncFromActual();

        mm.tween = null;
        mm.target = clamp(mm.target + d, 0, maxScroll());
        ev.preventDefault();
        wake();
    }

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

    function momentumStep(dt) {
        if (!MOTION.momentum) { return; }

        if (mm.tween) { stepTween(); return; }
        if (isPaused()) { mm.cur = mm.target = window.scrollY; return; }

        // Resync: anything that isn't us moved the page.
        if (syncFromActual()) { return; }

        if (Math.abs(mm.target - mm.cur) < 0.03) {
            mm.cur = mm.target;
            return;
        }

        // Frame-rate normalised so 60Hz and 120Hz feel identical.
        var k = 1 - Math.pow(1 - MOMENTUM_EASE, dt / 16.67);
        mm.cur += (mm.target - mm.cur) * k;
        window.scrollTo(0, mm.cur);
        mm.lastApplied = window.scrollY;
        idleFrames = 0;
    }

    /* Anchors use a fixed-duration tween so they land exactly. */
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

    function onAnchorClick(ev) {
        if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) { return; }
        var a = ev.target.closest && ev.target.closest('a[href^="#"], .scroll-top-dial');
        if (!a) { return; }

        var target = null;
        var owns = false;   // does script.js also scroll for this element?

        if (a.classList.contains('scroll-top-dial')) {
            target = 0;
            owns = true;                       // script.js §9 does scrollTo({smooth})
        } else {
            var href = a.getAttribute('href');
            if (!href || href === '#') { return; }
            var el = document.getElementById(href.slice(1));
            if (!el) { return; }
            target = el.getBoundingClientRect().top + window.scrollY - 94;
            owns = a.classList.contains('minimap-dot');   // §12 does scrollIntoView
            history.replaceState(null, '', href);
        }

        ev.preventDefault();

        // Only silence the elements script.js would ALSO scroll for.
        // Plain nav/footer links must keep propagating, or script.js
        // never gets to close the mobile menu on tap.
        if (owns) { ev.stopPropagation(); }

        scrollToY(target, 950);
    }


    /* =====================================================
       7. HERO — LAYERED PARALLAX
       ===================================================== */

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
        if (y > hero.h + 200) { return; }              // fully scrolled past

        var hp = clamp(y / (hero.h * 0.9), 0, 1);

        if (hero.content) {
            hero.content.style.transform =
                'perspective(1400px) translate3d(0px,' + (hp * -120).toFixed(1) + 'px,' +
                (hp * -190).toFixed(1) + 'px) rotateX(' + (hp * 9).toFixed(2) + 'deg)';
            hero.content.style.opacity = clamp(1 - hp * 1.15, 0, 1).toFixed(3);
        }

        if (hero.overlay) {
            hero.overlay.style.transform = 'translate3d(0px,' + (hp * 55).toFixed(1) + 'px,0px)';
        }

        /* Custom-property channel: the Ken Burns keyframe owns `transform`
           on this element and a CSS animation outranks an inline style, so
           writing style.transform here would be silently discarded. */
        if (hero.backdrop) {
            hero.backdrop.style.setProperty('--hb-y', (hp * 90).toFixed(1) + 'px');
            hero.backdrop.style.setProperty('--hb-x',
                (MOTION.hover ? ptrNX * -14 : 0).toFixed(1) + 'px');
        }

        if (hero.zoom) {
            // Travel into the photo rather than sliding it away.
            hero.zoom.style.transform = 'scale(' + (1 + hp * 0.42).toFixed(3) + ')';
            hero.zoom.style.opacity = clamp(1 - hp * 0.5, 0, 1).toFixed(3);
        }

        if (hero.meta) {
            hero.meta.style.transform =
                'translate3d(0px,' + (hp * -60).toFixed(1) + 'px,0px)';
            hero.meta.style.opacity = clamp(1 - hp * 1.4, 0, 1).toFixed(3);
        }
    }


    /* =====================================================
       8. SITE CHROME  (CSS custom-property channel)
       These all have running keyframes or stateful classes that
       own `transform`, and a CSS animation outranks an inline
       style — so JS writes only the vars.
       ===================================================== */

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
        if (chrome.orb1) {
            chrome.orb1.style.setProperty('--my', (y * 0.10).toFixed(1) + 'px');
            chrome.orb1.style.setProperty('--mx', (ptrNX * 18).toFixed(1) + 'px');
        }
        if (chrome.orb2) {
            chrome.orb2.style.setProperty('--my', (-y * 0.08).toFixed(1) + 'px');
            chrome.orb2.style.setProperty('--mx', (-ptrNX * 22).toFixed(1) + 'px');
        }
        if (chrome.gear) {
            /* ~360deg per 2000px, eased for free by the momentum lerp. */
            chrome.gear.style.setProperty('--wheel-rot', (y * 0.18).toFixed(1) + 'deg');
        }
        if (chrome.dial) {
            chrome.dial.style.setProperty('--dry', (ptrNX * 12).toFixed(2) + 'deg');
            chrome.dial.style.setProperty('--drx', clamp(-velocity * 1.1, -14, 14).toFixed(2) + 'deg');
        }
        if (chrome.minimap) {
            chrome.minimap.style.setProperty('--mmry', (ptrNX * -8).toFixed(2) + 'deg');
            chrome.minimap.style.setProperty('--mmz', clamp(Math.abs(velocity) * 1.6, 0, 22).toFixed(1) + 'px');
        }
        if (chrome.notif) {
            chrome.notif.style.setProperty('--nry', (ptrNX * 14).toFixed(2) + 'deg');
        }
    }


    /* =====================================================
       9. SPLIT-TEXT HEADINGS
       Recursive text-node walk. Never textContent: every h2 holds
       a coloured <span>, one also holds a <br>, and one IS a span.
       ===================================================== */

    function wordSpan(text) {
        var outer = document.createElement('span');
        outer.className = 'mw';
        var inner = document.createElement('span');
        inner.className = 'mwi';
        inner.textContent = text;
        outer.appendChild(inner);
        return outer;
    }

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
                    var clone = c.cloneNode(false);      // keeps <span class> + its colour
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

    /* Hero h1s: observe script.js's rotator, never fight it. */
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


    /* =====================================================
       10. ODOMETER COUNTERS
       Strips roll monotonically (0 -> spins -> final digit), so
       there is never a backward wrap. The value is exposed to
       assistive tech via aria-label; the spinner is hidden.
       ===================================================== */

    function buildOdometer(el) {
        if (el.dataset.odo) { return; }
        var target = parseInt(el.getAttribute('data-target'), 10);
        if (isNaN(target)) { return; }

        var text = target.toLocaleString();
        el.dataset.odo = '1';
        el.setAttribute('aria-label', text);
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


    /* =====================================================
       11. GALLERY — FILTER FLIP + LIGHTBOX ZOOM
       ===================================================== */

    var lastThumb = null;

    function initGalleryFlip() {
        // Capture phase: measure BEFORE script.js toggles .hidden.
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
                        // Moved: replay reveal from its old position.
                        st.revealAt = performance.now() + (st.col % 4) * 40;
                    } else {
                        // Newly shown: full 3D entrance.
                        st.revealAt = performance.now() + (st.col % 4) * 55;
                        st.last = '';
                    }
                });
                wake();
            }, 0);
        }, true);

        // Remember which thumbnail was clicked, for the FLIP zoom.
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

            // force reflow so the transition has a start value
            void imgEl.offsetWidth;

            imgEl.style.transition = 'transform .52s cubic-bezier(.16,1,.3,1), opacity .3s ease';
            imgEl.style.transform = 'translate3d(0px,0px,0px) scale(1,1) rotateY(0deg)';
            imgEl.style.opacity = '1';
        });
    }

    function initLightboxFlip() {
        // script.js exposes these as function declarations, so they
        // land on window and can be wrapped. Its `const lightbox`
        // bindings are NOT reachable — re-query the DOM instead.
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

        // Achievement lightbox has no wrappable opener — observe it.
        var achv = document.querySelector('.achievement-lightbox');
        if (achv) {
            new MutationObserver(function () {
                if (achv.classList.contains('active')) {
                    flipIn(achv.querySelector('.achievement-lightbox-content img'));
                }
            }).observe(achv, { attributes: true, attributeFilter: ['class'] });
        }
    }


    /* Project filter FLIP. Mirrors initGalleryFlip but matches
       .project-filter (NOT .gallery-filter, which script.js and the
       gallery FLIP both already own) and uses % 3 for the 3-column
       project grid. */
    function initProjectFlip() {
        document.addEventListener('click', function (ev) {
            var btn = ev.target.closest && ev.target.closest('.project-filter');
            if (!btn) { return; }

            // The fly-through owns these transforms; a FLIP would fight it.
            if (docEl.classList.contains('fly-on')) {
                // setTimeout, not rAF: this only needs to run AFTER the
                // filter handler toggles .hidden, and rAF is suspended
                // whenever the frame loop is throttled — which left the
                // corridor length and counter stale after filtering.
                setTimeout(function () {
                    var tr = document.querySelector('.fly-track');
                    if (tr && tr.__recount) { tr.__recount(); }
                    wake();
                }, 0);
                return;
            }

            var cards = Array.prototype.slice.call(
                document.querySelectorAll('.project-card'));
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
                    // Without this the `s !== st.last` write guard can skip
                    // the first frame and the card renders with the stale
                    // transform it held before display:none.
                    if (fresh) { st.last = ''; }
                });
                wake();
            });
        }, true);
    }


    /* =====================================================
       11b. SCROLL SCENES
       Each is opt-out via ?no=fly,rail,stack,hero,gear so they can be
       judged one at a time. All of them require a fine pointer and a
       wide viewport: pinned sections on touch feel sticky rather than
       smooth, so below 1025px every section keeps its original layout.
       ===================================================== */

    var SCENE_OFF = (params.get('no') || '').split(',');

    function sceneOn(name) {
        return SCENE_OFF.indexOf(name) === -1 &&
               window.innerWidth >= 1025 && finePointer;
    }

    /* Wrap an element in track + stage. Both are display:contents until
       the scene's html class is set, so an inactive scene leaves the
       original layout completely untouched. */
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

    /* --- Scene 1: project camera fly-through ----------------------- */
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

            // Start at 1.2 rather than -1.3 so the first card is ALREADY in
            // the corridor at p=0. Starting behind the fade-in point left a
            // ~270px dead zone: you landed on the #projects anchor and saw
            // an empty stage until the first card caught up.
            var head = 1.2 + p * (n + 0.48);
            var front = -1, frontD = 1e9;

            visible.forEach(function (c, i) {
                var local = head - i;
                // 820px of travel per card, against a ~2300px visible depth
                // window, keeps about three cards in flight at once. At the
                // original 2500 only one was ever in view, which read as a
                // slideshow rather than a corridor.
                var z = -2000 + local * 820;
                // Fade out between z=200 and z=500, so a card is fully opaque
                // when it is closest. The old window started fading at z=300,
                // which meant the card at the camera was only 58% visible.
                var op = clamp((z + 2000) / 700, 0, 1) * clamp((500 - z) / 300, 0, 1);

                // Fan OUT with distance, not with approach: the card at the
                // camera stays centred while the ones behind it splay left
                // and right, so you see down the corridor instead of at one
                // card with the rest hidden directly behind it.
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

            counter.querySelector('.fly-n').textContent =
                ('0' + clamp(front + 1, 1, n)).slice(-2);
            counter.style.setProperty('--fly-p', (p * 100).toFixed(1) + '%');
        });
    }

    /* --- Scene 2: gallery runs sideways ---------------------------- */
    function initRail() {
        var grid = document.querySelector('.gallery-grid');
        if (!grid || !sceneOn('rail')) { return; }

        var w = wrapScene(grid, 'rail-track', 'rail-stage');
        if (!w) { return; }
        docEl.classList.add('rail-on');

        function resize() {
            var travel = Math.max(grid.scrollWidth - window.innerWidth, 0);
            /* 0.55 vertical px per horizontal px keeps the track about
               the same height as the 4-column grid it replaces. */
            w.track.style.setProperty('--rail-h',
                (window.innerHeight + travel * 0.55) + 'px');
            markGeomDirty();
        }
        resize();
        w.track.__recount = resize;

        registerScene(w.track, function (p) {
            var travel = Math.max(grid.scrollWidth - window.innerWidth, 0);
            grid.style.transform = 'translate3d(' + (-p * travel).toFixed(0) + 'px,0,0)';
        });
    }

    /* --- Scene 3: awards stack into a deck ------------------------- */
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

        /* Cards further down the pile shrink and dim, so the deck reads
           as depth rather than a stack of identical rectangles. */
        registerScene(grid, function () {
            // How buried a card is = how far the NEXT card has closed in on
            // it. In free flow they sit ~158px apart; once both are stuck
            // the gap is the 14px stagger. Measuring the distance a card
            // has travelled from its own sticky top (the obvious approach)
            // tops out at ~0.05 and is invisible.
            var i, tops = [];
            for (i = 0; i < cards.length; i++) {
                tops.push(cards[i].getBoundingClientRect().top);   // read phase
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

    /* --- Scene 4: hero zoom-through --------------------------------
       NOT a registerScene: that formula is (y - top) / (height - viewport),
       which is right for a tall pinned track but gives the hero only
       947 - 900 = 47px of travel, so the whole zoom fired in 47 pixels.
       The hero is an ordinary section, so it rides updateHero's own `hp`
       (y / heroHeight) instead. */
    function initHeroZoom() {
        var backdrop = document.querySelector('.hero-backdrop');
        if (!backdrop || !sceneOn('hero')) { return; }
        docEl.classList.add('herozoom-on');
        hero.zoom = backdrop;
    }

    /* --- Scene 5: the page is geared to the Rotary wheel ------------ */
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

        var i, el;
        /* 24 teeth and 6 spokes, as on the actual emblem. */
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
        ring.setAttribute('cx', '50');
        ring.setAttribute('cy', '50');
        ring.setAttribute('r', '38');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', 'currentColor');
        ring.setAttribute('stroke-width', '9');
        g.appendChild(ring);

        var hub = document.createElementNS(NS, 'circle');
        hub.setAttribute('cx', '50');
        hub.setAttribute('cy', '50');
        hub.setAttribute('r', '12');
        hub.setAttribute('fill', 'none');
        hub.setAttribute('stroke', 'currentColor');
        hub.setAttribute('stroke-width', '7');
        g.appendChild(hub);

        svg.appendChild(g);
        dial.insertBefore(svg, dial.firstChild);
        chrome.gear = svg;
    }


    /* =====================================================
       12. INTEGRATION WITH script.js STATE CHANGES
       ===================================================== */

    function initIntegration() {
        // People tabs: 9 of 13 cards live in display:none panes, so
        // they have no geometry until their tab is shown.
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

        // Every rect taken while the preloader is up is garbage:
        // body is height:100vh; overflow:hidden.
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

        // Scrollbar width, for the lightbox padding compensation.
        docEl.style.setProperty('--sbw', (window.innerWidth - docEl.clientWidth) + 'px');

        // Document height moves all session: 70 lazy images.
        if (window.ResizeObserver) {
            new ResizeObserver(markGeomDirty).observe(docEl);
        }
        document.addEventListener('load', markGeomDirty, true);   // img load doesn't bubble
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


    /* =====================================================
       13. THE LOOP
       ===================================================== */

    function wake() {
        idleFrames = 0;
        if (!rafId) { lastFrame = performance.now(); rafId = requestAnimationFrame(frame); }
    }

    function frame(now) {
        var dt = clamp(now - lastFrame, 8, 50);
        lastFrame = now;

        momentumStep(dt);

        // --- the only DOM read of the frame ---
        scrollY = window.scrollY;
        if (geomDirty) { remeasure(); }

        var vh = window.innerHeight;
        var dy = scrollY - prevScrollY;
        prevScrollY = scrollY;
        velocity = velocity * 0.88 + (dy / dt * 16.67) * 0.12;
        if (Math.abs(velocity) < 0.02) { velocity = 0; }

        // --- hover easing ---
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

        updateScenes(scrollY, vh);
        checkTriggers(scrollY, vh);
        updateHero(scrollY, now);
        updateChrome(scrollY);

        // Park when genuinely idle; any input wakes us again.
        idleFrames++;
        if (idleFrames > 90 && !mm.tween && Math.abs(mm.target - mm.cur) < 0.1) {
            rafId = 0;
            return;
        }
        rafId = requestAnimationFrame(frame);
    }


    /* =====================================================
       14. BOOT
       ===================================================== */

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


    /* =====================================================
       15. DEBUG SURFACE
       ===================================================== */

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
