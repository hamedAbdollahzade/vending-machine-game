import * as THREE from 'three';

// Detailed vehicles for the family and the factory. All face local +X and sit on y = 0, like
// createCarModel in traffic.js; `wheels` lists rear wheels first, then the two front (steering) ones.

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .45, ...extra});

// A side profile (x along the car, y up) extruded across its width, with rounded edges.
function extrudeProfile(points, width, material, bevel = .1) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    const geometry = new THREE.ExtrudeGeometry(shape, {depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 3, curveSegments: 6});
    geometry.translate(0, 0, -(width - bevel * 2) / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
}

// Lower-body outline with wheel arches cut around the wheel centres.
function bodyOutline(front, rear, arches, radius, top) {
    const shape = new THREE.Shape();
    shape.moveTo(rear[0][0], rear[0][1]);
    const bottom = .3;
    // Underside from the rear towards the front, arching over each wheel.
    for (const ax of [...arches].sort((a, b) => a - b)) {
        shape.lineTo(ax - radius, bottom);
        shape.absarc(ax, .36, radius, Math.PI + .14, -.14, true);
    }
    for (const [x, y] of front) shape.lineTo(x, y);
    for (const [x, y] of top) shape.lineTo(x, y);
    for (const [x, y] of rear.slice(1).reverse()) shape.lineTo(x, y);
    return shape;
}

function addWheels(group, positions, radius, tyreWidth, rimColor = '#c9cdd1', spokes = 5) {
    const tyre = mat('#151719', {roughness: .9}), rim = mat(rimColor, {metalness: .85, roughness: .25}), brake = mat('#3a3d40', {metalness: .6});
    const wheels = [];
    for (const [x, z] of positions) {
        const wheel = new THREE.Group();
        wheel.position.set(x, radius, z);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, tyreWidth, 24), tyre);
        t.rotation.x = Math.PI / 2;
        t.castShadow = true;
        wheel.add(t);
        const side = Math.sign(z);
        const face = new THREE.Mesh(new THREE.CylinderGeometry(radius * .68, radius * .68, .02, 24), brake);
        face.rotation.x = Math.PI / 2;
        face.position.z = side * tyreWidth * .44;
        wheel.add(face);
        for (let i = 0; i < spokes; i++) {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.25, radius * .16, .04), rim);
            spoke.position.z = side * tyreWidth * .5;
            spoke.rotation.z = i * Math.PI / spokes;
            wheel.add(spoke);
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .2, radius * .2, .05, 12), rim);
        hub.rotation.x = Math.PI / 2;
        hub.position.z = side * tyreWidth * .52;
        wheel.add(hub);
        group.add(wheel);
        wheels.push(wheel);
    }
    return wheels;
}

/**
 * Sports saloon in the style of a German executive car: long bonnet, twin kidney grille,
 * ring-shaped "angel eye" headlights, kinked rear side window and five-spoke rims. 4.7 m long.
 * No manufacturer badges.
 */
