import * as THREE from 'three';
import {catalog} from './game-state.js';
import {textTexture} from './textures.js';

const PRODUCT_COLORS = {juice: '#e5ae47', water: '#9fd3e6', milk: '#8a5a3c', tea: '#c7783a', lemonade: '#f0dc5a', biscuit: '#c9935a', chocolate: '#5a3524', nuts: '#b9884f', cake: '#e58fa6'};

// Sign panel; the shared helper redraws it once the Persian web font has loaded.
const label = (text, sub) => textTexture(512, 160, (c, width, height) => {
    c.fillStyle = '#0f2a2a';
    c.fillRect(0, 0, width, height);
    c.fillStyle = '#3ee0c9';
    c.fillRect(0, height - 10, width, 10);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#e9fff8';
    c.font = 'bold 56px Vazirmatn, Tahoma, sans-serif';
    c.fillText(text, width / 2, 72);
    c.fillStyle = '#9fe9da';
    c.font = '34px Vazirmatn, Tahoma, sans-serif';
    c.fillText(sub, width / 2, 126);
});

// A Robot Market machine. Local +z is the front face; the group is placed facing the path.
export function createVendingMachine(def) {
    const group = new THREE.Group();
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .5, ...extra});
    const box = (w, h, d, material, x, y, z, parent = group) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const shell = mat('#0b8f88', {metalness: .45, roughness: .3, emissive: '#0b8f88', emissiveIntensity: .15}), white = mat('#eef5f3', {metalness: .2, roughness: .35});
    const dark = mat('#13292b'), steel = mat('#b7c1c0', {metalness: .8, roughness: .3});
    box(1.9, 2.4, 1.1, shell, 0, 1.3, 0);
    box(1.94, .32, 1.14, white, 0, 2.62, 0);
    box(1.94, .12, 1.14, dark, 0, .06, 0);
    // The lit interior glows instead of using a point light, which would cost every pixel in the scene.
    box(1.3, 1.8, .06, mat('#13292b', {emissive: '#2a7f73', emissiveIntensity: .5}), -.2, 1.45, .56);
    // Six shelves of products behind the glass, coloured by what this machine sells.
    for (let row = 0; row < 6; row++) {
        const y = .78 + row * .28;
        box(1.2, .02, .25, steel, -.2, y, .45);
        for (let col = 0; col < 8; col++) {
            const id = def.products[(row * 8 + col) % def.products.length];
            const color = mat(PRODUCT_COLORS[id]);
            if (catalog[id].type === 'drink') {
                const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.035, .04, .17, 8), color);
                bottle.position.set(-.73 + col * .15, y + .1, .47);
                group.add(bottle);
            } else box(.09, .14, .06, color, -.73 + col * .15, y + .08, .47);
        }
    }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.82), new THREE.MeshStandardMaterial({color: '#cdeeea', transparent: true, opacity: .16, roughness: .05, metalness: .3, depthWrite: false}));
    glass.position.set(-.2, 1.45, .6);
    group.add(glass);
    // Card reader panel on the right of the front.
    box(.42, 1.8, .05, white, .7, 1.45, .56);
    const screen = box(.3, .22, .02, new THREE.MeshStandardMaterial({color: '#7ef0d6', emissive: '#2bbfa0', emissiveIntensity: .8}), .7, 1.92, .6);
    box(.3, .2, .03, dark, .7, 1.55, .6);
    box(.22, .03, .04, steel, .7, 1.62, .62);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box(.07, .05, .02, steel, .62 + c * .08, 1.32 - r * .07, .6);
    box(.9, .3, .08, mat('#050f10'), -.2, .38, .56);
    const flap = new THREE.Group();
    flap.position.set(-.2, .53, .61);
    group.add(flap);
    box(.88, .28, .03, mat('#4f6f68', {metalness: .4}), 0, -.14, 0, flap);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.86, .3), new THREE.MeshBasicMaterial({map: label('روبات مارکت', def.name)}));
    sign.position.set(0, 2.62, .575);
    group.add(sign);
    const delivery = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .2, 10), mat('#e5ae47'));
    delivery.visible = false;
    group.add(delivery);
    const card = box(.2, .13, .01, mat('#e2d6a8', {metalness: .3}), .95, 1.7, .66);
    card.visible = false;

    // Objective beacon: a tall column of light visible across the city, like a mission marker.
    const beaconMaterial = new THREE.MeshBasicMaterial({color: '#3ee0c9', transparent: true, opacity: .22, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 90, 16, 1, true), beaconMaterial);
    beacon.position.y = 45;
    group.add(beacon);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.9, 40), new THREE.MeshBasicMaterial({color: '#3ee0c9', transparent: true, opacity: .6, depthWrite: false}));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, .09, 1.6);
    group.add(ring);

    return {
        group, flap, delivery, card, screen, beacon, ring,
        setDelivery(productId) {
            delivery.material = mat(PRODUCT_COLORS[productId]);
            delivery.scale.set(catalog[productId].type === 'drink' ? 1 : 1.6, 1, 1);
        },
        // Points in machine space, converted to world space by the caller.
        readerPoint: new THREE.Vector3(.7, 1.6, .62),
        slotPoint: new THREE.Vector3(-.2, .38, .66)
    };
}
