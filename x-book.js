/* =========================================================
   Concept: THE REPORT BOOK
   The homepage opens with one object: a 3D copy of the club's story
   as a hardcover book. Scrolling opens the cover and turns the pages:
     1. Who we are          | hero photo
     2. Our impact (numbers)| District 3240 map
     3. Where we serve      | project photos
     4. Recognised          | Club Excellence certificate
     5. Our journey         | Join the movement
   Everything printed on the pages is the club's real content. On
   phones the camera reads one page at a time. The normal site
   continues below; "Skip" jumps to it. Not used for "reduce motion"
   or without WebGL (the normal hero shows instead).
   ========================================================= */
import * as THREE from './vendor/three.module.min.js';

(function start() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { return; }
    var main = document.querySelector('main'), hero = document.querySelector('.hero');
    if (!main || !hero) { return; }
    var isPhone = innerWidth < 760;
    var root = document.documentElement;

    /* ---------- page structure ---------- */
    var section = document.createElement('section');
    section.className = 'x-book';
    section.setAttribute('aria-label', 'Our story, as a book');
    section.innerHTML =
        '<div class="x-bk-stage">' +
        '<h1 class="sr-only">Rotaract Club of Durgapur Central Presidency</h1>' +
        '<canvas class="x-bk-canvas" aria-hidden="true"></canvas>' +
        '<p class="x-bk-hint" aria-hidden="true">Scroll to open the book</p>' +
        '<div class="x-bk-progress" aria-hidden="true"><span></span></div>' +
        '<a class="x-bk-skip" href="#about">Skip the book &darr;</a>' +
        '<div class="x-bk-end">' +
        '<a class="btn btn-rebel-primary" href="#join">Join the Movement &rarr;</a>' +
        '<a class="hero-text-link" href="publications/reports/report-book-2025-26.pdf" target="_blank" rel="noopener">Read the full 2025&ndash;26 report (PDF)</a>' +
        '</div></div>';
    main.insertBefore(section, main.firstChild);
    hero.classList.add('x-bk-hidden');
    root.classList.add('x-book-on');
    var stage = section.querySelector('.x-bk-stage');
    var canvas = section.querySelector('.x-bk-canvas');
    var hint = section.querySelector('.x-bk-hint');
    var bar = section.querySelector('.x-bk-progress span');
    var endPanel = section.querySelector('.x-bk-end');

    /* ---------- printing the pages (2D canvas) ---------- */
    var PW = isPhone ? 768 : 1024, PH = Math.round(PW * 1.4);
    var S = PW / 1024;                       // type scale
    var PAPER = '#f6f1e6', INK = '#16241d', GREEN = '#047857', MUTED = '#5c6b63', GOLD = '#b8862b';
    var images = {};
    function img(src) {
        if (!images[src]) { var im = new Image(); im.src = src; images[src] = im; }
        return images[src];
    }
    function font(w, px) { return w + ' ' + Math.round(px * S) + 'px "Plus Jakarta Sans", system-ui, sans-serif'; }
    function wrap(g, text, x, y, maxW, lh) {
        var words = text.split(' '), line = '';
        words.forEach(function (w) {
            var test = line ? line + ' ' + w : w;
            if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; }
            else { line = test; }
        });
        if (line) { g.fillText(line, x, y); y += lh; }
        return y;
    }
    function cover(g, im, x, y, w, h) {
        if (!im.complete || !im.naturalWidth) { g.fillStyle = '#d8d2c4'; g.fillRect(x, y, w, h); return; }
        var r = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * r, ih = im.naturalHeight * r;
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); g.restore();
    }
    function contain(g, im, x, y, w, h) {
        if (!im.complete || !im.naturalWidth) { return; }
        var r = Math.min(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * r, ih = im.naturalHeight * r;
        g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    }
    function paper(g, side) {
        g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
        // soft gutter shading towards the spine
        var gr = side === 'left' ? g.createLinearGradient(PW, 0, PW - 120 * S, 0) : g.createLinearGradient(0, 0, 120 * S, 0);
        gr.addColorStop(0, 'rgba(60,45,20,0.18)'); gr.addColorStop(1, 'rgba(60,45,20,0)');
        g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
    }
    function folio(g, n, side) {
        g.font = font(600, 22); g.fillStyle = MUTED; g.textAlign = side === 'left' ? 'left' : 'right';
        g.fillText(String(n), side === 'left' ? 90 * S : PW - 90 * S, PH - 60 * S);
        g.textAlign = 'left';
    }
    function eyebrow(g, text, y) { g.font = font(800, 22); g.fillStyle = GREEN; g.fillText(text.toUpperCase().split('').join(String.fromCharCode(8202)), 90 * S, y); }
    function title(g, a, b, y) {
        g.font = font(800, 76); g.fillStyle = INK; g.fillText(a, 90 * S, y);
        g.fillStyle = GREEN; g.fillText(b, 90 * S, y + 84 * S);
        return y + 84 * S;
    }

    var pages = {
        cover: function (g) {
            var gr = g.createLinearGradient(0, 0, PW, PH);
            gr.addColorStop(0, '#0d3b2b'); gr.addColorStop(1, '#06231a');
            g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
            for (var i = 0; i < 2200; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.025) + ')'; g.fillRect(Math.random() * PW, Math.random() * PH, 2, 2); }
            g.strokeStyle = 'rgba(214,170,80,0.85)'; g.lineWidth = 3 * S; g.strokeRect(48 * S, 48 * S, PW - 96 * S, PH - 96 * S);
            g.lineWidth = 1 * S; g.strokeRect(62 * S, 62 * S, PW - 124 * S, PH - 124 * S);
            contain(g, img('club-logo.png'), PW / 2 - 110 * S, 170 * S, 220 * S, 220 * S);
            g.textAlign = 'center'; g.fillStyle = '#e9c77a';
            g.font = font(700, 26); g.fillText('ROTARACT CLUB OF', PW / 2, 470 * S);
            g.font = font(800, 46); g.fillText('DURGAPUR CENTRAL', PW / 2, 530 * S); g.fillText('PRESIDENCY', PW / 2, 584 * S);
            g.font = font(800, 120); g.fillStyle = '#ffffff'; g.fillText('Our Story', PW / 2, 790 * S);
            g.font = font(600, 34); g.fillStyle = '#a7f3d0';
            g.fillText("Don't just watch.", PW / 2, 900 * S); g.fillText('Take real action.', PW / 2, 948 * S);
            g.font = font(700, 24); g.fillStyle = '#e9c77a'; g.fillText('RI DISTRICT 3240  ·  SINCE 2023', PW / 2, PH - 120 * S);
            g.textAlign = 'left';
        },
        s1l: function (g) {
            paper(g, 'left'); eyebrow(g, 'Who we are', 170 * S);
            var y = title(g, 'Young people.', 'Real service.', 270 * S) + 90 * S;
            g.font = font(400, 34); g.fillStyle = INK;
            y = wrap(g, 'Rotaract Club of Durgapur Central Presidency is a youth-led service organization committed to creating positive and lasting impact in our community.', 90 * S, y, PW - 180 * S, 52 * S) + 26 * S;
            y = wrap(g, 'Through community service, professional development, fellowship and leadership, we bring together young people who believe that collective action can create lasting change.', 90 * S, y, PW - 180 * S, 52 * S) + 40 * S;
            g.font = font(700, 28); g.fillStyle = GREEN;
            wrap(g, 'Sponsored by the Rotary Club of Durgapur Central · RI District 3240', 90 * S, y, PW - 180 * S, 42 * S);
            folio(g, 1, 'left');
        },
        s1r: function (g) {
            paper(g, 'right');
            cover(g, img('images/hero-project.webp'), 70 * S, 90 * S, PW - 160 * S, PH - 300 * S);
            g.font = font(600, 26); g.fillStyle = MUTED;
            wrap(g, 'A learning session under the banyan tree, one of the club’s community projects.', 70 * S, PH - 160 * S, PW - 160 * S, 38 * S);
            folio(g, 2, 'right');
        },
        s2l: function (g) {
            paper(g, 'left'); eyebrow(g, 'Our impact', 170 * S);
            var y = title(g, 'Service,', 'in numbers.', 270 * S) + 70 * S;
            g.font = font(600, 26); g.fillStyle = MUTED; g.fillText('Since 12th October 2023 · figures as of October 2026', 90 * S, y); y += 60 * S;
            [['105', 'Projects'], ['2,277', 'Beneficiaries'], ['1,522', 'Service hours'], ['13', 'Active members']].forEach(function (s, i) {
                var x = 90 * S + (i % 2) * (PW / 2 - 70 * S), yy = y + Math.floor(i / 2) * 250 * S;
                g.fillStyle = 'rgba(4,120,87,0.08)'; g.fillRect(x, yy, PW / 2 - 110 * S, 210 * S);
                g.font = font(800, 92); g.fillStyle = GREEN; g.fillText(s[0], x + 30 * S, yy + 120 * S);
                g.font = font(700, 24); g.fillStyle = INK; g.fillText(s[1].toUpperCase(), x + 30 * S, yy + 170 * S);
            });
            folio(g, 3, 'left');
        },
        s2r: function (g) {
            paper(g, 'right'); eyebrow(g, 'Where we are', 170 * S);
            contain(g, img('images/district-3240-map-nopin.webp'), 60 * S, 230 * S, PW - 130 * S, 640 * S);
            // pin on Durgapur (21.45% across, 86.46% down the map image)
            var m = img('images/district-3240-map-nopin.webp');
            if (m.naturalWidth) {
                var r = Math.min((PW - 130 * S) / m.naturalWidth, 640 * S / m.naturalHeight), iw = m.naturalWidth * r, ih = m.naturalHeight * r;
                var px = 60 * S + (PW - 130 * S - iw) / 2 + iw * 0.2145, py = 230 * S + (640 * S - ih) / 2 + ih * 0.8646;
                g.fillStyle = '#e11d2e'; g.beginPath(); g.arc(px, py - 26 * S, 16 * S, Math.PI, 0); g.lineTo(px, py); g.closePath(); g.fill();
                g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - 26 * S, 6 * S, 0, 7); g.fill();
            }
            g.font = font(800, 48); g.fillStyle = INK; g.fillText('Durgapur, West Bengal', 90 * S, 980 * S);
            g.font = font(500, 30); g.fillStyle = MUTED; g.fillText('Also present in Kolkata and Naihati', 90 * S, 1030 * S);
            folio(g, 4, 'right');
        },
        s3l: function (g) {
            paper(g, 'left'); eyebrow(g, 'Rotary’s 7 Areas of Focus', 170 * S);
            var y = title(g, 'Where', 'we serve.', 270 * S) + 80 * S;
            ['Peacebuilding & Conflict Prevention', 'Disease Prevention & Treatment', 'Water, Sanitation & Hygiene', 'Maternal & Child Health', 'Basic Education & Literacy', 'Community Economic Development', 'Supporting the Environment'].forEach(function (a, i) {
                g.font = font(800, 28); g.fillStyle = GREEN; g.fillText(String(i + 1).padStart(2, '0'), 90 * S, y);
                g.font = font(600, 32); g.fillStyle = INK; g.fillText(a, 160 * S, y);
                g.strokeStyle = 'rgba(22,36,29,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(90 * S, y + 26 * S); g.lineTo(PW - 90 * S, y + 26 * S); g.stroke();
                y += 78 * S;
            });
            folio(g, 5, 'left');
        },
        s3r: function (g) {
            paper(g, 'right');
            var shots = [['images/projects/2026-27/soul-circle.webp', 'Soul Circle'], ['images/projects/2026-27/unmute.webp', 'Unmute: menstrual health drive'], ['images/projects/2026-27/triva.webp', 'TRIVA: Independence Day with children'], ['images/projects/2026-27/food-distribution.webp', 'Food distribution drive']];
            var w = (PW - 190 * S) / 2, h = w * 1.05;
            shots.forEach(function (s, i) {
                var x = 70 * S + (i % 2) * (w + 40 * S), y = 120 * S + Math.floor(i / 2) * (h + 120 * S);
                cover(g, img(s[0]), x, y, w, h);
                g.font = font(600, 24); g.fillStyle = MUTED; wrap(g, s[1], x, y + h + 40 * S, w, 32 * S);
            });
            folio(g, 6, 'right');
        },
        s4l: function (g) {
            paper(g, 'left'); eyebrow(g, 'Our track record', 170 * S);
            var y = title(g, 'Recognised', 'for our work.', 270 * S) + 90 * S;
            [['Club Excellence Award', 'Rotary International · RY 2024–25', '“For fostering a positive experience for its members and reflecting the values of Rotary.”'],
             ['Sustainable Odyssey — Gold Citation', 'RI District 3240 · RY 2025–26', '“For completing the District Projects successfully for the Rotary Year 2025–26.”'],
             ['Best Club Bulletin', 'Zone 1 · RY 2025–26', 'For our bulletin, Presidency Chronicles: 10 editions so far.']].forEach(function (a) {
                g.font = font(800, 36); g.fillStyle = INK; g.fillText(a[0], 90 * S, y); y += 44 * S;
                g.font = font(700, 22); g.fillStyle = GOLD; g.fillText(a[1].toUpperCase(), 90 * S, y); y += 44 * S;
                g.font = font(400, 28); g.fillStyle = MUTED; y = wrap(g, a[2], 90 * S, y, PW - 180 * S, 40 * S) + 46 * S;
            });
            folio(g, 7, 'left');
        },
        s4r: function (g) {
            paper(g, 'right');
            g.save(); g.translate(PW / 2, PH / 2 - 40 * S); g.rotate(-0.035);
            g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 30 * S; g.shadowOffsetY = 12 * S;
            var cw = PW - 200 * S, ch = cw * 1190 / 1600;
            g.fillStyle = '#fff'; g.fillRect(-cw / 2 - 14 * S, -ch / 2 - 14 * S, cw + 28 * S, ch + 28 * S);
            g.shadowColor = 'transparent';
            cover(g, img('images/achievements/club-excellence-ri.webp'), -cw / 2, -ch / 2, cw, ch);
            g.restore();
            g.font = font(600, 26); g.fillStyle = MUTED; g.textAlign = 'center';
            g.fillText('Club Excellence Award, Rotary International', PW / 2, PH - 230 * S);
            g.textAlign = 'left';
            folio(g, 8, 'right');
        },
        s5l: function (g) {
            paper(g, 'left'); eyebrow(g, 'Our journey', 170 * S);
            var y = title(g, 'Three years,', 'one story.', 270 * S) + 90 * S;
            [['12 Oct 2023', 'Chartered, sponsored by the Rotary Club of Durgapur Central'], ['RY 2023–24', '16 inaugural initiatives · 8 awards'], ['RY 2024–25', '36 projects & drives · 6 awards'], ['RY 2025–26', '35 events & initiatives · 11 awards'], ['RY 2026–27', '4th Club Installation on 4 July 2026 · 15 projects so far']].forEach(function (s) {
                g.fillStyle = GREEN; g.beginPath(); g.arc(102 * S, y - 10 * S, 10 * S, 0, 7); g.fill();
                g.font = font(800, 30); g.fillStyle = INK; g.fillText(s[0], 135 * S, y);
                g.font = font(500, 27); g.fillStyle = MUTED; y = wrap(g, s[1], 135 * S, y + 42 * S, PW - 230 * S, 38 * S) + 40 * S;
            });
            folio(g, 9, 'left');
        },
        s5r: function (g) {
            var gr = g.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, '#0b2e21'); gr.addColorStop(1, '#065f46');
            g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
            g.font = font(800, 24); g.fillStyle = '#6ee7b7'; g.fillText('NEXT CHAPTER', 90 * S, 220 * S);
            g.font = font(800, 92); g.fillStyle = '#ffffff'; g.fillText('Written by', 90 * S, 340 * S); g.fillText('the people', 90 * S, 440 * S); g.fillText('who join us.', 90 * S, 540 * S);
            g.font = font(400, 34); g.fillStyle = 'rgba(255,255,255,0.88)';
            var y = wrap(g, 'If you are ready to turn your ideas into action, connect with like-minded people and make a difference, we would love to hear from you.', 90 * S, 650 * S, PW - 180 * S, 52 * S) + 50 * S;
            g.font = font(700, 30); g.fillStyle = '#a7f3d0';
            g.fillText('rcdurgapurpresidency.3240@gmail.com', 90 * S, y); g.fillText('Instagram: @racdcp', 90 * S, y + 50 * S);
        }
    };
    function makePage(fn) {
        var c = document.createElement('canvas'); c.width = PW; c.height = PH;
        var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        var draw = function () { fn(c.getContext('2d')); tex.needsUpdate = true; };
        draw();
        return { tex: tex, redraw: draw };
    }
    var P = {};
    Object.keys(pages).forEach(function (k) { P[k] = makePage(pages[k]); });
    function redrawAll() { Object.keys(P).forEach(function (k) { P[k].redraw(); }); }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(redrawAll);
    Object.keys(images).forEach(function (src) { images[src].addEventListener('load', redrawAll); });

    /* ---------- the 3D book ---------- */
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 2 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(isPhone ? 38 : 32, 1, 0.1, 100);
    var W = 6, H = W * 1.4;
    var book = new THREE.Group();
    scene.add(book);

    var vert = [
        'uniform float bend; varying vec2 vUv;',
        'void main(){ vUv = uv; vec3 p = position;',
        '  float s = sin(uv.x * 3.14159);',
        '  p.z += bend * s * 1.1;',
        '  p.x -= bend * bend * uv.x * 0.35;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }'
    ].join('\n');
    var frag = [
        'uniform sampler2D frontMap; uniform sampler2D backMap; uniform float turn;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec4 c = gl_FrontFacing ? texture2D(frontMap, vUv) : texture2D(backMap, vec2(1.0 - vUv.x, vUv.y));',
        '  float light = gl_FrontFacing ? 0.72 + 0.28 * cos(turn) : 0.72 - 0.28 * cos(turn);',
        '  gl_FragColor = vec4(c.rgb * light, 1.0);',
        '  #include <colorspace_fragment>',
        '}'
    ].join('\n');
    function leaf(front, back, thickZ) {
        var geo = new THREE.PlaneGeometry(W, H, 24, 1);
        geo.translate(W / 2, 0, 0);
        var mat = new THREE.ShaderMaterial({
            uniforms: { frontMap: { value: front }, backMap: { value: back }, turn: { value: 0 }, bend: { value: 0 } },
            vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide
        });
        var mesh = new THREE.Mesh(geo, mat);
        book.add(mesh);
        return mesh;
    }
    var leaves = [
        leaf(P.cover.tex, P.s1l.tex),
        leaf(P.s1r.tex, P.s2l.tex),
        leaf(P.s2r.tex, P.s3l.tex),
        leaf(P.s3r.tex, P.s4l.tex),
        leaf(P.s4r.tex, P.s5l.tex)
    ];
    // last right-hand page sits on the back board
    var last = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: P.s5r.tex }));
    last.position.set(W / 2, 0, -0.005);
    book.add(last);
    // boards and page block for thickness
    var boardMat = new THREE.MeshBasicMaterial({ color: 0x082a1f });
    var back = new THREE.Mesh(new THREE.BoxGeometry(W + 0.16, H + 0.2, 0.12), boardMat);
    back.position.set(W / 2, 0, -0.08);
    book.add(back);
    var block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, H - 0.05, 0.1), new THREE.MeshBasicMaterial({ color: 0xe8e0cf }));
    block.position.set(W / 2, 0, -0.06);
    book.add(block);
    // soft shadow under the book
    var sc = document.createElement('canvas'); sc.width = sc.height = 128;
    var sg = sc.getContext('2d'), sgr = sg.createRadialGradient(64, 64, 10, 64, 64, 64);
    sgr.addColorStop(0, 'rgba(0,0,0,0.55)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.position.z = -0.3;
    book.add(shadow);

    /* ---------- scroll choreography ---------- */
    var COVER_DWELL = 0.7, TURN = 0.7, READ = 1.3;
    var units = COVER_DWELL + leaves.length * (TURN + READ);
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
    function progress() {
        var r = section.getBoundingClientRect();
        var total = section.offsetHeight - innerHeight;
        return Math.max(0, Math.min(1, -r.top / Math.max(1, total))) * units;
    }
    // distance needed so a width/height fits the view
    function distFor(wid, hei) {
        var vfov = THREE.MathUtils.degToRad(camera.fov);
        var dh = (hei / 2) / Math.tan(vfov / 2);
        var dw = (wid / 2) / (Math.tan(vfov / 2) * camera.aspect);
        return Math.max(dh, dw);
    }

    var mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') { return; }
        tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1;
    }, { passive: true });

    var camX = 0, camD = 20, lookX = 0, clock = new THREE.Clock(), running = true, visible = true;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { requestAnimationFrame(loop); } }).observe(section);
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(loop); } });

    function loop() {
        if (!running || !visible) { return; }
        requestAnimationFrame(loop);
        var dt = Math.min(clock.getDelta(), 0.05);
        var u = progress();

        // turn amount for each leaf (0 = lying right, 1 = turned to the left)
        var openAmt = 0, reading = -1, readT = 0;
        leaves.forEach(function (lf, k) {
            var startTurn = COVER_DWELL + k * (TURN + READ);
            var a = smooth(Math.max(0, Math.min(1, (u - startTurn) / TURN)));
            if (k === 0) { openAmt = a; }
            var ang = a * Math.PI;
            lf.rotation.y = -ang;
            lf.material.uniforms.turn.value = ang;
            lf.material.uniforms.bend.value = Math.sin(ang) * 0.55;
            // stack order: unturned leaves on the right (first on top), turned ones on the left (last on top)
            lf.position.z = (1 - a) * (leaves.length - k) * 0.012 + a * (k + 1) * 0.012;
            if (u >= startTurn + TURN) { reading = k; readT = Math.min(1, (u - startTurn - TURN) / READ); }
        });

        // closed: the cover is centred; open: the spine is centred
        book.position.x = -W / 2 * (1 - openAmt);
        book.rotation.x = -0.32 + openAmt * 0.14 - my * 0.05;
        book.rotation.y = mx * 0.08;
        shadow.scale.set((W + 2) * (1 + openAmt), H + 2, 1);
        shadow.position.x = W / 2 * (1 - openAmt);

        // camera: whole cover, whole spread (desktop) or one page at a time (phones)
        var targetX = 0, targetD;
        if (openAmt < 0.999 || reading < 0) {
            targetD = distFor(W * (1 + openAmt) * 1.15, H * 1.2);
        } else if (isPhone) {
            targetD = distFor(W * 1.08, H * 1.05);
            targetX = readT < 0.5 ? -W / 2 : W / 2;      // left page, then right page
        } else {
            targetD = distFor(W * 2 * 1.1, H * 1.32);
        }
        camD += (targetD - camD) * Math.min(1, dt * 3);
        camX += (targetX - camX) * Math.min(1, dt * (isPhone ? 2.2 : 3));
        lookX += (targetX - lookX) * Math.min(1, dt * 3);
        camera.position.set(camX + mx * 0.6, -0.3 - my * 0.3, camD);
        camera.lookAt(lookX, 0, 0);

        hint.classList.toggle('is-off', u > 0.15);
        bar.style.transform = 'scaleX(' + (u / units).toFixed(4) + ')';
        endPanel.classList.toggle('is-on', u > units - READ * 0.6);
        renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
})();
