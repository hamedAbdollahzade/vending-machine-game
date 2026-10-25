import * as THREE from 'three';

// Low-poly saloon facing local +X, sized like a Peugeot/Samand (4.4 m long).
export function createCarModel(color = '#d9d9d4') {
    const group = new THREE.Group();
    const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({color: c, roughness: .45, ...extra});
    const paint = mat(color, {metalness: .55, roughness: .35}), glass = mat('#1e2c33', {metalness: .6, roughness: .15});
    const dark = mat('#141618'), chrome = mat('#c8ccce', {metalness: .9, roughness: .2});
    const box = (w, h, d, m, x, y, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    box(4.4, .62, 1.78, paint, 0, .68, 0);
    box(4.42, .16, 1.8, dark, 0, .38, 0);
    const cabin = box(2.3, .62, 1.6, glass, -.25, 1.28, 0);
    cabin.scale.set(1, 1, .98);
    box(2.1, .08, 1.62, paint, -.25, 1.62, 0);
    box(.9, .06, 1.7, paint, 1.45, 1.0, 0).rotation.z = -.12;
    for (const z of [-.62, .62]) {
        box(.06, .18, .34, mat('#fff4cc', {emissive: '#fff1b0', emissiveIntensity: .6}), 2.21, .78, z);
        box(.06, .16, .34, mat('#b3261e', {emissive: '#7a0f0b', emissiveIntensity: .5}), -2.21, .8, z);
        box(.18, .08, .1, chrome, .6, 1.02, z * 1.47);
    }
    box(.04, .12, 1.0, chrome, 2.22, .6, 0);
    const wheels = [];
    for (const x of [-1.38, 1.38]) for (const z of [-.86, .86]) {
        const wheel = new THREE.Group();
        wheel.position.set(x, .36, z);
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .26, 18), dark);
        tyre.rotation.x = Math.PI / 2;
        tyre.castShadow = true;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .27, 10), chrome);
        hub.rotation.x = Math.PI / 2;
        wheel.add(tyre, hub);
        group.add(wheel);
        wheels.push(wheel);
    }
    return {group, wheels};
}

const COLORS = ['#e9e9e4', '#1d1f22', '#9aa3a8', '#d6c9a5', '#7e1f1d', '#2f4a6b', '#f2c94c', '#efefea'];

// Ambient cars that drive up and down the main boulevards and stop for anything in front of them.
export function createTraffic(scene, data, count = 32) {
    const roads = data.roads.filter(r => r[0] <= 2).map(r => {
        const pts = [];
        for (let i = 2; i < r.length; i += 2) pts.push(new THREE.Vector2(r[i], r[i + 1]));
        const lengths = [0];
        for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
        return {pts, lengths, total: lengths.at(-1)};
    }).filter(r => r.total > 140).sort((a, b) => b.total - a.total);
    const cars = [];
    for (let i = 0; i < Math.min(count, roads.length * 2); i++) {
        const road = roads[i % roads.length], model = createCarModel(COLORS[i % COLORS.length]);
        scene.add(model.group);
        cars.push({road, model, d: (i * 97) % road.total, dir: i % 2 ? 1 : -1, speed: 8 + (i % 5) * 1.3, wait: 0, x: 0, z: 0});
    }
    const sample = (road, d) => {
        let i = 1;
        while (i < road.lengths.length - 1 && road.lengths[i] < d) i++;
        const a = road.pts[i - 1], b = road.pts[i], t = (d - road.lengths[i - 1]) / (road.lengths[i] - road.lengths[i - 1] || 1);
        return {x: a.x + (b.x - a.x) * t, z: a.y + (b.y - a.y) * t, dx: b.x - a.x, dz: b.y - a.y};
    };
    function update(dt, obstacles) {
        for (const car of cars) {
            const here = sample(car.road, car.d), len = Math.hypot(here.dx, here.dz) || 1;
            const fx = here.dx / len * car.dir, fz = here.dz / len * car.dir;
            // Yield to the player and to other cars directly ahead in the same lane.
            const ahead = obstacles.concat(cars.filter(c => c !== car)).some(o => {
                const ox = o.x - car.x, oz = o.z - car.z, along = ox * fx + oz * fz;
                return along > 0 && along < 9 && Math.abs(ox * fz - oz * fx) < 2.2;
            });
            const speed = ahead ? 0 : car.speed;
            car.d += speed * car.dir * dt;
            if (car.d > car.road.total || car.d < 0) {
                car.dir *= -1;
                car.d = Math.max(0, Math.min(car.road.total, car.d));
            }
            // Keep to the right-hand lane relative to the direction of travel.
            const p = sample(car.road, car.d);
            car.x = p.x - fz * 2.2;
            car.z = p.z + fx * 2.2;
            car.model.group.position.set(car.x, 0, car.z);
            car.model.group.rotation.y = Math.atan2(-fz, fx);
            for (const wheel of car.model.wheels) wheel.rotation.z -= speed * dt / .36;
        }
    }
    return {cars, update};
}
