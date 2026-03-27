"use client";

import { useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "./firebase";
import { useDispatch } from "react-redux";
import { AppDispatch } from "./store";
import { clearUser, setUser, toSerializableUser } from "./slices/authSlice";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        // 1. Получаем базовые данные из Auth
        const serializableUser = toSerializableUser(user);

        // 2. Загружаем дополнительные данные из Database
        try {
          const userSnapshot = await get(ref(db, `users/${user.uid}`));
          if (userSnapshot.exists()) {
            const dbData = userSnapshot.val();
            // 3. Объединяем данные
            dispatch(
              setUser({
                ...serializableUser,
                displayName: dbData.displayName || serializableUser.displayName,
                role: dbData.role || "user",
              }),
            );
          } else {
            dispatch(setUser(serializableUser));
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          dispatch(setUser({ ...serializableUser, role: "user" }));
        }
      } else {
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
}
