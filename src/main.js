import {createJourney, advanceJourney, tickJourney, journeyLabels} from './journey.js';
import {createJourneyScenery} from './scenery.js';
import * as THREE from 'three';
import './style.css';
import {createPayment, beginPayment, swipePayment, cancelPayment} from './payment.js';
import {movementDirection, canWalk} from './controls.js';
import {chapters, createStory, completeChapter, nextChapter, storyReady, routeOffset, discoveries} from './story.js';
import {createFamily} from './characters.js';
import {products, createState, readyForPicnic, purchase, productByCode, channels, formatHetoman} from './game-state.js';

// One shared path coordinate drives both characters, their gait and the camera.
const canvas = document.querySelector('#world');
let renderer;
try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true});
} catch {
    document.querySelector('#loading').textContent = 'مرورگر شما گرافیک سه‌بعدی را اجرا نمی‌کند. شتاب‌دهی گرافیکی را فعال کنید.';
    throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#a4b492');
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#a4b492', .018);
const camera = new THREE.PerspectiveCamera(65, 1, .1, 140);
scene.add(new THREE.HemisphereLight('#fff3cc', '#375946', 2.8));
const sun = new THREE.DirectionalLight('#ffe5a3', 3.3);
sun.position.set(-5, 12, -8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -24, right: 24, top: 24, bottom: -24, far: 60});
scene.add(sun);
let story = createStory(), chapterId = null, chapterLine = 0, chapterTimer = 0;
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .85, ...extra});
const green = material('#6d975b'), bark = material('#755a3e'), dark = material('#172c2a');

function mesh(geometry, mat, parent = scene, position = [0, 0, 0]) {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(...position);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
}

function box(w, h, d, mat, parent, pos) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, pos)
}

function ball(r, mat, parent, pos) {
    return mesh(new THREE.SphereGeometry(r, 12, 10), mat, parent, pos)
}

const ground = mesh(new THREE.PlaneGeometry(160, 120), green);
ground.rotation.x = -Math.PI / 2;

// A broad, gently curving ribbon defines the walking route.
function pathZ(x) {
    return Math.sin(x * .17) * 1.5 + routeOffset(story, x)
}

const points = [];
for (let x = -42; x <= 50; x += .5) points.push(new THREE.Vector3(x, .025, pathZ(x)));
const curve = new THREE.CatmullRomCurve3(points);
const path = mesh(new THREE.TubeGeometry(curve, 180, 1.35, 8, false), material('#cbb889'));
path.scale.y = .025;
let seed = 42;

function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296
}

const trees = [];

function tree(x, z, s) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    trees.push(g);
    scene.add(g);
    mesh(new THREE.CylinderGeometry(.17, .3, 2.6, 7), bark, g, [0, 1.3, 0]);
    const foliage = material(['#315e42', '#47764b', '#597f4c', '#749759'][Math.floor(random() * 4)]);
    for (let i = 0; i < 3; i++) {
        mesh(new THREE.ConeGeometry(1.55 - i * .25, 2.6, 7), foliage, g, [0, 2.7 + i * .9, 0]);
    }
}

for (let i = 0; i < 130; i++) {
    const x = random() * 100 - 45, z = random() * 65 - 33;
    if (Math.abs(z - pathZ(x)) > 3.6 && !(Math.abs(x - 9) < 4 && z > -5 && z < 2) && !(x > 17 && x < 28 && Math.abs(z) < 7)) tree(x, z, .7 + random() * 1.2)
}
for (let i = 0; i < 150; i++) {
    const x = random() * 65 - 25, z = random() * 32 - 16;
    if (Math.abs(z - pathZ(x)) < 1.7) continue;
    const rock = mesh(new THREE.DodecahedronGeometry(.13 + random() * .3), material('#8c9c78'), scene, [x, .12, z]);
    rock.scale.y = .6;
}
for (let i = 0; i < 100; i++) {
    const x = random() * 55 - 20, z = random() * 25 - 12;
    if (Math.abs(z - pathZ(x)) < 1.5) continue;
    ball(.065, material(i % 3 ? '#eadba0' : '#e4ae89'), scene, [x, .22, z]);
}

const scenery = createJourneyScenery(scene, pathZ);
let journey = createJourney(), firstPerson = false, viewYaw = 0, viewPitch = 0;
const journeyPanel = document.createElement('section');
journeyPanel.id = 'journey-panel';
journeyPanel.innerHTML = '<small>FOREST ROAD · یک سفر کنار هم</small><h2></h2><p></p><button></button>';
document.body.append(journeyPanel);
journeyPanel.querySelector('button').onclick = () => {
    if (advanceJourney(journey)) {
        firstPerson = false;
        clearInput();
        syncHUD();
    }
};
const viewButton = document.createElement('button');
viewButton.id = 'camera-view';
viewButton.textContent = 'تغییر دوربین · V';
document.body.append(viewButton);
viewButton.onclick = () => {
    firstPerson = !firstPerson;
};
let dragging = false, dragX = 0, dragY = 0;
canvas.addEventListener('pointerdown', e => {
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    viewYaw = THREE.MathUtils.clamp(viewYaw + (e.clientX - dragX) * .005, -1.3, 1.3);
    viewPitch = THREE.MathUtils.clamp(viewPitch - (e.clientY - dragY) * .004, -.6, .6);
    dragX = e.clientX;
    dragY = e.clientY;
});
canvas.addEventListener('pointerup', () => dragging = false);
canvas.addEventListener('pointercancel', () => dragging = false);
const characters = createFamily();
const family = characters.group;
scene.add(family);

