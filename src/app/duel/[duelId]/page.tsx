// src/app/duel/[duelId]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { use } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useRouter } from "next/navigation";
import { clearActiveDuel, setActiveDuel } from "@/lib/slices/duelsSlice";
import { useAdmin } from "@/lib/hook/useAdmin";
import {
  BossFightResults,
  DraftPhase,
  Header,
  Loading,
} from "@/app/components";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Duel } from "@/lib/types";
import toast from "react-hot-toast";
import "./duelPage.scss";

interface PageProps {
  params: Promise<{ duelId: string }>;
}

const PHASES = ["drafting", "fighting"];

export default function DuelPage({ params }: PageProps) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useAdmin();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const { duelId } = use(params);

  const duel = useSelector((state: RootState) => state.duels.activeDuel);
  const status = useSelector((state: RootState) => state.duels.status);

  const isParticipant = useMemo(
    () =>
      user && duel && (duel.player1 === user.uid || duel.player2 === user.uid),
    [user, duel],
  );
  const isAdmin = userRole === "admin";

  // Начальная фаза
  const getInitialPhase = () => {
    if (!duel) return "drafting";
    if (duel.status === "finished") return "fighting";
    return duel.status;
  };

  const [viewPhase, setViewPhase] = useState<string>(getInitialPhase());
  const prevDuelDataRef = useRef<any>(null);

  // ✅ 1. ПОДПИСКА НА ДАННЫЕ (Только чтение и обновление Redux)
  useEffect(() => {
    if (!user?.uid || !duelId) return;

    // Слушаем только КОНКРЕТНУЮ дуэль
    const currentDuelRef = ref(db, `duels/${duelId}`);

    const unsubscribe = onValue(currentDuelRef, (snapshot) => {
      if (!snapshot.exists()) {
        dispatch(setActiveDuel(null));
        prevDuelDataRef.current = null;
        return;
      }

      const currentDuelData = snapshot.val() as Duel;
      const currentDuelWithId = { ...currentDuelData, id: duelId };
      const currentDataStr = JSON.stringify(currentDuelWithId);

      if (currentDataStr !== prevDuelDataRef.current) {
        dispatch(setActiveDuel(currentDuelWithId));
        prevDuelDataRef.current = currentDataStr;
        // Синхронизацию фаз вынесли в отдельный эффект ниже
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, user?.uid, duelId]);

  // ✅ 2. СИНХРОНИЗАЦИЯ ФАЗЫ (Автоматическое переключение при изменении статуса)
  useEffect(() => {
    if (!duel) return;

    // Порядок фаз для сравнения
    const phaseOrder: Record<string, number> = { 
      drafting: 0, 
      weapons: 1, 
      fighting: 2, 
      finished: 3 
    };

    const currentIndex = phaseOrder[viewPhase] ?? -1;
    const realIndex = phaseOrder[duel.status] ?? -1;

    // Если дуэль завершена, всегда переключаем на результаты
    if (duel.status === 'finished') {
      if (viewPhase !== 'fighting') setViewPhase('fighting');
      return;
    }

    // Если реальная фаза ушла вперед или назад относительно текущей вьюхи — синхронизируемся
    // Это гарантирует, что мы всегда видим актуальный статус, если не ушли в архив намеренно
    // Но так как у нас нет флага "архив", мы просто следуем за сервером, если фаза изменилась
    if (currentIndex !== realIndex) {
      setViewPhase(duel.status);
    }
    
  }, [duel?.status, duel?.id, viewPhase]);

  const handleStatusChange = async (newStatus: string) => {
    if (!duel || !isAdmin) return;
    try {
      await update(ref(db, `duels/${duel.id}`), {
        status: newStatus,
        currentTurn: newStatus === "drafting" ? duel.player1 : duel.currentTurn,
      });
      toast.success(`Фаза изменена на: ${newStatus}`);
    } catch (error) {
      toast.error("Ошибка смены фазы");
    }
  };

  const navigatePhase = (targetPhase: string) => {
    if (!duel) return;
    setViewPhase(targetPhase);
    if (targetPhase !== duel.status) {
      toast(`👁️ Просмотр архива: ${targetPhase}`);
    } else {
      toast.success("🔴 Live режим");
    }
  };

  if (!duelId || status === "loading" || !duel) {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  const currentViewPhase = viewPhase;
  
  // ✅ ИСПРАВЛЕНИЕ: Live только если фаза просмотра совпадает с реальной фазой в базе
  const isLive = currentViewPhase === duel.status;

  const isReadOnly =
    (!isAdmin && duel.status === "finished") ||
    (!isAdmin && !isParticipant) ||
    currentViewPhase !== duel.status;

  return (
    <>
      <Header />
      <main className="duel-page" style={{ position: "relative" }}>
        <div className="container">
          <section className="section">
            <h1 className="duel-page__title">
              Дуэль {isLive ? "(Активная)" : `(Архив: ${currentViewPhase})`}
            </h1>

            {/* 🛠 ПАНЕЛЬ АДМИНА */}
            {isAdmin && (
              <div className="duel-admin">
                <h3 className="duel-admin__h3">Управление дуэлью</h3>
                <div className="duel-admin__btns">
                  {PHASES.map((phase) => (
                    <button
                      key={phase}
                      onClick={() => handleStatusChange(phase)}
                      disabled={duel.status === phase}
                      className="duel-admin__btn"
                    >
                      {duel.status === phase
                        ? "✅ Текущая"
                        : `Назначить в ${phase}`}
                    </button>
                  ))}
                  {duel.status === 'finished' && (
                     <button
                     onClick={() => handleStatusChange('fighting')}
                     className="duel-admin__btn"
                     style={{ background: "#ef4444" }}
                   >
                     ↩️ Вернуть в бой
                   </button>
                  )}
                </div>
              </div>
            )}

            {/* 🧭 НАВИГАЦИЯ */}
            <div className="spectator-nav">
              <button
                onClick={() => navigatePhase("drafting")}
                disabled={currentViewPhase === "drafting"}
                className="spectator-nav__btn"
                style={{
                  cursor:
                    currentViewPhase === "drafting" ? "not-allowed" : "pointer",
                  background:
                    currentViewPhase === "drafting" ? "#22c55e" : "#3b82f6",
                }}
              >
                📝 Драфт
              </button>

              <button
                onClick={() => navigatePhase("fighting")}
                disabled={currentViewPhase === "fighting"}
                className="spectator-nav__btn"
                style={{
                  cursor:
                    currentViewPhase === "fighting" ? "not-allowed" : "pointer",
                  background:
                    currentViewPhase === "fighting" ? "#22c55e" : "#3b82f6",
                }}
              >
                ⚔️ Бой
              </button>
            </div>

            {/* Рендеринг контента */}
            {currentViewPhase === "drafting" && (
              <DraftPhase
                duel={duel}
                currentUserId={user?.uid || "spectator"}
                isReadOnly={isReadOnly}
              />
            )}

            {(currentViewPhase === "fighting" || duel.status === "finished") && (
              <BossFightResults
                duel={duel}
                currentUserId={user?.uid || "spectator"}
                isReadOnly={isReadOnly}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}