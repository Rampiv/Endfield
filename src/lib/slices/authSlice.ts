import { auth, db } from "@/lib/firebase";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AuthError,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { ref, set } from "firebase/database";

// --- Типы ---
interface LoginProps {
  email: string;
  password: string;
}

interface RegisterProps {
  email: string;
  password: string;
  displayName: string;
}

interface CharacterProps {
  id?: string;
  name: string;
  element: string;
  rarity: string;
  image?: string;
}

interface SerializableUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  role?: "user" | "admin";
  characters?: CharacterProps[];
  weapons?: [];
}

interface AuthState {
  user: SerializableUser | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

// --- Хелпер ---
const toSerializableUser = (user: User): SerializableUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  emailVerified: user.emailVerified,
  characters: [],
  weapons: [],
});

// --- Initial State ---
const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

// --- Thunks ---
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }: LoginProps, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      return toSerializableUser(userCredential.user);
    } catch (error) {
      const authError = error as AuthError;
      return rejectWithValue(authError.message || "Ошибка входа");
    }
  },
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    { email, password, displayName }: RegisterProps,
    { rejectWithValue },
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        displayName: displayName || "",
        email: email,
        createdAt: Date.now(),
        role: "user",
      });

      await sendEmailVerification(user);
      await signOut(auth);

      return toSerializableUser(user);
    } catch (error) {
      const authError = error as AuthError;
      return rejectWithValue(authError.message || "Ошибка регистрации");
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  await signOut(auth);
});

// --- Slice ---
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearUser: (state) => {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
    setUser: (state, action: PayloadAction<SerializableUser>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Login ---
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // --- Register ---
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // --- Logout ---
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

export const { clearUser, setUser } = authSlice.actions;
export default authSlice.reducer;
export { toSerializableUser };