// Procedural vending machine, with a canvas sign and visible product rows.
const stationX = 9, stationZ = pathZ(9) - 2.65;
const machine = new THREE.Group();
machine.position.set(stationX, 0, stationZ);
machine.rotation.y = .13;
scene.add(machine);
const shell = material('#243c3c', {metalness: .55, roughness: .32});
box(1.82, 2.96, 1.15, shell, machine, [0, 1.48, 0]);
const bezel = material('#bbc6bd', {metalness: .75, roughness: .25});
const led = new THREE.MeshBasicMaterial({color: '#c7f6dc'});
for (const side of [-1, 1]) {
    box(.045, 2.78, .04, bezel, machine, [side * .86, 1.5, .6]);
    box(.018, 1.86, .025, led, machine, [-.13 + side * .60, 1.55, .86]);
}
box(1.72, .07, .04, bezel, machine, [0, 2.91, .6]);
box(1.72, .07, .04, bezel, machine, [0, .12, .6]);
box(.3, 1.45, .08, material('#142625'), machine, [.67, 1.53, .6]);
box(1.2, .04, .08, bezel, machine, [-.13, 2.5, .7]);
const displayCanvas = document.createElement('canvas');
displayCanvas.width = 256;
displayCanvas.height = 256;
const displayCtx = displayCanvas.getContext('2d');
displayCtx.fillStyle = '#122d2c';
displayCtx.fillRect(0, 0, 256, 256);
displayCtx.textAlign = 'center';
displayCtx.fillStyle = '#bcf2d5';
displayCtx.font = 'bold 31px Tahoma';
displayCtx.fillText('پرداخت', 128, 70);
displayCtx.font = '24px Tahoma';
displayCtx.fillText('کارت بکشید', 128, 125);
displayCtx.fillStyle = '#85bbab';
displayCtx.fillRect(44, 170, 168, 4);
mesh(new THREE.PlaneGeometry(.23, .3), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(displayCanvas)}), machine, [.67, 1.7, .669]);

box(1.25, 1.85, .08, material('#a6d5c3', {metalness: .4, roughness: .22}), machine, [-.13, 1.55, .59]);
box(1.13, 1.72, .1, material('#223f3b'), machine, [-.13, 1.55, .65]);
const bottleMats = ['#e5ae47', '#badd81', '#c8704e'].map(c => material(c));
const steel = material('#aeb8b6', {metalness: .8, roughness: .3});
for (let row = 0; row < 6; row++) {
    const shelfY = .86 + row * .275;
    box(1.17, .025, .28, steel, machine, [-.13, shelfY, .73]);
    for (let col = 0; col < 10; col++) {
        const channel = (5 - row) * 10 + col + 1, px = -.65 + col * .115;
        if (channel % 3) {
            mesh(new THREE.CylinderGeometry(.033, .04, .155, 10), bottleMats[channel % 3], machine, [px, shelfY + .105, .73]);
            box(.035, .035, .035, dark, machine, [px, shelfY + .195, .73]);
        } else box(.068, .14, .07, bottleMats[channel % 3], machine, [px, shelfY + .09, .73]);
        // Each slot has its own dispensing spiral.
        const spiral = mesh(new THREE.TorusGeometry(.035, .006, 4, 10), steel, machine, [px, shelfY + .045, .79]);
    }
}
const slots = document.createElement('canvas');
slots.width = 1000;
slots.height = 900;
const slotContext = slots.getContext('2d');
slotContext.textAlign = 'center';
slotContext.font = 'bold 25px sans-serif';
for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
    const n = row * 10 + col + 1;
    slotContext.fillStyle = n >= 21 ? '#d1f0b3' : '#9ca6a0';
    slotContext.fillRect(col * 100 + 8, row * 150 + 120, 84, 30);
    slotContext.fillStyle = '#172c2a';
    slotContext.fillText(String(n), col * 100 + 50, row * 150 + 144);
}
const slotLabels = mesh(new THREE.PlaneGeometry(1.16, 1.65), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(slots),
    transparent: true
}), machine, [-.13, 1.56, .82]);
for (const px of [-.77, .48]) box(.025, 1.85, .08, steel, machine, [px, 1.55, .82]);
const glass = mesh(new THREE.PlaneGeometry(1.24, 1.86), material('#d5eee9', {
    transparent: true,
    opacity: .1,
    metalness: .3,
    roughness: .08,
    depthWrite: false
}), machine, [-.13, 1.55, .84]);
box(.04, .5, .06, steel, machine, [.52, 1.4, .88]);
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) box(.045, .045, .035, steel, machine, [.60 + c * .065, 1.43 - r * .07, .64]);
for (let i = 0; i < 6; i++) box(.24, .014, .025, steel, machine, [.67, .55 + i * .045, .58]);
for (const px of [-.65, .65]) box(.15, .09, .6, dark, machine, [px, .015, 0]);
box(.24, .38, .08, material('#81d9ba', {emissive: '#50a486', emissiveIntensity: .5}), machine, [.67, 1.7, .62]);
for (let i = 0; i < 3; i++) box(.15, .05, .08, material('#e4d7ad'), machine, [.67, 1.3 - i * .1, .62]);
box(.85, .3, .1, material('#050f10'), machine, [-.13, .36, .62]);
const label = document.createElement('canvas');
label.width = 512;
label.height = 128;
const ctx = label.getContext('2d');
ctx.fillStyle = '#193332';
ctx.fillRect(0, 0, 512, 128);
ctx.fillStyle = '#d9efa7';
ctx.font = 'bold 52px Tahoma';
ctx.textAlign = 'center';
ctx.fillText('روبات مارکت', 256, 83);
const sign = new THREE.MeshBasicMaterial({color: '#ffffff', map: new THREE.CanvasTexture(label)});
box(1.5, .38, .05, sign, machine, [0, 2.68, .58]);
// A separate card, animated through the reader only after an explicit swipe.
const bankCard = box(.24, .15, .014, material('#ddd4b4', {metalness: .2}), machine, [.9, 1.8, .8]);
box(.2, .03, .016, dark, bankCard, [0, .035, .008]);
bankCard.visible = false;
const pad = mesh(new THREE.CylinderGeometry(2.3, 2.4, .12, 32), material('#9caa80'), scene, [9, .05, stationZ]);
const delivery = new THREE.Group();
scene.add(delivery);
const deliveryBody = mesh(new THREE.CylinderGeometry(.1, .1, .28, 10), bottleMats[0], delivery);
box(.09, .05, .09, dark, delivery, [0, .16, 0]);
delivery.visible = false;

