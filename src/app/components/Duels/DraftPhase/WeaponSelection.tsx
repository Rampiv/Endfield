"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchWeapons } from "@/lib/slices/weaponsSlice";
import { Duel, Weapon } from "@/lib/types";
import { ItemCard } from "@/app/components/ItemCard";
import "./WeaponSelection.scss";

interface UserProfile {
  weapons?: Record<string, { addedAt: number; constellation?: number }>;
}

interface Props {
  duel: Duel;
  playerId: string;
  currentUserId: string;
  isMyColumn: boolean;
  canInteract: boolean;
  onSubmit: (weapons: string[]) => void;
  myWeaponIds?: string[];
  playerProfile?: UserProfile;
}

export function WeaponSelector({
  duel,
  playerId,
  isMyColumn,
  canInteract,
  myWeaponIds,
  playerProfile,
  onSubmit,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const allWeapons = useSelector((state: RootState) => state.weapons.items);
  const weaponsStatus = useSelector((state: RootState) => state.weapons.status);

  const [localWeapons, setLocalWeapons] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Состояние для фильтра по типу оружия
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string>("");

  const dbWeapons = duel.weapons?.[playerId] || [];
  const isReady = dbWeapons.length >= 4;

  useEffect(() => {
    if (weaponsStatus === "idle") {
      dispatch(fetchWeapons());
    }
  }, [dispatch, weaponsStatus]);

  useEffect(() => {
    if (dbWeapons.length > 0) {
      setLocalWeapons(dbWeapons);
    }
  }, [dbWeapons]);

  const canEdit = canInteract && isMyColumn && !isReady;

  const handleSelect = (id: string) => {
    if (!canEdit) return;
    if (localWeapons.length >= 4) {
      return;
    }
    setLocalWeapons((prev) => [...prev, id]);
  };

  const handleRemove = (idx: number) => {
    if (!canEdit) return;
    setLocalWeapons((prev) => prev.filter((_, i) => i !== idx));
  };

  const displayWeapons = isReady ? dbWeapons : localWeapons;

  const getWeaponConstellation = (wId: string) => {
    return playerProfile?.weapons?.[wId]?.constellation ?? 0;
  };

  // ЛОГИКА ФИЛЬТРАЦИИ С УЧЕТОМ ТИПА
  const availableWeapons = useMemo(() => {
    return allWeapons.filter((w) => {
      if (!w.id) return false;

      // Проверка 1: Есть ли это оружие в моем личном инвентаре?
      if (myWeaponIds && myWeaponIds.length > 0) {
        if (!myWeaponIds.includes(w.id)) return false;
      }

      // Проверка 2: Соответствует ли выбранному типу фильтра?
      if (weaponTypeFilter && w.type !== weaponTypeFilter) {
        return false;
      }

      return true;
    });
  }, [allWeapons, myWeaponIds, weaponTypeFilter]);

  // Функция для сброса фильтра при открытии/закрытии
  const toggleModal = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setWeaponTypeFilter("");
    }
  };

  return (
    <div className="weapon-selector">
      <div className="weapon-slots">
        {[0, 1, 2, 3].map((idx) => {
          const wId = displayWeapons[idx];
          const weapon = wId ? allWeapons.find((w) => w.id === wId) : null;
          
          const constellation = wId ? getWeaponConstellation(wId) : 0;

          return (
            <div
              key={idx}
              className={`weapon-slot ${wId ? "filled" : "empty"}`}
              onClick={() => canEdit && setIsOpen(true)}
            >
              {weapon ? (
                <>
                  <div className="weapon-slot__content">
                    <ItemCard item={weapon} constellationOverride={constellation} />
                  </div>
                  {canEdit && (
                    <button
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(idx);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <span className="placeholder">
                  {canEdit ? "🔽 Выбрать" : "⏳"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!isReady && canEdit && (
        <button
          disabled={localWeapons.length !== 4}
          onClick={() => onSubmit(localWeapons)}
          className="btn-submit-weapons"
        >
          ✅ Подтвердить выбор ({localWeapons.length}/4)
        </button>
      )}

      {isReady && <div className="ready-msg">Готов к бою</div>}

      {isOpen && canEdit && (
        <div className="modal-overlay" onClick={() => toggleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Выберите оружие ({localWeapons.length}/4)</h3>
              <button onClick={() => toggleModal(false)}>✕</button>
            </div>
            
            {/* ПАНЕЛЬ ФИЛЬТРОВ */}
            <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #334155', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.9rem', color: '#94a3b8', marginRight: '0.5rem' }}>
                Фильтр по типу:
              </label>
              <select
                value={weaponTypeFilter}
                onChange={(e) => setWeaponTypeFilter(e.target.value)}
                style={{
                  padding: '0.4rem',
                  borderRadius: '4px',
                  background: '#1e293b',
                  color: 'white',
                  border: '1px solid #475569',
                  cursor: 'pointer'
                }}
              >
                <option value="">Все типы</option>
                <option value="sword">Одноручный меч</option>
                <option value="handcannon">Пистолеты</option>
                <option value="greatsword">Двуручный меч</option>
                <option value="polearm">Копье</option>
                <option value="artsUnit">Катализатор</option>
              </select>
            </div>

            <div className="modal-weapons-grid">
              {availableWeapons.length > 0 ? (
                availableWeapons.map((w) => {
                  if (!w.id) return null;
                  const constellation = getWeaponConstellation(w.id);
                  return (
                    <div
                      key={w.id}
                      className="weapon-option"
                      onClick={() => handleSelect(w.id!)}
                    >
                      <ItemCard item={w} constellationOverride={constellation} />
                      <span className="weapon-name">{w.name}</span>
                    </div>
                  );
                })
              ) : (
                <p style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
                  Нет оружия такого типа в вашей коллекции
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}