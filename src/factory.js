import * as THREE from 'three';
import {createVendingMachine} from './vending.js';
import {createCarModel} from './traffic.js';
import {createPickup, createTruck} from './car-models.js';
import {createPerson, createCrew, nameTag} from './staff.js';
import {FACTORY} from './locations.js';
import {textTexture} from './textures.js';

function stripes(c, w, h, base, line, every) {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.fillStyle = line;
    for (let x = 0; x < w; x += every) c.fillRect(x, 0, every * .35, h);
}

// Persian sign: white text on the company's dark teal.
const sign = (text, sub = '') => textTexture(512, 160, (c, w, h) => {
    c.fillStyle = '#0d2f2c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#3ee0c9';
    c.fillRect(0, h - 12, w, 12);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#ffffff';
    c.font = `bold ${sub ? 58 : 66}px Vazirmatn, Tahoma, sans-serif`;
    c.fillText(text, w / 2, sub ? 72 : 100);
    if (sub) {
        c.fillStyle = '#9fe9da';
        c.font = '36px Vazirmatn, Tahoma, sans-serif';
        c.fillText(sub, w / 2, 128);
    }
});

// Monitor contents: a few lines of code (or rows) on a dark editor background.
const screen = (lines, background = '#14181f') => textTexture(512, 300, (c, w, h) => {
    c.fillStyle = background;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#232a35';
    c.fillRect(0, 0, w, 26);
    c.font = '21px monospace';
    lines.forEach(([text, color], i) => {
        c.fillStyle = color;
        c.fillText(text, 16, 58 + i * 29);
    });
});
const CODE = {
    react: screen([['export function Shelf({items}) {', '#c792ea'], ['  const [slot, setSlot] = useState();', '#82aaff'], ['  return (', '#eeffff'], ['    <Grid cols={4}>', '#f07178'], ['      {items.map(i => <Item {...i} />)}', '#c3e88d'], ['    </Grid>', '#f07178'], ['  );', '#eeffff'], ['}', '#c792ea']]),
    go: screen([['func (s *Server) Pay(w http.Res', '#82aaff'], ['  tx, err := s.bank.Charge(ctx, req)', '#eeffff'], ['  if err != nil {', '#c792ea'], ['    http.Error(w, err.Error(), 402)', '#f07178'], ['    return', '#c792ea'], ['  }', '#c792ea'], ['  s.events <- Sale{tx.ID, req.Slot}', '#c3e88d'], ['}', '#82aaff']]),
    cpp: screen([['void Motor::dispense(int slot) {', '#82aaff'], ['  auto& coil = coils_[slot];', '#eeffff'], ['  coil.rotate(360_deg);', '#c3e88d'], ['  while (!sensor_.dropped())', '#c792ea'], ['    std::this_thread::yield();', '#eeffff'], ['  fridge_.hold(4.0_C);', '#f78c6c'], ['  log("slot", slot, "ok");', '#c3e88d'], ['}', '#82aaff']]),
    terminal: screen([['$ go test ./...', '#c3e88d'], ['ok   payments   0.42s', '#eeffff'], ['$ cmake --build build', '#c3e88d'], ['[100%] Built target firmware', '#eeffff'], ['$ npm run build', '#c3e88d'], ['✓ built in 2.1s', '#eeffff'], ['$ git push origin main', '#c3e88d'], ['', '#fff']], '#0c0f12'),
    sheet: screen([['فاکتور   دستگاه        مبلغ', '#1d3b2f'], ['۱۰۴۲    بوستان ملت     ۴۸۰', '#333'], ['۱۰۴۳    دانشگاه فردوسی  ۳۲۰', '#333'], ['۱۰۴۴    مترو آزادی     ۲۹۰', '#333'], ['۱۰۴۵    مشهد مال       ۶۱۰', '#333'], ['۱۰۴۶    مدرسه راحیل    ۱۸۰', '#333'], ['جمع                 ۱۸۸۰', '#0b8f88']], '#f4f7f2'),
    dashboard: screen([['فروش امروز: ۱۲۸ دستگاه', '#3ee0c9'], ['تولید هفته: ۴۶ دستگاه', '#f2c94c'], ['ارسال شده: ۳۸', '#eeffff'], ['', '#fff'], ['▇▇▇▇▇▇▇▇▇▇▇ خم', '#82aaff'], ['▇▇▇▇▇▇▇▇▇ برش', '#82aaff'], ['▇▇▇▇▇▇▇ رنگ', '#82aaff']], '#101820')
};

/**
 * The Robot Market factory compound: production hall with five work areas and forty workers, an
 * office building (engineering, accounting and the manager's room), a loading truck, the manager's
 * arrival in his pickup, fenced yard and gate. Layout uses a local frame: u runs along the driveway
 * towards the gate, v across it. Returns world-space collision footprints, key positions and the
 * people the family can talk to.
 */
