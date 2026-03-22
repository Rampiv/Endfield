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
import { fetchAdminSettings, updateAdminSettings } from "@/lib/slices/adminSettingsSlice"; // ✅ Импортируем
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
  // ✅ Получаем настройки из Redux
  const adminSettings = useSelector((state: RootState) => state.adminSettings);
  const [localMaxCost, setLocalMaxCost] = useState<number>(10);

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
      dispatch(fetchAdminSettings()); // ✅ Загружаем настройки
    }
  }, [isAdmin, loading, dispatch]);

  // Синхронизация локального стейта с Redux
  useEffect(() => {
    if (adminSettings.status === "succeeded") {
      setLocalMaxCost(adminSettings.maxTeamCost);
    }
  }, [adminSettings.maxTeamCost, adminSettings.status]);

  const handleSaveMaxCost = async () => {
    if (localMaxCost < 1 || localMaxCost > 50) {
      toast.error("Лимит должен быть от 1 до 50");
      return;
    }
    try {
      await dispatch(updateAdminSettings({ maxTeamCost: localMaxCost })).unwrap();
      toast.success(`✅ Максимальный кост команды установлен: ${localMaxCost}`);
    } catch (error) {
      toast.error("❌ Ошибка сохранения настроек");
    }
  };

  // Логика фильтрации (без изменений)
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

          {/* ✅ НОВЫЙ БЛОК: ГЛОБАЛЬНЫЕ НАСТРОЙКИ */}
          <section className="section" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h2 className="h2-common" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>⚙️ Настройки дуэлей</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Максимальный суммарный кост команды (вес):
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={localMaxCost}
                  onChange={(e) => setLocalMaxCost(Number(e.target.value))}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: 'white',
                    width: '80px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}
                />
              </div>
              <button
                onClick={handleSaveMaxCost}
                disabled={adminSettings.status === "loading"}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: adminSettings.status === "loading" ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: adminSettings.status === "loading" ? 0.7 : 1
                }}
              >
                {adminSettings.status === "loading" ? "Сохранение..." : "💾 Сохранить"}
              </button>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '300px' }}>
                Игроки не смогут подтвердить команду, если сумма весов персонажей (C0=1, C1=2...) превысит это значение.
              </span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              Текущее значение в базе: <strong>{adminSettings.maxTeamCost}</strong>
            </div>
          </section>

          {/* === ПАНЕЛЬ ФИЛЬТРОВ (Без изменений) === */}
          <div className="filters-panel" style={{ marginBottom: "2rem", padding: "1rem", background: "#1e293b", borderRadius: "8px" }}>
             {/* ... (код фильтров как был) ... */}
             <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="🔍 Поиск по имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: "200px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #475569", background: "#0f172a", color: "white" }}
              />
              <button onClick={resetFilters} style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Сбросить</button>
            </div>
            {/* ... (остальные селекты) ... */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Редкость</label>
                <select value={charRarity} onChange={(e) => setCharRarity(e.target.value as RarityFilter)} style={{ width: "100%", padding: "0.4rem", background: "#0f172a", color: "white", border: "1px solid #475569", borderRadius: "4px" }}>
                  <option value="">Любая</option><option value="4">4 ★</option><option value="5">5 ★</option><option value="6">6 ★</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Конста</label>
                <select value={charConst} onChange={(e) => setCharConst(e.target.value as ConstFilter)} style={{ width: "100%", padding: "0.4rem", background: "#0f172a", color: "white", border: "1px solid #475569", borderRadius: "4px" }}>
                  <option value="">Любая</option>{[0, 1, 2, 3, 4, 5, 6].map((n) => (<option key={n} value={String(n)}>C{n}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Тип оружия</label>
                <select value={wepType} onChange={(e) => setWepType(e.target.value as WeaponTypeFilter)} style={{ width: "100%", padding: "0.4rem", background: "#0f172a", color: "white", border: "1px solid #475569", borderRadius: "4px" }}>
                  <option value="">Любой</option><option value="sword">Меч</option><option value="handcannon">Пистолеты</option><option value="greatsword">Двуручный</option><option value="polearm">Копье</option><option value="artsUnit">Катализатор</option>
                </select>
              </div>
            </div>
          </div>

          {/* === Персонажи и Оружие (Без изменений) === */}
          <section className="section admin__characters">
            <h2 className="h2-common">Персонажи ({filteredCharacters.length})</h2>
            <button onClick={() => dispatch(openModal({ type: "characterAdd" }))} className="user__btn-add">Добавить персонажа</button>
            <ul className="user__list">
              {filteredCharacters.map((char) => (
                <li key={char.id} className="user__item">
                  <ItemCard item={char} />
                  <div className="admin__btn-container">
                    <button onClick={() => dispatch(openModal({ type: "itemEdit", data: { itemType: "character", itemId: char.id } }))} className="admin__btn admin__btn-edit" title="Редактировать">✏️</button>
                    <button onClick={() => { if (!confirm(`Удалить "${char.name}"?`)) return; dispatch(deleteCharacter(char.id!)); toast.success("Удалён"); }} className="admin__btn admin__btn-dell" title="Удалить">🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="section admin__weapons">
            <h2 className="h2-common">Оружие ({filteredWeapons.length})</h2>
            <button onClick={() => dispatch(openModal({ type: "weaponAdd" }))} className="user__btn-add">Добавить оружие</button>
            <ul className="user__list">
              {filteredWeapons.map((weapon) => (
                <li key={weapon.id} className="user__item">
                  <ItemCard item={weapon} />
                  <div className="admin__btn-container">
                    <button onClick={() => dispatch(openModal({ type: "itemEdit", data: { itemType: "weapon", itemId: weapon.id } }))} className="admin__btn admin__btn-edit" title="Редактировать">✏️</button>
                    <button onClick={() => { if (!confirm(`Удалить "${weapon.name}"?`)) return; dispatch(deleteWeapon(weapon.id!)); toast.success("Удалено"); }} className="admin__btn admin__btn-dell" title="Удалить">🗑️</button>
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