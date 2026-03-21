import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../firebase";
import { Weapon } from "../types";

interface WeaponsState {
  items: Weapon[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: WeaponsState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchWeapons = createAsyncThunk("weapons/fetch", async () => {
  const snapshot = await get(ref(db, "weapons"));
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.entries(data).map(([id, value]) => ({
      ...(value as Weapon),
      id,
    }));
  }
  return [];
});

export const addWeapon = createAsyncThunk(
  "weapons/add",
  async (weapon: Omit<Weapon, "id" | "createdAt">) => {
    const newRef = ref(db, `weapons/${Date.now()}`);
    await set(newRef, {
      ...weapon,
      createdAt: Date.now(),
    });
    return { id: Date.now().toString(), ...weapon };
  },
);

export const updateWeapon = createAsyncThunk(
  "weapons/update",
  async ({ id, data }: { id: string; data: Partial<Weapon> }) => {
    await update(ref(db, `weapons/${id}`), data);
    return { id, data };
  },
);

export const deleteWeapon = createAsyncThunk(
  "weapons/delete",
  async (id: string) => {
    await remove(ref(db, `weapons/${id}`));
    return id;
  },
);

const weaponsSlice = createSlice({
  name: "weapons",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeapons.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchWeapons.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchWeapons.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка загрузки";
      })
      .addCase(addWeapon.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateWeapon.fulfilled, (state, action) => {
        const index = state.items.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            ...action.payload.data,
          };
        }
      })
      .addCase(deleteWeapon.fulfilled, (state, action) => {
        state.items = state.items.filter((w) => w.id !== action.payload);
      });
  },
});

export default weaponsSlice.reducer;
