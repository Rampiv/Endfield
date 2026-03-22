// src/components/duels/DraftPhase.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux"; // ✅ Убедись, что useSelector импортирован
import { AppDispatch, RootState } from "@/lib/store";
import {
  adminUndoPick,
  makeDraftMove,
  submitDuelWeapons,
} from "@/lib/slices/duelsSlice";
import { fetchCharacters } from "@/lib/slices/charactersSlice";
import { fetchAllUsers } from "@/lib/slices/usersSlice";
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
  
  // ✅ Получаем максимальный лимит стоимости из настроек
  const maxTeamCost = useSelector((state: RootState) => state.adminSettings.maxTeamCost);

  const allCharactersGlobal = useSelector(
    (state: RootState) => state.characters.items,
  );
  const allWeaponsGlobal = useSelector(
    (state: RootState) => state.weapons.items,
  );
  const allUsers = useSelector((state: RootState) => state.users?.list || []);

  useEffect(() => {
    if (!allUsers || allUsers.length === 0) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, allUsers]);

  useEffect(() => {
    if (!allCharactersGlobal || allCharactersGlobal.length === 0) {
      dispatch(fetchCharacters());
    }
  }, [dispatch, allCharactersGlobal]);

  const isPlayer1 = duel.player1 === currentUserId;
  const isMyTurn = duel.currentTurn === currentUserId;

  const p1Picks = duel.draft?.picks?.[duel.player1]?.length || 0;
  const p2Picks = duel.draft?.picks?.[duel.player2]?.length || 0;
  const isDraftFinished = p1Picks + p2Picks >= (duel.settings.picksCount || 4) * 2;

  const player1Profile = (allUsers.find((u) => u.uid === duel.player1) as UserProfile | undefined);
  const player2Profile = (allUsers.find((u) => u.uid === duel.player2) as UserProfile | undefined);

  const getProfileItemIds = (profile: UserProfile | undefined, field: 'characters' | 'weapons') => {
    if (!profile || !profile[field]) return [];
    return Object.keys(profile[field]);
  };

  const p1CharIds = new Set(getProfileItemIds(player1Profile, 'characters'));
  const p2CharIds = new Set(getProfileItemIds(player2Profile, 'characters'));
  
  const p1WeaponIds = new Set(getProfileItemIds(player1Profile, 'weapons'));
  const p2WeaponIds = new Set(getProfileItemIds(player2Profile, 'weapons'));

  const player1Characters = useMemo(() => 
    allCharactersGlobal.filter((c: Character) => c.id && p1CharIds.has(c.id)),
  [allCharactersGlobal, p1CharIds]);

  const player2Characters = useMemo(() => 
    allCharactersGlobal.filter((c: Character) => c.id && p2CharIds.has(c.id)),
  [allCharactersGlobal, p2CharIds]);

  const player1Weapons = useMemo(() => 
    allWeaponsGlobal.filter((w: Weapon) => w.id && p1WeaponIds.has(w.id)),
  [allWeaponsGlobal, p1WeaponIds]);

  const player2Weapons = useMemo(() => 
    allWeaponsGlobal.filter((w: Weapon) => w.id && p2WeaponIds.has(w.id)),
  [allWeaponsGlobal, p2WeaponIds]);

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

  // ✅ ФУНКЦИЯ РАСЧЕТА ВЕСА С УЧЕТОМ COST TABLE
  const get_item_cost = (item: Character | Weapon) => {
    const c = item.constellation ?? 0;
    if (item.costTable && item.costTable[c] !== undefined) {
      return item.costTable[c];
    }
    return c + 1;
  };

  // ✅ ПОДСЧЕТ ТЕКУЩЕЙ СТОИМОСТИ ПУЛА
  const p1CurrentCost = useMemo(() => {
    return player1Characters.reduce((sum, char) => sum + get_item_cost(char), 0);
  }, [player1Characters]);

  const p2CurrentCost = useMemo(() => {
    return player2Characters.reduce((sum, char) => sum + get_item_cost(char), 0);
  }, [player2Characters]);

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
      const nextPlayer = duel.player1 === currentUserId ? duel.player2 : duel.player1;
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

  // Компонент индикатора стоимости (чтобы не дублировать код)
  const CostIndicator = ({ current, max, isMyColumn }: { current: number, max: number, isMyColumn: boolean }) => {
    const isOver = current > max;
    return (
      <div 
        className="draft-cost-indicator"
        style={{
          position: 'absolute',
          top: '-10px',
          right: '10px',
          background: isOver ? '#450a0a' : '#1e293b',
          border: `1px solid ${isOver ? '#ef4444' : (isMyColumn ? '#fbbf24' : '#475569')}`,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          color: isOver ? '#ef4444' : (isMyColumn ? '#fbbf24' : '#94a3b8'),
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        title={isOver ? "Превышен лимит стоимости!" : "Текущая стоимость пула"}
      >
        <span>⚖️</span>
        <span>{current} / {max}</span>
        {isOver && <span>⚠️</span>}
      </div>
    );
  };

  return (
    <div className="draft-phase">
      <h2 className="draft-phase__title">Фаза драфта</h2>

      <div className="draft-phase__grid">
        {/* ЛЕВАЯ КОЛОНКА (Игрок 1) */}
        <div className={`column ${isPlayer1 ? "me" : "opponent"}`} style={{ position: 'relative' }}>
          
          {/* ✅ ИНДИКАТОР СТОИМОСТИ ДЛЯ ИГРОКА 1 */}
          <CostIndicator current={p1CurrentCost} max={maxTeamCost} isMyColumn={isPlayer1} />

          <h3 className="draft-phase__h3">{player1Name}</h3>

          <div className={isDraftFinished ? "readonly-section" : ""}>
            <CharacterDraft
              duel={duel}
              playerId={duel.player1}
              currentUserId={currentUserId}
              isMyTurn={isDraftFinished ? false : (isMyTurn && isPlayer1)} 
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
            <div className="weapon-section-wrapper">
              <h4 className="section-subtitle">⚔️ Выбор оружия</h4>
              {isReadOnly ? (
                 <WeaponSelector
                  duel={duel}
                  playerId={duel.player1}
                  currentUserId={currentUserId}
                  isMyColumn={isPlayer1}
                  canInteract={false}
                  onSubmit={() => {}}
                  myWeaponIds={Array.from(p1WeaponIds)}
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
                  myWeaponIds={Array.from(p1WeaponIds)}
                  playerProfile={player1Profile}
                />
              )}
            </div>
          )}
        </div>

        {/* ПРАВАЯ КОЛОНКА (Игрок 2) */}
        <div className={`column ${!isPlayer1 ? "me" : "opponent"}`} style={{ position: 'relative' }}>
          
          {/* ✅ ИНДИКАТОР СТОИМОСТИ ДЛЯ ИГРОКА 2 */}
          <CostIndicator current={p2CurrentCost} max={maxTeamCost} isMyColumn={!isPlayer1} />

          <h3 className="draft-phase__h3">{player2Name}</h3>

          <div className={isDraftFinished ? "readonly-section" : ""}>
            <CharacterDraft
              duel={duel}
              playerId={duel.player2}
              currentUserId={currentUserId}
              isMyTurn={isDraftFinished ? false : (isMyTurn && !isPlayer1)}
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
            <div className="weapon-section-wrapper">
              <h4 className="section-subtitle">⚔️ Выбор оружия</h4>
              {isReadOnly ? (
                 <WeaponSelector
                  duel={duel}
                  playerId={duel.player2}
                  currentUserId={currentUserId}
                  isMyColumn={!isPlayer1}
                  canInteract={false}
                  onSubmit={() => {}}
                  myWeaponIds={Array.from(p2WeaponIds)}
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
                  myWeaponIds={Array.from(p2WeaponIds)}
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