export function createFactory(scene) {
    const {center, axis} = FACTORY, normal = {x: -axis.z, z: axis.x};
    const rot = Math.atan2(-axis.z, axis.x);
    const toWorld = (u, v) => ({x: center.x + axis.x * u + normal.x * v, z: center.z + axis.z * u + normal.z * v});
    // A heading in the local frame (u, v direction) as a world-space car heading.
    const worldHeading = (du, dv) => {
        const x = axis.x * du + normal.x * dv, z = axis.z * du + normal.z * dv;
        return Math.atan2(-z, x);
    };
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    group.rotation.y = rot;
    scene.add(group);
    const footprints = [];
    const solid = (u0, u1, v0, v1) => footprints.push([[u0, v0], [u1, v0], [u1, v1], [u0, v1]].flatMap(([u, v]) => Object.values(toWorld(u, v))));
    // Axis-aligned box in the local frame; solid ones also block movement.
    const box = (a0, a1, b0, b1, y0, y1, material, isSolid = true, parent = group) => {
        const u0 = Math.min(a0, a1), u1 = Math.max(a0, a1), v0 = Math.min(b0, b1), v1 = Math.max(b0, b1);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), material);
        mesh.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        if (isSolid) solid(u0, u1, v0, v1);
        return mesh;
    };
    const cylinder = (r, h, material, u, y, v, parent = group) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material);
        mesh.position.set(u, y, v);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
    };
    // A sign plane; `facing` is the local direction its front faces: 1 = +v, -1 = −v.
    const panel = (texture, w, h, u, y, v, facing = 1) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide}));
        mesh.position.set(u, y, v);
        if (facing < 0) mesh.rotation.y = Math.PI;
        group.add(mesh);
        return mesh;
    };
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .7, ...extra});
    const floorMat = (color, extra = {}) => mat(color, {polygonOffset: true, polygonOffsetFactor: -16, polygonOffsetUnits: -32, ...extra});
    const flat = (u0, u1, v0, v1, y, material) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, v1 - v0), material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((u0 + u1) / 2, y, (v0 + v1) / 2);
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const steel = mat('#59646b', {metalness: .5}), teal = mat('#0b8f88', {metalness: .3, roughness: .4});
    const yellow = mat('#f2c94c', {roughness: .5}), darkSteel = mat('#3d4549', {metalness: .5}), silver = mat('#c4ccd0', {metalness: .8, roughness: .3});
    const lamp = new THREE.MeshBasicMaterial({color: '#fffbe8'});
    const animated = [];

    // ---------- Yard, fence, gate ----------
    flat(-110, 80, -50, 50, .08, floorMat('#8f8c86', {roughness: .95, polygonOffsetFactor: -14, polygonOffsetUnits: -28}));
    const fence = mat('#d9d3c4');
    box(-110, 80, -50.3, -49.7, 0, 2.4, fence);
    box(-110, 80, 49.7, 50.3, 0, 2.4, fence);
    box(-110.3, -109.7, -50, 50, 0, 2.4, fence);
    box(79.7, 80.3, -50, -9, 0, 2.4, fence);
    box(79.7, 80.3, 9, 50, 0, 2.4, fence);
    for (const v of [-9.5, 9.5]) box(79, 81, v - 1, v + 1, 0, 4.2, teal);
    // Painted parking bays in front of the office.
    const paint = floorMat('#f1efe6', {roughness: .9, polygonOffsetFactor: -18, polygonOffsetUnits: -36});
    for (let u = 38; u <= 70; u += 4) flat(u - .06, u + .06, -21.5, -16.5, .09, paint);

    const nameSign = textTexture(1024, 320, (c, w, h) => {
        c.fillStyle = '#0d2f2c';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#3ee0c9';
        c.fillRect(0, h - 18, w, 18);
        c.textAlign = 'center';
        c.direction = 'rtl';
        c.fillStyle = '#ffffff';
        c.font = 'bold 66px Vazirmatn, Tahoma, sans-serif';
        c.fillText(FACTORY.name, w / 2, 120);
        c.fillStyle = '#9fe9da';
        c.font = '44px Vazirmatn, Tahoma, sans-serif';
        c.fillText(FACTORY.tagline, w / 2, 210);
        c.font = 'bold 34px sans-serif';
        c.fillStyle = '#f2c94c';
        c.fillText('ROBOT MARKET · VENDING MACHINES', w / 2, 270);
    });
    const signMaterial = new THREE.MeshBasicMaterial({map: nameSign, side: THREE.DoubleSide});
    // Two faces, so the name also reads correctly from inside the yard.
    const frontSign = new THREE.MeshBasicMaterial({map: nameSign});
    for (const side of [1, -1]) {
        const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.4), frontSign);
        gateSign.position.set(82 + side * .02, 6.6, -20);
        gateSign.rotation.y = side * Math.PI / 2;
        group.add(gateSign);
    }
    for (const v of [-25.5, -14.5]) box(81.6, 82.4, v - .3, v + .3, 0, 8.8, steel, false);

    // ---------- Production hall ----------
    // Corrugated walls, a wide door onto the yard (v = V0) and a loading dock door at the east end.
    const corrugated = textTexture(256, 64, (c, w, h) => stripes(c, w, h, '#c9d3d6', '#b2bec2', 16));
    corrugated.wrapS = corrugated.wrapT = THREE.RepeatWrapping;
    corrugated.repeat.set(18, 2);
    const wall = mat('#ffffff', {map: corrugated, metalness: .35, roughness: .55});
    const H = 10, U0 = -104, U1 = 0, V0 = 10, V1 = 42, D0 = -36, D1 = -20, DOCK0 = 27, DOCK1 = 35;
    box(U0, U1, V1, V1 + .4, 0, H, wall);
    box(U0 - .4, U0, V0, V1 + .4, 0, H, wall);
    box(U1, U1 + .4, V0 - .4, DOCK0, 0, H, wall);
    box(U1, U1 + .4, DOCK1, V1 + .4, 0, H, wall);
    box(U1, U1 + .4, DOCK0, DOCK1, 5, H, wall, false);
    box(U0 - .4, D0, V0 - .4, V0, 0, H, wall);
    box(D1, U1 + .4, V0 - .4, V0, 0, H, wall);
    box(D0, D1, V0 - .4, V0, 7, H, wall, false);
    box(U0 - .4, U1 + .4, V0 - .5, V0 - .3, H - 1.6, H - .6, teal, false);
    const roof = box(U0 - 1, U1 + 1, V0 - 1, V1 + 1, H, H + .4, mat('#9aa6aa', {metalness: .4}), false);
    // The roof stays out of the shadow map, so daylight still reaches the hall floor.
    roof.castShadow = false;
    flat(U0, U1, V0, V1, .1, floorMat('#b9c4bd', {roughness: .35}));
    // Safety walkway along the door side.
    flat(U0 + 1, U1 - 1, 18.6, 19, .11, floorMat('#f2c94c', {polygonOffsetFactor: -18, polygonOffsetUnits: -36}));
    for (let u = U0 + 8; u < U1; u += 12) for (const v of [18, 32]) box(u - 3, u + 3, v - 1, v + 1, H - .3, H - .1, lamp, false).castShadow = false;
    panel(nameSign, 16, 5, (D0 + D1) / 2, H + 3, V0 - .6, -1);
    for (const u of [(D0 + D1) / 2 - 7.5, (D0 + D1) / 2 + 7.5]) box(u - .2, u + .2, V0 - .7, V0 - .5, H, H + 5.5, steel, false);
    // Work-area signs hang above the walkway, readable from the door.
    const zone = (text, sub, u) => {
        panel(sign(text, sub), 5.4, 1.7, u, 6.6, 21, -1);
        for (const du of [-2.2, 2.2]) box(u + du - .03, u + du + .03, 20.97, 21.03, 7.45, H, steel, false);
    };
    zone('خم‌کاری', 'ورق‌کاری بدنهٔ دستگاه', -93);
    zone('برش لیزر', 'برش ورق و قطعات', -71);
    zone('رنگ‌کاری', 'کابین رنگ پودری', -52);
    zone('یخچال‌سازی', 'کمپرسور و عایق‌کاری', -31);
    zone('مونتاژ', 'خط مونتاژ نهایی', -13);
    zone('بسته‌بندی', 'ارسال به شهر', -3);

    // Bending: two press brakes with a moving ram, sheet stacks behind.
    const sheet = mat('#d4dadd', {metalness: .85, roughness: .25});
    for (const u of [-98, -88]) {
        box(u - 1.8, u + 1.8, 29.4, 30.6, 0, 1.0, mat('#4a6b80', {metalness: .4}));
        for (const du of [-1.8, 1.5]) box(u + du, u + du + .3, 29.2, 30.8, 0, 2.9, mat('#4a6b80', {metalness: .4}), false);
        const ram = box(u - 1.5, u + 1.5, 29.6, 30.4, 1.9, 2.5, yellow, false);
        animated.push(t => ram.position.y = 2.2 + Math.max(0, Math.sin(t * 1.4 + u)) * -.6);
        box(u - 1.4, u + 1.4, 30.6, 31.4, 1.0, 1.03, sheet, false);
    }
    for (const u of [-101, -95, -90, -85]) {
        box(u - 1, u + 1, 38.4, 39.6, 0, .15, mat('#8a6a45'));
        for (let i = 0; i < 6; i++) box(u - .95, u + .95, 38.45, 39.55, .15 + i * .05, .19 + i * .05, sheet, false);
    }

    // Laser cutting: a bed with a moving gantry and glowing cutting head, plus a shear.
    box(-78, -66, 26, 32, 0, .9, darkSteel);
    const slats = textTexture(256, 128, (c, w, h) => stripes(c, w, h, '#2b3135', '#6d767c', 12));
    flat(-77.8, -66.2, 26.2, 31.8, .91, new THREE.MeshStandardMaterial({map: slats, metalness: .6, roughness: .4}));
    const gantry = new THREE.Group();
    group.add(gantry);
    box(-.3, .3, 25.4, 32.6, 1.6, 1.9, yellow, false, gantry);
    for (const v of [25.5, 32.5]) box(-.25, .25, v - .2, v + .2, .9, 1.9, yellow, false, gantry);
    const head = box(-.2, .2, -.2, .2, 1.1, 1.6, darkSteel, false, gantry);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({color: '#ff5a3c'}));
    gantry.add(spark);
    animated.push(t => {
        gantry.position.x = -72 + Math.sin(t * .45) * 5;
        head.position.z = spark.position.z = 29 + Math.sin(t * 1.3) * 2.5;
        spark.position.y = .95;
        spark.scale.setScalar(.7 + Math.random() * .6);
    });
    box(-65, -64, 33.2, 33.8, 0, 1.4, mat('#2e3a40'));
    box(-73.5, -70.5, 37.9, 39.1, 0, 1.6, mat('#4a6b80', {metalness: .4}));

    // Powder painting booth: see-through panels, an overhead rail carrying panels through it.
    const glass = mat('#9fd3e6', {transparent: true, opacity: .28, depthWrite: false, roughness: .1});
    box(-58, -46, 36.8, 37, 0, 4.2, glass);
    box(-58, -57.8, 25, 37, 0, 4.2, glass);
    box(-46.2, -46, 25, 37, 0, 4.2, glass);
    box(-58, -46, 25, 37, 4.2, 4.3, glass, false);
    flat(-57.8, -46.2, 25.2, 36.8, .12, floorMat('#5d7f86', {polygonOffsetFactor: -18, polygonOffsetUnits: -36}));
    box(-61, -43, 30.9, 31.1, 3.7, 3.8, steel, false);
    const hung = [];
    for (let i = 0; i < 5; i++) {
        const piece = box(-.6, .6, 30.97, 31.03, 1.4, 3.2, i % 2 ? teal : mat('#eef4f2'), false);
        hung.push(piece);
    }
    animated.push(t => hung.forEach((piece, i) => piece.position.x = -60 + ((t * .5 + i * 3.4) % 17)));

    // Refrigeration: work tables with insulated cabinets, compressors and copper coils.
    const copper = mat('#c27a45', {metalness: .9, roughness: .3}), insulated = mat('#f2f4f3', {roughness: .5});
    for (const u of [-37, -31, -25]) {
        box(u - 2, u + 2, 29.2, 30.8, 0, .9, steel);
        box(u - 1.6, u - .2, 29.4, 30.6, .9, 2.2, insulated, false);
        cylinder(.28, .55, mat('#16191c', {metalness: .5}), u + .7, 1.18, 30);
        const coil = new THREE.Mesh(new THREE.TorusGeometry(.35, .04, 6, 20), copper);
        coil.position.set(u + 1.4, 1.3, 30);
        coil.rotation.y = Math.PI / 2;
        group.add(coil);
    }
    for (let i = 0; i < 4; i++) box(-35 + i * 2.1, -33.2 + i * 2.1, 38.6, 40.4, 0, 1.9, insulated);

    // Assembly: conveyor carrying machine frames between robot arms, finished machines at the end.
    box(-20, -6, 32.4, 34.6, 0, .9, darkSteel);
    const rollers = mat('#9aa4a8', {metalness: .8, roughness: .3});
    for (let u = -19.4; u < -6; u += 1.2) {
        const roller = cylinder(.12, 2.2, rollers, u, .95, 33.5);
        roller.rotation.x = Math.PI / 2;
    }
    const frames = [], frameMaterial = mat('#0b8f88', {wireframe: true});
    for (let i = 0; i < 4; i++) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.8), i % 2 ? frameMaterial : teal);
        frame.position.set(-19 + i * 3.5, 2.2, 33.5);
        frame.castShadow = true;
        group.add(frame);
        frames.push(frame);
    }
    const arms = [];
    for (const u of [-16, -10]) {
        box(u - .6, u + .6, 36, 37.2, 0, 1.2, yellow);
        const arm = new THREE.Group();
        arm.position.set(u, 1.2, 36.6);
        group.add(arm);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.2, .35), yellow);
        upper.position.y = 1.1;
        upper.castShadow = true;
        const fore = new THREE.Mesh(new THREE.BoxGeometry(.28, .28, 2.4), mat('#e0b23a'));
        fore.position.set(0, 2.1, -1.1);
        fore.castShadow = true;
        arm.add(upper, fore);
        arms.push(arm);
    }
    animated.push(t => {
        arms.forEach((arm, i) => arm.rotation.y = Math.sin(t * .8 + i * 2) * .9);
        frames.forEach((frame, i) => frame.position.x = -19.5 + ((t * .6 + i * 3.5) % 14));
    });
    for (let i = 0; i < 4; i++) {
        const finished = createVendingMachine({name: 'آمادهٔ نصب', products: ['water', 'juice', 'biscuit', 'chocolate']});
        finished.beacon.visible = finished.ring.visible = false;
        const u = -19.2 + i * 4.2;
        finished.group.position.set(u, 0, 40.6);
        finished.group.rotation.y = Math.PI;
        group.add(finished.group);
        solid(u - 1, u + 1, 40, 41.2);
    }

    // Packing: wrapped machines and a roller conveyor out through the dock door to the truck.
    const carton = textTexture(256, 512, (c, w, h) => {
        c.fillStyle = '#c49a64';
        c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,255,255,.18)';
        for (let y = 0; y < h; y += 40) c.fillRect(0, y, w, 14);
        c.fillStyle = '#0b8f88';
        c.fillRect(0, h * .42, w, 34);
        c.fillStyle = '#1d2a2a';
        c.textAlign = 'center';
        c.font = 'bold 34px sans-serif';
        c.fillText('ROBOT', w / 2, h * .3);
        c.fillText('MARKET', w / 2, h * .3 + 40);
        c.font = '60px sans-serif';
        c.fillText('⇧', w / 2, h * .75);
    });
    const cartonMat = mat('#ffffff', {map: carton, roughness: .85});
    const cartonGeometry = new THREE.BoxGeometry(.95, 1.9, 1.05);
    const packaged = () => {
        const mesh = new THREE.Mesh(cartonGeometry, cartonMat);
        mesh.castShadow = mesh.receiveShadow = true;
        return mesh;
    };
    for (const v of [37, 38.4, 39.8]) {
        const p = packaged();
        p.position.set(-3.2, .95, v);
        group.add(p);
        solid(-3.7, -2.7, v - .55, v + .55);
    }
    box(-6, 1.6, 30.4, 31.6, 0, 1.0, darkSteel);
    for (let u = -5.6; u < 1.6; u += .8) cylinder(.08, 1.1, rollers, u, 1.04, 31).rotation.x = Math.PI / 2;

    // ---------- Production crew: 40 workers ----------
    const overall = '#2f4e7a', vest = '#e8742c', paintSuit = '#eef1f2';
    const W = (x, z, facing, kind = 'work', extra = {}) => ({x, z, facing, kind, suit: overall, ...extra});
    const walk = (x, z, tx, tz, extra = {}) => W(x, z, 0, 'walk', {to: {x: tx, z: tz}, ...extra});
    const carry = (x, z, tx, tz, extra = {}) => W(x, z, 0, 'carry', {to: {x: tx, z: tz}, ...extra});
    const crew = [
        // Bending: two at each press, four carrying sheets.
        W(-98.8, 32.3, Math.PI), W(-97.2, 32.3, Math.PI), W(-88.8, 32.3, Math.PI), W(-87.2, 32.3, Math.PI, 'work', {suit: vest}),
        carry(-101, 37.3, -99.5, 33.6), carry(-95, 37.3, -96.2, 33.6, {suit: vest}), carry(-90, 37.3, -90.5, 33.6), carry(-85, 37.3, -86.2, 33.6),
        // Laser cutting: operators at the bed and control panel, two at the shear, three moving parts.
        W(-64.5, 34.6, Math.PI), W(-68, 33.4, Math.PI), W(-75, 33.4, Math.PI, 'work', {suit: vest}),
        W(-73, 37.1, 0), W(-71, 37.1, 0),
        walk(-79, 35.3, -62, 35.3), carry(-68, 40.4, -62, 40.4), walk(-80, 37, -76, 40.4, {suit: vest}),
        // Painting: four spraying inside the booth in white suits, three outside.
        W(-55, 29.4, 0, 'work', {suit: paintSuit, hat: '#ffffff'}), W(-51.5, 29.4, 0, 'work', {suit: paintSuit, hat: '#ffffff'}),
        W(-53, 32.6, Math.PI, 'work', {suit: paintSuit, hat: '#ffffff'}), W(-49, 32.6, Math.PI, 'work', {suit: paintSuit, hat: '#ffffff'}),
        walk(-60, 23, -44, 23), carry(-59, 39.4, -45, 39.4), walk(-44.5, 26, -44.5, 37, {suit: vest}),
        // Refrigeration: two at each table, three moving cabinets and coils.
        W(-38, 28.4, 0), W(-36, 28.4, 0), W(-32, 28.4, 0, 'work', {suit: vest}), W(-30, 28.4, 0), W(-26, 28.4, 0), W(-24, 28.4, 0),
        walk(-39, 34.4, -22, 34.4), carry(-24, 37, -38, 37), walk(-31, 32.4, -31, 36),
        // Assembly and packing.
        W(-18, 31, 0), W(-14.4, 31, 0), W(-11, 31, 0, 'work', {suit: vest}), W(-7.6, 31, 0),
        W(-17.1, 38.4, 0), W(-12.9, 38.4, 0),
        carry(-20, 24, -4, 24), carry(-3, 22.5, -3, 29)
    ];
    const workers = createCrew(group, crew);
    for (const w of crew) if (w.kind === 'work') solid(w.x - .3, w.x + .3, w.z - .3, w.z + .3);

    // ---------- Office building: engineering, accounting, management ----------
    // One storey, rooms side by side with their own doors onto the yard (front at v = -24).
    const windows = textTexture(128, 128, (c, w, h) => {
        c.fillStyle = '#e9e4d8';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#4c6672';
        c.fillRect(14, 26, 100, 64);
        c.fillStyle = 'rgba(255,255,255,.25)';
        c.fillRect(18, 30, 28, 56);
    });
    windows.wrapS = windows.wrapT = THREE.RepeatWrapping;
    const facade = mat('#ffffff', {map: windows}), plaster = mat('#ece8df', {roughness: .9});
    const OH = 3.8, O0 = 6, O1 = 50, F = -24, B = -46;
    const doors = [[14, 17], [31, 34], [43.5, 46.5]];
    let from = O0;
    for (const [d0, d1] of doors) {
        box(from, d0, F - .3, F, 0, OH, plaster);
        box(d0, d1, F - .3, F, 2.7, OH, plaster, false);
        from = d1;
    }
    box(from, O1, F - .3, F, 0, OH, plaster);
    box(O0, O1, B - .3, B, 0, OH, plaster);
    box(O0 - .3, O0, B - .3, F, 0, OH, plaster);
    box(O1, O1 + .3, B - .3, F, 0, OH, plaster);
    box(25.85, 26.15, B, F - .3, 0, OH, plaster);
    box(39.85, 40.15, B, F - .3, 0, OH, plaster);
    const officeRoof = box(O0 - .5, O1 + .5, B - .8, F + .5, OH, OH + .25, mat('#bdb5a5'), false);
    officeRoof.castShadow = false;
    box(O0 - .5, O1 + .5, F + .4, F + .5, OH - .5, OH, teal, false);
    // Windows on the front wall between the doors, and on the end walls.
    for (const [u0, u1] of [[7, 13.2], [18, 30.2], [35, 42.6], [47.4, 49.4]]) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, 1.4), facade);
        pane.position.set((u0 + u1) / 2, 1.9, F + .02);
        facade.map.repeat.set(1, 1);
        group.add(pane);
    }
    panel(nameSign, 22, 3.4, 28, OH + 2, F + .1);
    for (const u of [18, 38]) box(u - .15, u + .15, F - .1, F + .05, OH, OH + 3.7, steel, false);
    flat(O0, 26, B, F, .1, floorMat('#a9b4bb'));
    flat(26, 40, B, F, .1, floorMat('#c8bba4'));
    flat(40, O1, B, F, .1, floorMat('#7b5a44', {roughness: .5}));
    for (const [u0, u1] of [[8, 24], [28, 38], [42, 48]]) box(u0, u1, -36, -34, OH - .08, OH - .02, lamp, false).castShadow = false;
    panel(sign('دفتر فنی مهندسی', 'Engineering'), 3.6, 1.1, 15.5, 3.25, F + .05);
    panel(sign('واحد حسابداری', 'Accounting'), 3.6, 1.1, 32.5, 3.25, F + .05);
    panel(sign('مدیریت', 'آقای محمدی'), 3.6, 1.1, 45, 3.25, F + .05);

    const wood = mat('#c8a477', {roughness: .6}), black = mat('#1b1d20', {roughness: .5}), fabric = mat('#2c3238');
    // Desk facing `facing` (the side the person sits on) with one or two monitors.
    function desk(u, v, sitSide, screens, width = 1.8) {
        box(u - width / 2, u + width / 2, v - .45, v + .45, .72, .77, wood);
        for (const du of [-1, 1]) box(u + du * (width / 2 - .05) - .03, u + du * (width / 2 - .05) + .03, v - .4, v + .4, 0, .72, black, false);
        screens.forEach((texture, i) => {
            const du = screens.length > 1 ? (i - .5) * .78 : 0;
            const mats = [black, black, black, black, black, black];
            mats[sitSide > 0 ? 4 : 5] = new THREE.MeshBasicMaterial({map: texture});
            const monitor = new THREE.Mesh(new THREE.BoxGeometry(.72, .44, .04), mats);
            monitor.position.set(u + du, 1.12, v - sitSide * .2);
            monitor.rotation.y = (i - .5) * -.25 * sitSide * (screens.length > 1 ? 1 : 0);
            group.add(monitor);
            box(u + du - .03, u + du + .03, v - sitSide * .22 - .03, v - sitSide * .22 + .03, .77, .9, black, false);
        });
        box(u - .25, u + .25, v + sitSide * .12, v + sitSide * .28, .77, .79, mat('#30353b'), false);
    }
    // Office chair behind a seated person; the back is on the far side from the desk.
    function chair(u, v, sitSide) {
        box(u - .26, u + .26, v - .26, v + .26, .4, .47, fabric, false);
        box(u - .25, u + .25, v + sitSide * .26, v + sitSide * .32, .47, 1.1, fabric, false);
        cylinder(.035, .4, black, u, .2, v);
        box(u - .3, u + .3, v - .03, v + .03, .02, .06, black, false);
        box(u - .03, u + .03, v - .3, v + .3, .02, .06, black, false);
        solid(u - .35, u + .35, v - .35, v + .35);
    }
    const people = [], talks = [];
    // A seated person at a desk; `sitSide` is +1 when they sit on the +v side facing −v.
    function seat(person, u, v, sitSide, tag) {
        person.root.position.set(u, 0, v);
        person.root.rotation.y = sitSide > 0 ? Math.PI : 0;
        group.add(person.root);
        if (tag) {
            tag.position.set(0, 1.78, 0);
            person.root.add(tag);
        }
        chair(u, v, sitSide);
        return person;
    }

    // Engineering: five developers, a whiteboard, and the office's vending machine by the door.
    const developers = [
        {name: 'حامد', role: 'React', u: 11, v: -31.6, look: {outfit: 'hoodie', top: '#151517', bottom: '#2d3d57'}, code: CODE.react, speaker: 'hamed',
            lines: ['سلام! من حامدم. رابط کاربری صفحهٔ لمسی دستگاه‌ها رو با React می‌سازم.', 'هر چی روی صفحهٔ دستگاه می‌بینین، از همین مانیتور اومده!']},
        {name: 'رایان', role: 'Go', u: 16, v: -31.6, look: {outfit: 'hoodie', top: '#2f6fd6', bottom: '#33363b', skin: '#e9bf9c'}, code: CODE.go, speaker: 'ryan',
            lines: ['سلام! من رایانم. سرور پرداخت و گزارش فروش دستگاه‌ها رو با Go می‌نویسم.']},
        {name: 'علیرضا', role: 'C++', u: 21, v: -31.6, look: {outfit: 'hoodie', top: '#1a1a1c', bottom: '#3b4a5e', hair: '#1a1410'}, code: CODE.cpp, speaker: 'alireza',
            lines: ['سلام! علیرضام. فریمور بُرد کنترل دستگاه با C++ ـه؛ الان دارم موتورهای تحویل کالا رو تنظیم می‌کنم.']},
        {name: 'رضا', role: 'C++', u: 13.5, v: -38.6, look: {outfit: 'suit', top: '#2b2f3a', bottom: '#2b2f3a', tie: '#7a1f2b', shoes: '#111'}, code: CODE.cpp, speaker: 'reza',
            lines: ['سلام، خوش اومدین. من رضام؛ کد C++ سنسورها و دمای یخچال دستگاه با منه.', 'دستگاه وندینگ همین دفتر کنار دره؛ از اون خرید کنین!']},
        {name: 'محمد', role: '', u: 18.5, v: -38.6, look: {outfit: 'hoodie', top: '#6f767d', bottom: '#2a2f36', skin: '#d9a985'}, code: CODE.terminal, speaker: 'mohammad',
            lines: ['سلام! من محمدم. به دفتر فنی مهندسی روبات مارکت خوش اومدین!']}
    ];
    for (const dev of developers) {
        desk(dev.u, dev.v - 1.0, 1, [dev.code, CODE.terminal]);
        const person = seat(createPerson(dev.look), dev.u, dev.v, 1, nameTag(dev.name, dev.role));
        people.push({person, pose: 'type'});
        talks.push({speaker: dev.speaker, label: dev.name, lines: dev.lines, radius: 2.6, pos: () => toWorld(dev.u, dev.v)});
    }
    const board = textTexture(512, 256, (c, w, h) => {
        c.fillStyle = '#fbfbf8';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#9aa4a8';
        c.lineWidth = 8;
        c.strokeRect(0, 0, w, h);
        c.textAlign = 'center';
        c.direction = 'rtl';
        c.fillStyle = '#1d4f91';
        c.font = 'bold 40px Vazirmatn, Tahoma, sans-serif';
        c.fillText('اسپرینت ۱۴: دستگاه نسل جدید', w / 2, 56);
        c.font = '28px Vazirmatn, Tahoma, sans-serif';
        c.fillStyle = '#333';
        ['صفحهٔ لمسی جدید ← React', 'سرویس پرداخت ← Go', 'فریمور موتور و سنسور ← C++'].forEach((t, i) => c.fillText(t, w / 2, 110 + i * 44));
    });
    panel(board, 4, 2, 16, 1.9, B + .05);
    const officeMachine = {u: 6.8, v: -28.6};

    // Accounting: four colleagues at desks, filing cabinets along the wall.
    const accountants = [
        {u: 29.5, v: -31.6, look: {top: '#2d3550', scarf: '#c25b7a'}},
        {u: 36.5, v: -31.6, look: {top: '#1f1f22', scarf: '#3e6e8e', skin: '#edc2a0'}},
        {u: 29.5, v: -38.6, look: {top: '#8a6e55', scarf: '#e3d3b9'}},
        {u: 36.5, v: -38.6, look: {top: '#4a5a48', scarf: '#7a3b52', skin: '#d9a985'}}
    ];
    for (const a of accountants) {
        desk(a.u, a.v - 1.0, 1, [CODE.sheet]);
        people.push({person: seat(createPerson({outfit: 'manteau', bottom: '#24262b', shoes: '#111', ...a.look}), a.u, a.v, 1), pose: 'type'});
    }
    for (let i = 0; i < 4; i++) box(26.2, 26.9, -44.5 + i * 1, -43.6 + i * 1, 0, 1.4, mat('#9aa3a8', {metalness: .5}));
    talks.push({speaker: 'accountant', label: 'واحد حسابداری', radius: 4, pos: () => toWorld(33, -29),
        lines: ['سلام! اینجا فروش همهٔ دستگاه‌ها ثبت می‌شه. هر خریدی بکنین، فاکتورش این‌جا میاد!']});

    // Management: the manager's desk facing the door, guest chairs, bookshelf and flag.
    desk(45, -39.7, -1, [CODE.dashboard], 2.4);
    chair(45, -40.7, -1);
    for (const u of [43.8, 46.2]) {
        box(u - .28, u + .28, -37.1, -36.5, .42, .5, mat('#5a3a2a'), false);
        box(u - .28, u + .28, -36.5, -36.4, .5, 1.0, mat('#5a3a2a'), false);
        solid(u - .3, u + .3, -37.1, -36.4);
    }
    box(41, 49, -45.9, -45.4, 0, 2.6, mat('#6b4a33'));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) box(41.3 + j * .85, 41.3 + j * .85 + .5, -45.4, -45.2, .3 + i * .6, .78 + i * .6, mat(['#7e1f1d', '#2f4a6b', '#d6c9a5', '#3e6b48'][(i + j) % 4]), false);
    box(49, 49.5, -27, -26.5, 0, .5, mat('#7a5a3c'), true);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), mat('#3e7a3e'));
    leaves.position.set(49.25, 1.0, -26.75);
    group.add(leaves);
    const nameplate = panel(sign('محمدی', 'مدیر شرکت'), .6, .19, 45, .87, -39.2, 1);
    nameplate.rotation.x = -.3;

    // ---------- Staff car park ----------
    for (let i = 0; i < 4; i++) {
        const parked = createCarModel(['#2f4a6b', '#e9e9e4', '#7e1f1d', '#9aa3a8'][i]);
        const u = 56 + i * 4;
        parked.group.position.set(u, 0, -19);
        parked.group.rotation.y = Math.PI / 2;
        group.add(parked.group);
        solid(u - 1.1, u + 1.1, -21.3, -16.7);
    }

    // ---------- The manager arrives in his pickup ----------
    // Mr Mohammadi drives in through the gate when the game starts, parks by the office, walks to
    // his room and sits at his desk.
    const pickup = createPickup('#f1f1ee');
    group.add(pickup.group);
    const manager = createPerson({outfit: 'suit', top: '#3a3f47', bottom: '#3a3f47', hair: '#8d8a86', glasses: true, shoes: '#111'});
    const managerTag = nameTag('آقای محمدی', 'مدیر شرکت');
    managerTag.position.y = 2.15;
    manager.root.add(managerTag);
    group.add(manager.root);
    const DRIVE_IN = [[98, -3], [80, -3], [62, -5], [51, -9], [46, -16]];
    const WALK_IN = [[47.4, -16.9], [45, -21], [45, -25.6], [48.5, -29], [48.5, -40.7], [45, -40.7]];
    {
        // The parked pickup blocks its bay.
        const [ax, az] = DRIVE_IN.at(-2), [bx, bz] = DRIVE_IN.at(-1), len = Math.hypot(bx - ax, bz - az);
        const du = (bx - ax) / len, dv = (bz - az) / len;
        footprints.push([[2.7, 1], [2.7, -1], [-2.7, -1], [-2.7, 1]].flatMap(([a, b]) => Object.values(toWorld(bx + du * a - dv * b, bz + dv * a + du * b))));
    }
    const arrival = {stage: 'drive', s: 0, heading: Math.PI, sat: false};
    talks.push({speaker: 'mohammadi', label: 'آقای محمدی', radius: 3.4, pos: () => toWorld(manager.root.position.x, manager.root.position.z), ready: () => arrival.stage === 'seated',
        lines: ['سلام، خوش اومدین! من محمدی‌ام، مدیر روبات مارکت.', 'امروز چهل نفر توی سالن تولید کار می‌کنن: خم‌کاری، برش، رنگ، یخچال‌سازی و مونتاژ.', 'یه سر به دفتر فنی بزنین و از دستگاهش خرید کنین؛ بعد برین سراغ دستگاه‌های شهر!']});

    // Position and direction a distance `s` along a polyline of [u, v] points.
    const along = (path, s) => {
        for (let i = 1; i < path.length; i++) {
            const [ax, az] = path[i - 1], [bx, bz] = path[i], len = Math.hypot(bx - ax, bz - az);
            if (s <= len || i === path.length - 1) {
                const t = Math.min(1, s / len);
                return {u: ax + (bx - ax) * t, v: az + (bz - az) * t, du: (bx - ax) / len, dv: (bz - az) / len, done: s >= len && i === path.length - 1};
            }
            s -= len;
        }
    };
    const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
    const placeVehicle = (vehicle, state, p, dt, reverse = false) => {
        const want = reverse ? Math.atan2(p.dv, -p.du) : Math.atan2(-p.dv, p.du);
        state.heading = dt ? turn(state.heading, want, Math.min(1, dt * 3)) : want;
        vehicle.group.position.set(p.u, 0, p.v);
        vehicle.group.rotation.y = state.heading;
    };
    function updateArrival(dt, time) {
        if (arrival.stage === 'drive') {
            arrival.s += dt * 7;
            const p = along(DRIVE_IN, arrival.s);
            placeVehicle(pickup, arrival, p, dt);
            pickup.wheels.forEach(w => w.rotation.z -= dt * 7 / .4);
            manager.root.visible = false;
            if (p.done) Object.assign(arrival, {stage: 'walk', s: 0});
        } else if (arrival.stage === 'walk') {
            arrival.s += dt * 1.3;
            const p = along(WALK_IN, arrival.s);
            manager.root.visible = true;
            manager.root.position.set(p.u, 0, p.v);
            manager.root.rotation.y = Math.atan2(p.du, p.dv);
            manager.pose('walk', time);
            if (p.done) arrival.stage = 'seated';
        } else if (!arrival.sat) {
            arrival.sat = true;
            manager.root.position.set(45, 0, -40.7);
            manager.root.rotation.y = 0;
            manager.pose('sit');
        }
    }
    function resetArrival() {
        Object.assign(arrival, {stage: 'drive', s: 0, sat: false});
        placeVehicle(pickup, arrival, along(DRIVE_IN, 0), 0);
        manager.root.visible = false;
    }
    resetArrival();

    // ---------- Delivery truck ----------
    // Packed machines ride the conveyor onto the truck at the dock; when it is full it drives out
    // of the gate to the city, and comes back empty a while later, reversing up to the dock.
    const truck = createTruck();
    group.add(truck.group);
    const DOCK = [5.5, 31];
    const DEPART = [DOCK, [14, 31], [30, 22], [50, 8], [66, 1], [80, 0], [100, 0]];
    const RETURN = [[100, 0], [80, 0], [60, 6], [40, 14], [27, 18]];
    const BACK_IN = [[27, 18], [16, 28.5], DOCK];
    const SLOTS = [2.1, .95, -.2, -1.35].flatMap(x => [[x, -.6], [x, .6]]);
    const loaded = [];
    const moving = packaged();
    group.add(moving);
    const delivery = {stage: 'load', t: 0, s: 0, heading: 0};
    const truckAtDock = () => {
        truck.group.visible = true;
        truck.group.position.set(DOCK[0], 0, DOCK[1]);
        truck.group.rotation.y = delivery.heading = 0;
    };
    truckAtDock();
    function updateTruck(dt) {
        const d = delivery;
        d.t += dt;
        moving.visible = d.stage === 'load';
        if (d.stage === 'load') {
            // Each box: two seconds along the conveyor, one second lifted onto its slot.
            const [sx, sz] = SLOTS[loaded.length], bed = truck.bed.position;
            const slot = {u: DOCK[0] + bed.x + sx, y: bed.y + .95, v: DOCK[1] + sz};
            if (d.t < 2) moving.position.set(-6 + (1.6 + 6) * d.t / 2, 1.05 + .95, 31);
            else {
                const k = Math.min(1, d.t - 2);
                moving.position.set(1.6 + (slot.u - 1.6) * k, 2.0 + (slot.y - 2.0) * k + Math.sin(k * Math.PI) * .5, 31 + (slot.v - 31) * k);
            }
            if (d.t >= 3) {
                const box = packaged();
                box.position.set(sx, .95, sz);
                truck.bed.add(box);
                loaded.push(box);
                d.t = 0;
                if (loaded.length === SLOTS.length) d.stage = 'full';
            }
        } else if (d.stage === 'full' && d.t > 2) Object.assign(d, {stage: 'depart', s: 0});
        else if (d.stage === 'depart' || d.stage === 'return' || d.stage === 'back') {
            const speed = d.stage === 'back' ? 2.5 : 6;
            d.s += dt * speed;
            const path = {depart: DEPART, return: RETURN, back: BACK_IN}[d.stage];
            const p = along(path, d.s);
            placeVehicle(truck, d, p, dt, d.stage === 'back');
            truck.wheels.forEach(w => w.rotation.z -= dt * speed / .5 * (d.stage === 'back' ? -1 : 1));
            if (p.done) {
                if (d.stage === 'depart') {
                    Object.assign(d, {stage: 'away', t: 0});
                    truck.group.visible = false;
                    loaded.splice(0).forEach(box => truck.bed.remove(box));
                } else if (d.stage === 'return') Object.assign(d, {stage: 'back', s: 0});
                else {
                    truckAtDock();
                    Object.assign(d, {stage: 'load', t: 0});
                }
            }
        } else if (d.stage === 'away' && d.t > 18) {
            truck.group.visible = true;
            Object.assign(d, {stage: 'return', s: 0, heading: Math.PI});
        }
    }
    talks.push({speaker: 'child', radius: 9, pos: () => toWorld(4, 31), once: true,
        lines: ['بابا ببین! کامیون داره دستگاه‌های بسته‌بندی‌شده رو بار می‌زنه که ببره شهر!']});
    // The family comments on each work area the first time they walk into it.
    for (const [u, text, speaker] of [
        [-93, 'اینجا خم‌کاریه؛ ورق‌های فلزی بدنهٔ دستگاه رو با پرس خم می‌کنن.', 'father'],
        [-71, 'دستگاه برش لیزر رو ببین! ورق رو مثل کاغذ می‌بُره.', 'child'],
        [-52, 'این کابین رنگه؛ بدنه‌ها اینجا رنگ فیروزه‌ای روبات مارکت می‌گیرن.', 'father'],
        [-31, 'یخچال‌سازی! برای همینه که نوشیدنی‌های دستگاه همیشه خنکن.', 'child'],
        [-13, 'خط مونتاژ: روبات‌ها و کارگرها قطعه‌ها رو کنار هم می‌ذارن و دستگاه کامل می‌شه.', 'father']
    ]) talks.push({speaker, radius: 8, pos: () => toWorld(u, 25), once: true, lines: [text]});

    // ---------- Key positions ----------
    // The family starts in the yard between the hall and the office, the car parked right beside them.
    const demo = toWorld(officeMachine.u, officeMachine.v), facing = {x: axis.x, z: axis.z};
    const car = toWorld(1.5, -7);
    const start = toWorld(-1, -3.6), door = toWorld(15.5, -24);
    return {
        group,
        footprints,
        demo: {x: demo.x, z: demo.z, rot: Math.atan2(facing.x, facing.z)},
        car: {x: car.x, z: car.z, heading: worldHeading(1, 0)},
        start: {x: start.x, z: start.z, heading: Math.atan2(-(door.z - start.z), door.x - start.x)},
        label: {name: FACTORY.name, kind: 'factory', ...toWorld(-20, 0)},
        talks,
        reset: resetArrival,
        // `dt` is 0 while the game is paused; distant viewers skip the people and machines.
        update(time, dt, viewer) {
            const near = !viewer || Math.hypot(viewer.x - center.x, viewer.z - center.z) < 260;
            updateArrival(dt, time);
            updateTruck(dt);
            workers.group.visible = near;
            if (!near) return;
            for (const step of animated) step(time);
            workers.update(time);
            people.forEach(({person, pose}, i) => person.pose(pose, time, i * 1.7));
        }
    };
}
