// Places in the factory that missions can point at besides vending machines: information boards
// about the company, the manager's desk and the products hall. Positions use the factory's local
// frame (u along the driveway towards the gate, v across it; see game/models/factory.js).

// Boards stand in a row in the yard, left of the product samples, facing the family's start spot.
// `topic` is the company information section the board shows (see startScreen/InfoSectionContent).
export const ABOUT_BOARDS = [
  { id: 'board-about', topic: 'about', u: -32, v: -15 },
  { id: 'board-contact', topic: 'contact', u: -27, v: -15 },
  { id: 'board-address', topic: 'address', u: -22, v: -15 },
];

// Mr Mohammadi's desk in the management room, where he sits once he has arrived.
export const MANAGER_POINT = { id: 'mohammadi', u: 45, v: -40.7 };

// The products hall: the row of machine samples next to the boards.
export const SHOWROOM_POINT_ID = 'showroom';

export const FACTORY_POINT_IDS = [
  ...ABOUT_BOARDS.map((board) => board.id),
  MANAGER_POINT.id,
  SHOWROOM_POINT_ID,
];

// How close (metres from the board front) the player must stand to read a board.
export const BOARD_REACH = 3;
// How close to the manager counts as meeting him; matches his talk radius in the factory.
export const MEET_RADIUS = 3.4;
