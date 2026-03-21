"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
// fetchAllDuels больше не нужен для основной логики, но можно оставить для импорта типов если нужно
import { useAdmin } from "@/lib/hook/useAdmin";
import {
  ActiveDuelsSection,
  DuelInvitesSection,
  FinishedDuelsSection,
  Header,
  Loading,
} from "./components";
import { fetchAllUsers } from "@/lib/slices/usersSlice";
// Импортируем функции Firebase для подписки
import { ref, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { Duel } from "@/lib/types";
import toast from "react-hot-toast";

export default function DuelsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading: authLoading } = useAdmin();

  // ✅ 1. Создаем локальные стейты для списков дуэлей
  const [activeDuels, setActiveDuels] = useState<Duel[]>([]);
  const [finishedDuels, setFinishedDuels] = useState<Duel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Статус пользователей оставляем из Redux
  const usersStatus = useSelector((state: RootState) => state.users?.status);

  // ✅ 2. Подписка на Realtime обновления дуэлей
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

    // Очистка подписки при выходе со страницы
    return () => {
      off(duelsRef);
      unsubscribe();
    };
  }, [user?.uid]);

  // Загрузка пользователей (оставляем как было)
  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, user?.uid]);

  // Показываем загрузку, если авторизация, дуэли или пользователи еще грузятся
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
          {/* Инвайты (если внутри DuelInvitesSection есть своя подписка, они будут работать) */}
          <DuelInvitesSection userId={user.uid} />

          {/* ✅ Передаем стейты, которые обновляются в реальном времени */}
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
