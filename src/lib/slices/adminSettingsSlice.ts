// src/lib/slices/adminSettingsSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";

interface AdminSettingsState {
  maxTeamCost: number;       // Для персонажей
  maxWeaponCost: number;     // ✅ Для оружия
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AdminSettingsState = {
  maxTeamCost: 10,
  maxWeaponCost: 10, 
  status: "idle",
  error: null,
};

// Загрузка настроек
export const fetchAdminSettings = createAsyncThunk(
  "adminSettings/fetch",
  async () => {
    const snapshot = await get(ref(db, "adminSettings"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        maxTeamCost: data.maxTeamCost ?? 10,
        maxWeaponCost: data.maxWeaponCost ?? 10, // Если нет в базе, берем дефолт
      };
    }
    // Если настроек нет, создаем дефолтные
    const defaultSettings = { maxTeamCost: 10, maxWeaponCost: 10 };
    await update(ref(db, "adminSettings"), defaultSettings);
    return defaultSettings;
  }
);

// Обновление настроек
export const updateAdminSettings = createAsyncThunk(
  "adminSettings/update",
  async (newSettings: Partial<{ maxTeamCost: number; maxWeaponCost: number }>) => {
    await update(ref(db, "adminSettings"), newSettings);
    return newSettings;
  }
);

const adminSettingsSlice = createSlice({
  name: "adminSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminSettings.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAdminSettings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.maxTeamCost = action.payload.maxTeamCost;
        state.maxWeaponCost = action.payload.maxWeaponCost;
      })
      .addCase(fetchAdminSettings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка загрузки настроек";
      })
      .addCase(updateAdminSettings.fulfilled, (state, action) => {
        if (action.payload.maxTeamCost !== undefined) {
          state.maxTeamCost = action.payload.maxTeamCost;
        }
        if (action.payload.maxWeaponCost !== undefined) {
          state.maxWeaponCost = action.payload.maxWeaponCost;
        }
      });
  },
});

export default adminSettingsSlice.reducer;