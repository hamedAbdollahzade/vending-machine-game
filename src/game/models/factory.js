import * as THREE from 'three';
import { createVendingMachine } from './vending.js';
import { createTruck } from './carModels.js';
import { createLuxuryCar } from './luxuryCars.js';
import { MANAGER_CAR_BRAND, MOTORCYCLE_COUNT, VEHICLE_BLACK } from '../../constants/vehicles.js';
import { createPerson, createCrew, nameTag } from './staff.js';
import { FACTORY } from '../../constants/locations.js';
import { textTexture } from './textures.js';
import { strings } from '../../i18n/fa.js';
import { COMPANY } from '../../config/company.js';

// Brand colours for materials and canvas drawings.
const BRAND = COMPANY.colors;
/**
 * Runs the stripes operation for this subsystem.
 * @param {*} c - c.
 * @param {*} w - w.
 * @param {*} h - h.
 * @param {*} base - base.
 * @param {*} line - line.
 * @param {*} every - every.
 * @returns {*} Operation result, when applicable.
 */
function stripes(c, w, h, base, line, every) {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  c.fillStyle = line;
  for (let x = 0; x < w; x += every) c.fillRect(x, 0, every * 0.35, h);
}

// Persian sign: white text on the company's dark teal.
/**
 * Runs the sign operation for this subsystem.
 * @param {*} text - text.
 * @param {*} sub - sub.
 * @returns {*} Operation result, when applicable.
 */
const sign = (text, sub = '') =>
  textTexture(512, 160, (c, w, h) => {
    c.fillStyle = BRAND.primaryDarker;
    c.fillRect(0, 0, w, h);
    c.fillStyle = BRAND.primary;
    c.fillRect(0, h - 12, w, 12);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#ffffff';
    c.font = `bold ${sub ? 58 : 66}px Vazirmatn, Tahoma, sans-serif`;
    c.fillText(text, w / 2, sub ? 72 : 100);
    if (sub) {
      c.fillStyle = BRAND.primaryLighter;
      c.font = '36px Vazirmatn, Tahoma, sans-serif';
      c.fillText(sub, w / 2, 128);
    }
  });

// Monitor contents: a few lines of code (or rows) on a dark editor background.
/**
 * Runs the screen operation for this subsystem.
 * @param {*} lines - lines.
 * @param {*} background - background.
 * @returns {*} Operation result, when applicable.
 */
const screen = (lines, background = '#14181f') =>
  textTexture(512, 300, (c, w, h) => {
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
  react: screen([
    ['export function Shelf({items}) {', '#c792ea'],
    ['  const [slot, setSlot] = useState();', '#82aaff'],
    ['  return (', '#eeffff'],
    ['    <Grid cols={4}>', '#f07178'],
    ['      {items.map(i => <Item {...i} />)}', '#c3e88d'],
    ['    </Grid>', '#f07178'],
    ['  );', '#eeffff'],
    ['}', '#c792ea'],
  ]),
  go: screen([
    ['func (s *Server) Pay(w http.Res', '#82aaff'],
    ['  tx, err := s.bank.Charge(ctx, req)', '#eeffff'],
    ['  if err != nil {', '#c792ea'],
    ['    http.Error(w, err.Error(), 402)', '#f07178'],
    ['    return', '#c792ea'],
    ['  }', '#c792ea'],
    ['  s.events <- Sale{tx.ID, req.Slot}', '#c3e88d'],
    ['}', '#82aaff'],
  ]),
  cpp: screen([
    ['void Motor::dispense(int slot) {', '#82aaff'],
    ['  auto& coil = coils_[slot];', '#eeffff'],
    ['  coil.rotate(360_deg);', '#c3e88d'],
    ['  while (!sensor_.dropped())', '#c792ea'],
    ['    std::this_thread::yield();', '#eeffff'],
    ['  fridge_.hold(4.0_C);', '#f78c6c'],
    ['  log("slot", slot, "ok");', '#c3e88d'],
    ['}', '#82aaff'],
  ]),
  terminal: screen(
    [
      ['$ go test ./...', '#c3e88d'],
      ['ok   payments   0.42s', '#eeffff'],
      ['$ cmake --build build', '#c3e88d'],
      ['[100%] Built target firmware', '#eeffff'],
      ['$ npm run build', '#c3e88d'],
      ['✓ built in 2.1s', '#eeffff'],
      ['$ git push origin main', '#c3e88d'],
      ['', '#fff'],
    ],
    '#0c0f12',
  ),
  sheet: screen(
    [
      // Header, five invoice rows, then the total in the brand colour.
      ...strings.factory.decor.invoices.map((line, i, all) => [
        line,
        ['#1d3b2f', ...Array(all.length - 2).fill('#333'), COMPANY.colors.primaryDark][i],
      ]),
    ],
    '#f4f7f2',
  ),
  dashboard: screen(
    [
      ...strings.factory.decor.dashboard.map((line, i) => [
        line,
        [COMPANY.colors.primary, '#f2c94c', '#eeffff', '#fff'][i] ?? '#82aaff',
      ]),
    ],
    '#101820',
  ),
};

/**
 * The Robot Market factory compound: production hall with five work areas and forty workers, an
 * office building (engineering, accounting and the manager's room), a loading truck, the manager's
 * arrival in his car, fenced yard and gate. Layout uses a local frame: u runs along the driveway
 * towards the gate, v across it. Returns world-space collision footprints, key positions and the
 * people the family can talk to.
 */
export function createFactory(scene) {
  const build = {
    scene,
  };
  for (const [name, method] of Object.entries(FACTORY_METHODS))
    build[name] = (...args) => method(build, ...args);
  for (const initialize of FACTORY_STEPS) initialize(build);
  return build.result;
}
// Desk facing `facing` (the side the person sits on) with one or two monitors.
/**
 * Runs the factory desk operation for this subsystem.
 * @param {*} build - build.
 * @param {*} u - u.
 * @param {*} v - v.
 * @param {*} sitSide - sit Side.
 * @param {*} screens - screens.
 * @param {*} width - width.
 * @returns {*} Operation result, when applicable.
 */
function factoryDesk(build, u, v, sitSide, screens, width = 1.8) {
  build.box(u - width / 2, u + width / 2, v - 0.45, v + 0.45, 0.72, 0.77, build.wood);
  for (const du of [-1, 1])
    build.box(
      u + du * (width / 2 - 0.05) - 0.03,
      u + du * (width / 2 - 0.05) + 0.03,
      v - 0.4,
      v + 0.4,
      0,
      0.72,
      build.black,
      false,
    );
  screens.forEach((texture, i) => {
    const du = screens.length > 1 ? (i - 0.5) * 0.78 : 0;
    const mats = [build.black, build.black, build.black, build.black, build.black, build.black];
    mats[sitSide > 0 ? 4 : 5] = new THREE.MeshBasicMaterial({
      map: texture,
    });
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.04), mats);
    monitor.position.set(u + du, 1.12, v - sitSide * 0.2);
    monitor.rotation.y = (i - 0.5) * -0.25 * sitSide * (screens.length > 1 ? 1 : 0);
    build.group.add(monitor);
    build.box(
      u + du - 0.03,
      u + du + 0.03,
      v - sitSide * 0.22 - 0.03,
      v - sitSide * 0.22 + 0.03,
      0.77,
      0.9,
      build.black,
      false,
    );
  });
  build.box(
    u - 0.25,
    u + 0.25,
    v + sitSide * 0.12,
    v + sitSide * 0.28,
    0.77,
    0.79,
    build.mat('#30353b'),
    false,
  );
}
// Office chair behind a seated person; the back is on the far side from the desk.
/**
 * Runs the factory chair operation for this subsystem.
 * @param {*} build - build.
 * @param {*} u - u.
 * @param {*} v - v.
 * @param {*} sitSide - sit Side.
 * @returns {*} Operation result, when applicable.
 */
