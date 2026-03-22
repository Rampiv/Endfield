// src/app/admin/page.tsx (или adminpage.tsx)
"use client";

import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/lib/store";
import { useAdmin } from "@/lib/hook/useAdmin";
import { deleteCharacter, fetchCharacters } from "@/lib/slices/charactersSlice";
import { deleteWeapon, fetchWeapons } from "@/lib/slices/weaponsSlice";
import { openModal } from "@/lib/slices/modalSlice";
import { Header, ItemCard, Loading } from "../components";
import "./adminpage.scss";
import "../user/userpage.scss";

type RarityFilter = "" | "4" | "5" | "6";
type ConstFilter = "" | "0" | "1" | "2" | "3" | "4" | "5" | "6";
type WeaponTypeFilter =
  | ""
  | "sword"
  | "handcannon"
  | "greatsword"
  | "polearm"
  | "artsUnit";

export default function AdminPage() {
  const { isAdmin, loading, user } = useAdmin();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const characters = useSelector((state: RootState) => state.characters.items);
  const weapons = useSelector((state: RootState) => state.weapons.items);

  // Состояния фильтров
  const [searchQuery, setSearchQuery] = useState("");
  const [charRarity, setCharRarity] = useState<RarityFilter>("");
  const [charConst, setCharConst] = useState<ConstFilter>("");
  const [wepRarity, setWepRarity] = useState<RarityFilter>("");
  const [wepConst, setWepConst] = useState<ConstFilter>("");
  const [wepType, setWepType] = useState<WeaponTypeFilter>("");

  useEffect(() => {
    if (!loading && isAdmin) {
      dispatch(fetchCharacters());
      dispatch(fetchWeapons());
    }
  }, [isAdmin, loading, dispatch]);

  // ✅ Логика фильтрации Персонажей
  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      const matchesSearch = char.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRarity = !charRarity || String(char.rarity) === charRarity;
      const matchesConst =
        !charConst || String(char.constellation ?? 0) === charConst;
      return matchesSearch && matchesRarity && matchesConst;
    });
  }, [characters, searchQuery, charRarity, charConst]);

  // ✅ Логика фильтрации Оружия
  const filteredWeapons = useMemo(() => {
    return weapons.filter((weapon) => {
      const matchesSearch = weapon.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRarity = !wepRarity || String(weapon.rarity) === wepRarity;
      const matchesConst =
        !wepConst || String(weapon.constellation ?? 0) === wepConst;
      const matchesType = !wepType || weapon.type === wepType;
      return matchesSearch && matchesRarity && matchesConst && matchesType;
    });
  }, [weapons, searchQuery, wepRarity, wepConst, wepType]);

  const resetFilters = () => {
    setSearchQuery("");
    setCharRarity("");
    setCharConst("");
    setWepRarity("");
    setWepConst("");
    setWepType("");
  };

  if (loading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="admin">
        <div className="container">
          <h1 className="admin-h1">🛡️ Админ-панель</h1>

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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Редкость
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
                  Конста
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

          <section className="section admin__characters">
            <h2 className="h2-common">
              Персонажи ({filteredCharacters.length})
            </h2>
            <button
              onClick={() => dispatch(openModal({ type: "characterAdd" }))}
              className="user__btn-add"
            >
              Добавить персонажа
            </button>

            <ul className="user__list">
              {filteredCharacters.map((char) => (
                <li key={char.id} className="user__item">
                  <ItemCard item={char} />
                  <div className="admin__btn-container">
                    <button
                      onClick={() =>
                        dispatch(
                          openModal({
                            type: "itemEdit",
                            data: { itemType: "character", itemId: char.id },
                          }),
                        )
                      }
                      className="admin__btn admin__btn-edit"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (
                          !confirm(
                            `Вы уверены, что хотите удалить "${char.name}"?`,
                          )
                        )
                          return;
                        dispatch(deleteCharacter(char.id!));
                        toast.success("Персонаж удалён");
                      }}
                      className="admin__btn admin__btn-dell"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="section admin__weapons">
            <h2 className="h2-common">Оружие ({filteredWeapons.length})</h2>
            <button
              onClick={() => dispatch(openModal({ type: "weaponAdd" }))}
              className="user__btn-add"
            >
              Добавить оружие
            </button>
            <ul className="user__list">
              {filteredWeapons.map((weapon) => (
                <li key={weapon.id} className="user__item">
                  <ItemCard item={weapon} />
                  <div className="admin__btn-container">
                    <button
                      onClick={() =>
                        dispatch(
                          openModal({
                            type: "itemEdit",
                            data: { itemType: "weapon", itemId: weapon.id },
                          }),
                        )
                      }
                      className="admin__btn admin__btn-edit"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (
                          !confirm(
                            `Вы уверены, что хотите удалить "${weapon.name}"?`,
                          )
                        )
                          return;
                        dispatch(deleteWeapon(weapon.id!));
                        toast.success("Оружие удалено");
                      }}
                      className="admin__btn admin__btn-dell"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
