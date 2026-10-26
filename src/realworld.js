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

// How close counts as "at the machine": twice the GPS error, between 12 m (good outdoor fix) and 40 m.
export const arrivalRadius = accuracy => Math.min(40, Math.max(12, accuracy * 2));

export const insideWorld = (bounds, x, z) => x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ;

// Watches the phone's position and compass. Calls onFix({x, z, accuracy, speed, lat, lon}),
// onHeading(radians in the game's heading convention), onError(message) for a real problem and
// onStatus(message) while it is still searching.
export function startTracking({onFix, onHeading, onError, onStatus = () => {}}) {
    if (!('geolocation' in navigator)) {
        onError('این دستگاه موقعیت‌یابی (GPS) ندارد.');
        return () => {};
    }
    if (!window.isSecureContext) {
        onError('موقعیت‌یابی فقط روی HTTPS کار می‌کند؛ بازی را از نشانی https:// باز کنید.');
        return () => {};
    }
    let estimate = null, fixes = 0;
    const handle = position => {
        const {latitude: lat, longitude: lon, accuracy, speed} = position.coords, local = toLocal(lat, lon);
        estimate = smoothFix(estimate, {...local, accuracy: Math.max(3, accuracy), speed: Number.isFinite(speed) ? speed : null, time: position.timestamp});
        fixes++;
        onFix({...estimate, lat, lon});
    };
    const fail = error => {
        if (error.code === error.PERMISSION_DENIED) onError('اجازهٔ دسترسی به موقعیت داده نشد. در تنظیمات مرورگر و گوشی، Location را برای این سایت مجاز کنید. (کد ۱)');
        else if (error.code === error.POSITION_UNAVAILABLE) onError('موقعیت در دسترس نیست. Location (GPS) گوشی را روشن کنید؛ روی کامپیوتر معمولاً موقعیت‌یابی کار نمی‌کند. (کد ۲)');
        // A timeout only means no fix yet; the watch keeps trying, so it is a status, not an error.
        else if (!fixes) onStatus('هنوز سیگنال GPS نرسیده… در فضای باز و کنار پنجره سریع‌تر پیدا می‌شود. (کد ۳)');
    };
    // A quick coarse fix from Wi-Fi or the mobile network shows the player at once; GPS refines it.
    navigator.geolocation.getCurrentPosition(handle, () => {}, {enableHighAccuracy: false, maximumAge: 60000, timeout: 15000});
    const watch = navigator.geolocation.watchPosition(handle, fail, {enableHighAccuracy: true, maximumAge: 3000, timeout: 30000});
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
