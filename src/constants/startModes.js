// Ways into the game from the start screen.
// - real: GPS places the player at their real position (falls back to offline on failure).
// - offline: starts at Park Mellat with the family car; the first goal is the factory.
// - about: starts in the factory yard to get to know the company.
// - products: starts at the machine samples in the factory with the showroom open.
export const START_MODES = ['real', 'offline', 'about', 'products'];
export const DEFAULT_START_MODE = 'about';

// Where the player and the family car stand relative to the Park Mellat machine (local metres:
// x along the machine front, z away from it), so the park gate and the machine are in view.
export const PARK_PLAYER_OFFSET = { x: -2, z: 6 };
export const PARK_CAR_OFFSET = { x: 3.5, z: 8 };

// Index of the showroom sample the Products mode starts at (the middle one of three).
export const PRODUCTS_SAMPLE = 1;
