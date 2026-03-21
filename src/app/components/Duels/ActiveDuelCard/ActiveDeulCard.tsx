"use client";

import { useDuelTimer } from "@/lib/hook/useDuelTimer";
import { Duel } from "@/lib/types";
import Link from "next/link";

interface Props {
  duel: Duel;
  currentUserId: string;
}

export function ActiveDuelCard({ duel, currentUserId }: Props) {
  const opponentId =
    duel.player1 === currentUserId ? duel.player2 : duel.player1;
  const { formatted, isOutOfTime } = useDuelTimer(duel.id, currentUserId);

  const statusText = {
    drafting: "Драфт персонажей",
    weapons: "Выбор оружия",
    fighting: "Битва с боссом",
    finished: "Завершена",
    cancelled: "Отменена",
  }[duel.status];

  return (
    <Link href={`/duel/${duel.id}`}>
      <div>
        <span>{statusText}</span>
        {duel.status === "drafting" && (
          <span
            className={`active-duel-card__timer ${isOutOfTime ? "active-duel-card__timer--urgent" : ""}`}
          >
            ⏱️ {formatted}
          </span>
        )}
      </div>

      <div>
        Противник: {opponentId} {/* Здесь можно подгрузить имя из users */}
      </div>

      {duel.status === "drafting" && duel.currentTurn === currentUserId && (
        <div>🔥 Ваш ход!</div>
      )}
    </Link>
  );
}
