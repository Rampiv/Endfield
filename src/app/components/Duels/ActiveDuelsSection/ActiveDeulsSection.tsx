"use client";

import Link from "next/link";
import { Duel } from "@/lib/types";
import { useDuelPermissions } from "@/lib/hook/useDuelPermissions";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { useMemo } from "react";
import { createUserNamesMap } from "@/lib/utils/userHelper";
import "./ActiveDeulsSection.scss";

interface Props {
  duels: Duel[];
  currentUserId: string;
}

export function ActiveDuelsSection({ duels, currentUserId }: Props) {
  const allUsers = useSelector((state: RootState) => state.users?.list || []);
  const userNames = useMemo(() => createUserNamesMap(allUsers), [allUsers]);

  if (duels.length === 0) {
    return (
      <section className="section">
        <h2 className="h2-common">Активные дуэли</h2>
        <p>Пока нет активных дуэлей</p>
      </section>
    );
  }

  return (
    <section className="section">
      <h2 className="h2-common">Активные дуэли</h2>

      <div className="active-duel">
        {duels.map((duel, index) => {
          const permissions = useDuelPermissions(duel, currentUserId);
          const isParticipant =
            duel.player1 === currentUserId || duel.player2 === currentUserId;
          const player1Name = userNames.get(duel.player1);
          const player2Name = userNames.get(duel.player2);

          return (
            <div className="active-duel__container" key={`active-duel ${index}`}>
              <span>
                {duel.status === "drafting" && "Драфт"}
                {duel.status === "weapons" && "Оружие"}
                {duel.status === "fighting" && "Битва"}
              </span>

              <div className="active-duel__players">
                <span>{player1Name}</span>
                <span>VS</span>
                <span>{player2Name}</span>
              </div>

              {!permissions.canEdit && <span>Только просмотр</span>}
              <Link
                key={duel.id}
                href={`/duel/${duel.id}`}
                className={`active-duel__btn`}
              >
                Перейти
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
