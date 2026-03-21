"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { Duel } from "../types";

export function useDuelPermissions(duel: Duel | null, userId: string | null) {
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isAdmin = userRole === "admin";

  const isPlayer = duel?.player1 === userId || duel?.player2 === userId;
  const isFinished =
    duel?.status === "finished" || duel?.status === "cancelled";

  return {
    // Можно ли редактировать дуэль
    canEdit: isAdmin || (!isFinished && isPlayer),

    // Можно ли подать результат
    canSubmitResult: !isFinished && isPlayer,

    // Можно ли использовать ретрай
    canRetry: () => {
      if (isAdmin) return true;
      if (!isPlayer || isFinished) return false;
      const retries = duel?.retries?.[userId];
      return retries ? retries.remaining > 0 : false;
    },

    // Можно ли видеть историю
    canViewHistory: isAdmin,

    // Можно ли менять статус
    canChangeStatus: isAdmin,

    // Оставшиеся ретраи
    remainingRetries:
      userId && duel?.retries ? (duel.retries[userId]?.remaining ?? 0) : 0,
  };
}
