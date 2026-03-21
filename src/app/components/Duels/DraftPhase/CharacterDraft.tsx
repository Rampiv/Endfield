// src/components/duels/draft/CharacterDraft.tsx
"use client";

import { useMemo } from "react";
import { Character, Duel } from "@/lib/types";
import { ItemCard } from "@/app/components/ItemCard";
import "./CharacterDraft.scss";

// Добавляем тип для профиля пользователя (упрощенный)
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
  playerProfile?: UserProfile; // ✅ Новый проп
  onAction: (charId: string, action: "ban" | "pick") => void;
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

  const canBan = myBans.length < (duel.settings.bansCount || 1);
  const canPick = myPicks.length < (duel.settings.picksCount || 4);

  const isActuallyMyTurn = playerId === currentUserId && isMyTurn;
  const areButtonsActive = canInteract && isActuallyMyTurn;

  // Хелпер для получения консты конкретного персонажа из профиля
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

    // Получаем консту для отображения в слоте
    const constellation = id ? getCharConstellation(id) : 0;

    return (
      <div
        key={key}
        className={`draft-slot--${type} ${!char ? "draft-slot--empty" : ""}`}
      >
        {char ? (
          <div className="draft-slot__content">
            {/* ✅ Передаем консту в ItemCard */}
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
            🚫 Бан ({myBans.length}/{duel.settings.bansCount || 1})
          </div>
          {isAdmin && myBans.length > 0 && onUndo && (
            <button
              onClick={() => onUndo("ban")}
              className="btn-undo"
              title="Отменить последний бан (Admin)"
            >
              ↩️ Отменить бан
            </button>
          )}
        </div>
        <div className="draft-slots__grid">
          {Array.from({ length: duel.settings.bansCount || 1 }).map((_, i) =>
            renderSlot(myBans[i], "ban", i),
          )}
        </div>
      </div>

      {/* Секция Пиков */}
      <div className="draft-section">
        <div className="draft-label-header">
          <div className="draft-label">
            ✅ Выбрано ({myPicks.length}/{duel.settings.picksCount || 4})
          </div>
          {isAdmin && myPicks.length > 0 && onUndo && (
            <button
              onClick={() => onUndo("pick")}
              className="btn-undo"
              title="Отменить последний пик (Admin)"
            >
              ↩️ Отменить пик
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
              // Получаем консту для доступного персонажа
              const constellation = getCharConstellation(char.id);

              return (
                <div key={char.id} className="char-card-wrapper">
                  {/* ✅ Передаем консту в ItemCard */}
                  <ItemCard item={char} constellationOverride={constellation} />

                  {areButtonsActive && (
                    <div className="char-actions">
                      {canBan && (
                        <button
                          onClick={() => onAction(char.id!, "ban")}
                          className="btn-action btn-ban"
                        >
                          🚫
                        </button>
                      )}
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