// Picnic clearing, checked blanket, basket and a recycling bin.
const picnic = new THREE.Group();
picnic.position.set(23, 1.8, pathZ(22));
scene.add(picnic);
for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) box(.5, .035, .5, material((i + j) % 2 ? '#f3dca9' : '#b96f51'), picnic, [(i - 2.5) * .5, .08, (j - 2) * .5]);
const picnicFood = new THREE.Group();
picnic.add(picnicFood);
box(.5, .3, .35, material('#ac8252'), picnic, [-1, .25, -.8]);
mesh(new THREE.TorusGeometry(.22, .035, 6, 16, Math.PI), bark, picnic, [-1, .5, -.8]);
const bin = box(.55, .8, .55, material('#39735b'), scene, [24, 2.2, pathZ(22) - 2.3]);
box(.65, .08, .65, dark, scene, [24, 2.64, pathZ(22) - 2.3]);
const flap = new THREE.Group();
flap.position.set(-.13, .53, .69);
machine.add(flap);
box(.87, .28, .035, material('#527268', {metalness: .45}), flap, [0, -.14, 0]);
const glow = new THREE.PointLight('#a8ffc5', 2, 7);
glow.position.set(9, 2, stationZ + 1);
scene.add(glow);
const butterfly = new THREE.Group();
scene.add(butterfly);
const wings = [-1, 1].map(side => {
    const wing = mesh(new THREE.SphereGeometry(.16, 8, 6), material('#efb75b'), butterfly, [side * .14, 0, 0]);
    wing.scale.set(1, .12, 1.4);
    return wing;
});
// A raised footbridge crosses a shallow stream before the vending stop.
const bridgeX = 0;
const water = mesh(new THREE.PlaneGeometry(3.4, 40), material('#68b4b6', {
    metalness: .3,
    roughness: .25
}), scene, [bridgeX, .035, 0]);
water.rotation.x = -Math.PI / 2;
const bridge = new THREE.Group();
scene.add(bridge);
const wood = material('#a57b50');
for (let i = 0; i < 13; i++) {
    const bx = -2 + i / 3;
    box(.29, .14, 2.8, wood, bridge, [bx, .22, pathZ(bx)]);
}
for (const side of [-1, 1]) {
    for (const bx of [-2, 0, 2]) box(.12, 1, .12, bark, bridge, [bx, .65, pathZ(bx) + side * 1.3]);
    const rail = box(4.3, .1, .1, wood, bridge, [0, 1.08, side * 1.3]);
    rail.rotation.y = -.25;
}

function pathHeight(at) {
    return Math.max(0, Math.min(1, (2.6 - Math.abs(at)) / .6)) * .3 + THREE.MathUtils.smoothstep(at, 17, 22) * 1.8;
}

const rabbit = new THREE.Group();
scene.add(rabbit);
const fur = material('#eee2ca'), pink = material('#d5a193');
const rabbitBody = ball(.28, fur, rabbit, [0, .3, 0]);
rabbitBody.scale.set(1.3, 1, 1);
ball(.22, fur, rabbit, [.24, .55, 0]);
ball(.12, fur, rabbit, [-.35, .4, 0]);
for (const side of [-1, 1]) {
    const ear = ball(.1, fur, rabbit, [.23, .86, side * .1]);
    ear.scale.set(.75, 2.5, .75);
    const inset = ball(.065, pink, rabbit, [.29, .88, side * .1]);
    inset.scale.set(.4, 2.6, .7);
    ball(.025, dark, rabbit, [.43, .58, side * .13]);
    ball(.09, fur, rabbit, [.1, .1, side * .2]);
}
const lostPaper = box(.6, .025, .43, material('#fff3d5'), scene, [14, .35, Math.sin(14 * .17) * 1.5 + 1.5]);
lostPaper.rotation.z = .15;
const bush = ball(.55, material('#688a4b'), scene, [14, .3, Math.sin(14 * .17) * 1.5 + 2]);
const oldTree = new THREE.Group();
oldTree.position.set(19, 0, -5);
scene.add(oldTree);
mesh(new THREE.CylinderGeometry(.5, .8, 4, 9), bark, oldTree, [0, 2, 0]);
ball(2, material('#54734a'), oldTree, [0, 4.8, 0]);
const hill = mesh(new THREE.SphereGeometry(5, 24, 16), green, scene, [23, -1.3, 0]);
hill.scale.set(1, .65, 1.3);
let branchPath = null;

function rebuildRoute() {
    if (branchPath) {
        scene.remove(branchPath);
        branchPath.geometry.dispose();
        branchPath.material.dispose();
    }
    const pts = [];
    for (let at = 11; at <= 24; at += .15) pts.push(new THREE.Vector3(at, pathHeight(at) + .045, pathZ(at)));
    branchPath = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .8, 8, false), material('#cbb889'));
    // Flatten only the cross-section, retaining the hill's elevation.
    const positions = branchPath.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        positions.setY(i, pathHeight(px) + .045);
    }
    positions.needsUpdate = true;
    branchPath.geometry.computeVertexNormals();
}

rebuildRoute();
const fishes = [];
for (let i = 0; i < 4; i++) {
    const fish = ball(.09, material('#e8b365'), scene, [.4, .11, -.6 + i * .4]);
    fish.scale.set(2, .5, 1);
    fishes.push(fish);
}
let encounterTime = 0, rabbitSeen = false, encounterActive = false, facing = Math.PI / 2;
const $ = s => document.querySelector(s), shop = $('#shop'), ending = $('#ending');
const storyDialog = $('#story-dialog'), notebook = $('#notebook');

