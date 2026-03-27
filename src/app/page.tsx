"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useAdmin } from "@/lib/hook/useAdmin";
import {
  ActiveDuelsSection,
  DuelInvitesSection,
  FinishedDuelsSection,
  Header,
  Loading,
} from "./components";
import { fetchAllUsers } from "@/lib/slices/usersSlice";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { Duel } from "@/lib/types";

export default function DuelsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading: authLoading } = useAdmin();
  const [activeDuels, setActiveDuels] = useState<Duel[]>([]);
  const [finishedDuels, setFinishedDuels] = useState<Duel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const usersStatus = useSelector((state: RootState) => state.users?.status);

  // Подписка на Realtime обновления дуэлей
  useEffect(() => {
    if (!user?.uid) return;

    const duelsRef = ref(db, "duels");
    setIsLoading(true);

    // onValue срабатывает каждый раз при изменении данных в базе
    const unsubscribe = onValue(duelsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveDuels([]);
        setFinishedDuels([]);
        setIsLoading(false);
        return;
      }

      const data = snapshot.val() as Record<string, Duel>;

      // Преобразуем объект в массив и добавляем ID
      const duelsList = Object.entries(data).map(([id, duel]) => ({
        ...duel,
        id,
      }));

      // Разделяем на активные и завершенные
      const active = duelsList.filter(
        (d) => d.status !== "finished" && d.status !== "cancelled",
      );
      const finished = duelsList.filter((d) => d.status === "finished");

      setActiveDuels(active);
      setFinishedDuels(finished);
      setIsLoading(false);
    });

    return () => {
      off(duelsRef);
      unsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, user?.uid]);

  if (authLoading || isLoading || usersStatus === "loading") {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  if (usersStatus === "failed") {
    return (
      <>
        <Header />
        <main className="duels-page">
          <div className="duels-page__error">
            <h2>❌ Ошибка загрузки данных</h2>
            <p>Попробуйте обновить страницу</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="duels-page">
          <div className="duels-page__login-prompt">
            <h2>🔐 Войдите для участия в дуэлях</h2>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="duels-page">
        <div className="container">
          <DuelInvitesSection userId={user.uid} />
          <ActiveDuelsSection duels={activeDuels} currentUserId={user.uid} />
          <FinishedDuelsSection
            duels={finishedDuels}
            currentUserId={user.uid}
          />
        </div>
      </main>
      <div className="background"></div>
    </>
  );
}
