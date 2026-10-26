import * as THREE from 'three';
import {createVendingMachine} from './vending.js';
import {createCarModel} from './traffic.js';
import {FACTORY} from './locations.js';
import {textTexture} from './textures.js';

function stripes(c, w, h, base, line, every) {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    c.fillStyle = line;
    for (let x = 0; x < w; x += every) c.fillRect(x, 0, every * .35, h);
}

/**
 * The Robot Market factory compound: production hall (where the game starts),
 * office, fenced yard and gate. Layout uses a local frame: u runs along the driveway towards the
 * gate, v across it. Returns world-space collision footprints and key positions.
 */
export function createFactory(scene) {
    const {center, axis} = FACTORY, normal = {x: -axis.z, z: axis.x};
    const rot = Math.atan2(-axis.z, axis.x);
    const toWorld = (u, v) => ({x: center.x + axis.x * u + normal.x * v, z: center.z + axis.z * u + normal.z * v});
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    group.rotation.y = rot;
    scene.add(group);
    const footprints = [];
    // Axis-aligned box in the local frame; solid ones also block movement.
    const box = (u0, u1, v0, v1, y0, y1, material, solid = true, parent = group) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), material);
        mesh.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        if (solid) footprints.push([[u0, v0], [u1, v0], [u1, v1], [u0, v1]].flatMap(([u, v]) => Object.values(toWorld(u, v))));
        return mesh;
    };
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .7, ...extra});

    // Yard: asphalt, painted driveway, and the concrete fence with a gate onto Kaleh Street.
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(190, 100), mat('#8f8c86', {roughness: .95, polygonOffset: true, polygonOffsetFactor: -14, polygonOffsetUnits: -28}));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(-15, .08, 0);
    yard.receiveShadow = true;
    group.add(yard);
    const fence = mat('#d9d3c4');
    box(-110, 80, -50.3, -49.7, 0, 2.4, fence);
    box(-110, 80, 49.7, 50.3, 0, 2.4, fence);
    box(-110.3, -109.7, -50, 50, 0, 2.4, fence);
    box(79.7, 80.3, -50, -9, 0, 2.4, fence);
    box(79.7, 80.3, 9, 50, 0, 2.4, fence);
    const teal = mat('#0b8f88', {metalness: .3, roughness: .4}), white = mat('#eef4f2', {roughness: .5});
    for (const v of [-9.5, 9.5]) box(79, 81, v - 1, v + 1, 0, 4.2, teal);

    // Gate sign with the company name.
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
    const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.4), signMaterial);
    gateSign.position.set(82, 6.6, -20);
    gateSign.rotation.y = Math.PI / 2;
    group.add(gateSign);
    for (const v of [-25.5, -14.5]) box(81.6, 82.4, v - .3, v + .3, 0, 8.8, mat('#59646b', {metalness: .5}), false);

    // Production hall: corrugated walls, teal band, a wide door facing the driveway.
    const corrugated = textTexture(256, 64, (c, w, h) => stripes(c, w, h, '#c9d3d6', '#b2bec2', 16));
    corrugated.wrapS = corrugated.wrapT = THREE.RepeatWrapping;
    corrugated.repeat.set(12, 2);
    const wall = mat('#ffffff', {map: corrugated, metalness: .35, roughness: .55});
    const H = 10, U0 = -62, U1 = 2, V0 = 15, V1 = 45, D0 = -20, D1 = -4;
    box(U0, U1, V1, V1 + .4, 0, H, wall);
    box(U0 - .4, U0, V0, V1 + .4, 0, H, wall);
    box(U1, U1 + .4, V0, V1 + .4, 0, H, wall);
    box(U0 - .4, D0, V0 - .4, V0, 0, H, wall);
    box(D1, U1 + .4, V0 - .4, V0, 0, H, wall);
    box(D0, D1, V0 - .4, V0, 7, H, wall, false);
    box(U0 - .4, U1 + .4, V0 - .5, V0 - .3, H - 1.6, H - .6, teal, false);
    const roof = box(U0 - 1, U1 + 1, V0 - 1, V1 + 1, H, H + .4, mat('#9aa6aa', {metalness: .4}), false);
    // The roof stays out of the shadow map, so daylight still reaches the hall floor.
    roof.castShadow = false;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(U1 - U0, V1 - V0), mat('#b9c4bd', {roughness: .35, polygonOffset: true, polygonOffsetFactor: -16, polygonOffsetUnits: -32}));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((U0 + U1) / 2, .1, (V0 + V1) / 2);
    floor.receiveShadow = true;
    group.add(floor);
    const lamp = new THREE.MeshBasicMaterial({color: '#fffbe8'});
    for (let u = U0 + 8; u < U1; u += 12) box(u - 3, u + 3, 29, 31, H - .3, H - .1, lamp, false);
    const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), signMaterial);
    hallSign.position.set((D0 + D1) / 2, H + 3, V0 - .6);
    hallSign.rotation.y = Math.PI;
    group.add(hallSign);
    for (const u of [(D0 + D1) / 2 - 7.5, (D0 + D1) / 2 + 7.5]) box(u - .2, u + .2, V0 - .7, V0 - .5, H, H + 5.5, mat('#59646b', {metalness: .5}), false);

    // Assembly line: a conveyor carrying machine frames, robot arms, and finished machines in a row.
    box(-60, -36, 33, 37, 0, .9, mat('#3d4549', {metalness: .5}));
    const rollers = mat('#9aa4a8', {metalness: .8, roughness: .3});
    for (let u = -59; u < -36; u += 1.2) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 3.8, 8), rollers);
        roller.rotation.x = Math.PI / 2;
        roller.position.set(u, .95, 35);
        group.add(roller);
    }
    const frames = [], frameMaterial = mat('#0b8f88', {wireframe: true});
    for (let i = 0; i < 4; i++) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.8), i % 2 ? frameMaterial : teal);
        frame.position.set(-58 + i * 6, 2.2, 35);
        frame.castShadow = true;
        group.add(frame);
        frames.push(frame);
    }
    const arms = [];
    for (const u of [-52, -42]) {
        box(u - .6, u + .6, 39, 40.2, 0, 1.2, mat('#f2c94c'));
        const arm = new THREE.Group();
        arm.position.set(u, 1.2, 39.6);
        group.add(arm);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.2, .35), mat('#f2c94c'));
        upper.position.y = 1.1;
        upper.castShadow = true;
        const fore = new THREE.Mesh(new THREE.BoxGeometry(.28, .28, 2.4), mat('#e0b23a'));
        fore.position.set(0, 2.1, -1.1);
        fore.castShadow = true;
        arm.add(upper, fore);
        arms.push(arm);
    }
    for (let i = 0; i < 4; i++) {
        const finished = createVendingMachine({name: 'آمادهٔ نصب', products: ['water', 'juice', 'biscuit', 'chocolate']});
        finished.beacon.visible = finished.ring.visible = false;
        finished.group.position.set(-32 + i * 4.2, 0, 43.4);
        finished.group.rotation.y = Math.PI;
        group.add(finished.group);
        footprints.push([[-33 + i * 4.2, 42.6], [-31 + i * 4.2, 42.6], [-31 + i * 4.2, 44.6], [-33 + i * 4.2, 44.6]].flatMap(([u, v]) => Object.values(toWorld(u, v))));
    }
    // Crates of Robot Market stock along the end wall.
    const crate = mat('#b98b55');
    for (let i = 0; i < 6; i++) box(-61, -58.6, 17 + i * 2.6, 19.2 + i * 2.6, 0, 1.2 + (i % 3) * 1.1, crate);

    // Office block with the company name on its roof.
    const windows = textTexture(128, 128, (c, w, h) => {
        c.fillStyle = '#e9e4d8';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#4c6672';
        c.fillRect(18, 22, 92, 70);
        c.fillStyle = 'rgba(255,255,255,.25)';
        c.fillRect(22, 26, 26, 62);
    });
    windows.wrapS = windows.wrapT = THREE.RepeatWrapping;
    const officeMaterial = mat('#ffffff', {map: windows});
    const office = box(8, 32, -34, -22, 0, 9.6, officeMaterial);
    office.material = [officeMaterial, officeMaterial, mat('#bdb5a5'), mat('#bdb5a5'), officeMaterial, officeMaterial];
    windows.repeat.set(6, 3);
    const roofSign = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.4), signMaterial);
    roofSign.position.set(20, 11.6, -21.9);
    roofSign.rotation.y = Math.PI;
    group.add(roofSign);
    for (const u of [11, 29]) box(u - .15, u + .15, -22.2, -21.9, 9.6, 13.2, mat('#59646b'), false);

    // Staff cars in the car park.
    for (let i = 0; i < 4; i++) {
        const parked = createCarModel(['#2f4a6b', '#e9e9e4', '#7e1f1d', '#9aa3a8'][i]);
        parked.group.position.set(36 + i * 4, 0, -18);
        parked.group.rotation.y = Math.PI / 2;
        group.add(parked.group);
        footprints.push([[34.9 + i * 4, -20.3], [37.1 + i * 4, -20.3], [37.1 + i * 4, -15.7], [34.9 + i * 4, -15.7]].flatMap(([u, v]) => Object.values(toWorld(u, v))));
    }

    // The demo machine stands inside the hall facing the door; the family starts in front of it.
    const demo = toWorld(-8, 41.5), facing = {x: -normal.x, z: -normal.z};
    const car = toWorld(52, -6);
    return {
        footprints,
        demo: {x: demo.x, z: demo.z, rot: Math.atan2(facing.x, facing.z)},
        car: {x: car.x, z: car.z, heading: Math.atan2(-axis.z, axis.x)},
        label: {name: FACTORY.name, kind: 'factory', ...toWorld(-20, 0)},
        update(time) {
            arms.forEach((arm, i) => arm.rotation.y = Math.sin(time * .8 + i * 2) * .9);
            frames.forEach((frame, i) => frame.position.x = -58 + ((time * .6 + i * 6) % 24));
        }
    };
}
