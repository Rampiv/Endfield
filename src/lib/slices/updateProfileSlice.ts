import { auth, db } from "@/lib/firebase"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { updateProfile } from "firebase/auth"
import { ref, set } from "firebase/database"


export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (displayName: string) => {
    const user = auth.currentUser

    if (!user) throw new Error("User not authenticated")

    await updateProfile(user, { displayName })

    // Обновляем displayName в базе данных
    await set(ref(db, `users/${user.uid}/displayName`), displayName)

    return { displayName }
  },
)