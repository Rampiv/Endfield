// src/app/duels/page.tsx
"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchAllDuels } from "@/lib/slices/duelsSlice";
import { useAdmin } from "@/lib/hook/useAdmin";
import {
  ActiveDuelsSection,
  DuelInvitesSection,
  FinishedDuelsSection,
  Header,
  Loading,
} from "./components";
import { fetchAllUsers } from "@/lib/slices/usersSlice";

export default function DuelsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading: authLoading } = useAdmin();

  const activeDuels = useSelector((state: RootState) => state.duels.activeDuels);
  const finishedDuels = useSelector((state: RootState) => state.duels.finishedDuels);
  const duelsStatus = useSelector((state: RootState) => state.duels.status);
  const usersStatus = useSelector((state: RootState) => state.users?.status);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchAllDuels());
      dispatch(fetchAllUsers());
    }
  }, [dispatch, user?.uid]);

  if (authLoading || duelsStatus === "loading" || usersStatus === "loading") {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  if (duelsStatus === "failed" || usersStatus === "failed") {
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
          
          <FinishedDuelsSection duels={finishedDuels} currentUserId={user.uid} />
        </div>
      </main>
    </>
  );
}