function renderChapter() {
    const chapter = chapters[chapterId];
    $('#chapter-title').textContent = chapter.title;
    $('#chapter-line').textContent = chapter.lines[chapterLine];
    $('#chapter-count').textContent = `${chapterLine + 1} / ${chapter.lines.length}`;
    $('#chapter-actions').replaceChildren();
    const last = chapterLine === chapter.lines.length - 1;
    if (last && chapter.action) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${chapter.action.label} · F`;
        b.onclick = performStoryAction;
        $('#chapter-actions').append(b);
    }
    chapterTimer = Math.max(2.5, chapter.lines[chapterLine].length * .055);
}

function performStoryAction() {
    if (shop.open || notebook.open || ending.open || state.busy) return;
    if (journey.phase !== 'walking') {
        if (advanceJourney(journey)) {
            firstPerson = false;
            clearInput();
            syncHUD();
        }
        return;
    }
    if (!chapterId || shop.open || notebook.open || ending.open || state.busy) return;
    const chapter = chapters[chapterId];
    if (chapter.action && chapterLine === chapter.lines.length - 1) finishChapter(chapter.action.value);
}

function showChapter(id) {
    chapterId = id;
    chapterLine = 0;
    storyDialog.hidden = false;
    renderChapter();
}

function finishChapter(choice) {
    const id = chapterId;
    if (!completeChapter(story, id, choice)) return;
    if (id === 'rabbit') {
        rabbitSeen = true;
        encounterTime = 0;
    }
    if (id === 'fork' || id === 'wind') rebuildRoute();
    storyDialog.hidden = true;
    chapterId = null;
    syncHUD();
    if (id === 'summit') {
        drawMemory($('#memory'));
        $('#ending-discoveries').textContent = discoveries(story).join(' · ');
        ending.showModal();
    }
}

function drawMemory(canvas) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 600, 360);
    c.fillStyle = story.sky === 'gold' ? '#f5d18b' : story.sky === 'rose' ? '#eeb9ba' : '#b9dfeb';
    c.fillRect(0, 0, 600, 360);
    c.fillStyle = '#fff0af';
    c.beginPath();
    c.arc(500, 65, 30, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#84a36b';
    c.beginPath();
    c.moveTo(0, 240);
    c.quadraticCurveTo(160, 90, 320, 235);
    c.quadraticCurveTo(460, 120, 600, 210);
    c.lineTo(600, 360);
    c.lineTo(0, 360);
    c.fill();
    for (let i = 0; i < 5; i++) {
        c.fillStyle = '#6a553e';
        c.fillRect(30 + i * 115, 180, 8, 75);
        c.fillStyle = '#456b47';
        c.beginPath();
        c.moveTo(5 + i * 115, 205);
        c.lineTo(34 + i * 115, 125);
        c.lineTo(63 + i * 115, 205);
        c.fill();
    }
    c.strokeStyle = '#8a674d';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(75, 278);
    c.lineTo(210, 278);
    c.moveTo(85, 263);
    c.lineTo(200, 263);
    c.stroke();

    function person(px, py, size, color) {
        c.fillStyle = '#edbb94';
        c.beginPath();
        c.arc(px, py, size * .18, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = color;
        c.lineWidth = size * .16;
        c.beginPath();
        c.moveTo(px, py + size * .22);
        c.lineTo(px, py + size * .65);
        c.moveTo(px, py + size * .3);
        c.lineTo(px + size * .3, py + size * .48);
        c.moveTo(px, py + size * .65);
        c.lineTo(px - size * .15, py + size);
        c.moveTo(px, py + size * .65);
        c.lineTo(px + size * .15, py + size);
        c.stroke();
    }

    person(300, 200, 90, '#b28b48');
    person(347, 235, 58, '#c56f4d');
    c.strokeStyle = '#d4a77d';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(327, 243);
    c.lineTo(347, 252);
    c.stroke();
    c.font = '20px Tahoma';
    c.textAlign = 'center';
    c.fillStyle = '#294b3c';
    c.fillText(story.sky ? 'من و بابا، تپهٔ آرزوها' : 'من و بابا… ادامه دارد', 300, 338);
}

$('#notebook-open').onclick = () => {
    clearInput();
    $('#discoveries').textContent = discoveries(story).join(' · ') || 'هنوز اول راهیم؛ کشف‌های امروز اینجا ثبت می‌شن.';
    drawMemory($('#drawing'));
    notebook.showModal();
};
$('#notebook-close').onclick = () => notebook.close();
notebook.addEventListener('close', clearInput);
let payment = createPayment(), paymentTime = 0;
let state = createState(), x = -8, moving = 0, gait = 0, deliveryTime = 0, activeProduct = null, elapsed = 0;
const pressed = new Set(), held = new Set();
const fa = n => n.toLocaleString('fa-IR');
let audio = null, soundEnabled = false, nextBird = 0, zoomDistance = 1;

function tone(frequency, duration = .12, volume = .04) {
    if (!soundEnabled || !audio) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .7, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
}

$('#sound').onclick = async () => {
    try {
        audio ??= new AudioContext();
        await audio.resume();
        soundEnabled = !soundEnabled;
        $('#sound').textContent = soundEnabled ? 'صدا: روشن ♫' : 'صدا: خاموش ♫';
        $('#sound').setAttribute('aria-pressed', String(soundEnabled));
        tone(700);
    } catch {
        $('#sound').textContent = 'صدا در دسترس نیست';
    }
};

function syncHUD() {
    $('#balance').textContent = fa(state.balance);
    $('#basket').textContent = state.basket.length ? '🧺 ' + state.basket.map(p => p.icon).join(' ') : '🧺 سبد پیک‌نیک خالی است';
    $('#mission').textContent = journey.phase !== 'walking' ? journeyLabels[journey.phase][1]
        : state.finished ? 'به قله رسیدید؛ روی فرش استراحت کنید'
            : chapterId ? chapters[chapterId].title
                : !story.done.includes('camp') ? 'مسیر جنگل را تا جمع کنار آتش ادامه بدهید'
                    : !readyForPicnic(state) ? 'از دستگاه یک نوشیدنی و یک خوراکی بخرید'
                        : 'خرید آماده است؛ مسیر را تا فرش بالای قله ادامه بدهید';
}

function selectChannel(code) {
    $('#product-code').value = code;
    $('#product-code').removeAttribute('aria-invalid');
    $('#shop-status').textContent = '';
    document.querySelectorAll('[data-channel]').forEach(node => node.classList.toggle('selected', node.dataset.channel === code));
    const row = $(`#products [data-channel="${code}"]`);
    row?.scrollIntoView({block: 'nearest'});
}

