import * as THREE from 'three';

export function createJourneyScenery(scene, pathZ) {
    const mat = c => new THREE.MeshStandardMaterial({color: c, roughness: .7});
    const wood = mat('#705340'), stone = mat('#a9a393'), black = mat('#172126'), skin = mat('#dca57e');

    function part(parent, geo, material, x, y, z) {
        const m = new THREE.Mesh(geo, material);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    const box = (p, w, h, d, m, x, y, z) => part(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const home = new THREE.Group();
    home.position.set(-35, 0, 7);
    scene.add(home);
    box(home, 8, 4, 6, mat('#d2c1a3'), 0, 2, 0);
    const roof = part(home, new THREE.ConeGeometry(6.5, 2, 4), mat('#6d493d'), 0, 5, 0);
    roof.rotation.y = Math.PI / 4;
    box(home, 1.3, 2.6, .15, wood, 0, 1.3, -3.08);
    for (const x of [-2.5, 2.5]) {
        box(home, 1.6, 1.4, .12, mat('#8eafb3'), x, 2.4, -3.08);
        box(home, .08, 1.4, .15, wood, x, 2.4, -3.16);
    }
    box(scene, 31, .035, 5, mat('#555957'), -22, .02, 0);
    for (let x = -36; x < -8; x += 3) box(scene, 1.5, .045, .12, mat('#ddd0a3'), x, .04, 0);
    const car = new THREE.Group();
    scene.add(car);
    const paint = mat('#bd703c'), glass = mat('#72989e');
    box(car, 4.4, .65, 1.9, paint, 0, .8, 0);
    box(car, 2.3, .8, 1.75, glass, -.15, 1.5, 0);
    box(car, 2.5, .12, 1.9, paint, -.15, 1.96, 0);
    for (const x of [-1.35, 1.35]) for (const z of [-1, 1]) {
        const wheel = part(car, new THREE.CylinderGeometry(.42, .42, .22, 16), black, x, .48, z);
        wheel.rotation.x = Math.PI / 2;
        box(car, .09, .2, .45, mat(x > 0 ? '#fff1c0' : '#b34232'), x > 0 ? 2.23 : -2.23, .9, z * .65);
    }
    box(car, .1, .5, 1.7, black, -1.32, 1.45, 0);
    box(scene, 5, .04, 3, stone, -11, .025, -4);
    const gate = new THREE.Group();
    gate.position.set(-8.5, 0, pathZ(-8.5));
    scene.add(gate);
    for (const z of [-2.5, 2.5]) box(gate, .3, 3.7, .3, wood, 0, 1.85, z);
    box(gate, .4, .65, 5.8, wood, 0, 3.4, 0);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#24392d';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#f2dfae';
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px Tahoma';
    ctx.fillText('ورودی جنگل · تپهٔ آرزوها', 256, 80);
    const sign = part(gate, new THREE.PlaneGeometry(4, .9), new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(signCanvas),
        side: THREE.DoubleSide
    }), .25, 3.4, 0);
    sign.rotation.y = Math.PI / 2;
    const camp = new THREE.Group();
    camp.position.set(4, 0, 4.4);
    scene.add(camp);
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        part(camp, new THREE.DodecahedronGeometry(.24), stone, Math.cos(a) * .9, .16, Math.sin(a) * .9);
    }
    for (let i = 0; i < 4; i++) {
        const log = box(camp, 1.4, .16, .17, wood, 0, .23, 0);
        log.rotation.y = i * Math.PI / 4;
    }
    const flames = [];
    for (let i = 0; i < 7; i++) {
        const flame = part(camp, new THREE.ConeGeometry(.18 + (i % 2) * .1, .8, 7), new THREE.MeshBasicMaterial({
            color: i % 2 ? '#ffb32f' : '#f56528',
            transparent: true,
            opacity: .85
        }), Math.sin(i * 2) * .3, .65, Math.cos(i * 2) * .3);
        flames.push(flame);
    }
    const light = new THREE.PointLight('#ff993d', 8, 10);
    light.position.y = 1.2;
    camp.add(light);
    const dancers = [];
    for (let i = 0; i < 6; i++) {
        const root = new THREE.Group(), a = i * Math.PI / 3;
        root.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
        root.rotation.y = -a - Math.PI / 2;
        camp.add(root);
        const female = i % 2 === 0, cloth = mat(['#ae684a', '#698b84', '#c29d59', '#75829a', '#985b69', '#6f8158'][i]);
        part(root, new THREE.CylinderGeometry(.23, .20, .6, 10), cloth, 0, 1.15, 0);
        part(root, new THREE.SphereGeometry(.22, 12, 10), skin, 0, 1.7, 0);
        part(root, new THREE.SphereGeometry(.235, 12, 10), mat('#322923'), 0, 1.8, -.045).scale.set(1, female ? 1.4 : .65, 1);
        if (female) part(root, new THREE.CylinderGeometry(.23, .4, .5, 12), cloth, 0, .8, 0);
        for (const side of [-1, 1]) box(root, .14, .65, .17, black, side * .15, .4, 0);
        const arms = [];
        for (const side of [-1, 1]) {
            const arm = new THREE.Group();
            arm.position.set(side * .27, 1.4, 0);
            root.add(arm);
            box(arm, .13, .6, .14, cloth, 0, -.25, 0);
            arms.push(arm);
        }
        const cup = part(arms[0], new THREE.CylinderGeometry(.07, .06, .2, 10), mat('#e6b853'), 0, -.58, 0);
        dancers.push({root, arms, a});
    }
    return {
        car, update(time, phase, progress = 0, lane = 0) {
            car.position.set(phase === 'home' || phase === 'boarding' ? -32 : phase === 'driving' ? -32 + progress * 21 : -11, .05, ['entrance', 'walking'].includes(phase) ? -4 : -.3 + lane - 3.7 * Math.pow(progress, 6));
            flames.forEach((f, i) => {
                f.scale.y = .7 + Math.sin(time * 11 + i) * .25;
                f.rotation.y = time + i;
            });
            light.intensity = 7 + Math.sin(time * 17);
            dancers.forEach(({root, arms, a}, i) => {
                root.position.y = Math.abs(Math.sin(time * 3 + i)) * .12;
                root.rotation.z = Math.sin(time * 3 + i) * .09;
                arms.forEach((arm, j) => {
                    arm.rotation.z = (j ? 1 : -1) * (.7 + Math.sin(time * 3 + a + j) * .5);
                    arm.rotation.x = Math.cos(time * 2 + i) * .3;
                });
            });
        }
    };
}
