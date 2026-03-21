import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

export interface UserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: "user" | "admin";
}

interface UsersState {
  list: UserInfo[];
  status: "idle" | "loading" | "succeeded" | "failed";
}

export const fetchAllUsers = createAsyncThunk("users/fetchAll", async () => {
  const usersSnap = await get(ref(db, "users"));
  if (!usersSnap.exists()) return [];
  
  // Возвращаем массив пользователей со всеми вложенными данными
  return Object.entries(usersSnap.val()).map(([uid, data]) => ({
    uid,
    ...(data as any),
  }));
});

const usersSlice = createSlice({
  name: "users",
  initialState: { list: [], status: "idle" } as UsersState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      });
  },
});

export default usersSlice.reducer;