function renderProducts() {
    syncHUD();
    $('#products').replaceChildren();
    $('#channels').replaceChildren();
    products.forEach(p => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = fa(p.channel);
        button.dataset.channel = p.code;
        button.disabled = !p.available;
        button.setAttribute('aria-label', `کانال ${fa(p.channel)}${p.available ? '' : '؛ غیرفعال'}`);
        button.onclick = () => selectChannel(p.code);
        $('#channels').append(button);
    });
    products.forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'product-code-card';
        card.dataset.channel = p.code;
        card.innerHTML = `<span class="icon">${p.icon}</span><b>کد ${fa(p.channel)} · ${p.name}<small>محصول فرضی کانال ${fa(p.channel)}</small></b><span>${formatHetoman(p.cost)}</span>`;
        card.onclick = () => selectChannel(p.code);
        $('#products').append(card);
    });
}

function deliver(p) {
    activeProduct = p;
    deliveryTime = 3.4;
    delivery.visible = true;
    deliveryBody.material = bottleMats[p.type === 'snack' ? 2 : p.baseId === 'water' ? 1 : 0];
    renderProducts();
    shop.close();
    pressed.clear();
    held.clear();
    tone(480, .3);
    $('#speech').textContent = 'پدر: ببین، دستگاه داره انتخابت رو آماده می‌کنه!';
}

function openShop() {
    if (!chapterId && journey.phase === 'walking' && Math.abs(x - stationX) < 2.5 && !shop.open && !notebook.open && !state.busy && !state.finished) {
        pressed.clear();
        held.clear();
        $('#shop-status').textContent = 'بچه: خودم می‌تونم انتخاب کنم؟  پدر: حتماً! برای نوشیدنی و خوراکی پول کنار بگذار.';
        renderProducts();
        $('#product-code').value = '';
        $('#product-code').removeAttribute('aria-invalid');
        shop.showModal();
        $('#product-code').focus();
        tone(750);
    }
}

$('#code-form').onsubmit = e => {
    e.preventDefault();
    if (state.busy || state.finished || !shop.open) return;
    const field = $('#product-code'), product = productByCode(field.value);
    let error = '';
    if (!field.value.trim()) error = 'کد محصول را وارد کن.';
    else if (!product) error = 'کانال قابل خرید نیست؛ عددی از ۲۱ تا ۶۰ وارد کن.';
    else if (state.balance < product.cost) error = 'برای این محصول موجودی کافی نداری.';
    else if (!purchase({
        ...state,
        basket: [...state.basket]
    }, product.id)) error = 'برای تکمیل پیک‌نیک، هزینهٔ نوشیدنی و خوراکی را کنار بگذار؛ محصول دیگری انتخاب کن.';
    if (error) {
        $('#shop-status').textContent = error;
        field.setAttribute('aria-invalid', 'true');
        field.focus();
        tone(200, .2);
        return;
    }
    field.removeAttribute('aria-invalid');
    if (beginPayment(state, payment, product)) {
        paymentTime = 0;
        shop.close();
        clearInput();
        $('#payment-panel').hidden = false;
        $('#cancel-payment').hidden = false;
        $('#payment-message').textContent = `کانال ${fa(product.channel)} · ${product.name} · ${formatHetoman(product.cost)}`;
        $('#swipe-card').disabled = true;
        $('#payment-result').textContent = 'در حال نزدیک شدن به کارت‌خوان…';
    }
};

function swipeCard() {
    if (!swipePayment(state, payment)) return;
    paymentTime = 0;
    bankCard.visible = true;
    $('#swipe-card').disabled = true;
    $('#cancel-payment').hidden = true;
    $('#payment-result').textContent = 'خرید موفق ✓ محصول در حال تحویل است';
    tone(1100, .3);
    syncHUD();
}

$('#swipe-card').onclick = swipeCard;
$('#cancel-payment').onclick = () => {
    if (cancelPayment(state, payment)) {
        $('#payment-panel').hidden = true;
        bankCard.visible = false;
        clearInput();
    }
};
$('#product-code').addEventListener('input', () => {
    document.querySelectorAll('[data-channel]').forEach(node => node.classList.remove('selected'));
    $('#product-code').removeAttribute('aria-invalid');
    $('#shop-status').textContent = '';
});
$('#interact').onclick = openShop;
$('#close').onclick = () => shop.close();
window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key.toLowerCase() === 'v' && !e.repeat) {
        firstPerson = !firstPerson;
        return;
    }
    if (e.key.toLowerCase() === 'f') {
        if (!e.repeat) performStoryAction();
        return;
    }
    if (e.key.toLowerCase() === 'c' && payment.phase === 'ready') {
        e.preventDefault();
        swipeCard();
        return;
    }
    if (notebook.open || ending.open) return;
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', ' '].includes(e.key) && !shop.open && !ending.open) e.preventDefault();
    pressed.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        openShop();
    }
});
window.addEventListener('keyup', e => pressed.delete(e.key.toLowerCase()));

function clearInput() {
    pressed.clear();
    held.clear();
}

window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', clearInput);
shop.addEventListener('close', clearInput);
for (const [id, dir] of [['back', -1], ['forward', 1], ['zoom-in', 'in'], ['zoom-out', 'out']]) {
    const b = $('#' + id);
    b.onpointerdown = e => {
        if ((state.busy || state.finished) && typeof dir === 'number') return;
        b.setPointerCapture(e.pointerId);
        held.add(dir);
    };
    b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => held.delete(dir);
}

