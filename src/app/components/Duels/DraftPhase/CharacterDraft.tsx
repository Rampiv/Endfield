"use client";

import { useMemo } from "react";
import { Character, Duel } from "@/lib/types";
import { ItemCard } from "@/app/components/ItemCard";
import "./CharacterDraft.scss";

interface UserProfile {
  characters?: Record<string, { addedAt: number; constellation?: number }>;
}

interface Props {
  duel: Duel;
  playerId: string;
  currentUserId: string;
  isMyTurn: boolean;
  canInteract: boolean;
  isAdmin: boolean;
  allCharacters: Character[];
  playerProfile?: UserProfile;
  onAction: (charId: string, action: "ban" | "pick") => void;
  onSkipBan?: () => void; 
  onUndo?: (moveType: "ban" | "pick") => void;
}

export function CharacterDraft({
  duel,
  playerId,
  currentUserId,
  isMyTurn,
  canInteract,
  isAdmin,
  allCharacters,
  playerProfile,
  onAction,
  onSkipBan,
  onUndo,
}: Props) {
  const myPicks = duel.draft?.picks?.[playerId] || [];
  const myBans = duel.draft?.bans?.[playerId] || [];

  const allBannedIds = new Set([
    ...(duel.draft?.bans?.[duel.player1] || []),
    ...(duel.draft?.bans?.[duel.player2] || []),
  ]);
  const allPickedIds = new Set([
    ...(duel.draft?.picks?.[duel.player1] || []),
    ...(duel.draft?.picks?.[duel.player2] || []),
  ]);

  const availableChars = useMemo(() => {
    return allCharacters.filter(
      (char) =>
        char.id && !allBannedIds.has(char.id) && !allPickedIds.has(char.id),
    );
  }, [allCharacters, allBannedIds, allPickedIds]);

  const bansLimit = duel.settings.bansCount || 1;

  const hasBanned = myBans.length > 0;

  const canBan = !hasBanned && myBans.length < bansLimit;
  const canPick = myPicks.length < (duel.settings.picksCount || 4);

  const isActuallyMyTurn = playerId === currentUserId && isMyTurn;
  const areButtonsActive = canInteract && isActuallyMyTurn;

  const hasSkippedBan = duel.draft?.banSkipped?.[playerId] === true;

  const isBanPhaseOver =
    (myBans.length >= bansLimit || hasSkippedBan) && // Я готов
    // Проверка противника (нужно знать его статус)
    true; // Заглушка, пока нет данных о противнике

  const getCharConstellation = (charId: string) => {
    return playerProfile?.characters?.[charId]?.constellation ?? 0;
  };

  const renderSlot = (
    id: string | undefined,
    type: "ban" | "pick",
    index: number,
  ) => {
    const char = id ? allCharacters.find((c) => c.id === id) : null;
    const key = `${type}-${index}-${id || "empty"}`;
    const constellation = id ? getCharConstellation(id) : 0;

    return (
      <div
        key={key}
        className={`draft-slot--${type} ${!char ? "draft-slot--empty" : ""} ${type === "ban" && hasSkippedBan && id === undefined ? "draft-slot--skipped" : ""}`}
      >
        {char ? (
          <div className="draft-slot__content">
            <ItemCard item={char} constellationOverride={constellation} />
          </div>
        ) : (
          <span className="draft-slot__placeholder">
            {type === "ban" ? "🚫 Бан" : "✅ Пик"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="character-draft">
      {/* Секция Банов */}
      <div className="draft-section">
        <div className="draft-label-header">
          <div className="draft-label">
            🚫 Бан ({myBans.length}/{bansLimit})
          </div>

          {isAdmin && myBans.length > 0 && onUndo && (
            <button onClick={() => onUndo("ban")} className="btn-undo">
              ↩️
            </button>
          )}
        </div>

        <div className="draft-slots__grid">
          {Array.from({ length: bansLimit }).map((_, i) =>
            renderSlot(myBans[i], "ban", i),
          )}
        </div>

        {/* КНОПКА ПРОПУСКА БАНА */}
        {areButtonsActive && !hasBanned && !hasSkippedBan && (
          <button
            onClick={() => onSkipBan && onSkipBan()}
            className="btn-skip-ban"
          >
            Пропустить бан
          </button>
        )}

        {hasSkippedBan && (
          <p className="descr-skip-ban">Вы пропустили фазу бана</p>
        )}
      </div>

      {/* Секция Пиков */}
      <div className="draft-section">
        <div className="draft-label-header">
          <div className="draft-label">
            ✅ Выбрано ({myPicks.length}/{duel.settings.picksCount || 4})
          </div>
          {isAdmin && myPicks.length > 0 && onUndo && (
            <button onClick={() => onUndo("pick")} className="btn-undo">
              ↩️
            </button>
          )}
        </div>
        <div className="draft-slots__grid">
          {Array.from({ length: duel.settings.picksCount || 4 }).map((_, i) =>
            renderSlot(myPicks[i], "pick", i),
          )}
        </div>
      </div>

      {/* Список доступных персонажей */}
      {canInteract && (
        <div className="available-chars-list">
          <h4>
            Доступные персонажи
            {!areButtonsActive && (
              <span className="waiting-hint"> (ожидание хода...)</span>
            )}
          </h4>

          <div className="chars-grid">
            {availableChars.map((char) => {
              if (!char.id) return null;
              const constellation = getCharConstellation(char.id);

              return (
                <div key={char.id} className="char-card-wrapper">
                  <ItemCard item={char} constellationOverride={constellation} />

                  {areButtonsActive && (
                    <div className="char-actions">
                      {/* Кнопка Бана */}
                      {canBan && !hasSkippedBan && (
                        <button
                          onClick={() => onAction(char.id!, "ban")}
                          className="btn-action btn-ban"
                        >
                          🚫
                        </button>
                      )}

                      {/* Кнопка Пика */}
                      {canPick && (
                        <button
                          onClick={() => onAction(char.id!, "pick")}
                          className="btn-action btn-pick"
                        >
                          ✅
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {availableChars.length === 0 && (
              <p className="no-chars-msg">
                Все персонажи выбраны или забанены!
              </p>
            )}
          </div>
        </div>
      )}

      {canInteract && !areButtonsActive && (
        <div className="waiting-msg">⏳ Ход противника...</div>
      )}
    </div>
  );
}