export function createSportSedan(color = '#1d3f78') {
    const group = new THREE.Group();
    const paint = mat(color, {metalness: .7, roughness: .28}), glass = mat('#0f1a22', {metalness: .7, roughness: .08});
    const black = mat('#0b0c0d', {roughness: .6}), chrome = mat('#d8dcdf', {metalness: .95, roughness: .15});
    const W = 1.86;
    const outline = bodyOutline(
        [[2.24, .3], [2.36, .42], [2.38, .62], [2.28, .78]],
        [[-2.3, .3], [-2.36, .55], [-2.3, .86], [-2.12, .97]],
        [-1.42, 1.43], .41,
        [[1.9, .86], [.95, 1.0], [-1.2, 1.0], [-1.6, .99]]
    );
    const bodyGeometry = new THREE.ExtrudeGeometry(outline, {depth: W - .2, bevelEnabled: true, bevelThickness: .1, bevelSize: .08, bevelSegments: 3, curveSegments: 10});
    bodyGeometry.translate(0, 0, -(W - .2) / 2);
    const body = new THREE.Mesh(bodyGeometry, paint);
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    // Greenhouse: windscreen, roof and the fast rear window, narrower than the body.
    const cabin = extrudeProfile([[.95, .98], [.05, 1.39], [-.9, 1.41], [-1.62, 1.0], [-1.5, .98]], 1.5, glass, .08);
    group.add(cabin);
    const roof = extrudeProfile([[.0, 1.37], [-.88, 1.39], [-1.0, 1.32], [.12, 1.32]], 1.36, paint, .06);
    roof.position.y = .045;
    group.add(roof);
    const pillar = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-1.05, 1.0), new THREE.Vector2(-1.55, 1.0), new THREE.Vector2(-1.08, 1.33), new THREE.Vector2(-.96, 1.33), new THREE.Vector2(-1.18, 1.12)]));
    const pillarPaint = paint.clone();
    pillarPaint.side = THREE.DoubleSide;
    // Pillars and the kinked C-pillar ("Hofmeister" kink) on both sides.
    for (const side of [-1, 1]) {
        const z = side * .72;
        const b = new THREE.Mesh(new THREE.BoxGeometry(.09, .4, .04), black);
        b.position.set(-.35, 1.18, z);
        group.add(b);
        const c = new THREE.Mesh(pillar, pillarPaint);
        c.position.z = z + side * .035;
        group.add(c);
        // Door handles, mirror and the chrome window line.
        for (const x of [.15, -.75]) {
            const handle = new THREE.Mesh(new THREE.BoxGeometry(.18, .04, .03), chrome);
            handle.position.set(x, .9, side * .94);
            group.add(handle);
        }
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(.18, .12, .2), paint);
        mirror.position.set(.78, 1.05, side * 1.0);
        group.add(mirror);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(2.1, .025, .02), chrome);
        trim.position.set(-.3, .985, side * .76);
        group.add(trim);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, .08, .04), black);
        skirt.position.set(0, .34, side * .93);
        group.add(skirt);
    }
    // Twin kidney grille with chrome surrounds.
    for (const side of [-1, 1]) {
        const surround = new THREE.Mesh(new THREE.BoxGeometry(.06, .2, .3), chrome);
        surround.position.set(2.46, .66, side * .18);
        group.add(surround);
        const grille = new THREE.Mesh(new THREE.BoxGeometry(.07, .16, .25), black);
        grille.position.set(2.47, .66, side * .18);
        group.add(grille);
        for (let i = 0; i < 5; i++) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(.075, .15, .012), chrome);
            bar.position.set(2.47, .66, side * .18 + (i - 2) * .05);
            group.add(bar);
        }
    }
    // Headlights with two light rings each, and slim L-shaped tail lights.
    const ring = mat('#eaf6ff', {emissive: '#cfe9ff', emissiveIntensity: 1.6});
    const tail = mat('#9e1410', {emissive: '#e0261c', emissiveIntensity: .9});
    for (const side of [-1, 1]) {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .44), black);
        housing.position.set(2.42, .72, side * .6);
        group.add(housing);
        for (const dz of [-.1, .1]) {
            const eye = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 18), ring);
            eye.rotation.y = Math.PI / 2;
            eye.position.set(2.48, .72, side * .6 + dz);
            group.add(eye);
        }
        const tl = new THREE.Mesh(new THREE.BoxGeometry(.06, .1, .42), tail);
        tl.position.set(-2.45, .82, side * .62);
        group.add(tl);
        const tlSide = new THREE.Mesh(new THREE.BoxGeometry(.3, .1, .05), tail);
        tlSide.position.set(-2.2, .82, side * .9);
        group.add(tlSide);
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .12, 12), chrome);
        exhaust.rotation.z = Math.PI / 2;
        exhaust.position.set(-2.44, .36, side * .45);
        group.add(exhaust);
    }
    const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(.05, .12, 1.2), black);
    lowerGrille.position.set(2.45, .42, 0);
    group.add(lowerGrille);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(.03, .11, .5), mat('#f4f4f0'));
    plate.position.set(2.47, .5, 0);
    group.add(plate);
    const wheels = addWheels(group, [[-1.42, -.82], [-1.42, .82], [1.43, -.82], [1.43, .82]], .36, .26, '#b8bcc0', 5);
    return {group, wheels};
}

/**
 * Double-cab pickup in the style of the KMC T8: tall square bonnet, wide chrome grille, a cargo
 * bed behind the cab. 5.3 m long.
 */