function reset() {
    journey = createJourney();
    firstPerson = false;
    viewYaw = 0;
    viewPitch = 0;
    camera.position.set(-39, 3.5, -6);
    look.set(-32, 1, 0);
    payment = createPayment();
    paymentTime = 0;
    $('#payment-panel').hidden = true;
    bankCard.visible = false;
    story = createStory();
    chapterId = null;
    storyDialog.hidden = true;
    chapterTimer = 0;
    if (notebook.open) notebook.close();
    rebuildRoute();
    state = createState();
    x = -8;
    deliveryTime = 0;
    delivery.visible = false;
    activeProduct = null;
    flap.rotation.x = 0;
    encounterTime = 0;
    rabbitSeen = false;
    encounterActive = false;
    facing = Math.PI / 2;
    zoomDistance = 1;
    picnicFood.traverse(node => {
        if (node.isMesh) node.geometry.dispose();
    });
    picnicFood.clear();
    clearInput();
    if (shop.open) shop.close();
    if (ending.open) ending.close();
    $('#badge').textContent = '';
    $('#recycle').disabled = false;
    $('#recycle').textContent = 'بسته‌ها را در سطل بینداز ♻';
    $('#speech').textContent = 'بچه: بابا، برای پیک‌نیک چی بخریم؟';
    syncHUD();
}

$('#restart').onclick = reset;
$('#again').onclick = reset;
$('#recycle').onclick = () => {
    state.recycled = true;
    $('#badge').textContent = '🏅 نشان دوست جنگل را گرفتی!';
    $('#recycle').disabled = true;
    $('#recycle').textContent = 'جنگل تمیز ماند ✓';
    $('#speech').textContent = 'بچه: چیزی جا نذاشتیم؟  پدر: فقط رد پامون.';
    tone(880, .4);
};

function finish() {
    state.finished = true;
    clearInput();
    state.basket.slice(0, 10).forEach((p, i) => {
        const item = mesh(p.type === 'drink' ? new THREE.CylinderGeometry(.09, .09, .3, 8) : new THREE.BoxGeometry(.25, .09, .2), bottleMats[p.type === 'drink' ? 0 : 2], picnicFood, [-.5 + (i % 5) * .28, .25, Math.floor(i / 5) * .3]);
    });
    $('#ending-text').textContent = `با ${fa(state.basket.length)} خوراکی و ${formatHetoman(state.balance)} باقی‌مانده، وقت یک استراحت دونفره است.`;
    $('#ending-basket').textContent = state.basket.map(p => p.icon).join(' ');
    $('#speech').textContent = 'بچه: بهترین قسمت گردش، با تو بودن بود بابا!';
    $('#mission').textContent = 'پیک‌نیک آماده است؛ یک خاطرهٔ خوب ساختید';
    tone(660, .5);
    showChapter('summit');
}

// The ending opens on request so the picnic remains visible before the overlay.
const celebrate = document.createElement('button');
celebrate.id = 'celebrate';
celebrate.textContent = 'پیک‌نیک و نشان دوست جنگل 🌿';
celebrate.hidden = true;
document.body.append(celebrate);
celebrate.onclick = () => {
    if (!story.done.includes('summit')) showChapter('summit'); else ending.showModal();
};
ending.addEventListener('cancel', clearInput);

function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();
const camTarget = new THREE.Vector3(), look = new THREE.Vector3(x + 1, .8, pathZ(x)), lookTarget = new THREE.Vector3();
camera.position.set(-39, 3.5, -6);
look.set(-32, 1, 0);
let last = performance.now();

