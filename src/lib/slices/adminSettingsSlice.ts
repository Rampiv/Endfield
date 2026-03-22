// src/lib/slices/adminSettingsSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";

interface AdminSettingsState {
  maxTeamCost: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AdminSettingsState = {
  maxTeamCost: 10, // Значение по умолчанию
  status: "idle",
  error: null,
};

// Загрузка настроек
export const fetchAdminSettings = createAsyncThunk(
  "adminSettings/fetch",
  async () => {
    const snapshot = await get(ref(db, "adminSettings"));
    if (snapshot.exists()) {
      return snapshot.val() as { maxTeamCost: number };
    }
    // Если настроек нет, возвращаем дефолт и создаем запись в БД (опционально)
    const defaultSettings = { maxTeamCost: 10 };
    await update(ref(db, "adminSettings"), defaultSettings);
    return defaultSettings;
  }
);

// Обновление настроек
export const updateAdminSettings = createAsyncThunk(
  "adminSettings/update",
  async (newSettings: Partial<{ maxTeamCost: number }>) => {
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
      })
      .addCase(fetchAdminSettings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка загрузки настроек";
      })
      .addCase(updateAdminSettings.fulfilled, (state, action) => {
        if (action.payload.maxTeamCost !== undefined) {
          state.maxTeamCost = action.payload.maxTeamCost;
        }
      });
  },
});

export default adminSettingsSlice.reducer;