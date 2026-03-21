// src/components/duels/BossFightResults.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { submitDuelResult, adminRetryResult } from "@/lib/slices/duelsSlice";
import { update, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Duel } from "@/lib/types";
import "./BossFightResult.scss";
import { getDefaultDuelSettings } from "@/lib/config/duelConfig";
import { fetchAllUsers } from "@/lib/slices/usersSlice";

interface Props {
  duel: Duel;
  currentUserId: string;
  isReadOnly?: boolean;
}

interface ModalData {
  type: "submit" | "retry" | "admin_edit";
  targetUserId: string;
  initialTime?: number;
  initialRetriesUsed?: number;
}

export function BossFightResults({
  duel,
  currentUserId,
  isReadOnly = false,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isAdmin = userRole === "admin";

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const [bossTime, setBossTime] = useState("");
  const [retriesUsed, setRetriesUsed] = useState<number>(0);
  const [reason, setReason] = useState("");

  const player1Id = duel.player1;
  const player2Id = duel.player2;

  const p1Result = duel.results?.[player1Id];
  const p2Result = duel.results?.[player2Id];

  const isFinished = duel.status === "finished";

  const allUsers = useSelector((state: RootState) => state.users?.list || []);

  useEffect(() => {
    if (!allUsers || allUsers.length === 0) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, allUsers]);

  const timeDiff = useMemo(() => {
    if (!p1Result?.bossTime || !p2Result?.bossTime) return null;
    return p1Result.bossTime - p2Result.bossTime;
  }, [p1Result, p2Result]);

  const openModal = (
    type: ModalData["type"],
    userId: string,
    time?: number,
    retriesUsedVal?: number,
  ) => {
    if (isReadOnly && !isAdmin) return;

    setModalData({
      type,
      targetUserId: userId,
      initialTime: time,
      initialRetriesUsed: retriesUsedVal,
    });
    setBossTime(time !== undefined ? time.toString() : "");
    setRetriesUsed(retriesUsedVal !== undefined ? retriesUsedVal : 0);
    setReason("");
    setShowModal(true);
  };

  const handleQuickRetry = async (userId: string) => {
    if (isReadOnly && !isAdmin) return;

    const retries = duel.retries?.[userId];
    const maxRetries =
      duel.settings.maxRetries || getDefaultDuelSettings().maxRetries;

    if (!retries || retries.remaining <= 0) {
      toast.error("❌ Нет доступных ретраев");
      return;
    }

    try {
      await update(ref(db, `duels/${duel.id}/retries/${userId}`), {
        remaining: retries.remaining - 1,
        used: (retries.used || 0) + 1,
      });
      toast.success("🔄 Ретрай использован!");
    } catch (error: any) {
      toast.error(error.message || "❌ Ошибка");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData) return;

    const timeVal = parseFloat(bossTime);

    if (modalData.type === "submit" && (isNaN(timeVal) || timeVal <= 0)) {
      toast.error("❌ Введите корректное время");
      return;
    }

    try {
      if (modalData.type === "admin_edit") {
        const updates: any = {};
        if (!isNaN(timeVal) && timeVal > 0) {
          updates[`results/${modalData.targetUserId}`] = {
            bossTime: timeVal,
            submittedAt: Date.now(),
            modifiedBy: "admin",
          };
        }
        if (retriesUsed >= 0) {
          const maxRetries = duel.settings.maxRetries || 1;
          updates[`retries/${modalData.targetUserId}`] = {
            remaining: Math.max(0, maxRetries - retriesUsed),
            used: retriesUsed,
            max: maxRetries,
          };
        }
        await update(ref(db, `duels/${duel.id}`), updates);
        toast.success("✅ Данные обновлены (Admin)");
      } else if (modalData.type === "retry") {
        if (!isNaN(timeVal) && timeVal > 0) {
          await dispatch(
            adminRetryResult({
              duelId: duel.id,
              targetUserId: modalData.targetUserId,
              bossTime: timeVal,
              reason: reason || "Player retry",
            }),
          ).unwrap();
        } else {
          const currentRetries = duel.retries?.[modalData.targetUserId];
          if (currentRetries && currentRetries.remaining > 0) {
            await update(
              ref(db, `duels/${duel.id}/retries/${modalData.targetUserId}`),
              {
                remaining: currentRetries.remaining - 1,
                used: (currentRetries.used || 0) + 1,
              },
            );
            toast.success("🔄 Попытка ретрая использована");
          }
        }
      } else {
        await dispatch(
          submitDuelResult({
            duelId: duel.id,
            userId: modalData.targetUserId,
            bossTime: timeVal,
            isRetry: false,
            reason: null,
          }),
        ).unwrap();
      }

      setShowModal(false);
      setBossTime("");
      setReason("");
    } catch (error: any) {
      toast.error(error.message || "❌ Ошибка сохранения");
    }
  };

  const userNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach((user) => {
      if (user.uid && user.displayName) {
        map.set(user.uid, user.displayName);
      } else if (user.uid) {
        map.set(user.uid, `User_${user.uid.slice(0, 5)}`);
      }
    });
    return map;
  }, [allUsers]);

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ РЕНДЕРА
  const renderPlayerCard = (userId: string) => {
    // ✅ Получаем имя КОНКРЕТНО для этого userId
    const playerName = userNamesMap.get(userId) || "Игрок";
    
    const isMe = userId === currentUserId;
    const result = duel.results?.[userId];
    const retries = duel.retries?.[userId];
    const maxRetries = duel.settings.maxRetries || 1;
    const usedRetries = retries?.used || 0;
    const remainingRetries = retries?.remaining || maxRetries;

    // Админ может редактировать всех. Игрок может редактировать только себя (и только если не readOnly)
    const canEdit = isAdmin || (isMe && !isReadOnly);
    const hasResult = !!result?.bossTime;

    return (
      <div
        key={userId}
        className={`player-card ${isMe ? "player-card--me" : ""}`}
      >
        <div className="card-header">
          {/* ✅ Используем правильное имя */}
          <h3>{isMe ? `🎮 Вы (${playerName})` : `👤 ${playerName}`}</h3>
          
          {canEdit && (
            <button
              onClick={() =>
                openModal("admin_edit", userId, result?.bossTime, usedRetries)
              }
              className="edit-btn"
              title="Редактировать"
            >
              ✏️
            </button>
          )}
        </div>

        <div className="result-block">
          <div className="label">Время:</div>
          {hasResult ? (
            <div className="time-value">
              {result.bossTime.toFixed(2)} <span>сек</span>
            </div>
          ) : (
            <div className="time-empty">--.--</div>
          )}
        </div>

        <div className="retries-block">
          <div className="label">
            Ретраи: <strong>{remainingRetries}</strong> / {maxRetries}
          </div>
          <div className="retries-dots">
            {Array.from({ length: maxRetries }).map((_, idx) => {
              const isUsed = idx < usedRetries;
              return (
                <div
                  key={idx}
                  className={`retry-dot ${isUsed ? "retry-dot--used" : "retry-dot--available"}`}
                  title={isUsed ? "Использован" : "Доступен"}
                />
              );
            })}
          </div>
        </div>

        <div className="actions">
          {!hasResult && canEdit ? (
            <button
              onClick={() => openModal("submit", userId)}
              className="btn btn--submit"
            >
              📝 Подать результат
            </button>
          ) : null}

          {canEdit && remainingRetries > 0 && (
            <button
              onClick={() => handleQuickRetry(userId)}
              disabled={isReadOnly && !isAdmin}
              className="btn btn--retry"
            >
              Использовать ретрай
            </button>
          )}

          {hasResult && canEdit && (
            <button
              onClick={() =>
                openModal("admin_edit", userId, result.bossTime, usedRetries)
              }
              className="btn btn--edit"
            >
              Редактировать
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="boss-fight-results">
      <h2 className="title">👹 Результаты битвы</h2>

      <div className="players-grid">
        {/* ✅ Передаем только userId, имя вычисляется внутри */}
        {renderPlayerCard(player1Id)}
        {renderPlayerCard(player2Id)}
      </div>

      {p1Result?.bossTime && p2Result?.bossTime && (
        <div className="diff-block">
          <span className="label">Разница:</span>
          <span
            className={`value ${timeDiff! > 0 ? "value--p2-faster" : timeDiff! < 0 ? "value--p1-faster" : "value--draw"}`}
          >
            {timeDiff! > 0 ? "+" : ""}
            {timeDiff!.toFixed(2)} сек
          </span>
          <span className="comment">
            (
            {timeDiff! > 0
              ? `${userNamesMap.get(player2Id)} быстрее`
              : timeDiff! < 0
                ? `${userNamesMap.get(player1Id)} быстрее`
                : "Ничья"}
            )
          </span>
        </div>
      )}

      {isFinished && duel.results?.winner && (
        <div className="winner-block">
          <h2>
            Победитель:{" "}
            {duel.results.winner === currentUserId
              ? "ВЫ!"
              : userNamesMap.get(duel.results.winner) || "Противник"}
          </h2>
        </div>
      )}

      {showModal && modalData && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modalData.type === "submit" && "📝 Подача результата"}
              {modalData.type === "retry" && "🔄 Использование ретрая"}
              {modalData.type === "admin_edit" && "🛠 Редактирование"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  Время (сек):
                  {modalData.type === "retry" && (
                    <div className="hint">
                      (оставьте пустым, чтобы только списать попытку)
                    </div>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bossTime}
                  onChange={(e) => setBossTime(e.target.value)}
                  placeholder="145.50"
                  required={
                    modalData.type === "submit" ||
                    (modalData.type === "admin_edit" && retriesUsed === 0)
                  }
                />
              </div>

              {modalData.type === "admin_edit" && (
                <div className="form-group">
                  <label>Использовано ретраев:</label>
                  <input
                    type="number"
                    min="0"
                    max={duel.settings.maxRetries || 1}
                    value={retriesUsed}
                    onChange={(e) =>
                      setRetriesUsed(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              )}

              {(modalData.type === "retry" ||
                modalData.type === "admin_edit") && (
                <div className="form-group">
                  <label>Причина (опционально):</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Комментарий..."
                    rows={2}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn--cancel"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`btn--confirm ${
                    modalData.type === "admin_edit"
                      ? "btn--admin"
                      : modalData.type === "retry"
                        ? "btn--retry"
                        : "btn--submit"
                  }`}
                >
                  {modalData.type === "submit"
                    ? "Отправить"
                    : modalData.type === "retry"
                      ? "Подтвердить ретрай"
                      : "Сохранить изменения"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}