function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .1);
    last = now;
    elapsed += dt;
    const paused = shop.open || notebook.open || ending.open || document.hidden;
    tickJourney(journey, dt, paused, {
        throttle: Number(pressed.has('w') || pressed.has('arrowup') || held.has(1)) - Number(pressed.has('s') || pressed.has('arrowdown') || held.has(-1)),
        steer: Number(pressed.has('d') || pressed.has('arrowright') || held.has('out')) - Number(pressed.has('a') || pressed.has('arrowleft') || held.has('in'))
    });
    scenery.update(elapsed, journey.phase, journey.distance / 21, journey.lane);
    const walking = journey.phase === 'walking';
    document.body.classList.toggle('on-journey', !walking);
    document.body.classList.toggle('driving', journey.phase === 'driving');
    $('#forward').textContent = journey.phase === 'driving' ? 'گاز' : '→';
    $('#back').textContent = journey.phase === 'driving' ? 'ترمز' : '←';
    $('#zoom-in').textContent = journey.phase === 'driving' ? '↶' : '↑';
    $('#zoom-out').textContent = journey.phase === 'driving' ? '↷' : '↓';
    for (const [id, driveLabel, walkLabel] of [['forward', 'گاز', 'حرکت به جلو'], ['back', 'ترمز', 'حرکت به عقب'], ['zoom-in', 'فرمان چپ', 'زوم نزدیک'], ['zoom-out', 'فرمان راست', 'زوم دور']]) $('#' + id).setAttribute('aria-label', journey.phase === 'driving' ? driveLabel : walkLabel);
    journeyPanel.hidden = walking;
    if (!walking) {
        const [title, line, action] = journeyLabels[journey.phase];
        journeyPanel.querySelector('h2').textContent = title;
        journeyPanel.querySelector('p').textContent = line;
        const button = journeyPanel.querySelector('button');
        button.textContent = action;
        button.hidden = !action;
        if (journey.phase === 'driving') journeyPanel.querySelector('h2').textContent = `جادهٔ جنگلی · ${Math.round(journey.distance / 21 * 100).toLocaleString('fa-IR')}٪ · ${Math.round(journey.speed * 12).toLocaleString('fa-IR')} کیلومتر/ساعت`;
    }
    const direction = movementDirection(pressed, held) || (Number(pressed.has('w')) - Number(pressed.has('s')));
    const next = nextChapter(story, x);
    if (walking && next && !chapterId && !shop.open && !ending.open && !notebook.open && !state.busy && !state.finished) showChapter(next);
    if (chapterId && !state.busy && !shop.open && !notebook.open && !ending.open && !document.hidden) {
        const chapter = chapters[chapterId], lastLine = chapterLine === chapter.lines.length - 1;
        if (!(lastLine && chapter.action)) {
            chapterTimer -= dt;
            if (chapterTimer <= 0) {
                if (!lastLine) {
                    chapterLine++;
                    renderChapter();
                } else finishChapter();
            }
        }
    }
    encounterActive = chapterId === 'rabbit';
    moving = walking && canWalk({
        shopOpen: shop.open,
        notebookOpen: notebook.open,
        endingOpen: ending.open,
        busy: state.busy,
        chapterId,
        finished: state.finished
    }) ? direction : 0;
    x = THREE.MathUtils.clamp(x + moving * (pressed.has('shift') ? 3.7 : 2.2) * dt, -9, 22);
    family.position.set(x, pathHeight(x), pathZ(x));
    family.rotation.y = -Math.atan(.255 * Math.cos(x * .17));
    const shopping = shop.open || state.busy;
    if (shopping) {
        family.position.x = THREE.MathUtils.lerp(x, stationX, 1 - Math.exp(-dt * 8));
        x = family.position.x;
    }
    const desiredFacing = state.finished ? 0 : shopping ? Math.PI : moving < 0 ? -Math.PI / 2 : moving > 0 ? Math.PI / 2 : facing;
    facing += Math.atan2(Math.sin(desiredFacing - facing), Math.cos(desiredFacing - facing)) * (1 - Math.exp(-dt * 7));
    if (moving) gait += dt * 6.2;
    characters.update({
        dt,
        time: elapsed,
        gait,
        moving: !!moving,
        facing,
        shopping,
        delivery: state.busy,
        finished: state.finished,
        watchRabbit: encounterActive
    });
    if (state.finished) {
        family.position.copy(picnic.position);
        family.rotation.y = 0;
    }
    rabbit.position.set(-2.5 + (rabbitSeen ? Math.min(4, encounterTime) * .8 : 0), rabbitSeen ? Math.abs(Math.sin(elapsed * 8)) * .3 : 0, pathZ(-2.5) + 2.5 + (rabbitSeen ? Math.min(4, encounterTime) : 0));
    if (rabbitSeen) encounterTime = Math.min(4, encounterTime + dt);
    camTarget.set(x - 4.5, pathHeight(x) + (innerWidth < 650 ? 4 : 3), pathZ(x - 4.5) + 2);
    lookTarget.set(x + 1, .8 + pathHeight(x), pathZ(x));
    if (walking && (shopping || Math.abs(x - stationX) < 3.2)) {
        camTarget.set(stationX + 2.6, 2.5, stationZ + (innerWidth < 650 ? 6.5 : 5));
        lookTarget.set(stationX, 1.5, stationZ + .6);
    }
    if (encounterActive) {
        camTarget.set(x + 5, 5.5, pathZ(x) + 9);
        lookTarget.set(-2.9, .65, pathZ(-2.5) + 1);
    }
    if (!shop.open && !notebook.open && !ending.open) {
        const zoomInput = Number(pressed.has('arrowdown') || held.has('out')) - Number(pressed.has('arrowup') || held.has('in'));
        zoomDistance = THREE.MathUtils.clamp(zoomDistance + zoomInput * dt * .45, .6, 1.6);
    }
    camTarget.sub(lookTarget).multiplyScalar(zoomDistance).add(lookTarget);
    const firstPersonActive = walking && Math.abs(x - stationX) >= 3.2 && firstPerson && !shopping && !state.finished && !encounterActive && chapterId !== 'camp';
    if (walking && !firstPersonActive && !shopping && !state.finished && !encounterActive && chapterId !== 'camp' && Math.abs(x - stationX) >= 3.2) {
        camTarget.sub(lookTarget);
        const orbit = new THREE.Spherical().setFromVector3(camTarget);
        orbit.theta += viewYaw;
        orbit.phi = THREE.MathUtils.clamp(orbit.phi - viewPitch, .2, Math.PI / 2 - .05);
        camTarget.setFromSpherical(orbit).add(lookTarget);
    }
    if (firstPersonActive) {
        const bob = moving ? Math.sin(gait * 2) * .035 : 0;
        camTarget.set(x - .35, 1.7 + pathHeight(x) + bob, pathZ(x) - .7);
        lookTarget.set(x + 5 * Math.cos(viewYaw), 1.65 + pathHeight(x) + viewPitch * 4, pathZ(x) + 5 * Math.sin(viewYaw));
    }
    if (!walking) {
        const cx = scenery.car.position.x;
        family.position.set(journey.phase === 'home' ? -35 : journey.phase === 'boarding' ? -35 + Math.min(1, journey.time / 2) * 3 : -10, 0, journey.phase === 'home' ? 4.2 - Math.min(1, journey.time / 2) * 1.2 : 0);
        if (journey.phase === 'boarding') characters.update({
            dt,
            time: elapsed,
            gait: elapsed * 6,
            moving: true,
            facing: Math.PI / 2
        });
        camTarget.set(cx - 6, 3.2, -7);
        lookTarget.set(cx, 1, 0);
        if (journey.phase === 'driving' || journey.phase === 'entrance') {
            camTarget.set(cx - 5, 3.2, scenery.car.position.z - 5);
            lookTarget.set(cx + 3, 1, scenery.car.position.z);
        }
    }
    family.visible = journey.phase !== 'driving' && !(journey.phase === 'boarding' && journey.time > 1.8) && !firstPersonActive;
    if (chapterId === 'camp' && walking) {
        camTarget.set(1, 2.4, -1);
        lookTarget.set(4, 1, 4.4);
        family.visible = true;
    }
    if (state.finished) {
        camTarget.set(25.5, 5.1, picnic.position.z + 6);
        lookTarget.copy(picnic.position).add(new THREE.Vector3(0, .6, 0));
    }
    if (['approaching', 'ready', 'approved'].includes(payment.phase)) {
        const reader = new THREE.Vector3(.67, 1.7, .68);
        machine.localToWorld(reader);
        lookTarget.copy(reader);
        camTarget.copy(reader).add(new THREE.Vector3(.8, .35, 1.8));
    }
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 2.8));
    look.lerp(lookTarget, 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
    document.body.classList.toggle('cinematic', shopping || encounterActive);
    const near = Math.abs(x - stationX) < 2.5;
    // Project the prompt from the reader into screen space; it follows the machine.
    camera.updateMatrixWorld();
    machine.updateMatrixWorld(true);
    const promptPoint = machine.localToWorld(new THREE.Vector3(.55, 2.15, .9)).project(camera);
    const promptVisible = walking && near && !shop.open && !notebook.open && !ending.open && !state.busy && !state.finished && promptPoint.z > -1 && promptPoint.z < 1;
    $('#interact').hidden = !promptVisible;
    if (promptVisible) {
        $('#interact').style.left = `${THREE.MathUtils.clamp((promptPoint.x * .5 + .5) * innerWidth, 85, innerWidth - 85)}px`;
        $('#interact').style.top = `${THREE.MathUtils.clamp((-.5 * promptPoint.y + .5) * innerHeight, 85, innerHeight - 100)}px`;
    }
    $('#machine-note').hidden = !promptVisible;
    document.body.classList.toggle('near-machine', promptVisible);
    celebrate.hidden = !state.finished;
    $('#progress').style.width = `${Math.min(100, (state.basket.some(p => p.type === 'drink') ? 30 : 0) + (state.basket.some(p => p.type === 'snack') ? 30 : 0) + (state.finished ? 40 : Math.max(0, (x - 11) / 11) * 35))}%`;
    syncHUD();
    $('#speech').hidden = !walking || Boolean(chapterId) || shop.open || notebook.open || ending.open;
    $('#speech').textContent = state.finished ? (state.recycled ? 'بچه: جنگل رو تمیز گذاشتیم؛ چه روز خوبی!' : 'بچه: رسیدیم نوک قله؛ روی فرش کنار هم نشستیم.')
        : payment.phase !== 'idle' ? $('#payment-result').textContent
            : deliveryTime > 0 ? 'پدر: محصول در حال تحویل است؛ کمی صبر کن.'
                : near ? (readyForPicnic(state) ? 'پدر: خرید کامل شد؛ حالا به سمت قله برویم.' : 'پدر: این هم دستگاه؛ با E نوشیدنی و خوراکی انتخاب کن.')
                    : x > 20 && !readyForPicnic(state) ? 'پدر: هنوز نوشیدنی و خوراکی نداریم؛ به دستگاه برگردیم.'
                        : x > 16 ? 'پدر: مسیر قله را ادامه بده؛ فرش بالای کوه آماده است.'
                            : x > 11 ? 'بچه: از مسیر جنگل به سمت بالای کوه می‌ریم.'
                                : x > 2.7 && story.done.includes('camp') ? 'بچه: دوستان گفتند دستگاه کمی جلوتره؛ بریم خرید کنیم.'
                                    : x > -2.2 ? 'پدر: از روی پل عبور کنیم و مسیر جنگل را ادامه بدهیم.'
                                        : 'بچه: از ورودی جنگل به سمت مسیر پیاده‌روی بریم.';
    if (!shop.open && !notebook.open && !ending.open && x > 21 && storyReady(story) && readyForPicnic(state) && !state.busy && !state.finished) finish();
    if (payment.phase !== 'idle') {
        paymentTime += dt;
        if (payment.phase === 'approaching' && paymentTime > 1.2) {
            payment.phase = 'ready';
            $('#swipe-card').disabled = false;
            $('#cancel-payment').hidden = false;
            $('#payment-result').textContent = 'دکمهٔ «کشیدن کارت» یا کلید C را بزن.';
        }
        if (payment.phase === 'approved') {
            bankCard.position.set(.92 - Math.min(paymentTime, 1) * .35, 1.86 - Math.min(paymentTime, 1) * .32, .78);
            if (paymentTime > 1.35) {
                const product = payment.product;
                payment = createPayment();
                $('#payment-panel').hidden = true;
                bankCard.visible = false;
                deliver(product);
            }
        }
    }
    if (deliveryTime > 0) {
        deliveryTime = Math.max(0, deliveryTime - dt);
        const t = 3.4 - deliveryTime;
        const slotIndex = (activeProduct?.channel ?? 22) - 1;
        const start = new THREE.Vector3(-.65 + (slotIndex % 10) * .115, .965 + (5 - Math.floor(slotIndex / 10)) * .275, .76);
        machine.localToWorld(start);
        const slot = new THREE.Vector3(-.13, .35, .86);
        machine.localToWorld(slot);
        const hand = new THREE.Vector3(.5, .65, -.15);
        family.localToWorld(hand);
        if (t < 1.1) delivery.position.lerpVectors(start, slot, t / 1.1);
        else if (t < 1.8) {
            delivery.position.copy(slot);
        } else delivery.position.lerpVectors(slot, hand, Math.min(1, (t - 1.8) / 1.3));
        flap.rotation.x = t > 1 && t < 2.6 ? -1 : 0;
        if (!deliveryTime) {
            state.busy = false;
            delivery.visible = false;
            flap.rotation.x = 0;
            tone(980, .18);
            syncHUD();
        }
    }
    lostPaper.visible = !story.done.includes('paper');
    lostPaper.rotation.y = Math.sin(elapsed) * .15;
    fishes.forEach((fish, i) => fish.position.z = Math.sin(elapsed * .8 + i) * .8);
    trees.forEach((tree, i) => {
        tree.rotation.z = Math.sin(elapsed * .65 + i) * .012;
    });
    butterfly.position.set(x + 1.6 + Math.sin(elapsed) * .5, 2 + Math.sin(elapsed * 1.4) * .4, pathZ(x) + 1.8);
    wings.forEach((wing, i) => wing.rotation.z = Math.sin(elapsed * 15) * (i ? 1 : -1) * .7);
    if (soundEnabled && elapsed > nextBird) {
        tone(1500 + Math.random() * 900, .2, .018);
        nextBird = elapsed + 3 + Math.random() * 4;
    }
    renderer.render(scene, camera);
}

$('#loading').remove();
syncHUD();
requestAnimationFrame(frame);