function factoryChair(build, u, v, sitSide) {
  build.box(u - 0.26, u + 0.26, v - 0.26, v + 0.26, 0.4, 0.47, build.fabric, false);
  build.box(
    u - 0.25,
    u + 0.25,
    v + sitSide * 0.26,
    v + sitSide * 0.32,
    0.47,
    1.1,
    build.fabric,
    false,
  );
  build.cylinder(0.035, 0.4, build.black, u, 0.2, v);
  build.box(u - 0.3, u + 0.3, v - 0.03, v + 0.03, 0.02, 0.06, build.black, false);
  build.box(u - 0.03, u + 0.03, v - 0.3, v + 0.3, 0.02, 0.06, build.black, false);
  build.solid(u - 0.35, u + 0.35, v - 0.35, v + 0.35);
}
// A seated person at a desk; `sitSide` is +1 when they sit on the +v side facing −v.
/**
 * Runs the factory seat operation for this subsystem.
 * @param {*} build - build.
 * @param {*} person - person.
 * @param {*} u - u.
 * @param {*} v - v.
 * @param {*} sitSide - sit Side.
 * @param {*} tag - tag.
 * @returns {*} Operation result, when applicable.
 */
function factorySeat(build, person, u, v, sitSide, tag) {
  person.root.position.set(u, 0, v);
  person.root.rotation.y = sitSide > 0 ? Math.PI : 0;
  build.group.add(person.root);
  if (tag) {
    tag.position.set(0, 1.78, 0);
    person.root.add(tag);
  }
  build.chair(u, v, sitSide);
  return person;
}

// Engineering: five developers, a whiteboard, and the office's vending machine by the door.

/**
 * Runs the factory update arrival operation for this subsystem.
 * @param {*} build - build.
 * @param {*} dt - dt.
 * @param {*} time - time.
 * @returns {*} Operation result, when applicable.
 */
