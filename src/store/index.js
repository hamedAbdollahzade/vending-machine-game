import { configureStore } from '@reduxjs/toolkit';
import { interfaceReducer } from './slices/interfaceSlice.js';
import { gameReducer } from './slices/gameSlice.js';
/** Creates one Redux store for interface snapshots and shared economic progress. */
export function createAppStore() {
  return configureStore({
    reducer: {
      interface: interfaceReducer,
      game: gameReducer,
    },
  });
}
export const store = createAppStore();
