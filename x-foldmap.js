/* =========================================================
   Concept: THE FOLDING MAP  ("Where we serve")
   A paper map of RI District 3240 lies folded on a desk. Scrolling
   unfolds it panel by panel (accordion folds), lays it flat, then
   pins rise at places where the club has worked and the camera
   visits each one while a card tells the story. All facts come
   from the site; pin positions are approximate.
   Not used for "reduce motion" or without WebGL (normal hero shows).
   ========================================================= */
import * as THREE from './vendor/three.module.min.js';

(function start() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { return; }
    var main = document.querySelector('main');
    if (!main) { return; }
    var isPhone = innerWidth < 760;

    var PINS = [
        { name: 'Durgapur', at: [0.2145, 0.8646], kicker: 'Home', text: 'Where the club was chartered on 12 October 2023, sponsored by the Rotary Club of Durgapur Central.', link: ['#about', 'About the club'] },
        { name: 'Naihati', at: [0.278, 0.893], kicker: 'Muktodhara & Ganga Brick Factory', text: 'Unmute menstrual health drive for 30+ girls, TRIVA Independence Day with children, and lunch for 40+ children of brick factory workers.', link: ['our-work.html', 'See the projects'] },
        { name: 'Kolkata', at: [0.287, 0.925], kicker: 'Our presence', text: 'Members and activities in Kolkata, alongside our home in Durgapur.', link: ['#people', 'Meet our people'] },
        { name: 'Malda', at: [0.305, 0.565], kicker: 'District Installation', text: 'Symphony, the 36th Rotaract District Installation, hosted by RAC Malda Central on 12–13 July 2025.', link: ['ry-2025-26.html', 'RY 2025–26 records'] },
        { name: 'Unakoti', at: [0.558, 0.665], kicker: 'Heritage & eco-stewardship', text: 'A fellowship trip to the historic rock carvings of Unakoti, promoting heritage conservation.', link: ['our-work.html', 'See the projects'] }
    ];

    /* ---------- page structure ---------- */
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

    /* ---------- print the map sheet ---------- */
    var TW = 2048, TH = 1421;
    var sheet = document.createElement('canvas'); sheet.width = TW; sheet.height = TH;
    var g = sheet.getContext('2d');
    var MAPBOX = [120, 150, TW - 240, TH - 270];      // where the district map is drawn
    function printSheet(mapImg) {
        g.fillStyle = '#efe5cc'; g.fillRect(0, 0, TW, TH);
        for (var i = 0; i < 9000; i++) { g.fillStyle = 'rgba(120,90,40,' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * TW, Math.random() * TH, 3, 3); }
        var v = g.createRadialGradient(TW / 2, TH / 2, TH * 0.3, TW / 2, TH / 2, TW * 0.7);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(90,60,20,0.22)');
        g.fillStyle = v; g.fillRect(0, 0, TW, TH);
        g.strokeStyle = 'rgba(70,50,20,0.55)'; g.lineWidth = 4; g.strokeRect(50, 50, TW - 100, TH - 100);
        g.lineWidth = 1.5; g.strokeRect(66, 66, TW - 132, TH - 132);
        g.strokeStyle = 'rgba(70,50,20,0.12)'; g.lineWidth = 1;
        for (var x = 66; x < TW - 66; x += 128) { g.beginPath(); g.moveTo(x, 66); g.lineTo(x, TH - 66); g.stroke(); }
        for (var y = 66; y < TH - 66; y += 128) { g.beginPath(); g.moveTo(66, y); g.lineTo(TW - 66, y); g.stroke(); }
        if (mapImg) {
            g.globalAlpha = 0.92;
            g.drawImage(mapImg, MAPBOX[0], MAPBOX[1], MAPBOX[2], MAPBOX[3]);
            g.globalAlpha = 1;
        }
        // title cartouche
        g.fillStyle = 'rgba(239,229,204,0.92)'; g.fillRect(100, 92, 620, 190);
        g.strokeStyle = 'rgba(70,50,20,0.6)'; g.lineWidth = 2; g.strokeRect(108, 100, 604, 174);
        g.fillStyle = '#3d2b12'; g.font = '800 30px "Plus Jakarta Sans", Georgia, serif'; g.fillText('RI DISTRICT 3240', 140, 150);
        g.font = '800 64px "Plus Jakarta Sans", Georgia, serif'; g.fillText('Where we serve', 140, 222);
        g.font = '600 24px "Plus Jakarta Sans", Georgia, serif'; g.fillStyle = '#6b5530'; g.fillText('Rotaract Club of Durgapur Central Presidency', 140, 258);
        // compass
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
    printSheet(null);
    var mapImg = new Image();
    mapImg.onload = function () { printSheet(mapImg); };
    mapImg.src = 'images/district-3240-map-nopin.webp';
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { printSheet(mapImg.complete ? mapImg : null); }); }

    /* ---------- three.js ---------- */
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 2 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(isPhone ? 46 : 38, 1, 0.1, 200);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    var key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 10, 8); scene.add(key);

    var MW = 16, MH = MW * TH / TW, NP = 4, PWd = MW / NP;
    var vert = [
        'varying vec2 vUv; varying float vEdge;',
        'void main(){ vUv = uv; vEdge = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
    ].join('\n');
    var frag = [
        'uniform sampler2D map; uniform float fold; uniform float pw;',
        'varying vec2 vUv; varying float vEdge;',
        'void main(){',
        '  vec3 c = gl_FrontFacing ? texture2D(map, vUv).rgb : vec3(0.86, 0.80, 0.68);',
        '  float e = min(vEdge, pw - vEdge) / pw;',                       // 0 at a crease
        '  float crease = 1.0 - (1.0 - smoothstep(0.0, 0.08, e)) * (0.08 + 0.25 * fold);',
        '  gl_FragColor = vec4(c * crease * (0.9 + 0.1 * (1.0 - fold)), 1.0);',
        '  #include <colorspace_fragment>',
        '}'
    ].join('\n');
    var root = new THREE.Group();        // whole map (tilt + centring)
    scene.add(root);
    var hinges = [];
    var parent = root;
    for (var k = 0; k < NP; k++) {
        var geo = new THREE.PlaneGeometry(PWd, MH, 6, 1);
        geo.translate(PWd / 2, 0, 0);
        var uv = geo.attributes.uv;
        for (var q = 0; q < uv.count; q++) { uv.setX(q, (k + uv.getX(q)) / NP); }
        var mat = new THREE.ShaderMaterial({ uniforms: { map: { value: sheetTex }, fold: { value: 1 }, pw: { value: PWd } }, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide });
        var hinge = new THREE.Group();
        hinge.position.x = k === 0 ? 0 : PWd;
        hinge.add(new THREE.Mesh(geo, mat));
        parent.add(hinge);
        hinges.push(hinge);
        parent = hinge;
    }
    // pins (in map-sheet coordinates, attached to the panel they sit on)
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
        pin.scale.setScalar(0.001);
        hinges[panel].add(pin);
        return pin;
    });

    // soft desk shadow
    var sc = document.createElement('canvas'); sc.width = sc.height = 128;
    var sg = sc.getContext('2d'), sgr = sg.createRadialGradient(64, 64, 8, 64, 64, 64);
    sgr.addColorStop(0, 'rgba(0,0,0,0.5)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    scene.add(shadow);

    /* ---------- scroll choreography ---------- */
    var LIFT = 0.5, UNFOLD = 1.6, SETTLE = 0.4, PER_PIN = 1.0;
    var units = LIFT + UNFOLD + SETTLE + PINS.length * PER_PIN + 0.9;   // + a last beat for "Join"
    function sizeSection() { section.style.height = (innerHeight * (units + 1)) + 'px'; }
    sizeSection();
    function fit() {
        var w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    fit();
    window.addEventListener('resize', function () { isPhone = innerWidth < 760; sizeSection(); fit(); });
    function smooth(t) { return t * t * (3 - 2 * t); }
    function clamp01(t) { return Math.max(0, Math.min(1, t)); }
    function distFor(wid, hei) {
        var vf = THREE.MathUtils.degToRad(camera.fov);
        return Math.max((hei / 2) / Math.tan(vf / 2), (wid / 2) / (Math.tan(vf / 2) * camera.aspect));
    }

    var box = new THREE.Box3(), ctr = new THREE.Vector3(), tmp = new THREE.Vector3();
    var camPos = new THREE.Vector3(0, -6, 20), camLook = new THREE.Vector3();
    var mx = 0, my = 0, tmx = 0, tmy = 0, clock = new THREE.Clock(), visible = true, running = true, active = -2;
    window.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') { return; }
        tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1;
    }, { passive: true });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { requestAnimationFrame(loop); } }).observe(section);
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(loop); } });

    function loop() {
        if (!running || !visible) { return; }
        requestAnimationFrame(loop);
        var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
        var r = section.getBoundingClientRect();
        var u = clamp01(-r.top / Math.max(1, section.offsetHeight - innerHeight)) * units;

        var lift = smooth(clamp01(u / LIFT));
        var unfoldU = clamp01((u - LIFT) / UNFOLD);
        // accordion: unfold the creases one after another (last crease first)
        for (var k = 1; k < NP; k++) {
            var order = NP - 1 - k;                         // 0 = first to open
            var a = smooth(clamp01((unfoldU - order * 0.28) / 0.44));
            var theta = (1 - a) * Math.PI * 0.985;
            hinges[k].rotation.y = (k % 2 ? 1 : -1) * theta;
            hinges[k].children[0].material.uniforms.fold.value = 1 - a;
        }
        hinges[0].children[0].material.uniforms.fold.value = 1 - unfoldU;
        var flat = smooth(clamp01((u - LIFT - UNFOLD) / SETTLE));

        // tilt: lying on the desk -> raised to face you -> slightly laid back once open
        root.rotation.x = -1.15 * (1 - lift) - 0.42 * flat + my * 0.05;
        root.rotation.y = mx * 0.06;
        root.rotation.z = (1 - lift) * 0.12;
        // keep the folded/unfolding sheet centred
        root.position.set(0, 0, 0);
        root.updateMatrixWorld(true);
        box.setFromObject(root); box.getCenter(ctr);
        root.position.x = -ctr.x; root.position.y = -ctr.y * 0.6;
        shadow.position.set(0, -MH * 0.55, -1.2);
        shadow.scale.set((box.max.x - box.min.x) * 1.4 + 2, 3, 1);

        // pins rise once the map is flat
        var pinPhase = u - LIFT - UNFOLD - SETTLE;
        pinMeshes.forEach(function (p, i) {
            var s = smooth(clamp01((flat - 0.4) / 0.6 - i * 0.12));
            p.scale.setScalar(Math.max(0.001, s * (1 + (Math.floor(pinPhase) === i ? 0.35 + Math.sin(t * 4) * 0.08 : 0))));
        });

        // camera: frame the sheet, then visit each pin
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