function factoryUpdateArrival(build, dt, time) {
  if (build.arrival.stage === 'drive') {
    build.arrival.s += dt * 7;
    const p = build.along(build.DRIVE_IN, build.arrival.s);
    build.placeVehicle(build.managerCar, build.arrival, p, dt);
    build.managerCar.wheels.forEach((w) => (w.rotation.z -= (dt * 7) / 0.4));
    build.manager.root.visible = false;
    if (p.done)
      Object.assign(build.arrival, {
        stage: 'walk',
        s: 0,
      });
  } else if (build.arrival.stage === 'walk') {
    build.arrival.s += dt * 1.3;
    const p = build.along(build.WALK_IN, build.arrival.s);
    build.manager.root.visible = true;
    build.manager.root.position.set(p.u, 0, p.v);
    build.manager.root.rotation.y = Math.atan2(p.du, p.dv);
    build.manager.pose('walk', time);
    if (p.done) build.arrival.stage = 'seated';
  } else if (!build.arrival.sat) {
    build.arrival.sat = true;
    build.manager.root.position.set(45, 0, -40.7);
    build.manager.root.rotation.y = 0;
    build.manager.pose('sit');
  }
}
/**
 * Runs the factory reset arrival operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryResetArrival(build) {
  Object.assign(build.arrival, {
    stage: 'drive',
    s: 0,
    sat: false,
  });
  build.placeVehicle(build.managerCar, build.arrival, build.along(build.DRIVE_IN, 0), 0);
  build.manager.root.visible = false;
}
/**
 * Runs the factory update truck operation for this subsystem.
 * @param {*} build - build.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
function factoryUpdateTruck(build, dt) {
  const d = build.delivery;
  d.t += dt;
  build.moving.visible = d.stage === 'load';
  if (d.stage === 'load') {
    // Each box: two seconds along the conveyor, one second lifted onto its slot.
    const [sx, sz] = build.SLOTS[build.loaded.length],
      bed = build.truck.bed.position;
    const slot = {
      u: build.DOCK[0] + bed.x + sx,
      y: bed.y + 0.95,
      v: build.DOCK[1] + sz,
    };
    if (d.t < 2) build.moving.position.set(-6 + ((1.6 + 6) * d.t) / 2, 1.05 + 0.95, 31);
    else {
      const k = Math.min(1, d.t - 2);
      build.moving.position.set(
        1.6 + (slot.u - 1.6) * k,
        2.0 + (slot.y - 2.0) * k + Math.sin(k * Math.PI) * 0.5,
        31 + (slot.v - 31) * k,
      );
    }
    if (d.t >= 3) {
      const box = build.packaged();
      box.position.set(sx, 0.95, sz);
      build.truck.bed.add(box);
      build.loaded.push(box);
      d.t = 0;
      if (build.loaded.length === build.SLOTS.length) d.stage = 'full';
    }
  } else if (d.stage === 'full' && d.t > 2)
    Object.assign(d, {
      stage: 'depart',
      s: 0,
    });
  else if (d.stage === 'depart' || d.stage === 'return' || d.stage === 'back') {
    const speed = d.stage === 'back' ? 2.5 : 6;
    d.s += dt * speed;
    const path = {
      depart: build.DEPART,
      return: build.RETURN,
      back: build.BACK_IN,
    }[d.stage];
    const p = build.along(path, d.s);
    build.placeVehicle(build.truck, d, p, dt, d.stage === 'back');
    build.truck.wheels.forEach(
      (w) => (w.rotation.z -= ((dt * speed) / 0.5) * (d.stage === 'back' ? -1 : 1)),
    );
    if (p.done) {
      if (d.stage === 'depart') {
        Object.assign(d, {
          stage: 'away',
          t: 0,
        });
        build.truck.group.visible = false;
        build.loaded.splice(0).forEach((box) => build.truck.bed.remove(box));
      } else if (d.stage === 'return')
        Object.assign(d, {
          stage: 'back',
          s: 0,
        });
      else {
        build.truckAtDock();
        Object.assign(d, {
          stage: 'load',
          t: 0,
        });
      }
    }
  } else if (d.stage === 'away' && d.t > 18) {
    build.truck.group.visible = true;
    Object.assign(d, {
      stage: 'return',
      s: 0,
      heading: Math.PI,
    });
  }
}
/**
 * Runs the factory build geometry operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry(build) {
  ({ center: build.center, axis: build.axis } = FACTORY);
  build.normal = {
    x: -build.axis.z,
    z: build.axis.x,
  };
  build.rot = Math.atan2(-build.axis.z, build.axis.x);
  build.toWorld = (u, v) => ({
    x: build.center.x + build.axis.x * u + build.normal.x * v,
    z: build.center.z + build.axis.z * u + build.normal.z * v,
  });
  // A heading in the local frame (u, v direction) as a world-space car heading.
  build.worldHeading = (du, dv) => {
    const x = build.axis.x * du + build.normal.x * dv,
      z = build.axis.z * du + build.normal.z * dv;
    return Math.atan2(-z, x);
  };
  build.group = new THREE.Group();
  build.group.position.set(build.center.x, 0, build.center.z);
  build.group.rotation.y = build.rot;
  build.scene.add(build.group);
  build.footprints = [];
}
/**
 * Runs the factory build solid operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildSolid(build) {
  build.solid = (u0, u1, v0, v1) =>
    build.footprints.push(
      [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ].flatMap(([u, v]) => Object.values(build.toWorld(u, v))),
    );
  // Axis-aligned box in the local frame; solid ones also block movement.
  build.box = (a0, a1, b0, b1, y0, y1, material, isSolid = true, parent = build.group) => {
    const u0 = Math.min(a0, a1),
      u1 = Math.max(a0, a1),
      v0 = Math.min(b0, b1),
      v1 = Math.max(b0, b1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), material);
    mesh.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    if (isSolid) build.solid(u0, u1, v0, v1);
    return mesh;
  };
  build.cylinder = (r, h, material, u, y, v, parent = build.group) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material);
    mesh.position.set(u, y, v);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
}
/**
 * Runs the factory build panel operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildPanel(build) {
  // A sign plane; `facing` is the local direction its front faces: 1 = +v, -1 = −v.
  build.panel = (texture, w, h, u, y, v, facing = 1) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(u, y, v);
    if (facing < 0) mesh.rotation.y = Math.PI;
    build.group.add(mesh);
    return mesh;
  };
  build.mat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      ...extra,
    });
  build.floorMat = (color, extra = {}) =>
    build.mat(color, {
      polygonOffset: true,
      polygonOffsetFactor: -16,
      polygonOffsetUnits: -32,
      ...extra,
    });
}
/**
 * Runs the factory build flat operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildFlat(build) {
  build.flat = (u0, u1, v0, v1, y, material) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, v1 - v0), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((u0 + u1) / 2, y, (v0 + v1) / 2);
    mesh.receiveShadow = true;
    build.group.add(mesh);
    return mesh;
  };
  build.steel = build.mat('#59646b', {
    metalness: 0.5,
  });
  build.teal = build.mat(BRAND.primary, {
    metalness: 0.3,
    roughness: 0.4,
  });
  build.yellow = build.mat('#f2c94c', {
    roughness: 0.5,
  });
  build.darkSteel = build.mat('#3d4549', {
    metalness: 0.5,
  });
  build.lamp = new THREE.MeshBasicMaterial({
    color: '#fffbe8',
  });
}
/**
 * Runs the factory build animated operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildAnimated(build) {
  build.animated = [];
  // ---------- Yard, fence, gate ----------
  build.flat(
    -110,
    80,
    -50,
    50,
    0.08,
    build.floorMat('#8f8c86', {
      roughness: 0.95,
      polygonOffsetFactor: -14,
      polygonOffsetUnits: -28,
    }),
  );
  build.fence = build.mat('#d9d3c4');
  build.box(-110, 80, -50.3, -49.7, 0, 2.4, build.fence);
  build.box(-110, 80, 49.7, 50.3, 0, 2.4, build.fence);
  build.box(-110.3, -109.7, -50, 50, 0, 2.4, build.fence);
  build.box(79.7, 80.3, -50, -9, 0, 2.4, build.fence);
  build.box(79.7, 80.3, 9, 50, 0, 2.4, build.fence);
  for (const v of [-9.5, 9.5]) build.box(79, 81, v - 1, v + 1, 0, 4.2, build.teal);
  // Painted parking bays in front of the office.
  build.paint = build.floorMat('#f1efe6', {
    roughness: 0.9,
    polygonOffsetFactor: -18,
    polygonOffsetUnits: -36,
  });
  for (let u = 38; u <= 70; u += 4) build.flat(u - 0.06, u + 0.06, -21.5, -16.5, 0.09, build.paint);
}
/**
 * Runs the factory build name sign operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildNameSign(build) {
  build.nameSign = textTexture(1024, 320, (c, w, h) => {
    c.fillStyle = BRAND.primaryDarker;
    c.fillRect(0, 0, w, h);
    c.fillStyle = BRAND.primary;
    c.fillRect(0, h - 18, w, 18);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#ffffff';
    c.font = 'bold 66px Vazirmatn, Tahoma, sans-serif';
    c.fillText(FACTORY.name, w / 2, 120);
    c.fillStyle = BRAND.primaryLighter;
    c.font = '44px Vazirmatn, Tahoma, sans-serif';
    c.fillText(FACTORY.tagline, w / 2, 210);
    c.font = 'bold 34px sans-serif';
    c.fillStyle = '#f2c94c';
    c.fillText('ROBOT MARKET · VENDING MACHINES', w / 2, 270);
  });
  // Two faces, so the name also reads correctly from inside the yard.
  build.frontSign = new THREE.MeshBasicMaterial({
    map: build.nameSign,
  });
}
/**
 * Runs the factory build geometry2 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry2(build) {
  for (const side of [1, -1]) {
    const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.4), build.frontSign);
    gateSign.position.set(82 + side * 0.02, 6.6, -20);
    gateSign.rotation.y = (side * Math.PI) / 2;
    build.group.add(gateSign);
  }
  for (const v of [-25.5, -14.5])
    build.box(81.6, 82.4, v - 0.3, v + 0.3, 0, 8.8, build.steel, false);

  // ---------- Production hall ----------
  // Corrugated walls, a wide door onto the yard (v = V0) and a loading dock door at the east end.
  build.corrugated = textTexture(256, 64, (c, w, h) => stripes(c, w, h, '#c9d3d6', '#b2bec2', 16));
  build.corrugated.wrapS = build.corrugated.wrapT = THREE.RepeatWrapping;
  build.corrugated.repeat.set(18, 2);
  build.wall = build.mat('#ffffff', {
    map: build.corrugated,
    metalness: 0.35,
    roughness: 0.55,
  });
  build.H = 10;
  build.U0 = -104;
  build.U1 = 0;
  build.V0 = 10;
}
/**
 * Runs the factory build v1 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildV1(build) {
  build.V1 = 42;
  build.D0 = -36;
  build.D1 = -20;
  build.DOCK0 = 27;
  build.DOCK1 = 35;
  build.box(build.U0, build.U1, build.V1, build.V1 + 0.4, 0, build.H, build.wall);
  build.box(build.U0 - 0.4, build.U0, build.V0, build.V1 + 0.4, 0, build.H, build.wall);
  build.box(build.U1, build.U1 + 0.4, build.V0 - 0.4, build.DOCK0, 0, build.H, build.wall);
  build.box(build.U1, build.U1 + 0.4, build.DOCK1, build.V1 + 0.4, 0, build.H, build.wall);
  build.box(build.U1, build.U1 + 0.4, build.DOCK0, build.DOCK1, 5, build.H, build.wall, false);
  build.box(build.U0 - 0.4, build.D0, build.V0 - 0.4, build.V0, 0, build.H, build.wall);
  build.box(build.D1, build.U1 + 0.4, build.V0 - 0.4, build.V0, 0, build.H, build.wall);
  build.box(build.D0, build.D1, build.V0 - 0.4, build.V0, 7, build.H, build.wall, false);
  build.box(
    build.U0 - 0.4,
    build.U1 + 0.4,
    build.V0 - 0.5,
    build.V0 - 0.3,
    build.H - 1.6,
    build.H - 0.6,
    build.teal,
    false,
  );
  build.roof = build.box(
    build.U0 - 1,
    build.U1 + 1,
    build.V0 - 1,
    build.V1 + 1,
    build.H,
    build.H + 0.4,
    build.mat('#9aa6aa', {
      metalness: 0.4,
    }),
    false,
  );
  // The roof stays out of the shadow map, so daylight still reaches the hall floor.
  build.roof.castShadow = false;
  build.flat(
    build.U0,
    build.U1,
    build.V0,
    build.V1,
    0.1,
    build.floorMat('#b9c4bd', {
      roughness: 0.35,
    }),
  );
  // Safety walkway along the door side.
}
/**
 * Runs the factory build geometry3 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry3(build) {
  build.flat(
    build.U0 + 1,
    build.U1 - 1,
    18.6,
    19,
    0.11,
    build.floorMat('#f2c94c', {
      polygonOffsetFactor: -18,
      polygonOffsetUnits: -36,
    }),
  );
  for (let u = build.U0 + 8; u < build.U1; u += 12)
    for (const v of [18, 32])
      build.box(
        u - 3,
        u + 3,
        v - 1,
        v + 1,
        build.H - 0.3,
        build.H - 0.1,
        build.lamp,
        false,
      ).castShadow = false;
  build.panel(build.nameSign, 16, 5, (build.D0 + build.D1) / 2, build.H + 3, build.V0 - 0.6, -1);
  for (const u of [(build.D0 + build.D1) / 2 - 7.5, (build.D0 + build.D1) / 2 + 7.5])
    build.box(
      u - 0.2,
      u + 0.2,
      build.V0 - 0.7,
      build.V0 - 0.5,
      build.H,
      build.H + 5.5,
      build.steel,
      false,
    );
  // Work-area signs hang above the walkway, readable from the door.
  build.zone = (text, sub, u) => {
    build.panel(sign(text, sub), 5.4, 1.7, u, 6.6, 21, -1);
    for (const du of [-2.2, 2.2])
      build.box(u + du - 0.03, u + du + 0.03, 20.97, 21.03, 7.45, build.H, build.steel, false);
  };
  // Work areas along the hall, from the press brakes to packing (u of each sign).
  [-93, -71, -52, -31, -13, -3].forEach((u, i) => build.zone(...strings.factory.zones[i], u));

  // Bending: two press brakes with a moving ram, sheet stacks behind.
}
/**
 * Runs the factory build sheet operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildSheet(build) {
  build.sheet = build.mat('#d4dadd', {
    metalness: 0.85,
    roughness: 0.25,
  });
  for (const u of [-98, -88]) {
    build.box(
      u - 1.8,
      u + 1.8,
      29.4,
      30.6,
      0,
      1.0,
      build.mat('#4a6b80', {
        metalness: 0.4,
      }),
    );
    for (const du of [-1.8, 1.5])
      build.box(
        u + du,
        u + du + 0.3,
        29.2,
        30.8,
        0,
        2.9,
        build.mat('#4a6b80', {
          metalness: 0.4,
        }),
        false,
      );
    const ram = build.box(u - 1.5, u + 1.5, 29.6, 30.4, 1.9, 2.5, build.yellow, false);
    build.animated.push((t) => (ram.position.y = 2.2 + Math.max(0, Math.sin(t * 1.4 + u)) * -0.6));
    build.box(u - 1.4, u + 1.4, 30.6, 31.4, 1.0, 1.03, build.sheet, false);
  }
  for (const u of [-101, -95, -90, -85]) {
    build.box(u - 1, u + 1, 38.4, 39.6, 0, 0.15, build.mat('#8a6a45'));
    for (let i = 0; i < 6; i++)
      build.box(
        u - 0.95,
        u + 0.95,
        38.45,
        39.55,
        0.15 + i * 0.05,
        0.19 + i * 0.05,
        build.sheet,
        false,
      );
  }

  // Laser cutting: a bed with a moving gantry and glowing cutting head, plus a shear.
  build.box(-78, -66, 26, 32, 0, 0.9, build.darkSteel);
}
/**
 * Runs the factory build slats operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildSlats(build) {
  build.slats = textTexture(256, 128, (c, w, h) => stripes(c, w, h, '#2b3135', '#6d767c', 12));
  build.flat(
    -77.8,
    -66.2,
    26.2,
    31.8,
    0.91,
    new THREE.MeshStandardMaterial({
      map: build.slats,
      metalness: 0.6,
      roughness: 0.4,
    }),
  );
  build.gantry = new THREE.Group();
  build.group.add(build.gantry);
  build.box(-0.3, 0.3, 25.4, 32.6, 1.6, 1.9, build.yellow, false, build.gantry);
  for (const v of [25.5, 32.5])
    build.box(-0.25, 0.25, v - 0.2, v + 0.2, 0.9, 1.9, build.yellow, false, build.gantry);
  build.head = build.box(-0.2, 0.2, -0.2, 0.2, 1.1, 1.6, build.darkSteel, false, build.gantry);
  build.spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshBasicMaterial({
      color: '#ff5a3c',
    }),
  );
  build.gantry.add(build.spark);
  build.animated.push((t) => {
    build.gantry.position.x = -72 + Math.sin(t * 0.45) * 5;
    build.head.position.z = build.spark.position.z = 29 + Math.sin(t * 1.3) * 2.5;
    build.spark.position.y = 0.95;
    build.spark.scale.setScalar(0.7 + Math.random() * 0.6);
  });
  build.box(-65, -64, 33.2, 33.8, 0, 1.4, build.mat('#2e3a40'));
}
/**
 * Runs the factory build geometry4 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry4(build) {
  build.box(
    -73.5,
    -70.5,
    37.9,
    39.1,
    0,
    1.6,
    build.mat('#4a6b80', {
      metalness: 0.4,
    }),
  );

  // Powder painting booth: see-through panels, an overhead rail carrying panels through it.
  build.glass = build.mat('#9fd3e6', {
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    roughness: 0.1,
  });
  build.box(-58, -46, 36.8, 37, 0, 4.2, build.glass);
  build.box(-58, -57.8, 25, 37, 0, 4.2, build.glass);
  build.box(-46.2, -46, 25, 37, 0, 4.2, build.glass);
  build.box(-58, -46, 25, 37, 4.2, 4.3, build.glass, false);
  build.flat(
    -57.8,
    -46.2,
    25.2,
    36.8,
    0.12,
    build.floorMat('#5d7f86', {
      polygonOffsetFactor: -18,
      polygonOffsetUnits: -36,
    }),
  );
  build.box(-61, -43, 30.9, 31.1, 3.7, 3.8, build.steel, false);
  build.hung = [];
}
/**
 * Runs the factory build geometry5 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry5(build) {
  for (let i = 0; i < 5; i++) {
    const piece = build.box(
      -0.6,
      0.6,
      30.97,
      31.03,
      1.4,
      3.2,
      i % 2 ? build.teal : build.mat('#eef4f2'),
      false,
    );
    build.hung.push(piece);
  }
  build.animated.push((t) =>
    build.hung.forEach((piece, i) => (piece.position.x = -60 + ((t * 0.5 + i * 3.4) % 17))),
  );

  // Refrigeration: work tables with insulated cabinets, compressors and copper coils.
  build.copper = build.mat('#c27a45', {
    metalness: 0.9,
    roughness: 0.3,
  });
  build.insulated = build.mat('#f2f4f3', {
    roughness: 0.5,
  });
}
/**
 * Runs the factory build geometry6 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry6(build) {
  for (const u of [-37, -31, -25]) {
    build.box(u - 2, u + 2, 29.2, 30.8, 0, 0.9, build.steel);
    build.box(u - 1.6, u - 0.2, 29.4, 30.6, 0.9, 2.2, build.insulated, false);
    build.cylinder(
      0.28,
      0.55,
      build.mat('#16191c', {
        metalness: 0.5,
      }),
      u + 0.7,
      1.18,
      30,
    );
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 20), build.copper);
    coil.position.set(u + 1.4, 1.3, 30);
    coil.rotation.y = Math.PI / 2;
    build.group.add(coil);
  }
  for (let i = 0; i < 4; i++)
    build.box(-35 + i * 2.1, -33.2 + i * 2.1, 38.6, 40.4, 0, 1.9, build.insulated);

  // Assembly: conveyor carrying machine frames between robot arms, finished machines at the end.
  build.box(-20, -6, 32.4, 34.6, 0, 0.9, build.darkSteel);
  build.rollers = build.mat('#9aa4a8', {
    metalness: 0.8,
    roughness: 0.3,
  });
  for (let u = -19.4; u < -6; u += 1.2) {
    const roller = build.cylinder(0.12, 2.2, build.rollers, u, 0.95, 33.5);
    roller.rotation.x = Math.PI / 2;
  }
}
/**
 * Runs the factory build frames operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildFrames(build) {
  build.frames = [];
  build.frameMaterial = build.mat(BRAND.primary, {
    wireframe: true,
  });
  for (let i = 0; i < 4; i++) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.4, 1.8),
      i % 2 ? build.frameMaterial : build.teal,
    );
    frame.position.set(-19 + i * 3.5, 2.2, 33.5);
    frame.castShadow = true;
    build.group.add(frame);
    build.frames.push(frame);
  }
  build.arms = [];
}
/**
 * Runs the factory build geometry7 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry7(build) {
  for (const u of [-16, -10]) {
    build.box(u - 0.6, u + 0.6, 36, 37.2, 0, 1.2, build.yellow);
    const arm = new THREE.Group();
    arm.position.set(u, 1.2, 36.6);
    build.group.add(arm);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 0.35), build.yellow);
    upper.position.y = 1.1;
    upper.castShadow = true;
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 2.4), build.mat('#e0b23a'));
    fore.position.set(0, 2.1, -1.1);
    fore.castShadow = true;
    arm.add(upper, fore);
    build.arms.push(arm);
  }
  build.animated.push((t) => {
    build.arms.forEach((arm, i) => (arm.rotation.y = Math.sin(t * 0.8 + i * 2) * 0.9));
    build.frames.forEach((frame, i) => (frame.position.x = -19.5 + ((t * 0.6 + i * 3.5) % 14)));
  });
}
/**
 * Runs the factory build geometry8 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry8(build) {
  for (let i = 0; i < 4; i++) {
    const finished = createVendingMachine({
      name: strings.factory.readyToInstall,
      products: ['water', 'juice', 'biscuit', 'chocolate'],
    });
    finished.beacon.visible = finished.ring.visible = false;
    const u = -19.2 + i * 4.2;
    finished.group.position.set(u, 0, 40.6);
    finished.group.rotation.y = Math.PI;
    build.group.add(finished.group);
    build.solid(u - 1, u + 1, 40, 41.2);
  }

  // Packing: wrapped machines and a roller conveyor out through the dock door to the truck.
}
/**
 * Runs the factory build carton operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildCarton(build) {
  build.carton = textTexture(256, 512, (c, w, h) => {
    c.fillStyle = '#c49a64';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.18)';
    for (let y = 0; y < h; y += 40) c.fillRect(0, y, w, 14);
    c.fillStyle = BRAND.primary;
    c.fillRect(0, h * 0.42, w, 34);
    c.fillStyle = '#1d2a2a';
    c.textAlign = 'center';
    c.font = 'bold 34px sans-serif';
    c.fillText('ROBOT', w / 2, h * 0.3);
    c.fillText('MARKET', w / 2, h * 0.3 + 40);
    c.font = '60px sans-serif';
    c.fillText('⇧', w / 2, h * 0.75);
  });
  build.cartonMat = build.mat('#ffffff', {
    map: build.carton,
    roughness: 0.85,
  });
  build.cartonGeometry = new THREE.BoxGeometry(0.95, 1.9, 1.05);
}
/**
 * Runs the factory build packaged operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildPackaged(build) {
  build.packaged = () => {
    const mesh = new THREE.Mesh(build.cartonGeometry, build.cartonMat);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };
  for (const v of [37, 38.4, 39.8]) {
    const p = build.packaged();
    p.position.set(-3.2, 0.95, v);
    build.group.add(p);
    build.solid(-3.7, -2.7, v - 0.55, v + 0.55);
  }
  build.box(-6, 1.6, 30.4, 31.6, 0, 1.0, build.darkSteel);
  for (let u = -5.6; u < 1.6; u += 0.8)
    build.cylinder(0.08, 1.1, build.rollers, u, 1.04, 31).rotation.x = Math.PI / 2;

  // ---------- Production crew: 40 workers ----------
  build.overall = '#2f4e7a';
  build.vest = '#e8742c';
  build.paintSuit = '#eef1f2';
}
/**
 * Runs the factory build w operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildW(build) {
  build.W = (x, z, facing, kind = 'work', extra = {}) => ({
    x,
    z,
    facing,
    kind,
    suit: build.overall,
    ...extra,
  });
  build.walk = (x, z, tx, tz, extra = {}) =>
    build.W(x, z, 0, 'walk', {
      to: {
        x: tx,
        z: tz,
      },
      ...extra,
    });
  build.carry = (x, z, tx, tz, extra = {}) =>
    build.W(x, z, 0, 'carry', {
      to: {
        x: tx,
        z: tz,
      },
      ...extra,
    });
}
/**
 * Runs the factory build crew operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildCrew(build) {
  build.crew = [
    // Bending: two at each press, four carrying sheets.
    build.W(-98.8, 32.3, Math.PI),
    build.W(-97.2, 32.3, Math.PI),
    build.W(-88.8, 32.3, Math.PI),
    build.W(-87.2, 32.3, Math.PI, 'work', {
      suit: build.vest,
    }),
    build.carry(-101, 37.3, -99.5, 33.6),
    build.carry(-95, 37.3, -96.2, 33.6, {
      suit: build.vest,
    }),
    build.carry(-90, 37.3, -90.5, 33.6),
    build.carry(-85, 37.3, -86.2, 33.6),
    // Laser cutting: operators at the bed and control panel, two at the shear, three moving parts.
    build.W(-64.5, 34.6, Math.PI),
    build.W(-68, 33.4, Math.PI),
    build.W(-75, 33.4, Math.PI, 'work', {
      suit: build.vest,
    }),
    build.W(-73, 37.1, 0),
    build.W(-71, 37.1, 0),
    build.walk(-79, 35.3, -62, 35.3),
    build.carry(-68, 40.4, -62, 40.4),
    build.walk(-80, 37, -76, 40.4, {
      suit: build.vest,
    }),
    // Painting: four spraying inside the booth in white suits, three outside.
    build.W(-55, 29.4, 0, 'work', {
      suit: build.paintSuit,
      hat: '#ffffff',
    }),
    build.W(-51.5, 29.4, 0, 'work', {
      suit: build.paintSuit,
      hat: '#ffffff',
    }),
    build.W(-53, 32.6, Math.PI, 'work', {
      suit: build.paintSuit,
      hat: '#ffffff',
    }),
    build.W(-49, 32.6, Math.PI, 'work', {
      suit: build.paintSuit,
      hat: '#ffffff',
    }),
    build.walk(-60, 23, -44, 23),
    build.carry(-59, 39.4, -45, 39.4),
    build.walk(-44.5, 26, -44.5, 37, {
      suit: build.vest,
    }),
    // Refrigeration: two at each table, three moving cabinets and coils.
    build.W(-38, 28.4, 0),
    build.W(-36, 28.4, 0),
    build.W(-32, 28.4, 0, 'work', {
      suit: build.vest,
    }),
    build.W(-30, 28.4, 0),
    build.W(-26, 28.4, 0),
    build.W(-24, 28.4, 0),
    build.walk(-39, 34.4, -22, 34.4),
    build.carry(-24, 37, -38, 37),
    build.walk(-31, 32.4, -31, 36),
    // Assembly and packing.
    build.W(-18, 31, 0),
    build.W(-14.4, 31, 0),
    build.W(-11, 31, 0, 'work', {
      suit: build.vest,
    }),
    build.W(-7.6, 31, 0),
    build.W(-17.1, 38.4, 0),
    build.W(-12.9, 38.4, 0),
    build.carry(-20, 24, -4, 24),
    build.carry(-3, 22.5, -3, 29),
  ];
}
/**
 * Runs the factory build workers operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildWorkers(build) {
  build.workers = createCrew(build.group, build.crew);
  for (const w of build.crew)
    if (w.kind === 'work') build.solid(w.x - 0.3, w.x + 0.3, w.z - 0.3, w.z + 0.3);

  // ---------- Office building: engineering, accounting, management ----------
  // One storey, rooms side by side with their own doors onto the yard (front at v = -24).
  build.windows = textTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#e9e4d8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#4c6672';
    c.fillRect(14, 26, 100, 64);
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(18, 30, 28, 56);
  });
  build.windows.wrapS = build.windows.wrapT = THREE.RepeatWrapping;
  build.facade = build.mat('#ffffff', {
    map: build.windows,
  });
  build.plaster = build.mat('#ece8df', {
    roughness: 0.9,
  });
  build.OH = 3.8;
  build.O0 = 6;
}
/**
 * Runs the factory build o1 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildO1(build) {
  build.O1 = 50;
  build.F = -24;
  build.B = -46;
  build.doors = [
    [14, 17],
    [31, 34],
    [43.5, 46.5],
  ];
  build.from = build.O0;
  for (const [d0, d1] of build.doors) {
    build.box(build.from, d0, build.F - 0.3, build.F, 0, build.OH, build.plaster);
    build.box(d0, d1, build.F - 0.3, build.F, 2.7, build.OH, build.plaster, false);
    build.from = d1;
  }
  build.box(build.from, build.O1, build.F - 0.3, build.F, 0, build.OH, build.plaster);
  build.box(build.O0, build.O1, build.B - 0.3, build.B, 0, build.OH, build.plaster);
  build.box(build.O0 - 0.3, build.O0, build.B - 0.3, build.F, 0, build.OH, build.plaster);
  build.box(build.O1, build.O1 + 0.3, build.B - 0.3, build.F, 0, build.OH, build.plaster);
  build.box(25.85, 26.15, build.B, build.F - 0.3, 0, build.OH, build.plaster);
  build.box(39.85, 40.15, build.B, build.F - 0.3, 0, build.OH, build.plaster);
  build.officeRoof = build.box(
    build.O0 - 0.5,
    build.O1 + 0.5,
    build.B - 0.8,
    build.F + 0.5,
    build.OH,
    build.OH + 0.25,
    build.mat('#bdb5a5'),
    false,
  );
  build.officeRoof.castShadow = false;
  build.box(
    build.O0 - 0.5,
    build.O1 + 0.5,
    build.F + 0.4,
    build.F + 0.5,
    build.OH - 0.5,
    build.OH,
    build.teal,
    false,
  );
  // Windows on the front wall between the doors, and on the end walls.
}
/**
 * Runs the factory build geometry9 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry9(build) {
  for (const [u0, u1] of [
    [7, 13.2],
    [18, 30.2],
    [35, 42.6],
    [47.4, 49.4],
  ]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, 1.4), build.facade);
    pane.position.set((u0 + u1) / 2, 1.9, build.F + 0.02);
    build.facade.map.repeat.set(1, 1);
    build.group.add(pane);
  }
  build.panel(build.nameSign, 22, 3.4, 28, build.OH + 2, build.F + 0.1);
  for (const u of [18, 38])
    build.box(
      u - 0.15,
      u + 0.15,
      build.F - 0.1,
      build.F + 0.05,
      build.OH,
      build.OH + 3.7,
      build.steel,
      false,
    );
  build.flat(build.O0, 26, build.B, build.F, 0.1, build.floorMat('#a9b4bb'));
  build.flat(26, 40, build.B, build.F, 0.1, build.floorMat('#c8bba4'));
  build.flat(
    40,
    build.O1,
    build.B,
    build.F,
    0.1,
    build.floorMat('#7b5a44', {
      roughness: 0.5,
    }),
  );
  for (const [u0, u1] of [
    [8, 24],
    [28, 38],
    [42, 48],
  ])
    build.box(u0, u1, -36, -34, build.OH - 0.08, build.OH - 0.02, build.lamp, false).castShadow =
      false;
  build.panel(sign(...strings.factory.signs.engineering), 3.6, 1.1, 15.5, 3.25, build.F + 0.05);
  build.panel(sign(...strings.factory.signs.accounting), 3.6, 1.1, 32.5, 3.25, build.F + 0.05);
  build.panel(sign(...strings.factory.signs.management), 3.6, 1.1, 45, 3.25, build.F + 0.05);
  build.wood = build.mat('#c8a477', {
    roughness: 0.6,
  });
  build.black = build.mat('#1b1d20', {
    roughness: 0.5,
  });
}
/**
 * Runs the factory build fabric operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildFabric(build) {
  build.fabric = build.mat('#2c3238');
  build.people = [];
  build.talks = [];
}
/**
 * Runs the factory build developers operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildDevelopers(build) {
  build.developers = [
    {
      name: strings.factory.staff.hamed.name,
      role: 'React',
      u: 11,
      v: -31.6,
      look: {
        outfit: 'hoodie',
        top: '#151517',
        bottom: '#2d3d57',
      },
      code: CODE.react,
      speaker: 'hamed',
      lines: strings.factory.staff.hamed.lines,
    },
    {
      name: strings.factory.staff.ryan.name,
      role: 'Go',
      u: 16,
      v: -31.6,
      look: {
        outfit: 'hoodie',
        top: '#2f6fd6',
        bottom: '#33363b',
        skin: '#e9bf9c',
      },
      code: CODE.go,
      speaker: 'ryan',
      lines: strings.factory.staff.ryan.lines,
    },
    {
      name: strings.factory.staff.alireza.name,
      role: 'C++',
      u: 21,
      v: -31.6,
      look: {
        outfit: 'hoodie',
        top: '#1a1a1c',
        bottom: '#3b4a5e',
        hair: '#1a1410',
      },
      code: CODE.cpp,
      speaker: 'alireza',
      lines: strings.factory.staff.alireza.lines,
    },
    {
      name: strings.factory.staff.reza.name,
      role: 'C++',
      u: 13.5,
      v: -38.6,
      look: {
        outfit: 'suit',
        top: '#2b2f3a',
        bottom: '#2b2f3a',
        tie: '#7a1f2b',
        shoes: '#111',
      },
      code: CODE.cpp,
      speaker: 'reza',
      lines: strings.factory.staff.reza.lines,
    },
    {
      name: strings.factory.staff.mohammad.name,
      role: '',
      u: 18.5,
      v: -38.6,
      look: {
        outfit: 'hoodie',
        top: '#6f767d',
        bottom: '#2a2f36',
        skin: '#d9a985',
      },
      code: CODE.terminal,
      speaker: 'mohammad',
      lines: strings.factory.staff.mohammad.lines,
    },
  ];
}
/**
 * Runs the factory build geometry10 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry10(build) {
  for (const dev of build.developers) {
    build.desk(dev.u, dev.v - 1.0, 1, [dev.code, CODE.terminal]);
    const person = build.seat(createPerson(dev.look), dev.u, dev.v, 1, nameTag(dev.name, dev.role));
    build.people.push({
      person,
      pose: 'type',
    });
    build.talks.push({
      speaker: dev.speaker,
      label: dev.name,
      lines: dev.lines,
      radius: 2.6,
      pos: () => build.toWorld(dev.u, dev.v),
    });
  }
}
/**
 * Runs the factory build board operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildBoard(build) {
  build.board = textTexture(512, 256, (c, w, h) => {
    c.fillStyle = '#fbfbf8';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#9aa4a8';
    c.lineWidth = 8;
    c.strokeRect(0, 0, w, h);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#1d4f91';
    c.font = 'bold 40px Vazirmatn, Tahoma, sans-serif';
    c.fillText(strings.factory.decor.sprintTitle, w / 2, 56);
    c.font = '28px Vazirmatn, Tahoma, sans-serif';
    c.fillStyle = '#333';
    strings.factory.decor.sprintItems.forEach((t, i) => c.fillText(t, w / 2, 110 + i * 44));
  });
  build.panel(build.board, 4, 2, 16, 1.9, build.B + 0.05);
  build.officeMachine = {
    u: 6.8,
    v: -28.6,
  };
}
/**
 * Runs the factory build accountants operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildAccountants(build) {
  // Accounting: four colleagues at desks, filing cabinets along the wall.
  build.accountants = [
    {
      u: 29.5,
      v: -31.6,
      look: {
        top: '#2d3550',
        scarf: '#c25b7a',
      },
    },
    {
      u: 36.5,
      v: -31.6,
      look: {
        top: '#1f1f22',
        scarf: '#3e6e8e',
        skin: '#edc2a0',
      },
    },
    {
      u: 29.5,
      v: -38.6,
      look: {
        top: '#8a6e55',
        scarf: '#e3d3b9',
      },
    },
    {
      u: 36.5,
      v: -38.6,
      look: {
        top: '#4a5a48',
        scarf: '#7a3b52',
        skin: '#d9a985',
      },
    },
  ];
}
/**
 * Runs the factory build geometry11 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry11(build) {
  for (const a of build.accountants) {
    build.desk(a.u, a.v - 1.0, 1, [CODE.sheet]);
    build.people.push({
      person: build.seat(
        createPerson({
          outfit: 'manteau',
          bottom: '#24262b',
          shoes: '#111',
          ...a.look,
        }),
        a.u,
        a.v,
        1,
      ),
      pose: 'type',
    });
  }
  for (let i = 0; i < 4; i++)
    build.box(
      26.2,
      26.9,
      -44.5 + i * 1,
      -43.6 + i * 1,
      0,
      1.4,
      build.mat('#9aa3a8', {
        metalness: 0.5,
      }),
    );
  build.talks.push({
    speaker: 'accountant',
    label: strings.factory.accounting.label,
    radius: 4,
    pos: () => build.toWorld(33, -29),
    lines: strings.factory.accounting.lines,
  });

  // Management: the manager's desk facing the door, guest chairs, bookshelf and flag.
}
/**
 * Runs the factory build geometry12 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry12(build) {
  build.desk(45, -39.7, -1, [CODE.dashboard], 2.4);
  build.chair(45, -40.7, -1);
  for (const u of [43.8, 46.2]) {
    build.box(u - 0.28, u + 0.28, -37.1, -36.5, 0.42, 0.5, build.mat('#5a3a2a'), false);
    build.box(u - 0.28, u + 0.28, -36.5, -36.4, 0.5, 1.0, build.mat('#5a3a2a'), false);
    build.solid(u - 0.3, u + 0.3, -37.1, -36.4);
  }
  build.box(41, 49, -45.9, -45.4, 0, 2.6, build.mat('#6b4a33'));
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 9; j++)
      build.box(
        41.3 + j * 0.85,
        41.3 + j * 0.85 + 0.5,
        -45.4,
        -45.2,
        0.3 + i * 0.6,
        0.78 + i * 0.6,
        build.mat(['#7e1f1d', '#2f4a6b', '#d6c9a5', '#3e6b48'][(i + j) % 4]),
        false,
      );
  build.box(49, 49.5, -27, -26.5, 0, 0.5, build.mat('#7a5a3c'), true);
  build.leaves = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), build.mat('#3e7a3e'));
  build.leaves.position.set(49.25, 1.0, -26.75);
  build.group.add(build.leaves);
  build.nameplate = build.panel(
    sign(...strings.factory.signs.nameplate),
    0.6,
    0.19,
    45,
    0.87,
    -39.2,
    1,
  );
  build.nameplate.rotation.x = -0.3;

  // ---------- Staff car park ----------
}
/**
 * Runs the factory build geometry13 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry13(build) {
  // Bay centres for the staff cars and the motorcycle row; the garage puts drivable vehicles there.
  const heading = build.worldHeading(0, -1);
  build.parking = {
    cars: [58, 62, 66].map((u) => ({ ...build.toWorld(u, -19), heading })),
    // Motorcycles barely reverse, so they stand facing out towards the driveway.
    bikes: Array.from({ length: MOTORCYCLE_COUNT }, (_, i) => ({
      ...build.toWorld(36.6 + i * 1.1, -19.5),
      heading: build.worldHeading(0, 1),
    })),
  };

  // ---------- The manager arrives in his Bugatti ----------
  // Mr Mohammadi drives in through the gate when the game starts, parks by the office, walks to
  // his room and sits at his desk. Once parked the car can be taken like any other.
  build.managerCar = createLuxuryCar(MANAGER_CAR_BRAND);
  build.group.add(build.managerCar.group);
}
/**
 * Runs the factory build manager operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildManager(build) {
  build.manager = createPerson({
    outfit: 'suit',
    top: '#3a3f47',
    bottom: '#3a3f47',
    hair: '#8d8a86',
    glasses: true,
    shoes: '#111',
  });
  build.managerTag = nameTag(strings.factory.manager.name, strings.factory.manager.role);
  build.managerTag.position.y = 2.15;
  build.manager.root.add(build.managerTag);
  build.group.add(build.manager.root);
  build.DRIVE_IN = [
    [98, -3],
    [80, -3],
    [62, -5],
    [51, -9],
    [46, -16],
  ];
  build.WALK_IN = [
    [47.4, -16.9],
    [45, -21],
    [45, -25.6],
    [48.5, -29],
    [48.5, -40.7],
    [45, -40.7],
  ];
}
/**
 * Runs the factory build arrival operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildArrival(build) {
  build.arrival = {
    stage: 'drive',
    s: 0,
    heading: Math.PI,
    sat: false,
  };
  build.talks.push({
    speaker: 'mohammadi',
    label: strings.factory.manager.name,
    radius: 3.4,
    pos: () => build.toWorld(build.manager.root.position.x, build.manager.root.position.z),
    ready: () => build.arrival.stage === 'seated',
    lines: strings.factory.managerLines,
  });

  // Position and direction a distance `s` along a polyline of [u, v] points.
}
/**
 * Runs the factory build along operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildAlong(build) {
  build.along = (path, s) => {
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1],
        [bx, bz] = path[i],
        len = Math.hypot(bx - ax, bz - az);
      if (s <= len || i === path.length - 1) {
        const t = Math.min(1, s / len);
        return {
          u: ax + (bx - ax) * t,
          v: az + (bz - az) * t,
          du: (bx - ax) / len,
          dv: (bz - az) / len,
          done: s >= len && i === path.length - 1,
        };
      }
      s -= len;
    }
  };
  build.turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
}
/**
 * Runs the factory build place vehicle operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildPlaceVehicle(build) {
  build.placeVehicle = (vehicle, state, p, dt, reverse = false) => {
    const want = reverse ? Math.atan2(p.dv, -p.du) : Math.atan2(-p.dv, p.du);
    state.heading = dt ? build.turn(state.heading, want, Math.min(1, dt * 3)) : want;
    vehicle.group.position.set(p.u, 0, p.v);
    vehicle.group.rotation.y = state.heading;
  };
  build.resetArrival();

  // ---------- Delivery truck ----------
  // Packed machines ride the conveyor onto the truck at the dock; when it is full it drives out
  // of the gate to the city, and comes back empty a while later, reversing up to the dock.
  build.truck = createTruck(VEHICLE_BLACK);
  build.group.add(build.truck.group);
  build.DOCK = [5.5, 31];
  build.DEPART = [build.DOCK, [14, 31], [30, 22], [50, 8], [66, 1], [80, 0], [100, 0]];
  build.RETURN = [
    [100, 0],
    [80, 0],
    [60, 6],
    [40, 14],
    [27, 18],
  ];
  build.BACK_IN = [[27, 18], [16, 28.5], build.DOCK];
  build.SLOTS = [2.1, 0.95, -0.2, -1.35].flatMap((x) => [
    [x, -0.6],
    [x, 0.6],
  ]);
  build.loaded = [];
  build.moving = build.packaged();
  build.group.add(build.moving);
}
/**
 * Runs the factory build delivery operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildDelivery(build) {
  build.delivery = {
    stage: 'load',
    t: 0,
    s: 0,
    heading: 0,
  };
  build.truckAtDock = () => {
    build.truck.group.visible = true;
    build.truck.group.position.set(build.DOCK[0], 0, build.DOCK[1]);
    build.truck.group.rotation.y = build.delivery.heading = 0;
  };
  build.truckAtDock();
  build.talks.push({
    speaker: 'child',
    radius: 9,
    pos: () => build.toWorld(4, 31),
    once: true,
    lines: [strings.factory.truck],
  });
  // The family comments on each work area the first time they walk into it.
}
/**
 * Runs the factory build geometry14 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildGeometry14(build) {
  // u of each production area and who comments on it; the lines come from the strings file.
  for (const [i, [u, speaker]] of [
    [-93, 'father'],
    [-71, 'child'],
    [-52, 'father'],
    [-31, 'child'],
    [-13, 'father'],
  ].entries())
    build.talks.push({
      speaker,
      radius: 8,
      pos: () => build.toWorld(u, 25),
      once: true,
      lines: [strings.factory.areaTalks[i]],
    });

  // ---------- Key positions ----------
  // The family starts in the yard between the hall and the office, the car parked right beside them.
  build.demo = build.toWorld(build.officeMachine.u, build.officeMachine.v);
  build.facing = {
    x: build.axis.x,
    z: build.axis.z,
  };
  build.car = build.toWorld(1.5, -7);
  build.start = build.toWorld(-1, -3.6);
  build.door = build.toWorld(15.5, -24);
}
/**
 * Runs the factory build result operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function factoryBuildResult(build) {
  build.result = {
    group: build.group,
    footprints: build.footprints,
    demo: {
      x: build.demo.x,
      z: build.demo.z,
      rot: Math.atan2(build.facing.x, build.facing.z),
    },
    car: {
      x: build.car.x,
      z: build.car.z,
      heading: build.worldHeading(1, 0),
    },
    start: {
      x: build.start.x,
      z: build.start.z,
      heading: Math.atan2(-(build.door.z - build.start.z), build.door.x - build.start.x),
    },
    label: {
      name: FACTORY.name,
      kind: 'factory',
      ...build.toWorld(-20, 0),
    },
    talks: build.talks,
    parking: build.parking,
    // The garage takes the manager's car over once it has parked, and hands it back on reset.
    managerCar: {
      model: build.managerCar,
      home: build.group,
      parked: () => build.arrival.stage !== 'drive',
    },
    reset: build.resetArrival,
    // `dt` is 0 while the game is paused; distant viewers skip the people and machines.
    update(time, dt, viewer) {
      const near =
        !viewer || Math.hypot(viewer.x - build.center.x, viewer.z - build.center.z) < 260;
      build.updateArrival(dt, time);
      build.updateTruck(dt);
      build.workers.group.visible = near;
      if (!near) return;
      for (const step of build.animated) step(time);
      build.workers.update(time);
      build.people.forEach(({ person, pose }, i) => person.pose(pose, time, i * 1.7));
    },
  };
}
const FACTORY_METHODS = {
  desk: factoryDesk,
  chair: factoryChair,
  seat: factorySeat,
  updateArrival: factoryUpdateArrival,
  resetArrival: factoryResetArrival,
  updateTruck: factoryUpdateTruck,
};
const FACTORY_STEPS = [
  factoryBuildGeometry,
  factoryBuildSolid,
  factoryBuildPanel,
  factoryBuildFlat,
  factoryBuildAnimated,
  factoryBuildNameSign,
  factoryBuildGeometry2,
  factoryBuildV1,
  factoryBuildGeometry3,
  factoryBuildSheet,
  factoryBuildSlats,
  factoryBuildGeometry4,
  factoryBuildGeometry5,
  factoryBuildGeometry6,
  factoryBuildFrames,
  factoryBuildGeometry7,
  factoryBuildGeometry8,
  factoryBuildCarton,
  factoryBuildPackaged,
  factoryBuildW,
  factoryBuildCrew,
  factoryBuildWorkers,
  factoryBuildO1,
  factoryBuildGeometry9,
  factoryBuildFabric,
  factoryBuildDevelopers,
  factoryBuildGeometry10,
  factoryBuildBoard,
  factoryBuildAccountants,
  factoryBuildGeometry11,
  factoryBuildGeometry12,
  factoryBuildGeometry13,
  factoryBuildManager,
  factoryBuildArrival,
  factoryBuildAlong,
  factoryBuildPlaceVehicle,
  factoryBuildDelivery,
  factoryBuildGeometry14,
  factoryBuildResult,
];
