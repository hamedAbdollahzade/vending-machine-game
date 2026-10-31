// Device pixel ratio caps. Rendering at the full ratio of a 3× phone screen costs nine times the
// pixels for little visible gain, so it is capped; the low setting renders at 1× for weak devices.
export const PIXEL_RATIO_LOW = 1;
export const PIXEL_RATIO_MOBILE = 1.5;
export const PIXEL_RATIO_DESKTOP = 1.75;
