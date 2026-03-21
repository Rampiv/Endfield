// store/index.ts или store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import modalReducer from "./slices/modalSlice";
import charactersReducer from "./slices/charactersSlice";
import weaponsReducer from "./slices/weaponsSlice";
import userItemsReducer from "./slices/userItemsSlice";
import duelsReducer from "./slices/duelsSlice";
import usersReducer from "./slices/usersSlice";



// ✅ Создаём store сразу (не функцию)
export const store = configureStore({
  reducer: {
    auth: authReducer,
    modal: modalReducer,
    characters: charactersReducer,
    weapons: weaponsReducer,
    userItems: userItemsReducer,
    duels: duelsReducer,
    users: usersReducer, 
  },
});

// ✅ Правильные типы
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
