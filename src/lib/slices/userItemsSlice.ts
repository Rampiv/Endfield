import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { ref, set, get, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { RootState } from "../store";

interface UserItemsState {
  characterIds: string[];
  weaponIds: string[];
  constellations: Record<string, number>; 
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: UserItemsState = {
  characterIds: [],
  weaponIds: [],
  constellations: {},
  status: "idle",
  error: null,
};

// Загрузить ID предметов пользователя (и консты, если они есть в базе)
export const fetchUserItemIds = createAsyncThunk(
  "userItems/fetchIds",
  async (userId: string) => {
    const [charsSnap, weaponsSnap] = await Promise.all([
      get(ref(db, `users/${userId}/characters`)),
      get(ref(db, `users/${userId}/weapons`)),
    ]);

    const charsData = charsSnap.exists() ? charsSnap.val() : {};
    const weaponsData = weaponsSnap.exists() ? weaponsSnap.val() : {};

    const characterIds = Object.keys(charsData);
    const weaponIds = Object.keys(weaponsData);

    // ✅ Собираем консты в один объект
    const constellations: Record<string, number> = {};
    
    characterIds.forEach(id => {
      if (charsData[id]?.constellation !== undefined) {
        constellations[id] = charsData[id].constellation;
      }
    });

    weaponIds.forEach(id => {
      if (weaponsData[id]?.constellation !== undefined) {
        constellations[id] = weaponsData[id].constellation;
      }
    });

    return { characterIds, weaponIds, constellations };
  },
);

// Добавить ID предмета пользователю
export const addUserItemId = createAsyncThunk(
  "userItems/addId",
  async ({
    userId,
    type,
    itemId,
  }: {
    userId: string;
    type: "character" | "weapon";
    itemId: string;
  }) => {
    await set(ref(db, `users/${userId}/${type}s/${itemId}`), {
      addedAt: Date.now(),
      constellation: 0, // По умолчанию C0
    });
    return { type, itemId };
  },
);

// Удалить ID предмета у пользователя
export const removeUserItemId = createAsyncThunk(
  "userItems/removeId",
  async ({
    userId,
    type,
    itemId,
  }: {
    userId: string;
    type: "character" | "weapon";
    itemId: string;
  }) => {
    await remove(ref(db, `users/${userId}/${type}s/${itemId}`));
    return { type, itemId };
  },
);

// ✅ Обновить консту
export const updateUserItemConstellation = createAsyncThunk(
  "userItems/updateConstellation",
  async ({
    userId,
    type,
    itemId,
    constellation,
  }: {
    userId: string;
    type: "character" | "weapon";
    itemId: string;
    constellation: number;
  }) => {
    const path = `users/${userId}/${type}s/${itemId}`;
    await update(ref(db, path), { constellation });
    
    return { itemId, constellation };
  }
);

// ✅ Селекторы, объединяющие глобальные данные и пользовательские консты
export const selectUserCharacters = createSelector(
  [
    (state: RootState) => state.userItems.characterIds,
    (state: RootState) => state.characters.items,
    (state: RootState) => state.userItems.constellations,
  ],
  (characterIds, allCharacters, constellations) => {
    return characterIds
      .map((id) => {
        const char = allCharacters.find((c) => c.id === id);
        if (!char) return undefined;
        // ✅ Переопределяем консту на пользовательскую
        return {
          ...char,
          constellation: constellations[id] ?? char.constellation ?? 0,
        };
      })
      .filter((char): char is typeof char & { id: string } => char !== undefined);
  },
);

export const selectUserWeapons = createSelector(
  [
    (state: RootState) => state.userItems.weaponIds,
    (state: RootState) => state.weapons.items,
    (state: RootState) => state.userItems.constellations,
  ],
  (weaponIds, allWeapons, constellations) => {
    return weaponIds
      .map((id) => {
        const weapon = allWeapons.find((w) => w.id === id);
        if (!weapon) return undefined;
        // ✅ Переопределяем консту на пользовательскую
        return {
          ...weapon,
          constellation: constellations[id] ?? weapon.constellation ?? 0,
        };
      })
      .filter((weapon): weapon is typeof weapon & { id: string } => weapon !== undefined);
  },
);

const userItemsSlice = createSlice({
  name: "userItems",
  initialState,
  reducers: {
    clearUserItems: (state) => {
      state.characterIds = [];
      state.weaponIds = [];
      state.constellations = {};
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserItemIds.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserItemIds.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.characterIds = action.payload.characterIds;
        state.weaponIds = action.payload.weaponIds;
        // ✅ Сохраняем загруженные консты
        state.constellations = action.payload.constellations;
      })
      .addCase(fetchUserItemIds.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Ошибка загрузки";
      })
      .addCase(addUserItemId.fulfilled, (state, action) => {
        if (action.payload.type === "character") {
          if (!state.characterIds.includes(action.payload.itemId)) {
            state.characterIds.push(action.payload.itemId);
            state.constellations[action.payload.itemId] = 0; // Default C0
          }
        } else {
          if (!state.weaponIds.includes(action.payload.itemId)) {
            state.weaponIds.push(action.payload.itemId);
            state.constellations[action.payload.itemId] = 0; // Default C0
          }
        }
      })
      .addCase(removeUserItemId.fulfilled, (state, action) => {
        const id = action.payload.itemId;
        if (action.payload.type === "character") {
          state.characterIds = state.characterIds.filter((cid) => cid !== id);
        } else {
          state.weaponIds = state.weaponIds.filter((wid) => wid !== id);
        }
        // ✅ Удаляем консту из памяти при удалении предмета
        delete state.constellations[id];
      })
      .addCase(updateUserItemConstellation.fulfilled, (state, action) => {
        const { itemId, constellation } = action.payload;
        // ✅ Обновляем консту в локальном стейте
        state.constellations[itemId] = constellation;
      });
  },
});

export const { clearUserItems } = userItemsSlice.actions;
export default userItemsSlice.reducer;