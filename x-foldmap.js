/* ============================================================================
   RAC DCP — 3D FOLDING MAP SECTION ("Where we serve") — x-foldmap.js
   ============================================================================
   
   WHAT THIS FILE DOES:
   Builds an interactive 3D folded paper map of RI District 3240 using Three.js.
   As the visitor scrolls down:
     1. The folded brochure lifts up off the wooden desk.
     2. Its 4 accordion panels smoothly unfold one by one.
     3. Red 3D pushpins rise out of Durgapur, Naihati, and Kolkata.
     4. The camera flies smoothly from pin to pin while story cards appear.
   
   ACCESSIBILITY & PERFORMANCE:
   - Automatically skips if the visitor turned on "Reduce Motion" or lacks WebGL.
   - Clamps canvas resolution (DPR) on mobile and low-spec PCs for smooth FPS.
   - Caches bounding boxes once the map lies flat to save CPU and battery.
   ============================================================================ */
import * as THREE from './vendor/three.module.min.js';

(function start() {
    // Bail out safely if reduced motion is preferred or WebGL is unavailable
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { return; }

    var main = document.querySelector('main');
    if (!main) { return; }
    var isPhone = innerWidth < 760;

    // ------------------------------------------------------------------------
    // 1. MAP PINS & STORY CARDS CONFIGURATION
    // ------------------------------------------------------------------------
    // Each entry places a 3D pin at normalized coordinates [x, y] (0.0 to 1.0)
    // on the district map and generates a matching floating story card.
    var PINS = [
        { name: 'Durgapur', at: [0.2145, 0.8646], kicker: 'Home', text: 'Where the club was chartered on 12 October 2023, sponsored by the Rotary Club of Durgapur Central.', link: ['#about', 'About the club'] },
        { name: 'Naihati', at: [0.278, 0.893], kicker: 'Muktodhara & Ganga Brick Factory', text: 'Unmute menstrual health drive for 30+ girls, TRIVA Independence Day with children, and lunch for 40+ children of brick factory workers.', link: ['our-work.html', 'See the projects'] },
        { name: 'Kolkata', at: [0.287, 0.925], kicker: 'Our presence', text: 'Members and activities in Kolkata, alongside our home in Durgapur.', link: ['#people', 'Meet our people'] }
    ];

    // ------------------------------------------------------------------------
    // 2. BUILD HTML SECTION & STORY CARDS
    // ------------------------------------------------------------------------
    // Creates the sticky viewport stage, canvas, intro heading, pin cards,
    // end call-to-action buttons, and a "Skip the map" accessibility link.
    var section = document.createElement('section');
    section.className = 'x-fold';
    section.id = 'map';
    section.setAttribute('aria-label', 'Where we serve: an interactive map');
    section.innerHTML =
        '<div class="x-fd-stage">' +
        '<h2 class="sr-only">Where We Serve &middot; RI District 3240</h2>' +
        '<canvas class="x-fd-canvas" aria-hidden="true"></canvas>' +
        '<div class="x-fd-intro"><p class="x-fd-eyebrow">RI District 3240</p><h2>Where<br><span>we serve.</span></h2><p class="x-fd-hint">Scroll to unfold the map</p></div>' +
        PINS.map(function (p, i) {
            return '<article class="x-fd-card" data-i="' + i + '"><p class="x-fd-eyebrow">' + (i + 1) + ' / ' + PINS.length + ' &middot; ' + p.kicker + '</p><h3>' + p.name + '</h3><p>' + p.text + '</p><a href="' + p.link[0] + '">' + p.link[1] + ' &rarr;</a></article>';
        }).join('') +
        '<div class="x-fd-end"><a class="btn btn-rebel-primary" href="#join">Join the Movement &rarr;</a><a class="hero-text-link" href="#impact">Keep exploring &darr;</a></div>' +
        '<a class="x-fd-skip" href="#impact">Skip the map &darr;</a>' +
        '</div>';

    // Insert the 3D map section immediately after the "#about" section
    var about = document.querySelector('#about');
    if (about && about.parentNode) {
        about.parentNode.insertBefore(section, about.nextSibling);
    } else if (main) {
        main.appendChild(section);
    }
    document.documentElement.classList.add('x-fold-on');

    var stage = section.querySelector('.x-fd-stage');
    var canvas = section.querySelector('.x-fd-canvas');
    var intro = section.querySelector('.x-fd-intro');
    var cards = Array.prototype.slice.call(section.querySelectorAll('.x-fd-card'));
    var endPanel = section.querySelector('.x-fd-end');

    // ------------------------------------------------------------------------
    // 3. PRINT THE VINTAGE PAPER MAP TEXTURE ON AN OFFSCREEN 2D CANVAS
    // ------------------------------------------------------------------------
    // Generates a crisp 2048x1421 textured paper sheet with parchment grain,
    // coordinate grid lines, borders, a title cartouche, compass rose, and the map image.
    var TW = 2048, TH = 1421;
    var sheet = document.createElement('canvas'); sheet.width = TW; sheet.height = TH;
    var g = sheet.getContext('2d');
    var MAPBOX = [120, 150, TW - 240, TH - 270];      // Inner rectangle where the district map image fits

    function printSheet(mapImg) {
        // Warm parchment base fill + subtle paper fiber grain
        g.fillStyle = '#efe5cc'; g.fillRect(0, 0, TW, TH);
        for (var i = 0; i < 9000; i++) { g.fillStyle = 'rgba(120,90,40,' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * TW, Math.random() * TH, 3, 3); }

        // Soft warm vignette around the edges of the paper sheet
        var v = g.createRadialGradient(TW / 2, TH / 2, TH * 0.3, TW / 2, TH / 2, TW * 0.7);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(90,60,20,0.22)');
        g.fillStyle = v; g.fillRect(0, 0, TW, TH);

        // Classic double cartographic border and subtle grid lines
        g.strokeStyle = 'rgba(70,50,20,0.55)'; g.lineWidth = 4; g.strokeRect(50, 50, TW - 100, TH - 100);
        g.lineWidth = 1.5; g.strokeRect(66, 66, TW - 132, TH - 132);
        g.strokeStyle = 'rgba(70,50,20,0.12)'; g.lineWidth = 1;
        for (var x = 66; x < TW - 66; x += 128) { g.beginPath(); g.moveTo(x, 66); g.lineTo(x, TH - 66); g.stroke(); }
        for (var y = 66; y < TH - 66; y += 128) { g.beginPath(); g.moveTo(66, y); g.lineTo(TW - 66, y); g.stroke(); }

        // Overlay the District 3240 illustration if loaded
        if (mapImg) {
            g.globalAlpha = 0.92;
            g.drawImage(mapImg, MAPBOX[0], MAPBOX[1], MAPBOX[2], MAPBOX[3]);
            g.globalAlpha = 1;
        }

        // Top-left Title Cartouche box
        g.fillStyle = 'rgba(239,229,204,0.92)'; g.fillRect(100, 92, 620, 190);
        g.strokeStyle = 'rgba(70,50,20,0.6)'; g.lineWidth = 2; g.strokeRect(108, 100, 604, 174);
        g.fillStyle = '#3d2b12'; g.font = '800 30px "Plus Jakarta Sans", Georgia, serif'; g.fillText('RI DISTRICT 3240', 140, 150);
        g.font = '800 64px "Plus Jakarta Sans", Georgia, serif'; g.fillText('Where we serve', 140, 222);
        g.font = '600 24px "Plus Jakarta Sans", Georgia, serif'; g.fillStyle = '#6b5530'; g.fillText('Rotaract Club of Durgapur Central Presidency', 140, 258);

        // Bottom-right 4-point Compass Rose
        var cx = TW - 220, cy = TH - 230;
        g.save(); g.translate(cx, cy); g.fillStyle = '#3d2b12';
        for (var k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -90); g.lineTo(16, 0); g.lineTo(-16, 0); g.closePath(); g.fill(); }
        g.restore();
        g.font = '800 34px Georgia, serif'; g.fillStyle = '#3d2b12'; g.textAlign = 'center'; g.fillText('N', cx, cy - 104); g.textAlign = 'left';
        g.font = '500 20px "Plus Jakarta Sans", sans-serif'; g.fillStyle = '#6b5530';
        g.fillText('Pin positions are approximate', 120, TH - 92);

        sheetTex.needsUpdate = true;
    }

    var sheetTex = new THREE.CanvasTexture(sheet);
    sheetTex.colorSpace = THREE.SRGBColorSpace;
    sheetTex.anisotropy = 8;
    printSheet(null); // Draw base paper immediately while map image downloads

    var mapImg = new Image();
    mapImg.onload = function () { printSheet(mapImg); };
    mapImg.src = 'images/district-3240-map-nopin.webp';
    // Re-render text sharply once custom web fonts finish loading
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { printSheet(mapImg.complete ? mapImg : null); }); }

    // ------------------------------------------------------------------------
    // 4. THREE.JS SCENE, RENDERER & HARDWARE OPTIMIZATION
    // ------------------------------------------------------------------------
    // Check for low-spec PCs/mobile phones and cap canvas pixel density to keep FPS smooth
    var isLowEnd = document.documentElement.classList.contains('low-spec') ||
                   (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
                   (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                   (navigator.connection && (navigator.connection.saveData || /2g|3g/.test(navigator.connection.effectiveType)));
    var maxDpr = isLowEnd ? 1.0 : (isPhone ? 1.25 : 1.5);
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !isLowEnd && !isPhone,
        alpha: true,
        powerPreference: isLowEnd ? 'default' : 'high-performance'
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(isPhone ? 46 : 38, 1, 0.1, 200);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 10, 8); scene.add(key);

    // ------------------------------------------------------------------------
    // 5. ACCORDION PAPER MESHES & CREASE SHADER
    // ------------------------------------------------------------------------
    // Divides the map sheet into 4 hinged panels chained together. A custom GLSL
    // shader darkens the paper along the fold creases and dims when folded.
    var MW = 16, MH = MW * TH / TW, NP = 4, PWd = MW / NP;
    var vert = [
        'varying vec2 vUv; varying float vEdge;',
        'void main(){ vUv = uv; vEdge = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var frag = [
        'uniform sampler2D map; uniform float fold; uniform float pw;',
        'varying vec2 vUv; varying float vEdge;',
        'void main(){',
        '  vec3 c = gl_FrontFacing ? texture2D(map, vUv).rgb : vec3(0.86, 0.80, 0.68);', // Plain beige backing when flipped
        '  float e = min(vEdge, pw - vEdge) / pw;',                       // Distance to nearest vertical fold crease (0 = on crease)
        '  float crease = 1.0 - (1.0 - smoothstep(0.0, 0.08, e)) * (0.08 + 0.25 * fold);',
        '  gl_FragColor = vec4(c * crease * (0.9 + 0.1 * (1.0 - fold)), 1.0);',
        '  #include <colorspace_fragment>',
        '}'
    ].join('\n');

    var root = new THREE.Group();        // Root container holding the entire tilted & centered map
    scene.add(root);
    var hinges = [];
    var parent = root;
    for (var k = 0; k < NP; k++) {
        var geo = new THREE.PlaneGeometry(PWd, MH, 6, 1);
        geo.translate(PWd / 2, 0, 0); // Move pivot origin to the left edge (the fold hinge)
        var uv = geo.attributes.uv;
        for (var q = 0; q < uv.count; q++) { uv.setX(q, (k + uv.getX(q)) / NP); } // Map slice UVs to 1/4th of the texture
        var mat = new THREE.ShaderMaterial({ uniforms: { map: { value: sheetTex }, fold: { value: 1 }, pw: { value: PWd } }, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide });
        var hinge = new THREE.Group();
        hinge.position.x = k === 0 ? 0 : PWd;
        hinge.add(new THREE.Mesh(geo, mat));
        parent.add(hinge);
        hinges.push(hinge);
        parent = hinge; // Nest next panel inside previous hinge for accordion chain
    }

    // ------------------------------------------------------------------------
    // 6. 3D MAP PUSHPINS
    // ------------------------------------------------------------------------
    // Convert normalized [x, y] pin coordinates into local 3D positions on the
    // specific hinged panel they belong to, so pins ride along during unfolding.
    var pinMeshes = PINS.map(function (p) {
        var u = (MAPBOX[0] + p.at[0] * MAPBOX[2]) / TW, v = (MAPBOX[1] + p.at[1] * MAPBOX[3]) / TH;
        var panel = Math.min(NP - 1, Math.floor(u * NP));
        var lx = (u * NP - panel) * PWd, ly = (0.5 - v) * MH;
        var pin = new THREE.Group();
        var red = new THREE.MeshStandardMaterial({ color: 0xe11d2e, roughness: 0.35 });
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), red); head.position.z = 0.75;
        var needle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.004, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 }));
        needle.rotation.x = Math.PI / 2; needle.position.z = 0.375;
        pin.add(head, needle);
        pin.position.set(lx, ly, 0.01);
        pin.scale.setScalar(0.001); // Start tiny until the map lies flat
        hinges[panel].add(pin);
        return pin;
    });

    // Soft radial drop-shadow resting underneath the paper brochure
    var sc = document.createElement('canvas'); sc.width = sc.height = 128;
    var sg = sc.getContext('2d'), sgr = sg.createRadialGradient(64, 64, 8, 64, 64, 64);
    sgr.addColorStop(0, 'rgba(0,0,0,0.5)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    scene.add(shadow);

    // ------------------------------------------------------------------------
    // 7. SCROLL CHOREOGRAPHY TIMELINE & RENDER LOOP
    // ------------------------------------------------------------------------
    // Scroll distance is measured in arbitrary "units" mapped to animation phases:
    //   [0 .. LIFT]   -> Map rises off the wooden desk
    //   [LIFT .. +UNFOLD] -> Panels swing open like an accordion
    //   [.. +SETTLE]  -> Map flattens and red pins rise up
    //   [.. PER_PIN]  -> Camera flies closely to each location pin & reveals story card
    var LIFT = 0.5, UNFOLD = 1.6, SETTLE = 0.4, PER_PIN = 1.0;
    var units = LIFT + UNFOLD + SETTLE + PINS.length * PER_PIN + 0.9;   // +0.9 trailing beat for the "Join" CTA buttons

    function sizeSection() { section.style.height = (innerHeight * (units + 1)) + 'px'; }
    sizeSection();

    function fit() {
        var w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    fit();
    window.addEventListener('resize', function () { isPhone = innerWidth < 760; sizeSection(); fit(); });

    function smooth(t) { return t * t * (3 - 2 * t); } // Smoothstep easing curve
    function clamp01(t) { return Math.max(0, Math.min(1, t)); }
    function distFor(wid, hei) {
        var vf = THREE.MathUtils.degToRad(camera.fov);
        return Math.max((hei / 2) / Math.tan(vf / 2), (wid / 2) / (Math.tan(vf / 2) * camera.aspect));
    }

    var box = new THREE.Box3(), ctr = new THREE.Vector3(), tmp = new THREE.Vector3();
    var camPos = new THREE.Vector3(0, -6, 20), camLook = new THREE.Vector3();
    var mx = 0, my = 0, tmx = 0, tmy = 0, clock = new THREE.Clock(), visible = true, running = true, active = -2;

    // Cache scroll position so we don't call getBoundingClientRect() on idle frames
    var scrollDirty = true, lastComputedU = 0;
    function computeU() {
        var r = section.getBoundingClientRect();
        return clamp01(-r.top / Math.max(1, section.offsetHeight - innerHeight)) * units;
    }
    window.addEventListener('scroll', function () { scrollDirty = true; }, { passive: true });
    window.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') { return; }
        tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1;
    }, { passive: true });

    // Pause WebGL render loop automatically whenever #map is scrolled out of sight or tab is hidden
    new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { scrollDirty = true; requestAnimationFrame(loop); }
    }).observe(section);
    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) { clock.getDelta(); scrollDirty = true; requestAnimationFrame(loop); }
    });

    function loop() {
        if (!running || !visible) { return; }
        requestAnimationFrame(loop);

        var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
        if (scrollDirty) {
            lastComputedU = computeU();
            scrollDirty = false;
        }
        var u = lastComputedU;
        // Gently smooth subtle mouse parallax motion
        mx += (tmx - mx) * 0.08;
        my += (tmy - my) * 0.08;

        // Calculate progress for lift, accordion unfold, and flat settle phases
        var lift = smooth(clamp01(u / LIFT));
        var unfoldU = clamp01((u - LIFT) / UNFOLD);

        // Rotate hinges in sequence (last panel opens out first)
        for (var k = 1; k < NP; k++) {
            var order = NP - 1 - k;
            var a = smooth(clamp01((unfoldU - order * 0.28) / 0.44));
            var theta = (1 - a) * Math.PI * 0.985;
            hinges[k].rotation.y = (k % 2 ? 1 : -1) * theta;
            hinges[k].children[0].material.uniforms.fold.value = 1 - a;
        }
        hinges[0].children[0].material.uniforms.fold.value = 1 - unfoldU;
        var flat = smooth(clamp01((u - LIFT - UNFOLD) / SETTLE));

        // Tilt the brochure: flat on desk -> tilted facing user -> slightly angled once open
        root.rotation.x = -1.15 * (1 - lift) - 0.42 * flat + my * 0.05;
        root.rotation.y = mx * 0.06;
        root.rotation.z = (1 - lift) * 0.12;

        // Center the unfolding sheet (uses fixed dimensions once flat to skip heavy vertex math)
        root.position.set(0, 0, 0);
        if (flat < 0.999) {
            root.updateMatrixWorld(true);
            box.setFromObject(root); box.getCenter(ctr);
        } else {
            box.min.set(-MW / 2, -MH / 2, 0);
            box.max.set(MW / 2, MH / 2, 0);
            ctr.set(0, 0, 0);
        }
        root.position.x = -ctr.x; root.position.y = -ctr.y * 0.6;
        shadow.position.set(0, -MH * 0.55, -1.2);
        shadow.scale.set((box.max.x - box.min.x) * 1.4 + 2, 3, 1);

        // Grow pins upward once the map settles, gently pulsing whichever pin is currently active
        var pinPhase = u - LIFT - UNFOLD - SETTLE;
        pinMeshes.forEach(function (p, i) {
            var s = smooth(clamp01((flat - 0.4) / 0.6 - i * 0.12));
            p.scale.setScalar(Math.max(0.001, s * (1 + (Math.floor(pinPhase) === i ? 0.35 + Math.sin(t * 4) * 0.08 : 0))));
        });

        // Interpolate camera position: wide overview while unfolding, zoomed in when visiting pins
        var wid = (box.max.x - box.min.x) + 1, hei = (box.max.y - box.min.y) + 1;
        var cur = Math.floor(pinPhase);
        if (pinPhase < 0 || cur >= PINS.length) {
            var d = distFor(Math.max(wid, isPhone ? 6 : 8) * 1.1, Math.max(hei, 6) * 1.25);
            tmp.set(0, -1.2 - flat * 1.5, d);
            camLook.lerp(new THREE.Vector3(0, -flat * 0.4, 0), Math.min(1, dt * 3));
        } else {
            var pin = pinMeshes[cur];
            pin.getWorldPosition(ctr);
            var near = isPhone ? 9.5 : 6.5;
            tmp.set(ctr.x + (isPhone ? 0 : 2.2), ctr.y - near * 0.55, ctr.z + near);
            camLook.lerp(new THREE.Vector3(ctr.x + (isPhone ? 0 : 2.2), ctr.y + (isPhone ? -1.2 : 0), ctr.z), Math.min(1, dt * 3));
        }
        camPos.lerp(tmp, Math.min(1, dt * 2.6));
        camera.position.set(camPos.x + mx * 0.5, camPos.y - my * 0.3, camPos.z);
        camera.lookAt(camLook);

        // Toggle active HTML story card and final action panel cleanly only when index changes
        var show = pinPhase < 0 ? -1 : (cur >= PINS.length ? PINS.length : cur);
        if (show !== active) {
            active = show;
            cards.forEach(function (c, i) { c.classList.toggle('is-on', i === show); });
            endPanel.classList.toggle('is-on', show === PINS.length);
        }
        intro.classList.toggle('is-off', u > (isPhone ? LIFT * 0.5 : LIFT + UNFOLD * 0.5));

        renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
})();
