import {toLocal} from './geo.js';

// Real-world mode: the family follows the phone's GPS position. Phone GPS in a city is off by
// 5–20 m and jumps around, so fixes are blended by their accuracy and arrival uses a wide radius.

export const MAX_WALKING_SPEED = 6; // m/s (~22 km/h); faster means a vehicle, so buying pauses.

// Blends a new fix into the previous estimate, trusting whichever is more accurate.
export function smoothFix(previous, fix) {
    if (!previous || fix.time - previous.time > 30000) return {...fix};
    const weight = previous.accuracy ** 2 / (previous.accuracy ** 2 + fix.accuracy ** 2);
    const dt = Math.max(.001, (fix.time - previous.time) / 1000);
    const x = previous.x + (fix.x - previous.x) * weight, z = previous.z + (fix.z - previous.z) * weight;
    // The blended estimate is a little better than either input, but never better than 3 m.
    const accuracy = Math.max(3, Math.sqrt(1 / (1 / previous.accuracy ** 2 + 1 / fix.accuracy ** 2)) + Math.hypot(x - previous.x, z - previous.z) * .2);
    return {x, z, accuracy, time: fix.time, speed: fix.speed ?? Math.hypot(x - previous.x, z - previous.z) / dt};
}

// How close counts as "at the machine": never tighter than 20 m, wider when GPS is poor.
export const arrivalRadius = accuracy => Math.min(40, Math.max(20, accuracy * 1.5));

export const insideWorld = (bounds, x, z) => x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ;

// Watches the phone's position and compass. Calls onFix({x, z, accuracy, speed, lat, lon}),
// onHeading(radians in the game's heading convention) and onError(message).
export function startTracking({onFix, onHeading, onError}) {
    if (!('geolocation' in navigator)) {
        onError('این دستگاه موقعیت‌یابی (GPS) ندارد.');
        return () => {};
    }
    let estimate = null;
    const watch = navigator.geolocation.watchPosition(position => {
        const {latitude: lat, longitude: lon, accuracy, speed} = position.coords, local = toLocal(lat, lon);
        estimate = smoothFix(estimate, {...local, accuracy: Math.max(3, accuracy), speed: Number.isFinite(speed) ? speed : null, time: position.timestamp});
        onFix({...estimate, lat, lon});
    }, error => onError(error.code === error.PERMISSION_DENIED ? 'اجازهٔ دسترسی به موقعیت داده نشد. از تنظیمات مرورگر اجازه بدهید.' : 'موقعیت پیدا نشد؛ به فضای باز بروید.'), {
        enableHighAccuracy: true, maximumAge: 2000, timeout: 20000
    });
    // Compass: iOS reports webkitCompassHeading; Android reports absolute alpha (counter-clockwise).
    const orientation = event => {
        const compass = event.webkitCompassHeading ?? (event.absolute && event.alpha != null ? 360 - event.alpha : null);
        // Game heading 0 faces east and grows counter-clockwise, compass 0 faces north and grows clockwise.
        if (compass != null) onHeading(Math.PI / 2 - compass * Math.PI / 180);
    };
    const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, orientation);
    return () => {
        navigator.geolocation.clearWatch(watch);
        window.removeEventListener(eventName, orientation);
    };
}

// iOS needs an explicit permission prompt for the compass, and it must come from a tap.
export async function requestCompass() {
    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission();
    } catch {
        // Without the compass the family faces the direction of travel instead.
    }
}
