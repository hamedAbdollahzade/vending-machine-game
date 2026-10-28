// Arcade car physics. Heading h faces world direction (cos h, 0, -sin h), matching Three's rotation.y.
// maxSpeed 55.6 m/s is 200 km/h.
export const CAR = {
  maxSpeed: 55.6,
  maxReverse: 6,
  accel: 9.5,
  brake: 14,
  drag: 1.6,
  maxSteer: 0.55,
  wheelBase: 2.7,
  radius: 1.6,
};
/**
 * Creates car resources for the game.
 * @param {*} x - x.
 * @param {*} z - z.
 * @param {*} heading - heading.
 * @returns {*} Operation result, when applicable.
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
 * Runs the step car operation for this subsystem.
 * @param {*} car - car.
 * @param {*} options1 - Operation options.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function stepCar(car, { throttle = 0, steer = 0, handbrake = false }, dt) {
  car.steer += (steer * CAR.maxSteer - car.steer) * Math.min(1, dt * 6);
  if (throttle > 0) car.speed += (car.speed < 0 ? CAR.brake : CAR.accel) * throttle * dt;
  else if (throttle < 0)
    car.speed += (car.speed > 0 ? -CAR.brake : -CAR.accel * 0.6) * -throttle * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.drag * dt);
  if (handbrake)
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.brake * 1.4 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  // High speed narrows the usable steering angle so the car stays controllable.
  const steerAngle = car.steer / (1 + Math.abs(car.speed) * 0.045);
  car.heading -= ((car.speed * Math.tan(steerAngle)) / CAR.wheelBase) * dt;
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.z -= Math.sin(car.heading) * car.speed * dt;
  return car;
}
/**
 * Runs the kmh operation for this subsystem.
 * @param {*} car - car.
 * @returns {*} Operation result, when applicable.
 */
export const kmh = (car) => Math.round(Math.abs(car.speed) * 3.6);
