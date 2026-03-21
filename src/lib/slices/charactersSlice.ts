import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../firebase";
import { Character } from "../types";

interface CharactersState {
  items: Character[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: CharactersState = {
  items: [],
  status: "idle",
  error: null,
};

// Получить всех персонажей
export const fetchCharacters = createAsyncThunk(
  "characters/fetch",
  async () => {
    const snapshot = await get(ref(db, "characters"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data).map(([id, value]) => ({
        ...(value as Character),
        id,
      }));
    }
    return [];
  },
);

// Добавить персонажа
export const addCharacter = createAsyncThunk(
  "characters/add",
  async (character: Omit<Character, "id" | "createdAt">) => {
    const newRef = ref(db, `characters/${Date.now()}`);
    await set(newRef, {
      ...character,
      createdAt: Date.now(),
    });
    return { id: Date.now().toString(), ...character };
  },
);

// Обновить персонажа
export const updateCharacter = createAsyncThunk(
  "characters/update",
  async ({ id, data }: { id: string; data: Partial<Character> }) => {
    await update(ref(db, `characters/${id}`), data);
    return { id, data };
  },
);

// Удалить персонажа
export const deleteCharacter = createAsyncThunk(
  "characters/delete",
  async (id: string) => {
    await remove(ref(db, `characters/${id}`));
    return id;
  },
);

const charactersSlice = createSlice({
  name: "characters",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCharacters.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCharacters.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCharacters.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка загрузки";
      })
      .addCase(addCharacter.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateCharacter.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            ...action.payload.data,
          };
        }
      })
      .addCase(deleteCharacter.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      });
  },
});

export default charactersSlice.reducer;
