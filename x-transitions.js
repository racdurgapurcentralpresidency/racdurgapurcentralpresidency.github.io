/* Idea B — Page-to-page 3D transitions (see x-transitions.css).
   Loaded in <head> without defer so the 'pagereveal' listener exists
   before the new page is first painted. */
(function () {
    'use strict';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var root = document.documentElement;
    var KEY = 'x-vt-origin';

    // Remember where on screen the visitor clicked a link to another page.
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || a.target === '_blank') { return; }
        var url;
        try { url = new URL(a.href, location.href); } catch (_) { return; }
        if (url.origin !== location.origin || url.pathname === location.pathname) { return; }
        var x = ((e.clientX || innerWidth / 2) / innerWidth) * 100;
        var y = ((e.clientY || innerHeight / 2) / innerHeight) * 100;
        try { sessionStorage.setItem(KEY, x.toFixed(1) + '% ' + y.toFixed(1) + '%'); } catch (_) {}
    }, true);

    // On the new page: grow from that point, or reverse when going back.
    window.addEventListener('pagereveal', function (e) {
        if (!e.viewTransition) { return; }
        var act = window.navigation && navigation.activation;
        var back = !!(act && act.navigationType === 'traverse' && act.from && act.entry &&
                      act.from.index > act.entry.index);
        var origin = null;
        try { origin = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (_) {}
        if (back) {
            root.classList.add('x-vt-back');
        } else if (origin) {
            var p = origin.split(' ');
            root.style.setProperty('--x-vt-ox', p[0]);
            root.style.setProperty('--x-vt-oy', p[1]);
        }
        e.viewTransition.finished.finally(function () {
            root.classList.remove('x-vt-back');
            root.style.removeProperty('--x-vt-ox');
            root.style.removeProperty('--x-vt-oy');
        });
    });
})();
