/* ============================================================================
   RAC DCP — PAGE-TO-PAGE 3D VIEW TRANSITIONS (x-transitions.js)
   ============================================================================
   
   WHAT THIS FILE DOES:
   Coordinates smooth 3D camera transitions when moving between website pages:
     1. Loaded synchronously in <head> without `defer` so the browser's
        `pagereveal` event listener is registered before the first frame paints.
     2. Captures the X/Y screen percentage where the visitor clicked a link.
     3. On the new page, grows the incoming page directly from that click point,
        or plays the reverse 3D zoom-out animation when pressing Browser Back.
   ============================================================================ */
(function () {
    'use strict';

    // Respect the visitor's OS "Reduce Motion" preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

    var root = document.documentElement;
    var KEY = 'x-vt-origin'; // Temporary sessionStorage key to pass coordinates across pages

    // ------------------------------------------------------------------------
    // 1. SAVE CLICK ORIGIN BEFORE NAVIGATING AWAY
    // ------------------------------------------------------------------------
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || a.target === '_blank') { return; }

        var url;
        try { url = new URL(a.href, location.href); } catch (_) { return; }
        // Only apply transitions for internal navigation to a different page on this site
        if (url.origin !== location.origin || url.pathname === location.pathname) { return; }

        // Store the click coordinates as viewport percentages (e.g. "42.5% 18.0%")
        var x = ((e.clientX || innerWidth / 2) / innerWidth) * 100;
        var y = ((e.clientY || innerHeight / 2) / innerHeight) * 100;
        try { sessionStorage.setItem(KEY, x.toFixed(1) + '% ' + y.toFixed(1) + '%'); } catch (_) {}
    }, true);

    // ------------------------------------------------------------------------
    // 2. ANIMATE THE NEW PAGE ON REVEAL
    // ------------------------------------------------------------------------
    window.addEventListener('pagereveal', function (e) {
        if (!e.viewTransition) { return; }

        // Detect if the user navigated backwards via Browser Back button
        var act = window.navigation && navigation.activation;
        var back = !!(act && act.navigationType === 'traverse' && act.from && act.entry &&
                      act.from.index > act.entry.index);

        var origin = null;
        try { origin = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (_) {}

        if (back) {
            // Reversing: add helper class to reverse the CSS keyframes
            root.classList.add('x-vt-back');
        } else if (origin) {
            // Forward: inject clicked X/Y percentages into CSS custom properties
            var p = origin.split(' ');
            root.style.setProperty('--x-vt-ox', p[0]);
            root.style.setProperty('--x-vt-oy', p[1]);
        }

        // Clean up temporary attributes once the transition animation ends
        e.viewTransition.finished.finally(function () {
            root.classList.remove('x-vt-back');
            root.style.removeProperty('--x-vt-ox');
            root.style.removeProperty('--x-vt-oy');
        });
    });
})();
