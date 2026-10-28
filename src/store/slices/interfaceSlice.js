import { createSlice } from '@reduxjs/toolkit';

const initialState = { nodes: { briefing: { hidden: false }, hud: { hidden: true } } };
const interfaceSlice = createSlice({
  name: 'interface',
  initialState,
  reducers: {
    publishInterface(state, action) {
      state.nodes = action.payload;
    },
  },
});
export const { publishInterface } = interfaceSlice.actions;
export const interfaceReducer = interfaceSlice.reducer;
/** Selects serializable interface snapshots; renderer objects never enter Redux. */
export const selectNodes = (state) => state.interface.nodes;
