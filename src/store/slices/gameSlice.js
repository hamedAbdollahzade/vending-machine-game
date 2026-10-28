import { createSlice } from '@reduxjs/toolkit';
const gameSlice = createSlice({
  name: 'game',
  initialState: {
    balance: 500,
    xp: 0,
    purchases: [],
    missionsDone: [],
    minutes: 510,
  },
  reducers: {
    publishProgress(_state, action) {
      return action.payload;
    },
  },
});
export const { publishProgress } = gameSlice.actions;
export const gameReducer = gameSlice.reducer;
/** Selects the economic progress shared by the HUD and game panels. */
export const selectProgress = (state) => state.game;
