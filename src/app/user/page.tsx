// src/app/user/page.tsx
"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useEffect, useState, useMemo } from "react";
import { openModal } from "@/lib/slices/modalSlice";
import toast from "react-hot-toast";
import { ItemCard, Header, Loading } from "../components";
import "./userpage.scss";
import {
  fetchUserItemIds,
  removeUserItemId,
  selectUserCharacters,
  selectUserWeapons,
} from "@/lib/slices/userItemsSlice";
import { Character, Weapon } from "@/lib/types";
import { fetchCharacters } from "@/lib/slices/charactersSlice";
import { fetchWeapons } from "@/lib/slices/weaponsSlice";
import { fetchAdminSettings } from "@/lib/slices/adminSettingsSlice"; // ✅ Импортируем настройки

type UserItem = Character | Weapon;

// Типы для фильтров
type RarityFilter = "" | "4" | "5" | "6";
type ConstFilter = "" | "0" | "1" | "2" | "3" | "4" | "5" | "6";
type WeaponTypeFilter =
  | ""
  | "sword"
  | "handcannon"
  | "greatsword"
  | "polearm"
  | "artsUnit";

export default function UserPage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const userCharacters = useSelector(selectUserCharacters);
  const userWeapons = useSelector(selectUserWeapons);
  const status = useSelector((state: RootState) => state.userItems.status);

  // ✅ Получаем настройки лимита
  const adminSettings = useSelector((state: RootState) => state.adminSettings);
  const maxTeamCost = adminSettings.maxTeamCost;

  const [isEditMode, setIsEditMode] = useState(false);

  // Состояния фильтров
  const [searchQuery, setSearchQuery] = useState("");
  const [charRarity, setCharRarity] = useState<RarityFilter>("");
  const [charConst, setCharConst] = useState<ConstFilter>("");
  const [wepRarity, setWepRarity] = useState<RarityFilter>("");
  const [wepConst, setWepConst] = useState<ConstFilter>("");
  const [wepType, setWepType] = useState<WeaponTypeFilter>("");

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchCharacters());
      dispatch(fetchWeapons());
      dispatch(fetchUserItemIds(user.uid));
      dispatch(fetchAdminSettings()); // ✅ Загружаем настройки лимита
    }
  }, [dispatch, user]);

  // ✅ Функция расчета веса предмета с учетом costTable
  const get_item_cost = (item: Character | Weapon) => {
    const c = item.constellation ?? 0;
    // Если есть таблица стоимостей и значение для этой консты определено - берем его
    if (item.costTable && item.costTable[c] !== undefined) {
      return item.costTable[c];
    }
    // Иначе базовая формула: C + 1
    return c + 1;
  };

  const filteredCharacters = useMemo(() => {
    return userCharacters.filter((char) => {
      const matchesSearch = char.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRarity = !charRarity || String(char.rarity) === charRarity;
      const matchesConst =
        !charConst || String(char.constellation ?? 0) === charConst;
      return matchesSearch && matchesRarity && matchesConst;
    });
  }, [userCharacters, searchQuery, charRarity, charConst]);

  const filteredWeapons = useMemo(() => {
    return userWeapons.filter((weapon) => {
      const matchesSearch = weapon.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRarity = !wepRarity || String(weapon.rarity) === wepRarity;
      const matchesConst =
        !wepConst || String(weapon.constellation ?? 0) === wepConst;
      const matchesType = !wepType || weapon.type === wepType;
      return matchesSearch && matchesRarity && matchesConst && matchesType;
    });
  }, [userWeapons, searchQuery, wepRarity, wepConst, wepType]);

  // ✅ Подсчет общей стоимости пула персонажей
  const currentCharPoolCost = useMemo(() => {
    return filteredCharacters.reduce(
      (sum, char) => sum + get_item_cost(char),
      0,
    );
  }, [filteredCharacters]);

  const handleRemoveItem = async (
    type: "character" | "weapon",
    item: UserItem,
  ) => {
    if (!user || !item.id) {
      toast.error("❌ Ошибка: у предмета нет ID");
      return;
    }
    try {
      await dispatch(
        removeUserItemId({ userId: user.uid, type, itemId: item.id }),
      ).unwrap();
      toast.success(`${item.name} удалён из коллекции`);
    } catch (error) {
      toast.error("❌ Ошибка удаления");
    }
  };

  const handleAddCharacters = () =>
    dispatch(openModal({ type: "chooseCharacters" }));
  const handleAddWeapons = () => dispatch(openModal({ type: "chooseWeapons" }));

  const resetFilters = () => {
    setSearchQuery("");
    setCharRarity("");
    setCharConst("");
    setWepRarity("");
    setWepConst("");
    setWepType("");
  };

  if (!user || status === "loading") {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  if (status === "failed") {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-red-600">❌ Ошибка загрузки данных</div>
        </main>
      </>
    );
  }

  // Проверка превышения лимита
  const isOverLimit = currentCharPoolCost > maxTeamCost;

  return (
    <>
      <Header />
      <main className="user">
        <div className="container">
          {/* === ПАНЕЛЬ ФИЛЬТРОВ === */}
          <div
            className="filters-panel"
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              background: "#1e293b",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="🔍 Поиск по имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "white",
                }}
              />
              <button
                onClick={resetFilters}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Сбросить
              </button>
            </div>
            {/* ... (остальные фильтры без изменений) ... */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Редкость (Все)
                </label>
                <select
                  value={charRarity}
                  onChange={(e) =>
                    setCharRarity(e.target.value as RarityFilter)
                  }
                  style={{
                    width: "100%",
                    padding: "0.4rem",
                    background: "#0f172a",
                    color: "white",
                    border: "1px solid #475569",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">Любая</option>
                  <option value="4">4 ★</option>
                  <option value="5">5 ★</option>
                  <option value="6">6 ★</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Конста (Все)
                </label>
                <select
                  value={charConst}
                  onChange={(e) => setCharConst(e.target.value as ConstFilter)}
                  style={{
                    width: "100%",
                    padding: "0.4rem",
                    background: "#0f172a",
                    color: "white",
                    border: "1px solid #475569",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">Любая</option>
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>
                      C{n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Тип оружия
                </label>
                <select
                  value={wepType}
                  onChange={(e) =>
                    setWepType(e.target.value as WeaponTypeFilter)
                  }
                  style={{
                    width: "100%",
                    padding: "0.4rem",
                    background: "#0f172a",
                    color: "white",
                    border: "1px solid #475569",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">Любой</option>
                  <option value="sword">Меч</option>
                  <option value="handcannon">Пистолеты</option>
                  <option value="greatsword">Двуручный</option>
                  <option value="polearm">Копье</option>
                  <option value="artsUnit">Катализатор</option>
                </select>
              </div>
            </div>
          </div>

          {/* === ПЕРСОНАЖИ === */}
          <section className="section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 className="h2-common">
                Мои персонажи ({filteredCharacters.length})
              </h2>

              {/* ✅ БЛОК СО СТОИМОСТЬЮ ПУЛА */}
              <div
                style={{
                  background: isOverLimit ? "#450a0a" : "#1e293b",
                  border: `1px solid ${isOverLimit ? "#ef4444" : "#475569"}`,
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                  Стоимость пула:
                </span>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    color: isOverLimit ? "#ef4444" : "#fbbf24",
                  }}
                >
                  {currentCharPoolCost} / {maxTeamCost}
                </span>
                {isOverLimit && <span style={{ fontSize: "1.2rem" }}>⚠️</span>}
              </div>
            </div>

            <button
              onClick={handleAddCharacters}
              className="user__btn-add"
              style={{ marginTop: "1rem" }}
            >
              Добавить персонажа
            </button>

            {filteredCharacters.length === 0 ? (
              <p className="user__item-null">
                Нет персонажей по выбранным фильтрам
              </p>
            ) : (
              <ul className="user__list">
                {filteredCharacters.map((char) => {
                  const charCost = get_item_cost(char);
                  return (
                    <li key={char.id} className="user__item">
                      <ItemCard item={char} />

                      {/* Отображение веса карточки (опционально) */}
                      <div
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          background: "rgba(0,0,0,0.8)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          color: "#fbbf24",
                          fontWeight: "bold",
                        }}
                      >
                        ⚖️ {charCost}
                      </div>

                      {isEditMode && (
                        <div className="user__item-actions">
                          <button
                            onClick={() =>
                              dispatch(
                                openModal({
                                  type: "itemEdit",
                                  data: {
                                    itemType: "character",
                                    itemId: char.id,
                                  },
                                  isUserMode: true,
                                }),
                              )
                            }
                            className="user__btn-edit-const"
                            title="Изменить консту"
                          >
                            ✦ C{char.constellation || 0}
                          </button>
                          <button
                            onClick={() => handleRemoveItem("character", char)}
                            className="user__btn-dell"
                            title="Удалить"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* === ОРУЖИЕ === */}
          <section className="section">
            <h2 className="h2-common">Моё оружие ({filteredWeapons.length})</h2>
            <button onClick={handleAddWeapons} className="user__btn-add">
              Добавить оружие
            </button>

            {filteredWeapons.length === 0 ? (
              <p className="user__item-null">
                Нет оружия по выбранным фильтрам
              </p>
            ) : (
              <ul className="user__list">
                {filteredWeapons.map((weapon) => (
                  <li key={weapon.id} className="user__item">
                    <ItemCard item={weapon} />
                    {isEditMode && (
                      <div className="user__item-actions">
                        <button
                          onClick={() =>
                            dispatch(
                              openModal({
                                type: "itemEdit",
                                data: { itemType: "weapon", itemId: weapon.id },
                                isUserMode: true,
                              }),
                            )
                          }
                          className="user__btn-edit-const"
                          title="Изменить консту"
                        >
                          ✦ C{weapon.constellation || 0}
                        </button>
                        <button
                          onClick={() => handleRemoveItem("weapon", weapon)}
                          className="user__btn-dell"
                          title="Удалить"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="user__btn-container">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`user__btn-edit ${isEditMode ? "user__btn-edit_off" : "user__btn-edit_on"}`}
            >
              {isEditMode ? "Готово" : "Редактировать коллекцию"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
