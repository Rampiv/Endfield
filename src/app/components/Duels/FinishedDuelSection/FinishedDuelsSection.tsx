"use client";

import Link from "next/link";
import { Duel } from "@/lib/types";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { useMemo } from "react";
import { createUserNamesMap } from "@/lib/utils/userHelper";
import "./FinishedDuelsSection.scss";

interface Props {
  duels: Duel[];
  currentUserId: string;
}

export function FinishedDuelsSection({ duels, currentUserId }: Props) {
  const allUsers = useSelector((state: RootState) => state.users?.list || []);
  const userNames = useMemo(() => createUserNamesMap(allUsers), [allUsers]);

  if (duels.length === 0) {
    return null;
  }

  // Сортируем: сначала самые свежие
  const sortedDuels = [...duels].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="section finished-section">
      <h2 className="h2-common">🏆 История дуэлей</h2>

      <ul className="finished-section__list">
        {sortedDuels.map((duel, index) => {
          const isParticipant =
            duel.player1 === currentUserId || duel.player2 === currentUserId;
          const player1Name = userNames.get(duel.player1) || "Игрок 1";
          const player2Name = userNames.get(duel.player2) || "Игрок 2";

          const winnerId = duel.results?.winner;
          let winnerText = "Ничья";
          if (winnerId) {
            if (winnerId === duel.player1) {
              winnerText = player1Name;
            } else if (winnerId === duel.player2) {
              winnerText = player2Name;
            } else {
              winnerText = "Неизвестный победитель";
            }
          }

          return (
            <li className="finished-section__item" key={`finished ${index}`}>
              <div className="finished-section__header">
                <span className="finished-section__status">Завершено</span>
                <span>
                  Победитель:{" "}
                  <span className="finished-section__winner">{winnerText}</span>
                </span>
              </div>

              <div className="finished-section__players">
                <div
                  className={`player-name ${duel.player1 === currentUserId ? "player-name--me" : ""}`}
                >
                  {player1Name}
                </div>
                <span className="vs">VS</span>
                <div
                  className={`player-name ${duel.player2 === currentUserId ? "player-name--me" : ""}`}
                >
                  {player2Name}
                </div>
              </div>

              <div className="finished-section__footer">
                <span className="date">
                  {new Date(duel.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Link
                key={duel.id}
                href={`/duel/${duel.id}?view=finished`}
                className="finished-section__btn"
              >
                Перейти
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
