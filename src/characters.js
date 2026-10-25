import * as THREE from 'three';

// Lightweight articulated characters; all coordinates below are in the family group.
export function createFamily() {
    const group = new THREE.Group();
    const mat = color => new THREE.MeshStandardMaterial({color, roughness: .82});
    const skin = mat('#edbd98'), hair = mat('#49382d'), shoes = mat('#273c36');

    function shape(parent, geometry, material, position) {
        const m = new THREE.Mesh(geometry, material);
        m.position.set(...position);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    function sphere(parent, r, material, pos, scale = [1, 1, 1]) {
        const m = shape(parent, new THREE.SphereGeometry(r, 16, 12), material, pos);
        m.scale.set(...scale);
        return m;
    }

    function segment(parent, a, b, r, material) {
        const mesh = shape(parent, new THREE.CylinderGeometry(r, r, 1, 10), material, [0, 0, 0]);
        return {mesh, a, b};
    }

    function updateSegment(bone, a, b) {
        const delta = b.clone().sub(a);
        bone.mesh.position.copy(a).add(b).multiplyScalar(.5);
        bone.mesh.scale.y = delta.length();
        bone.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }

    // Procedural Robot Market mascot: a hovering guide that follows the father and child.
    function makeRobot(z) {
        const scale = .69, root = new THREE.Group(), torso = new THREE.Group();
        root.name = 'robot-market-mascot';
        root.position.z = z;
        group.add(root);
        root.add(torso);
        const teal = new THREE.MeshStandardMaterial({color: '#079f98', metalness: .4, roughness: .28});
        const white = new THREE.MeshStandardMaterial({color: '#edf6f4', metalness: .22, roughness: .32});
        const joint = new THREE.MeshStandardMaterial({color: '#102b30', metalness: .5, roughness: .35});
        const glow = new THREE.MeshStandardMaterial({color: '#c6f7ff', emissive: '#23bcff', emissiveIntensity: 2.5, roughness: .2});
        const visor = new THREE.MeshStandardMaterial({color: '#020d16', metalness: .5, roughness: .16});
        sphere(torso, .25, teal, [0, .76, 0], [1, .65, .75]);
        sphere(torso, .31, white, [0, .97, 0], [1, 1.05, .72]);
        for (const side of [-1, 1]) sphere(torso, .17, teal, [side * .24, 1.03, -.04], [.55, 1, 1]);
        shape(torso, new THREE.CylinderGeometry(.09, .09, .12, 12), joint, [0, 1.27, 0]);
        const head = new THREE.Group();
        head.position.y = 1.61;
        torso.add(head);
        sphere(head, .43, teal, [0, 0, 0], [1.12, .91, .88]);
        sphere(head, .40, white, [0, -.015, .12], [1.12, .86, .77]);
        sphere(head, .35, visor, [0, -.015, .255], [1.13, .83, .48]);
        const eyes = [];
        function arc(parent, radius, thickness, pos, rotation = 0, material = glow) {
            const line = shape(parent, new THREE.TorusGeometry(radius, thickness, 8, 24, Math.PI), material, pos);
            line.rotation.z = rotation;
            return line;
        }
        for (const side of [-1, 1]) {
            eyes.push(arc(head, .065, .016, [side * .16, .025, .423]));
            const ear = shape(head, new THREE.CylinderGeometry(.14, .14, .085, 24), joint, [side * .47, 0, 0]);
            ear.rotation.z = Math.PI / 2;
            const ring = shape(head, new THREE.TorusGeometry(.105, .012, 8, 24), glow, [side * .518, 0, 0]);
            ring.rotation.y = Math.PI / 2;
            sphere(head, .12, teal, [side * .49, 0, 0], [.4, 1, 1]);
        }
        arc(head, .075, .016, [0, -.085, .425], Math.PI);
        sphere(head, .10, teal, [0, .38, 0], [1, .55, 1]);
        shape(head, new THREE.CylinderGeometry(.017, .022, .18, 10), teal, [0, .49, 0]);
        sphere(head, .055, teal, [0, .60, 0]);
        // Draw the chest mark as a texture so it remains attached to the 3D body.
        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const c = canvas.getContext('2d');
            if (c) {
                c.strokeStyle = '#102b30'; c.fillStyle = '#102b30';
                c.lineWidth = 12; c.lineJoin = 'round';
                c.beginPath(); c.moveTo(65, 40); c.lineTo(82, 40); c.lineTo(99, 110); c.lineTo(170, 110); c.lineTo(186, 58); c.lineTo(89, 58); c.stroke();
                for (const x of [111, 162]) {c.beginPath(); c.arc(x, 130, 9, 0, Math.PI * 2); c.fill();}
                c.textAlign = 'center'; c.font = 'bold 34px sans-serif';
                c.fillText('ROBOT', 128, 181); c.fillText('MARKET', 128, 218);
                shape(torso, new THREE.PlaneGeometry(.31, .31), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false}), [0, .99, .224]);
            }
        }
        const legs = [-1, 1].map(side => {
            const hip = new THREE.Group(); hip.position.set(side * .15, .65, 0); root.add(hip);
            sphere(hip, .09, joint, [0, 0, 0]);
            shape(hip, new THREE.CapsuleGeometry(.095, .12, 4, 12), white, [0, -.12, 0]);
            const knee = new THREE.Group(); knee.position.y = -.25; hip.add(knee);
            sphere(knee, .105, teal, [0, 0, .035]);
            shape(knee, new THREE.CapsuleGeometry(.10, .12, 4, 12), white, [0, -.13, 0]);
            const foot = sphere(knee, .13, teal, [0, -.29, .07], [1, .65, 1.6]);
            sphere(knee, .13, joint, [0, -.34, .07], [1.06, .22, 1.65]);
            return {hip, knee, foot};
        });
        const arms = [-1, 1].map(() => ({
            upper: segment(group, null, null, .09, teal),
            lower: segment(group, null, null, .085, white),
            hand: sphere(group, .09, joint, [0, 0, 0], [1, 1.1, 1])
        }));
        return {root, torso, head, legs, arms, scale, z, eyes};
    }

    function makePerson(isChild, z) {
        const scale = isChild ? .69 : 1.05, root = new THREE.Group();
        root.position.z = z;
        group.add(root);
        const torso = new THREE.Group();
        root.add(torso);
        const cloth = mat(isChild ? '#d98150' : '#e4c695'), pants = mat(isChild ? '#527463' : '#496474');
        // Tapered jacket, hips and neck replace the single rounded toy-like body.
        shape(torso, new THREE.CylinderGeometry(.255 * scale, .22 * scale, .62 * scale, 16), cloth, [0, 1.2 * scale, 0]).scale.z = .72;
        sphere(torso, .23, pants, [0, .88 * scale, 0], [scale, .55 * scale, .72 * scale]);
        shape(torso, new THREE.CylinderGeometry(.075 * scale, .09 * scale, .18 * scale, 12), skin, [0, 1.59 * scale, 0]);
        const seam = shape(torso, new THREE.BoxGeometry(.014 * scale, .5 * scale, .014 * scale), mat('#bda77f'), [0, 1.2 * scale, .19 * scale]);
        for (const side of [-1, 1]) {
            const collar = shape(torso, new THREE.BoxGeometry(.12 * scale, .09 * scale, .025 * scale), cloth, [side * .07 * scale, 1.49 * scale, .15 * scale]);
            collar.rotation.z = side * .4;
        }
        const head = new THREE.Group();
        head.position.y = 1.77 * scale;
        torso.add(head);
        head.scale.setScalar(isChild ? .9 : .77);
        const eyes = [];
        sphere(head, .27 * scale, skin, [0, 0, 0]);
        sphere(head, .275 * scale, hair, [0, .11 * scale, -.035 * scale], [1, .65, 1]);
        sphere(head, .058 * scale, skin, [0, -.02 * scale, .25 * scale]);
        for (const side of [-1, 1]) {
            sphere(head, .06 * scale, skin, [side * .26 * scale, 0, 0]);
            sphere(head, .037 * scale, mat('#f6f1e7'), [side * .09 * scale, .03 * scale, .241 * scale], [1, .65, .5]);
            const eye = sphere(head, .022 * scale, shoes, [side * .09 * scale, .03 * scale, .258 * scale], [.8, 1, .45]);
            eyes.push(eye);
            const brow = shape(head, new THREE.BoxGeometry(.075 * scale, .015 * scale, .015 * scale), hair, [side * .09 * scale, .087 * scale, .237 * scale]);
            brow.rotation.z = side * -.08;
            sphere(head, .04 * scale, mat('#d79379'), [side * .15 * scale, -.055 * scale, .215 * scale]);
        }
        const smile = shape(head, new THREE.TorusGeometry(.068 * scale, .012 * scale, 6, 14, Math.PI), shoes, [0, -.075 * scale, .252 * scale]);
        smile.rotation.z = Math.PI;
        if (isChild) {
            sphere(head, .29 * scale, mat('#e8b857'), [0, .18 * scale, 0], [1, .5, 1]);
            shape(head, new THREE.BoxGeometry(.55 * scale, .04 * scale, .34 * scale), mat('#e8b857'), [0, .13 * scale, .12 * scale]);
        } else {
            sphere(torso, .22, mat('#a77950'), [0, 1.2 * scale, -.24 * scale], [1, 1.2, .5]);
        }
        const legs = [-1, 1].map(side => {
            const hip = new THREE.Group();
            hip.position.set(side * .15 * scale, .83 * scale, 0);
            root.add(hip);
            shape(hip, new THREE.CapsuleGeometry(.09 * scale, .23 * scale, 4, 10), pants, [0, -.16 * scale, 0]);
            const knee = new THREE.Group();
            knee.position.y = -.34 * scale;
            hip.add(knee);
            shape(knee, new THREE.CapsuleGeometry(.08 * scale, .25 * scale, 4, 10), pants, [0, -.16 * scale, 0]);
            const foot = shape(knee, new THREE.SphereGeometry(.12 * scale, 12, 8), shoes, [0, -.32 * scale, .065 * scale]);
            foot.scale.set(.85, .65, 1.5);
            return {hip, knee, foot};
        });
        const arms = [-1, 1].map(() => ({
            upper: segment(group, null, null, .072 * scale, cloth),
            lower: segment(group, null, null, .061 * scale, skin),
            hand: sphere(group, .075 * scale, skin, [0, 0, 0])
        }));
        return {root, torso, head, legs, arms, scale, z, eyes};
    }

    const father = makePerson(false, -.45), child = makePerson(true, .45), robot = makeRobot(1.45);
    robot.root.scale.setScalar(.7);


    // The group faces +X; `facing` is the actors' own yaw inside it (π/2 = along +X).
    function update({time, gait, moving, facing = Math.PI / 2, shopping, delivery, finished, talking = false, dt = 1 / 60}) {
        const actors = [father, child, robot];
        actors.forEach((actor, index) => {
            const blend = 1 - Math.exp(-dt * 7), isRobot = actor === robot;
            const restX = isRobot ? -.7 : 0;
            actor.root.position.x = THREE.MathUtils.lerp(actor.root.position.x, finished ? (index === 0 ? -.55 : .55) : shopping ? [-.55, .25, -.9][index] : restX, blend);
            // The robot hovers; it bobs faster while it is speaking.
            const hover = isRobot ? .35 + Math.sin(time * (talking ? 6 : 2.2)) * .07 : 0;
            actor.root.position.y = THREE.MathUtils.lerp(actor.root.position.y, finished ? -.6 * actor.scale : hover, isRobot ? 1 : blend);
            actor.root.position.z = finished ? 0 : actor.z;
            actor.root.rotation.y = facing;
            const bob = moving ? Math.abs(Math.sin(gait)) * .022 : Math.sin(time * 2) * .006;
            actor.torso.position.y = bob;
            actor.torso.rotation.z = moving ? Math.sin(gait) * .018 : 0;
            const blinking = Math.sin(time * 1.3 + index) > .993;
            actor.eyes.forEach(eye => eye.scale.y = blinking ? .12 : 1);
            actor.head.rotation.y = shopping ? -.65 : isRobot ? Math.sin(time * .9) * .35 : Math.sin(time * .7) * .06;
            actor.torso.rotation.x = delivery && index === 1 ? .22 : 0;
            actor.legs.forEach((leg, i) => {
                const phase = gait + i * Math.PI;
                const stride = isRobot ? .08 : .34;
                leg.hip.rotation.x = finished ? -1.4 : moving ? Math.sin(phase) * stride : 0;
                leg.foot.rotation.x = moving ? Math.sin(phase + .5) * .12 : 0;
                leg.knee.rotation.x = finished ? 2.5 : isRobot ? .25 : moving ? Math.max(0, -Math.sin(phase)) * .5 : .05;
            });
        });
        group.updateMatrixWorld(true);
        const toFamily = (actor, point) => point.applyMatrix4(actor.root.matrix).clone();
        const shoulder = (actor, side) => toFamily(actor, new THREE.Vector3(side * .29 * actor.scale, (actor === robot ? 1.12 : 1.43) * actor.scale, 0));
        // With characters facing +X, father's left and child's right hands meet.
        const contact = new THREE.Vector3(0, 1.06, 0);
        actors.forEach((actor, index) => actor.arms.forEach((arm, i) => {
            const side = i === 0 ? -1 : 1, inside = index === 0 ? side === -1 : index === 1 && side === 1;
            const a = shoulder(actor, side);
            let target;
            if (inside && !shopping && !finished) target = contact.clone();
            else if (index === 1 && shopping && side === -1) target = new THREE.Vector3(.5, delivery ? .65 : 1.1, -.15);
            else target = toFamily(actor, new THREE.Vector3(side * .34 * actor.scale, .88 * actor.scale, moving ? Math.sin(gait + (i ? Math.PI : 0)) * .2 : 0));
            const elbow = a.clone().lerp(target, .5).add(new THREE.Vector3(.07, 0, inside ? 0 : .07));
            updateSegment(arm.upper, a, elbow);
            updateSegment(arm.lower, elbow, target);
            arm.hand.position.copy(target);
        }));
    }

    update({time: 0, gait: 0, moving: false});
    return {group, update, robot: robot.root};
}
