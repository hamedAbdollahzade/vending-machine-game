import { strings } from '../i18n/fa.js';

// Every vehicle in the factory yard is painted this gloss black.
export const VEHICLE_BLACK = '#0c0d0f';

// How close (metres, centre to centre) the player must stand to get on or in a vehicle.
export const ENTER_DISTANCE = 4.5;

// Above this speed (m/s) the player has to stop before getting off.
export const EXIT_MAX_SPEED = 3;

// Names shown in prompts, from the strings file. `bmw` is the family car beside the start point.
export const VEHICLE_LABELS = strings.vehicles;

// Brands parked in the staff bays, in bay order. Mr Mohammadi arrives in the Bugatti.
export const STAFF_CAR_BRANDS = ['lamborghini', 'mazda', 'nissan'];
export const MANAGER_CAR_BRAND = 'bugatti';
