// src/components/duels/DraftPhase.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  adminUndoPick,
  makeDraftMove,
  submitDuelWeapons,
} from "@/lib/slices/duelsSlice";
import { fetchCharacters } from "@/lib/slices/charactersSlice";
import { fetchAllUsers } from "@/lib/slices/usersSlice";
import { fetchAdminSettings } from "@/lib/slices/adminSettingsSlice"; // ✅ Явно импортируем
import toast from "react-hot-toast";
import { Duel, Character, Weapon } from "@/lib/types";
import { WeaponSelector } from "./WeaponSelection";
import { CharacterDraft } from "./CharacterDraft";
import "./DraftPhase.scss";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";

interface Props {
  duel: Duel;
  currentUserId: string;
  isReadOnly?: boolean;
}

interface UserProfile {
  uid: string;
  displayName?: string;
  characters?: Record<string, { addedAt: number; constellation?: number }>;
  weapons?: Record<string, { addedAt: number; constellation?: number }>;
}

export function DraftPhase({ duel, currentUserId, isReadOnly = false }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const canInteract = !isReadOnly;

  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isAdmin = userRole === "admin";

  const adminSettings = useSelector((state: RootState) => state.adminSettings);
  const allCharactersGlobal = useSelector(
    (state: RootState) => state.characters.items,
  );
  const allWeaponsGlobal = useSelector(
    (state: RootState) => state.weapons.items,
  );
  const allUsers = useSelector((state: RootState) => state.users?.list || []);

  // ✅ 1. ЯВНАЯ ЗАГРУЗКА НАСТРОЕК ПРИ МОНТИРОВАНИИ
  useEffect(() => {
    if (adminSettings.status === "idle") {
      dispatch(fetchAdminSettings());
    }
  }, [dispatch, adminSettings.status]);

  useEffect(() => {
    if (!allUsers || allUsers.length === 0) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, allUsers]);

  useEffect(() => {
    if (!allCharactersGlobal || allCharactersGlobal.length === 0) {
      dispatch(fetchCharacters());
    }
    // Оружие обычно грузится внутри WeaponSelector, но для расчета веса нам нужно оно здесь
    // Убедись, что где-то выше (в layout или page) вызывается fetchWeapons(),
    // либо добавь dispatch(fetchWeapons()) здесь, если нужно.
  }, [dispatch, allCharactersGlobal]);

  const isPlayer1 = duel.player1 === currentUserId;
  const isMyTurn = duel.currentTurn === currentUserId;

  const p1Picks = duel.draft?.picks?.[duel.player1]?.length || 0;
  const p2Picks = duel.draft?.picks?.[duel.player2]?.length || 0;
  const isDraftFinished =
    p1Picks + p2Picks >= (duel.settings.picksCount || 4) * 2;

  const player1Profile = allUsers.find((u) => u.uid === duel.player1) as
    | UserProfile
    | undefined;
  const player2Profile = allUsers.find((u) => u.uid === duel.player2) as
    | UserProfile
    | undefined;

  const getProfileItemIds = (
    profile: UserProfile | undefined,
    field: "characters" | "weapons",
  ) => {
    if (!profile || !profile[field]) return [];
    return Object.keys(profile[field]);
  };

  const p1CharIds = new Set(getProfileItemIds(player1Profile, "characters"));
  const p2CharIds = new Set(getProfileItemIds(player2Profile, "characters"));

  const p1WeaponIds = new Set(getProfileItemIds(player1Profile, "weapons"));
  const p2WeaponIds = new Set(getProfileItemIds(player2Profile, "weapons"));

  const player1Characters = useMemo(
    () =>
      allCharactersGlobal.filter((c: Character) => c.id && p1CharIds.has(c.id)),
    [allCharactersGlobal, p1CharIds],
  );

  const player2Characters = useMemo(
    () =>
      allCharactersGlobal.filter((c: Character) => c.id && p2CharIds.has(c.id)),
    [allCharactersGlobal, p2CharIds],
  );

  const p1WeaponIdList = Array.from(p1WeaponIds);
  const p2WeaponIdList = Array.from(p2WeaponIds);

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

  const player1Name = userNamesMap.get(duel.player1) || "Игрок 1";
  const player2Name = userNamesMap.get(duel.player2) || "Игрок 2";

  // ✅ ФУНКЦИЯ РАСЧЕТА ВЕСА
  const get_item_cost = (item: Character | Weapon) => {
    if (!item) return 0;
    const c = item.constellation ?? 0;
    if (item.costTable && typeof item.costTable[c] === "number") {
      return item.costTable[c];
    }
    return c + 1;
  };

  // ✅ ПОДСЧЕТ СТОИМОСТИ ПЕРСОНАЖЕЙ
  const p1CurrentCost = useMemo(() => {
    return player1Characters.reduce(
      (sum, char) => sum + get_item_cost(char),
      0,
    );
  }, [player1Characters]);

  const p2CurrentCost = useMemo(() => {
    return player2Characters.reduce(
      (sum, char) => sum + get_item_cost(char),
      0,
    );
  }, [player2Characters]);

  // ✅ ПОДСЧЕТ СТОИМОСТИ ОРУЖИЯ + ОТЛАДКА
  const p1CurrentWeaponCost = useMemo(() => {
    if (!p1WeaponIdList.length) return 0;
    if (!allWeaponsGlobal.length) {
      return 0;
    }

    let total = 0;

    p1WeaponIdList.forEach((wId) => {
      const weapon = allWeaponsGlobal.find((w) => w.id === wId);
      if (weapon) {
        const cost = get_item_cost(weapon);
        total += cost;
      }
    });

    return total;
  }, [p1WeaponIdList, allWeaponsGlobal]);

  const p2CurrentWeaponCost = useMemo(() => {
    if (!p2WeaponIdList.length) return 0;
    if (!allWeaponsGlobal.length) return 0;

    return p2WeaponIdList.reduce((sum, wId) => {
      const weapon = allWeaponsGlobal.find((w) => w.id === wId);
      return sum + (weapon ? get_item_cost(weapon) : 0);
    }, 0);
  }, [p2WeaponIdList, allWeaponsGlobal]);

  // ✅ ЛИМИТЫ (с защитой от undefined)
  const maxTeamCost = adminSettings.maxTeamCost || 10;
  const maxWeaponCost =
    adminSettings.maxWeaponCost ?? adminSettings.maxTeamCost ?? 10;

  // Отладка настроек
  useEffect(() => {
  }, [adminSettings]);

  const handleCharAction = async (charId: string, action: "ban" | "pick") => {
    if (!canInteract || duel.currentTurn !== currentUserId) {
      toast.error("Не ваш ход!");
      return;
    }
    try {
      await dispatch(
        makeDraftMove({
          duelId: duel.id,
          userId: currentUserId,
          moveType: action,
          characterId: charId,
        }),
      ).unwrap();
      toast.success(action === "ban" ? "🚫 Забанено!" : "✅ Выбрано!");
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    }
  };

  const handleWeaponSubmit = async (weapons: string[]) => {
    try {
      await dispatch(
        submitDuelWeapons({
          duelId: duel.id,
          userId: currentUserId,
          weaponIds: weapons,
        }),
      ).unwrap();
      toast.success("✅ Оружие выбрано!");
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    }
  };

  const handleUndo = async (playerId: string, moveType: "ban" | "pick") => {
    if (!isAdmin) return;
    try {
      await dispatch(
        adminUndoPick({ duelId: duel.id, playerId, moveType }),
      ).unwrap();
      toast.success(
        `✅ ${moveType === "ban" ? "Бан" : "Пик"} отменен! Ход возвращен.`,
      );
    } catch (e: any) {
      toast.error(e.message || "Ошибка отмены");
    }
  };

  const handleSkipBan = async () => {
    if (!canInteract || duel.currentTurn !== currentUserId) {
      toast.error("Не ваш ход!");
      return;
    }
    try {
      const nextPlayer =
        duel.player1 === currentUserId ? duel.player2 : duel.player1;
      await update(ref(db, `duels/${duel.id}`), {
        [`draft/banSkipped/${currentUserId}`]: true,
        currentTurn: nextPlayer,
        turnStartTime: Date.now(),
      });
      toast.success("⏭️ Бан пропущен!");
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    }
  };

  const CostIndicator = ({
    current,
    max,
    isMyColumn,
    label,
  }: {
    current: number;
    max: number;
    isMyColumn: boolean;
    label?: string;
  }) => {
    const isOver = current > max;
    return (
      <div
        style={{
          background: isOver ? "#450a0a" : "#1e293b",
          border: `1px solid ${isOver ? "#ef4444" : isMyColumn ? "#fbbf24" : "#475569"}`,
          padding: "4px 10px",
          borderRadius: "12px",
          fontSize: "0.8rem",
          fontWeight: "bold",
          color: isOver ? "#ef4444" : isMyColumn ? "#fbbf24" : "#94a3b8",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
        }}
        title={label || (isOver ? "Превышен лимит!" : "Текущая стоимость")}
      >
        <span>⚖️</span>
        <span>
          {current} / {max}
        </span>
        {isOver && <span>⚠️</span>}
      </div>
    );
  };

  return (
    <div className="draft-phase">
      <h2 className="draft-phase__title">Фаза драфта</h2>

      <div className="draft-phase__grid">
        {/* ЛЕВАЯ КОЛОНКА */}
        <div
          className={`column ${isPlayer1 ? "me" : "opponent"}`}
          style={{ position: "relative" }}
        >
          <div
            style={{
              position: "absolute",
              top: "-10px",
              right: "10px",
              zIndex: 10,
            }}
          >
            <CostIndicator
              current={p1CurrentCost}
              max={maxTeamCost}
              isMyColumn={isPlayer1}
              label="Стоимость персонажей"
            />
          </div>

          <h3 className="draft-phase__h3">{player1Name}</h3>

          <div className={isDraftFinished ? "readonly-section" : ""}>
            <CharacterDraft
              duel={duel}
              playerId={duel.player1}
              currentUserId={currentUserId}
              isMyTurn={isDraftFinished ? false : isMyTurn && isPlayer1}
              canInteract={canInteract && !isDraftFinished}
              allCharacters={player1Characters}
              playerProfile={player1Profile}
              onAction={handleCharAction}
              onUndo={(type) => handleUndo(duel.player1, type)}
              isAdmin={isAdmin}
              onSkipBan={handleSkipBan}
            />
          </div>

          {isDraftFinished && (
            <div
              className="weapon-section-wrapper"
              style={{ position: "relative", marginTop: "1.5rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <h4 className="section-subtitle" style={{ margin: 0 }}>
                  ⚔️ Выбор оружия
                </h4>
                <CostIndicator
                  current={p1CurrentWeaponCost}
                  max={maxWeaponCost}
                  isMyColumn={isPlayer1}
                  label="Стоимость оружия"
                />
              </div>

              {isReadOnly ? (
                <WeaponSelector
                  duel={duel}
                  playerId={duel.player1}
                  currentUserId={currentUserId}
                  isMyColumn={isPlayer1}
                  canInteract={false}
                  onSubmit={() => {}}
                  myWeaponIds={p1WeaponIdList}
                  playerProfile={player1Profile}
                />
              ) : (
                <WeaponSelector
                  duel={duel}
                  playerId={duel.player1}
                  currentUserId={currentUserId}
                  isMyColumn={isPlayer1}
                  canInteract={canInteract}
                  onSubmit={handleWeaponSubmit}
                  myWeaponIds={p1WeaponIdList}
                  playerProfile={player1Profile}
                />
              )}
            </div>
          )}
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div
          className={`column ${!isPlayer1 ? "me" : "opponent"}`}
          style={{ position: "relative" }}
        >
          <div
            style={{
              position: "absolute",
              top: "-10px",
              right: "10px",
              zIndex: 10,
            }}
          >
            <CostIndicator
              current={p2CurrentCost}
              max={maxTeamCost}
              isMyColumn={!isPlayer1}
              label="Стоимость персонажей"
            />
          </div>

          <h3 className="draft-phase__h3">{player2Name}</h3>

          <div className={isDraftFinished ? "readonly-section" : ""}>
            <CharacterDraft
              duel={duel}
              playerId={duel.player2}
              currentUserId={currentUserId}
              isMyTurn={isDraftFinished ? false : isMyTurn && !isPlayer1}
              canInteract={canInteract && !isDraftFinished}
              allCharacters={player2Characters}
              playerProfile={player2Profile}
              onAction={handleCharAction}
              onUndo={(type) => handleUndo(duel.player2, type)}
              isAdmin={isAdmin}
              onSkipBan={handleSkipBan}
            />
          </div>

          {isDraftFinished && (
            <div
              className="weapon-section-wrapper"
              style={{ position: "relative", marginTop: "1.5rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <h4 className="section-subtitle" style={{ margin: 0 }}>
                  ⚔️ Выбор оружия
                </h4>
                <CostIndicator
                  current={p2CurrentWeaponCost}
                  max={maxWeaponCost}
                  isMyColumn={!isPlayer1}
                  label="Стоимость оружия"
                />
              </div>

              {isReadOnly ? (
                <WeaponSelector
                  duel={duel}
                  playerId={duel.player2}
                  currentUserId={currentUserId}
                  isMyColumn={!isPlayer1}
                  canInteract={false}
                  onSubmit={() => {}}
                  myWeaponIds={p2WeaponIdList}
                  playerProfile={player2Profile}
                />
              ) : (
                <WeaponSelector
                  duel={duel}
                  playerId={duel.player2}
                  currentUserId={currentUserId}
                  isMyColumn={!isPlayer1}
                  canInteract={canInteract}
                  onSubmit={handleWeaponSubmit}
                  myWeaponIds={p2WeaponIdList}
                  playerProfile={player2Profile}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {!canInteract && (
        <div className="read-only-msg">Режим просмотра истории</div>
      )}
    </div>
  );
}
