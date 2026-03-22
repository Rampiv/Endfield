// src/app/components/Modal/ItemEditModal.tsx
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

export function ItemEditModal({
  onClose,
  itemType,
  itemId,
  isUserMode = false,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);

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

  // 🔄 Заполняем форму при загрузке + Исправление пустых полей
  useEffect(() => {
    if (existingItem) {
      // Создаем копию данных
      const dataToSet = { ...existingItem };

      // ✅ ИСПРАВЛЕНИЕ ОШИБОК TS: Проверяем itemType перед доступом к полям

      if (itemType === "weapon") {
        // Приводим тип к Weapon, чтобы TS знал про поле type
        const weaponData = dataToSet as Weapon;
        if (!weaponData.type || weaponData.type === "") {
          weaponData.type = "sword";
        }
      }

      if (itemType === "character") {
        // Приводим тип к Character, чтобы TS знал про поле element
        const charData = dataToSet as Character;
        if (!charData.element || charData.element === "") {
          charData.element = "physical";
        }
      }

      setFormData(dataToSet);
    }
  }, [existingItem, itemType]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
          }),
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

        // Страховка перед отправкой
        if (itemType === "weapon") {
          // Говорим TS, что здесь finalData — это Weapon
          const weaponData = finalData as Weapon;
          if (!weaponData.type || weaponData.type === "") {
            weaponData.type = "sword";
          }
        } else if (itemType === "character") {
          // Говорим TS, что здесь finalData — это Character
          const charData = finalData as Character;
          if (!charData.element || charData.element === "") {
            charData.element = "physical";
          }
        }
        if (itemType === "character") {
          await dispatch(
            updateCharacter({ id: itemId, data: finalData }),
          ).unwrap();
        } else {
          await dispatch(
            updateWeapon({ id: itemId, data: finalData }),
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
      : itemId && itemType === "character"
        ? "Редактировать персонажа"
        : "Редактировать оружие",
    submit: isUserMode ? "Применить" : "Сохранить",
  };

  return (
    <>
      <h2 className="h2-common">{texts.title}</h2>

      {isUserMode && (
        <p
          style={{
            marginBottom: "1rem",
            color: "#94a3b8",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          Изменение применится только к вашей копии предмета в коллекции.
        </p>
      )}

      <form onSubmit={handleSubmit} className="form">
        {isUserMode ? (
          <div className="form__content">
            <label className="form__label">Уровень пробуждения (Конста)</label>
            <select
              value={formData.constellation ?? 0}
              onChange={(e) =>
                handleChange("constellation", Number(e.target.value))
              }
              className="form__input"
              style={{ fontSize: "1.1rem", fontWeight: "bold" }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  C{n} {n === 0 ? "(Базовый)" : ""}
                </option>
              ))}
            </select>
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
              <label className="form__label">Пробуждение (Глобальное)</label>
              <select
                value={formData.constellation ?? 0}
                onChange={(e) =>
                  handleChange("constellation", Number(e.target.value))
                }
                className="form__input"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    C{n}
                  </option>
                ))}
              </select>
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
          <button
            type="submit"
            className={`form__btn ${isUserMode ? "form__btn-create" : "form__btn-create"}`}
          >
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
