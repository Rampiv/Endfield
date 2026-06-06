import { render, RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import duelsReducer from "@/lib/slices/duelsSlice";
import authReducer from "@/lib/slices/authSlice";
import charactersReducer from "@/lib/slices/charactersSlice";
import weaponsReducer from "@/lib/slices/weaponsSlice";
import usersReducer from "@/lib/slices/usersSlice";
import adminSettingsReducer from "@/lib/slices/adminSettingsSlice";

const rootReducer = combineReducers({
  duels: duelsReducer,
  auth: authReducer,
  characters: charactersReducer,
  weapons: weaponsReducer,
  users: usersReducer,
  adminSettings: adminSettingsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function createMockStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as any,
  });
}

interface RenderWithProvidersOptions {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof configureStore>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { preloadedState = {}, store }: RenderWithProvidersOptions = {},
): RenderResult & { store: ReturnType<typeof configureStore> } {
  const mockStore = store ?? createMockStore(preloadedState);

  const renderResult = render(<Provider store={mockStore}>{ui}</Provider>);

  return {
    ...renderResult,
    store: mockStore,
  };
}
