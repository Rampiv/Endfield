// src/components/duels/DuelInvitesSection.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  acceptDuelInvite,
  declineDuelInvite,
  sendDuelInvite,
  setInvites,
} from "@/lib/slices/duelsSlice";
import toast from "react-hot-toast";
import { onValue, ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { DuelInvite, Duel } from "@/lib/types";
import { getDefaultDuelSettings } from "@/lib/config/duelConfig";
import "./InviteSection.scss";

interface Props {
  userId: string;
}

const defaultSettings = getDefaultDuelSettings();

export function DuelInvitesSection({ userId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const receivedInvites = useSelector(
    (state: RootState) => state.duels.receivedInvites,
  );
  const sentInvites = useSelector(
    (state: RootState) => state.duels.sentInvites,
  );
  const activeDuels = useSelector(
    (state: RootState) => state.duels.activeDuels,
  );
  const allUsers = useSelector((state: RootState) => state.users?.list || []);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const userNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach((user: any) => {
      if (user?.uid) {
        map.set(
          user.uid,
          user.displayName || user.email || user.uid.slice(0, 8),
        );
      }
    });
    return map;
  }, [allUsers]);

  useEffect(() => {
    if (!userId) return;

    const invitesRef = ref(db, "duelInvites");

    const unsubscribe = onValue(invitesRef, (snapshot) => {
      if (!snapshot.exists()) {
        dispatch(setInvites({ received: [], sent: [] }));
        return;
      }

      const invites = Object.entries(snapshot.val()).map(([id, data]) => ({
        ...(data as DuelInvite),
        id,
      })) as DuelInvite[];

      const received = invites.filter(
        (inv) => inv.to === userId && inv.status === "pending",
      );
      const sent = invites.filter(
        (inv) => inv.from === userId && inv.status === "pending",
      );

      dispatch(setInvites({ received, sent }));
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [dispatch, userId]);

  // ✅ УЛУЧШЕННАЯ ПРОВЕРКА ДОСТУПНОСТИ СОПЕРНИКА
  const availableOpponents = useMemo(() => {
    return allUsers.filter((user: any) => {
      if (!user?.uid || user.uid === userId) return false;

      // 1. Проверка по списку активных дуэлей (быстрая)
      const hasVisibleActiveDuel = activeDuels.some(
        (duel) =>
          (duel.player1 === userId && duel.player2 === user.uid) ||
          (duel.player2 === userId && duel.player1 === user.uid),
      );
      if (hasVisibleActiveDuel) return false;

      // 2. Проверка на.pending инвайты
      const hasPendingInvite = sentInvites.some(
        (invite) => invite.to === user.uid && invite.status === "pending",
      );
      if (hasPendingInvite) return false;

      // 3. Глубокая проверка: если в профиле пользователя есть activeDuel,
      // но её нет в списке activeDuels (значит она битая/завершенная),
      // мы всё равно считаем игрока доступным (так как бэкенд очистит это при отправке).
      // Но для UI лучше перестраховаться и проверить наличие реальной дуэли.
      const userActiveDuelId = user?.activeDuel?.duelId;
      if (userActiveDuelId) {
        const realDuelExists = activeDuels.some(d => d.id === userActiveDuelId && d.status !== 'finished');
        if (realDuelExists) {
           // Если дуэль реально есть и активна -> блокируем
           return false;
        }
        // Если дуэли нет в списке activeDuels, значит она либо завершена, либо удалена.
        // Считаем игрока доступным (бэкенд почистит хвосты).
      }

      return true;
    });
  }, [allUsers, activeDuels, sentInvites, userId]);

  const handleAccept = async (inviteId: string) => {
    try {
      await dispatch(
        acceptDuelInvite({ inviteId, settings: defaultSettings }),
      ).unwrap();
      toast.success("✅ Дуэль принята!");
    } catch (error: any) {
      toast.error(error.message || "❌ Ошибка");
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await dispatch(declineDuelInvite(inviteId)).unwrap();
      toast.success("❌ Инвайт отклонён");
    } catch (error) {
      toast.error("❌ Ошибка");
    }
  };

  const handleSendInvite = async () => {
    if (!selectedOpponent) {
      toast.error("❌ Выберите противника");
      return;
    }

    setIsSending(true);
    try {
      await dispatch(
        sendDuelInvite({
          from: userId,
          to: selectedOpponent,
          settings: defaultSettings,
        }),
      ).unwrap();

      toast.success("✅ Инвайт отправлен!");
      setShowInviteForm(false);
      setSelectedOpponent("");
    } catch (error: any) {
      toast.error(error.message || "❌ Ошибка отправки");
    } finally {
      setIsSending(false);
    }
  };

  const getUserName = (uid: string) => {
    return userNamesMap.get(uid) || "Игрок";
  };

  if (receivedInvites.length === 0 && !showInviteForm) {
    return (
      <section className="section">
        <h2 className="h2-common">Вызов на дуэль</h2>

        <div className="invite__content">
          <p>У вас нет входящих вызовов</p>
          <button onClick={() => setShowInviteForm(true)}>
            Пригласить на дуэль
          </button>
        </div>

        {showInviteForm && (
          <div className="invite__content">
            <p>Пригласить игрока</p>

            <select
              value={selectedOpponent}
              onChange={(e) => setSelectedOpponent(e.target.value)}
              disabled={isSending}
            >
              <option value="">Выберите противника...</option>
              {availableOpponents.length > 0 ? (
                availableOpponents.map((user: any) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName || user.email || user.uid}
                  </option>
                ))
              ) : (
                <option disabled>Нет доступных игроков</option>
              )}
            </select>

            <div>
              <button
                onClick={handleSendInvite}
                disabled={!selectedOpponent || isSending}
              >
                {isSending ? "Отправка..." : "📤 Отправить вызов"}
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setSelectedOpponent("");
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="section">
      <div>
        <h2 className="h2-common">Входящие вызовы</h2>
        {!showInviteForm && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="btn-toggle-form"
          >
            Создать дуэль
          </button>
        )}
      </div>

      {showInviteForm && (
        <div className="invite__content">
          <p>Пригласить игрока</p>

          <select
            value={selectedOpponent}
            onChange={(e) => setSelectedOpponent(e.target.value)}
            disabled={isSending}
          >
            <option value="">Выберите противника...</option>
            {availableOpponents.length > 0 ? (
              availableOpponents.map((user: any) => (
                <option key={user.uid} value={user.uid}>
                  {user.displayName || user.email || user.uid}
                </option>
              ))
            ) : (
              <option disabled>Нет доступных игроков</option>
            )}
          </select>

          <div className="invite__btns">
            <button
              onClick={handleSendInvite}
              disabled={!selectedOpponent || isSending}
            >
              {isSending ? "Отправка..." : "📤 Отправить вызов"}
            </button>
            <button
              onClick={() => {
                setShowInviteForm(false);
                setSelectedOpponent("");
              }}
              disabled={isSending}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {receivedInvites.length > 0 && (
        <div className="invites-list">
          {receivedInvites.map((invite) => (
            <div key={invite.id} className="invite-card">
              <span className="invite-sender">
                От: <strong>{getUserName(invite.from)}</strong>
              </span>

              <div className="invite-card__actions">
                <button
                  onClick={() => handleAccept(invite.id)}
                  className="btn-accept"
                >
                  ✅ Принять
                </button>
                <button
                  onClick={() => handleDecline(invite.id)}
                  className="btn-decline"
                >
                  ❌ Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}