export function createPickup(color = '#e8e8e4') {
    const group = new THREE.Group();
    const paint = mat(color, {metalness: .5, roughness: .32}), glass = mat('#13202a', {metalness: .6, roughness: .1});
    const black = mat('#1a1c1e', {roughness: .7}), chrome = mat('#d0d4d7', {metalness: .9, roughness: .2});
    const box = (w, h, d, m, x, y, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    group.add(extrudeProfile([[2.62, .5], [2.66, .95], [2.5, 1.18], [1.3, 1.24], [1.3, .5]], 1.9, paint, .1));
    group.add(extrudeProfile([[1.3, .5], [1.3, 1.24], [.7, 1.86], [-.95, 1.88], [-1.0, .5]], 1.88, paint, .1));
    group.add(extrudeProfile([[1.24, 1.26], [.68, 1.82], [-.9, 1.84], [-.94, 1.26]], 1.92, glass, .02));
    // Cargo bed: floor, sides and tailgate.
    box(1.62, .1, 1.8, black, -1.85, .72, 0);
    for (const side of [-1, 1]) box(1.66, .5, .07, paint, -1.85, .95, side * .9);
    box(.07, .5, 1.86, paint, -2.66, .95, 0);
    box(1.66, .46, 1.9, paint, -1.85, .5, 0);
    box(.3, .06, 1.86, black, -1.02, 1.26, 0);
    // Front: wide grille with horizontal chrome bars, headlights, bumper and skid plate.
    box(.06, .34, 1.1, black, 2.67, .92, 0);
    for (let i = 0; i < 3; i++) box(.07, .04, 1.12, chrome, 2.68, .82 + i * .1, 0);
    const lamp = mat('#eaf6ff', {emissive: '#cfe9ff', emissiveIntensity: 1.2});
    for (const side of [-1, 1]) {
        box(.08, .14, .32, lamp, 2.62, 1.02, side * .74);
        box(.06, .26, .1, mat('#9e1410', {emissive: '#c4241b', emissiveIntensity: .7}), -2.7, 1.0, side * .86);
        box(.2, .14, .2, black, 1.2, 1.36, side * 1.02);
        box(1.0, .05, .06, chrome, -.1, 1.25, side * .97);
        for (const x of [.6, -.4]) box(.16, .04, .03, chrome, x, 1.12, side * .97);
    }
    box(.16, .2, 2.0, black, 2.7, .55, 0);
    box(.16, .2, 2.0, black, -2.72, .55, 0);
    box(.04, .12, .5, mat('#f4f4f0'), 2.79, .6, 0);
    const wheels = addWheels(group, [[-1.7, -.86], [-1.7, .86], [1.7, -.86], [1.7, .86]], .4, .3, '#a9adb1', 6);
    for (const x of [-1.7, 1.7]) for (const side of [-1, 1]) box(1.05, .1, .2, black, x, .86, side * .96);
    return {group, wheels};
}

/**
 * Flatbed delivery lorry with side rails. `bed` is a group on the load floor (local +X towards the
 * cab, origin at the bed's centre) where cargo is placed. 8 m long.
 */
export function createTruck(color = '#e9eef0') {
    const group = new THREE.Group();
    const paint = mat(color, {metalness: .35, roughness: .4}), glass = mat('#14212b', {metalness: .6, roughness: .1});
    const black = mat('#1b1d1f', {roughness: .7}), teal = mat('#0b8f88', {metalness: .3, roughness: .4});
    const box = (w, h, d, m, x, y, z, parent = group) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    // Cab over the front axle.
    box(1.9, 2.1, 2.3, paint, 2.95, 1.95, 0);
    box(.05, .9, 2.0, glass, 3.91, 2.35, 0);
    for (const side of [-1, 1]) box(1.0, .7, .04, glass, 3.1, 2.4, side * 1.16);
    box(.08, .3, 2.2, teal, 3.92, 1.35, 0);
    box(.25, .35, 2.36, black, 3.95, .85, 0);
    const lamp = mat('#eaf6ff', {emissive: '#cfe9ff', emissiveIntensity: 1});
    for (const side of [-1, 1]) {
        box(.06, .16, .3, lamp, 3.98, 1.1, side * .9);
        box(.3, .3, .08, black, 3.4, 2.7, side * 1.25);
    }
    // Chassis and the flatbed with low side rails.
    box(7.6, .3, 1.0, black, 0, .75, 0);
    box(5.9, .14, 2.4, mat('#6b5a45', {roughness: .9}), -1.05, 1.0, 0);
    for (const side of [-1, 1]) box(5.9, .5, .06, teal, -1.05, 1.32, side * 1.19);
    box(.06, .5, 2.4, teal, -4.0, 1.32, 0);
    box(.1, 1.6, 2.4, black, 1.9, 1.85, 0);
    for (const side of [-1, 1]) box(.1, .22, .26, mat('#9e1410', {emissive: '#c4241b', emissiveIntensity: .6}), -4.02, .82, side * .95);
    const bed = new THREE.Group();
    bed.position.set(-1.05, 1.07, 0);
    group.add(bed);
    const wheels = addWheels(group, [[-2.9, -1.0], [-2.9, 1.0], [2.9, -1.0], [2.9, 1.0]], .5, .38, '#c2c6c9', 8);
    return {group, wheels, bed};
}
