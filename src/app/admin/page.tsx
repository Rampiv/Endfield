// src/app/admin/page.tsx
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
import { fetchAdminSettings, updateAdminSettings } from "@/lib/slices/adminSettingsSlice";
import { Header, ItemCard, Loading } from "../components";
import "./adminpage.scss";
import "../user/userpage.scss";

type RarityFilter = "" | "4" | "5" | "6";
type ConstFilter = "" | "0" | "1" | "2" | "3" | "4" | "5" | "6";
type WeaponTypeFilter = "" | "sword" | "handcannon" | "greatsword" | "polearm" | "artsUnit";

export default function AdminPage() {
  const { isAdmin, loading, user } = useAdmin();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const characters = useSelector((state: RootState) => state.characters.items);
  const weapons = useSelector((state: RootState) => state.weapons.items);
  
  const adminSettings = useSelector((state: RootState) => state.adminSettings);
  
  const [localMaxCharCost, setLocalMaxCharCost] = useState<number>(10);
  const [localMaxWepCost, setLocalMaxWepCost] = useState<number>(10);

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
      dispatch(fetchAdminSettings());
    }
  }, [isAdmin, loading, dispatch]);

  useEffect(() => {
    if (adminSettings.status === "succeeded") {
      setLocalMaxCharCost(adminSettings.maxTeamCost || 10);
      setLocalMaxWepCost(adminSettings.maxWeaponCost ?? adminSettings.maxTeamCost ?? 10);
    }
  }, [adminSettings.maxTeamCost, adminSettings.maxWeaponCost, adminSettings.status]);

  const handleSaveSettings = async () => {
    if (localMaxCharCost < 1 || localMaxCharCost > 50) {
      toast.error("Лимит персонажей должен быть от 1 до 50");
      return;
    }
    if (localMaxWepCost < 1 || localMaxWepCost > 50) {
      toast.error("Лимит оружия должен быть от 1 до 50");
      return;
    }

    try {
      await dispatch(updateAdminSettings({ 
        maxTeamCost: localMaxCharCost,
        maxWeaponCost: localMaxWepCost
      })).unwrap();
      
      toast.success(`✅ Настройки сохранены!\nПерсонажи: ${localMaxCharCost}\nОружие: ${localMaxWepCost}`);
    } catch (error) {
      toast.error("❌ Ошибка сохранения настроек");
    }
  };

  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = !charRarity || String(char.rarity) === charRarity;
      const matchesConst = !charConst || String(char.constellation ?? 0) === charConst;
      return matchesSearch && matchesRarity && matchesConst;
    });
  }, [characters, searchQuery, charRarity, charConst]);

  const filteredWeapons = useMemo(() => {
    return weapons.filter((weapon) => {
      const matchesSearch = weapon.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = !wepRarity || String(weapon.rarity) === wepRarity;
      const matchesConst = !wepConst || String(weapon.constellation ?? 0) === wepConst;
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
          
          {/* === БЛОК НАСТРОЕК === */}
          <section className="admin__settings-section">
            <h2 className="section-title">⚙️ Настройки дуэлей</h2>
            
            <div className="settings-grid">
              {/* Лимит персонажей */}
              <div className="setting-card">
                <label>🧙‍♂️ Макс. кост команды (Персонажи)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={localMaxCharCost}
                  onChange={(e) => setLocalMaxCharCost(Number(e.target.value))}
                />
                <p className="hint">
                  Сумма весов всех персонажей не должна превышать это значение.
                </p>
              </div>

              {/* Лимит оружия */}
              <div className="setting-card">
                <label>⚔️ Макс. кост команды (Оружие)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={localMaxWepCost}
                  onChange={(e) => setLocalMaxWepCost(Number(e.target.value))}
                />
                <p className="hint">
                  Сумма весов всего оружия не должна превышать это значение.
                </p>
              </div>
            </div>

            <div className="actions-row">
              <button
                onClick={handleSaveSettings}
                disabled={adminSettings.status === "loading"}
                className="save-btn"
              >
                {adminSettings.status === "loading" ? "Сохранение..." : "💾 Сохранить настройки"}
              </button>
              
              <span className="status-text">
                Текущие значения в базе: <strong>Персы: {adminSettings.maxTeamCost}</strong> | <strong>Оружие: {adminSettings.maxWeaponCost ?? adminSettings.maxTeamCost}</strong>
              </span>
            </div>
          </section>

          {/* === ПАНЕЛЬ ФИЛЬТРОВ === */}
          <div className="admin__filters-panel">
             <div className="filters-header">
              <input
                type="text"
                placeholder="🔍 Поиск по имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button onClick={resetFilters} className="reset-btn">
                Сбросить
              </button>
            </div>
            
            <div className="filters-grid">
              <div className="filter-group">
                <label>Редкость</label>
                <select value={charRarity} onChange={(e) => setCharRarity(e.target.value as RarityFilter)}>
                  <option value="">Любая</option>
                  <option value="4">4 ★</option>
                  <option value="5">5 ★</option>
                  <option value="6">6 ★</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Конста</label>
                <select value={charConst} onChange={(e) => setCharConst(e.target.value as ConstFilter)}>
                  <option value="">Любая</option>
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>C{n}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Тип оружия</label>
                <select value={wepType} onChange={(e) => setWepType(e.target.value as WeaponTypeFilter)}>
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

          {/* === Персонажи === */}
          <section className="section admin__characters">
            <h2 className="h2-common">Персонажи ({filteredCharacters.length})</h2>
            <button onClick={() => dispatch(openModal({ type: "characterAdd" }))} className="user__btn-add">
              Добавить персонажа
            </button>
            <ul className="user__list">
              {filteredCharacters.map((char) => (
                <li key={char.id} className="user__item">
                  <ItemCard item={char} />
                  <div className="admin__btn-container">
                    <button 
                      onClick={() => dispatch(openModal({ type: "itemEdit", data: { itemType: "character", itemId: char.id } }))} 
                      className="admin__btn admin__btn-edit" 
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => { 
                        if (!confirm(`Удалить "${char.name}"?`)) return; 
                        dispatch(deleteCharacter(char.id!)); 
                        toast.success("Удалён"); 
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

          {/* === Оружие === */}
          <section className="section admin__weapons">
            <h2 className="h2-common">Оружие ({filteredWeapons.length})</h2>
            <button onClick={() => dispatch(openModal({ type: "weaponAdd" }))} className="user__btn-add">
              Добавить оружие
            </button>
            <ul className="user__list">
              {filteredWeapons.map((weapon) => (
                <li key={weapon.id} className="user__item">
                  <ItemCard item={weapon} />
                  <div className="admin__btn-container">
                    <button 
                      onClick={() => dispatch(openModal({ type: "itemEdit", data: { itemType: "weapon", itemId: weapon.id } }))} 
                      className="admin__btn admin__btn-edit" 
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => { 
                        if (!confirm(`Удалить "${weapon.name}"?`)) return; 
                        dispatch(deleteWeapon(weapon.id!)); 
                        toast.success("Удалено"); 
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