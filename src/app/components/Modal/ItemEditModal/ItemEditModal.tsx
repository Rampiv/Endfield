// src/app/components/Modal/ItemEditModal.tsx
"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import toast from "react-hot-toast";
import { Loading } from "../../Loading";
import { Character, Weapon } from "@/lib/types";
// Импортируем thunk для обновления консты пользователя
import { updateUserItemConstellation } from "@/lib/slices/userItemsSlice"; 
import { updateCharacter } from "@/lib/slices/charactersSlice";
import { updateWeapon } from "@/lib/slices/weaponsSlice";
import "./ItemEditModal.scss";
import "../../../admin/adminpage.scss";

interface Props {
  onClose: () => void;
  itemType: "weapon" | "character";
  itemId?: string;
  isUserMode?: boolean; // ✅ Новый проп: true если пользователь редактирует свою коллекцию
}

type Item = Character | Weapon;

export function ItemEditModal({ onClose, itemType, itemId, isUserMode = false }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  
  // Получаем текущего пользователя (нужен для isUserMode)
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Загружаем данные, если редактируем существующий предмет
  const existingItem = useSelector((state: RootState) => {
    if (!itemId) return null;
    const items =
      itemType === "character" ? state.characters.items : state.weapons.items;
    return items.find((item) => item.id === itemId) || null;
  });

  const status = useSelector((state: RootState) =>
    itemType === "character" ? state.characters.status : state.weapons.status,
  );

  // ✅ Состояние формы
  const [formData, setFormData] = useState<Partial<Item>>({
    name: "",
    element: "",
    rarity: "",
    image: "",
    constellation: 0,
    type: "",
  });

  // 🔄 Заполняем форму при загрузке
  useEffect(() => {
    if (existingItem) {
      setFormData(existingItem);
    }
  }, [existingItem]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 💾 Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) {
      toast.error("❌ Ошибка: нет ID предмета");
      return;
    }

    // Проверка для режима пользователя
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

    // Проверка для режима админа (глобальное редактирование)
    if (!formData.name?.trim()) {
      toast.error("❌ Название обязательно");
      return;
    }

    try {
      if (existingItem) {
        if (itemType === "character") {
          await dispatch(
            updateCharacter({ id: itemId, data: formData })
          ).unwrap();
        } else {
          await dispatch(
            updateWeapon({ id: itemId, data: formData })
          ).unwrap();
        }
        toast.success("✅ Данные предмета обновлены!");
        onClose();
      } else {
        toast.error("❌ Создание новых предметов недоступно в этом окне");
      }
    } catch (error) {
      toast.error("❌ Ошибка сохранения");
      console.error(error);
    }
  };

  // ⏳ Загрузка
  if (status === "loading" && itemId && !isUserMode) {
    return (
      <div className="modal-content">
        <h2 className="h2-common">Загрузка...</h2>
        <Loading />
      </div>
    );
  }

  // 📝 Тексты
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
        
        {/* ✅ РЕЖИМ ПОЛЬЗОВАТЕЛЯ: Только конста */}
        {isUserMode ? (
          <div className="form__content">
            <label className="form__label">Уровень пробуждения (Конста)</label>
            <select
              value={formData.constellation ?? 0}
              onChange={(e) => handleChange("constellation", Number(e.target.value))}
              className="form__input"
              style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>C{n} {n === 0 ? '(Базовый)' : ''}</option>
              ))}
            </select>
          </div>
        ) : (
          /* ✅ РЕЖИМ АДМИНА: Все поля */
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
                value={formData.rarity || ""}
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
              <label className="form__label">Пробуждение (Глобальное)</label>
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

            {/* Поля для персонажей */}
            {itemType === "character" && (
              <div className="form__content">
                <label className="form__label">Элемент</label>
                <select
                  value={(formData as Character).element || ""}
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
                  value={(formData as Weapon).type || ""}
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