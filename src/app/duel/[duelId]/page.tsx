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
import { ref, onValue, off, update } from "firebase/database";
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

  // ✅ ИСПРАВЛЕНИЕ 1: Логика начальной фазы
  const getInitialPhase = () => {
    if (!duel) return "drafting";
    
    // Если дуэль завершена -> сразу показываем бой (результаты)
    if (duel.status === "finished") {
      return "fighting";
    }
    
    // Если зритель -> показываем текущую фазу
    if (!isParticipant) {
      return duel.status;
    }

    // Иначе следуем за статусом
    return duel.status;
  };

  const [viewPhase, setViewPhase] = useState<string>(getInitialPhase());
  const prevDuelDataRef = useRef<any>(null);

  // Подписка на Firebase
  useEffect(() => {
    if (!user?.uid) return;

    const duelRef = ref(db, "duels");

    const unsubscribe = onValue(duelRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (prevDuelDataRef.current !== null) {
          dispatch(setActiveDuel(null));
          prevDuelDataRef.current = null;
        }
        return;
      }

      const duels = snapshot.val() as Record<string, Duel>;
      const currentDuel = duels[duelId];

      const currentDataStr = currentDuel ? JSON.stringify(currentDuel) : "null";

      if (currentDataStr !== prevDuelDataRef.current) {
        dispatch(setActiveDuel(currentDuel || null));
        prevDuelDataRef.current = currentDataStr;

        // ✅ ИСПРАВЛЕНИЕ 2: Синхронизация фазы при изменении данных
        if (currentDuel) {
          // Если дуэль только что завершилась, переключаем вид на 'fighting'
          if (currentDuel.status === 'finished' && viewPhase !== 'fighting') {
             setViewPhase('fighting');
          } 
          // Если мы в Live режиме и статус сменился (например drafting -> fighting)
          else if (viewPhase === duel?.status && currentDuel.status !== viewPhase && currentDuel.status !== 'finished') {
             setViewPhase(currentDuel.status);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, user?.uid, duelId, viewPhase, duel?.status]);

  // Обновление viewPhase, если сменилась сама дуэль (переход по ссылке)
  useEffect(() => {
    if (duel) {
      const newPhase = getInitialPhase();
      if (viewPhase !== newPhase) {
        setViewPhase(newPhase);
      }
    }
  }, [duel?.id]);

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

  // Показываем загрузку, пока дуэль не найдена
  if (!duelId || status === "loading" || !duel) {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  const currentViewPhase = viewPhase;
  
  // ✅ ИСПРАВЛЕНИЕ 3: Считаем Live, если дуэль завершена и мы смотрим на бой
  const isLive = currentViewPhase === duel.status || (duel.status === 'finished' && currentViewPhase === 'fighting');

  // Логика ReadOnly
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
              Дуэль {isLive ? "(Завершена)" : `(Архив: ${currentViewPhase})`}
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
                  {/* Кнопка для возврата из finished, если нужно */}
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

            {/* 🧭 НАВИГАЦИЯ ДЛЯ ИГРОКОВ И ЗРИТЕЛЕЙ */}
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

            {/* ✅ ИСПРАВЛЕНИЕ 4: Показываем Бой, если выбрана эта фаза ИЛИ если дуэль завершена */}
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