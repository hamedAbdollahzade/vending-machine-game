// Arcade vehicle physics. Heading h faces world direction (cos h, 0, -sin h), matching Three's
// rotation.y. A spec holds the handling and the body size used for collisions:
// halfLength/halfWidth is the footprint box, `probes` are circles along the body that keep it out
// of buildings, `wheelRadius` turns speed into wheel spin.

// Cars: maxSpeed 55.6 m/s is 200 km/h.
export const CAR = {
  maxSpeed: 55.6,
  maxReverse: 6,
  accel: 9.5,
  brake: 14,
  drag: 1.6,
  maxSteer: 0.55,
  wheelBase: 2.7,
  radius: 1.6,
  halfLength: 2.35,
  halfWidth: 0.98,
  wheelRadius: 0.36,
  probes: [
    { along: 1.3, radius: 1.05 },
    { along: -1.3, radius: 1.05 },
  ],
};

/**
 * Creates the moving state of a vehicle.
 * @param {number} x - World x.
 * @param {number} z - World z.
 * @param {number} heading - Heading in radians.
 * @returns {{x: number, z: number, heading: number, speed: number, steer: number}} The state.
 */
export function createCar(x, z, heading = 0) {
  return {
    x,
    z,
    heading,
    speed: 0,
    steer: 0,
  };
}

/**
 * Applies throttle and brakes to the speed for one step.
 * @param {object} car - Vehicle state, changed in place.
 * @param {{throttle: number, handbrake: boolean}} input - Driver input.
 * @param {{dt: number, spec: object}} step - Time step and vehicle spec.
 */
function applyThrottle(car, { throttle, handbrake }, { dt, spec }) {
  if (throttle > 0) car.speed += (car.speed < 0 ? spec.brake : spec.accel) * throttle * dt;
  else if (throttle < 0)
    car.speed += (car.speed > 0 ? -spec.brake : -spec.accel * 0.6) * -throttle * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), spec.drag * dt);
  if (handbrake)
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), spec.brake * 1.4 * dt);
  car.speed = Math.max(-spec.maxReverse, Math.min(spec.maxSpeed, car.speed));
}

/**
 * Advances a vehicle by one physics step.
 * @param {object} car - Vehicle state, changed in place.
 * @param {{throttle?: number, steer?: number, handbrake?: boolean}} input - Driver input.
 * @param {number} dt - Step length in seconds.
 * @param {object} spec - Handling spec, CAR by default.
 * @returns {object} The same vehicle state.
 */
export function stepCar(car, { throttle = 0, steer = 0, handbrake = false }, dt, spec = CAR) {
  car.steer += (steer * spec.maxSteer - car.steer) * Math.min(1, dt * 6);
  applyThrottle(car, { throttle, handbrake }, { dt, spec });
  // High speed narrows the usable steering angle so the vehicle stays controllable.
  const steerAngle = car.steer / (1 + Math.abs(car.speed) * 0.045);
  car.heading -= ((car.speed * Math.tan(steerAngle)) / spec.wheelBase) * dt;
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.z -= Math.sin(car.heading) * car.speed * dt;
  return car;
}

/**
 * Converts a vehicle's speed to whole km/h for the HUD.
 * @param {{speed: number}} car - Vehicle state.
 * @returns {number} Speed in km/h.
 */
export const kmh = (car) => Math.round(Math.abs(car.speed) * 3.6);
