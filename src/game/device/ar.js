import * as THREE from 'three';

// Location-based AR: the phone's rear camera is the background and the 3D camera stands where the
// phone is (GPS) and points where the phone points (orientation sensors), so machines and the
// robot appear in their real direction over the camera picture.

// The rear camera's field of view across its long side; typical phone main cameras are 60–70°.
const CAMERA_LONG_FOV = 65;

const zee = new THREE.Vector3(0, 0, 1),
  euler = new THREE.Euler(),
  q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // camera looks out of the back, not the top

// Device orientation (degrees) to a camera quaternion in a frame where −z is north and +y is up.
// `alpha` must be measured from north (absolute), counter-clockwise.
export function orientationQuaternion(target, alpha, beta, gamma, screenAngle) {
  const r = Math.PI / 180;
  euler.set(beta * r, alpha * r, -gamma * r, 'YXZ');
  target.setFromEuler(euler);
  target.multiply(q1);
  target.multiply(q0.setFromAxisAngle(zee, -screenAngle * r));
  return target;
}

// Vertical field of view of what is visible once the video is scaled to cover the screen.
export function coverFov(videoAspect, screenAspect) {
  const long = Math.tan((CAMERA_LONG_FOV * Math.PI) / 360);
  // The video's own vertical and horizontal half-angle tangents.
  const vTan = videoAspect >= 1 ? long / videoAspect : long,
    hTan = videoAspect >= 1 ? long : long * videoAspect;
  // "cover" fills the screen: if the screen is wider than the video, the full width shows.
  const visibleV = screenAspect > videoAspect ? hTan / screenAspect : vTan;
  return (Math.atan(visibleV) * 360) / Math.PI;
}

export function createArView(video) {
  let stream = null,
    orientation = null,
    compassOffset = null,
    absoluteSeen = false;
  const target = new THREE.Quaternion();
  // Android sends north-referenced readings as `deviceorientationabsolute`; iOS and some browsers
  // only send `deviceorientation`, which is used until (or unless) absolute readings arrive.
  const onAbsolute = (event) => {
    if (event.alpha == null) return;
    absoluteSeen = true;
    orientation = { alpha: event.alpha, beta: event.beta, gamma: event.gamma };
  };
  const onOrientation = (event) => {
    if (event.alpha == null || absoluteSeen) return;
    let alpha = event.alpha;
    if (event.webkitCompassHeading != null) {
      // iOS: alpha is relative to the start pose; the compass heading pins it to north.
      compassOffset = 360 - event.webkitCompassHeading - event.alpha;
    }
    if (!event.absolute && compassOffset != null) alpha += compassOffset;
    orientation = { alpha, beta: event.beta, gamma: event.gamma };
  };
  let sensing = false;
  return {
    // Camera picture on (AR) or off (the 3D world fills the screen).
    get active() {
      return Boolean(stream);
    },
    get hasOrientation() {
      return Boolean(orientation);
    },
    // Phone orientation, used by the first-person view with or without the camera picture.
    startSensors() {
      if (sensing) return;
      sensing = true;
      window.addEventListener('deviceorientationabsolute', onAbsolute);
      window.addEventListener('deviceorientation', onOrientation);
    },
    stopSensors() {
      sensing = false;
      orientation = null;
      absoluteSeen = false;
      window.removeEventListener('deviceorientationabsolute', onAbsolute);
      window.removeEventListener('deviceorientation', onOrientation);
    },
    // Opens the rear camera. Resolves to null on success or to a message explaining the failure.
    async start() {
      if (stream) return null;
      if (!navigator.mediaDevices?.getUserMedia)
        return 'این مرورگر به دوربین دسترسی نمی‌دهد (HTTPS لازم است).';
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (error) {
        stream = null;
        return error?.name === 'NotAllowedError'
          ? 'اجازهٔ دوربین داده نشد؛ از تنظیمات مرورگر اجازه بدهید.'
          : 'دوربین باز نشد؛ برنامهٔ دیگری از آن استفاده نمی‌کند؟';
      }
      video.srcObject = stream;
      video.hidden = false;
      await video.play().catch(() => {});
      this.startSensors();
      return null;
    },
    // Closes the camera picture; the sensors keep running for the first-person view.
    stop() {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      video.srcObject = null;
      video.hidden = true;
    },
    // Points the 3D camera like the phone. With the camera picture on, the field of view matches it.
    // `smoothing` (per second) trades lag for steadiness. Returns false without orientation data.
    update(camera, dt, smoothing = 8) {
      const fov = stream
        ? coverFov(
            video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3,
            innerWidth / innerHeight,
          )
        : 62;
      if (Math.abs(camera.fov - fov) > 0.1) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      if (!orientation) return false;
      const angle = screen.orientation?.angle ?? window.orientation ?? 0;
      orientationQuaternion(target, orientation.alpha, orientation.beta, orientation.gamma, angle);
      camera.quaternion.slerp(target, 1 - Math.exp(-dt * smoothing));
      return true;
    },
  };
}
