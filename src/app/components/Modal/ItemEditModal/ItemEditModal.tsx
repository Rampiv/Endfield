"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import toast from "react-hot-toast";
import { Loading } from "../../Loading";
import { Character, Weapon } from "@/lib/types";
import { updateUserItemConstellation } from "@/lib/slices/userItemsSlice"; 
import { updateCharacter } from "@/lib/slices/charactersSlice";
import { updateWeapon } from "@/lib/slices/weaponsSlice";
import "./ItemEditModal.scss";
import "../../../admin/adminpage.scss";

interface Props {
  onClose: () => void;
  itemType: "weapon" | "character";
  itemId?: string;
  isUserMode?: boolean;
}

type Item = Character | Weapon;

type CostTable = Record<number, number>;

export function ItemEditModal({ onClose, itemType, itemId, isUserMode = false }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const existingItem = useSelector((state: RootState) => {
    if (!itemId) return null;
    const items = itemType === "character" ? state.characters.items : state.weapons.items;
    return items.find((item) => item.id === itemId) || null;
  });

  const status = useSelector((state: RootState) =>
    itemType === "character" ? state.characters.status : state.weapons.status,
  );

  const [formData, setFormData] = useState<Partial<Item> & { costTable?: CostTable }>({
    name: "",
    element: "",
    rarity: "",
    image: "",
    constellation: 0,
    type: "",
    costTable: undefined,
  });

  useEffect(() => {
    if (existingItem) {
      const dataToSet = { ...existingItem };
      
      if (itemType === "weapon") {
        const weaponData = dataToSet as Weapon;
        if (!weaponData.type || weaponData.type === "") {
          weaponData.type = "sword";
        }
      }
      
      if (itemType === "character") {
        const charData = dataToSet as Character;
        if (!charData.element || charData.element === "") {
          charData.element = "physical";
        }
      }

      // Инициализируем таблицу стоимостей, если её нет
      if (!dataToSet.costTable) {
        dataToSet.costTable = {};
      }

      setFormData(dataToSet);
    }
  }, [existingItem, itemType]);

  // лОГИКА РАСЧЕТА ВЕСА
  const currentConst = formData.constellation ?? 0;
  
  const getCostForConst = (c: number) => {
    if (formData.costTable && formData.costTable[c] !== undefined) {
      return formData.costTable[c];
    }
    return c + 1; 
  };

  const currentCost = getCostForConst(currentConst);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Обновление веса для конкретной консты
  const handleCostChange = (constLevel: number, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    const newTable = { ...(formData.costTable || {}) };
    
    if (numValue === undefined) {
      delete newTable[constLevel];
    } else {
      newTable[constLevel] = numValue;
    }
    
    setFormData((prev) => ({ ...prev, costTable: newTable }));
  };

  const handleResetAllCosts = () => {
    setFormData((prev) => ({ ...prev, costTable: {} }));
    toast.success("✅ Таблица весов сброшена на базовую (C+1)");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) {
      toast.error("❌ Ошибка: нет ID предмета");
      return;
    }

    if (isUserMode) {
      if (!currentUser?.uid) {
        toast.error("❌ Ошибка: пользователь не авторизован");
        return;
      }
      
      try {
        await dispatch(
          updateUserItemConstellation({
            userId: currentUser.uid,
            type: itemType,
            itemId,
            constellation: Number(formData.constellation) || 0,
          })
        ).unwrap();
        
        toast.success(`✅ Конста обновлена на C${formData.constellation}!`);
        onClose();
        return;
      } catch (error) {
        toast.error("❌ Ошибка обновления консты");
        console.error(error);
        return;
      }
    }

    if (!formData.name?.trim()) {
      toast.error("❌ Название обязательно");
      return;
    }

    try {
      if (existingItem) {
        const finalData = { ...formData };
        
        // Очищаем пустую таблицу, чтобы не мусорить в БД
        if (finalData.costTable && Object.keys(finalData.costTable).length === 0) {
          delete finalData.costTable;
        }

        if (itemType === "weapon") {
          const weaponData = finalData as Weapon;
          if (!weaponData.type || weaponData.type === "") {
             weaponData.type = "sword";
          }
        }
        if (itemType === "character") {
          const charData = finalData as Character;
          if (!charData.element || charData.element === "") {
             charData.element = "physical";
          }
        }

        if (itemType === "character") {
          await dispatch(updateCharacter({ id: itemId, data: finalData })).unwrap();
        } else {
          await dispatch(updateWeapon({ id: itemId, data: finalData })).unwrap();
        }
        
        const hasCustomCosts = formData.costTable && Object.keys(formData.costTable).length > 0;
        toast.success(`✅ Данные обновлены! ${hasCustomCosts ? '(Есть ручные веса)' : '(Базовые веса)'}`);
        onClose();
      } else {
        toast.error("❌ Создание новых предметов недоступно в этом окне");
      }
    } catch (error) {
      toast.error("❌ Ошибка сохранения");
      console.error(error);
    }
  };

  if (status === "loading" && itemId && !isUserMode) {
    return (
      <div className="modal-content">
        <h2 className="h2-common">Загрузка...</h2>
        <Loading />
      </div>
    );
  }

  const texts = {
    title: isUserMode 
      ? `Изменить консту: ${existingItem?.name || "Предмет"}`
      : (itemId && itemType === "character" ? "Редактировать персонажа" : "Редактировать оружие"),
    submit: isUserMode ? "Применить" : "Сохранить",
  };

  return (
    <>
      <h2 className="h2-common">{texts.title}</h2>
      
      {isUserMode && (
        <p style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
          Изменение применится только к вашей копии предмета в коллекции.
        </p>
      )}

      <form onSubmit={handleSubmit} className="form">
        
        {isUserMode ? (
          <div className="form__content">
            <label className="form__label">Уровень пробуждения (Конста)</label>
            <select
              value={formData.constellation ?? 0}
              onChange={(e) => handleChange("constellation", Number(e.target.value))}
              className="form__input"
              style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>C{n} (Вес: {getCostForConst(n)})</option>
              ))}
            </select>
            <p style={{ fontSize: '0.9rem', color: '#fbbf24', marginTop: '0.5rem', textAlign: 'center' }}>
              Вес этого предмета в команде: <strong>{currentCost}</strong>
            </p>
          </div>
        ) : (
          <>
            {/* Название */}
            <div className="form__content">
              <label className="form__label">
                {itemType === "character" ? "Имя" : "Название оружия"}
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Введите название"
                className="form__input"
                required
              />
            </div>

            {/* Изображение */}
            <div className="form__content">
              <label className="form__label">URL изображения</label>
              <input
                type="url"
                value={formData.image || ""}
                onChange={(e) => handleChange("image", e.target.value)}
                className="form__input"
                placeholder="https://..."
              />
            </div>

            {/* Редкость */}
            <div className="form__content">
              <label className="form__label">Редкость</label>
              <select
                value={formData.rarity || "5"}
                onChange={(e) => handleChange("rarity", e.target.value)}
                className="form__input"
              >
                <option value="4">4 ★</option>
                <option value="5">5 ★</option>
                <option value="6">6 ★</option>
              </select>
            </div>

            {/* Пробуждение (Конста) */}
            <div className="form__content">
              <label className="form__label">Текущее пробуждение</label>
              <select
                value={formData.constellation ?? 0}
                onChange={(e) => handleChange("constellation", Number(e.target.value))}
                className="form__input"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>C{n}</option>
                ))}
              </select>
            </div>

            {/* ТАБЛИЦА СТОИМОСТИ КОНСТ (ТОЛЬКО АДМИН) */}
            <div className="form__content" style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form__label" style={{ color: '#fbbf24', margin: 0 }}>
                  ⚖️ Настройка весов конст
                </label>
                {(formData.costTable && Object.keys(formData.costTable).length > 0) && (
                  <button
                    type="button"
                    onClick={handleResetAllCosts}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Сбросить всё
                  </button>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {[0, 1, 2, 3, 4, 5].map((c) => {
                  const defaultCost = c + 1;
                  const customCost = formData.costTable?.[c];
                  const isCustom = customCost !== undefined;
                  
                  return (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', padding: '0.25rem', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', width: '30px' }}>C{c}</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={isCustom ? customCost : ''}
                        onChange={(e) => handleCostChange(c, e.target.value)}
                        placeholder={`${defaultCost}`}
                        style={{
                          width: '100%',
                          padding: '0.25rem',
                          background: 'transparent',
                          border: isCustom ? '1px solid #fbbf24' : '1px solid #334155',
                          borderRadius: '2px',
                          color: isCustom ? '#fbbf24' : 'white',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
                Оставьте поле пустым для авто-расчета (C+1). Заполните для ручного веса.
                <br/>
                Текущий вес для C{currentConst}: <strong style={{ color: '#fbbf24' }}>{currentCost}</strong>
              </p>
            </div>

            {/* Поля для персонажей */}
            {itemType === "character" && (
              <div className="form__content">
                <label className="form__label">Элемент</label>
                <select
                  value={(formData as Character).element || "physical"}
                  onChange={(e) => handleChange("element", e.target.value)}
                  className="form__input"
                >
                  <option value="cryo">Крио</option>
                  <option value="heat">Пиро</option>
                  <option value="physical">Физ</option>
                  <option value="nature">Природа</option>
                  <option value="electric">Электричество</option>
                </select>
              </div>
            )}

            {/* Поля для оружия */}
            {itemType === "weapon" && (
              <div className="form__content">
                <label className="form__label">Тип оружия</label>
                <select
                  value={(formData as Weapon).type || "sword"}
                  onChange={(e) => handleChange("type", e.target.value)}
                  className="form__input"
                >
                  <option value="sword">Одноручный меч</option>
                  <option value="handcannon">Пистолеты</option>
                  <option value="greatsword">Двуручный меч</option>
                  <option value="polearm">Копье</option>
                  <option value="artsUnit">Катализатор</option>
                </select>
              </div>
            )}
          </>
        )}

        <div className="form__btn-container">
          <button type="submit" className={`form__btn ${isUserMode ? 'form__btn-create' : 'form__btn-create'}`}>
            {texts.submit}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="form__btn form__btn-close"
          >
            Отмена
          </button>
        </div>
      </form>
    </>
  );
}