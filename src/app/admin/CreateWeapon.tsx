// src/app/admin/weapons/new/page.tsx
"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppDispatch } from "@/lib/store";
import { addWeapon } from "@/lib/slices/weaponsSlice";

interface Props {
  onClose: () => void;
}

export default function NewWeaponPage({ onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    type: "sword",
    rarity: "5",
    image: "",
    constellation: 0,
  });

  // ✅ Расчет "веса" оружия для лимита команды
  const unitCost = formData.constellation + 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      toast.error("❌ Выберите тип оружия!");
      return;
    }

    try {
      await dispatch(addWeapon(formData)).unwrap();
      toast.success(`✅ Оружие создано! (Вес в команде: ${unitCost})`);
      onClose();
      router.push("/admin");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("❌ Ошибка при создании оружия");
    }
  };

  return (
    <>
      <h2 className="h2-common">Добавить оружие</h2>

      <form onSubmit={handleSubmit} className="form">
        <div className="form__content">
          <label className="form__label">Имя</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="form__input"
            required
            placeholder="Например: Eminent Repute"
          />
        </div>

        <div className="form__content">
          <label className="form__label">Тип оружия</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form__input"
            required
          >
            <option value="" disabled>Выберите тип...</option>
            <option value="sword">Одноручный меч</option>
            <option value="handcannon">Пистолеты</option>
            <option value="greatsword">Двуручный меч</option>
            <option value="polearm">Копье</option>
            <option value="artsUnit">Катализатор</option>
          </select>
        </div>

        <div className="form__content">
          <label className="form__label">Редкость</label>
          <select
            value={formData.rarity}
            onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
            className="form__input"
            required
          >
            <option value="" disabled>Выберите редкость...</option>
            <option value="4">4 ★</option>
            <option value="5">5 ★</option>
            <option value="6">6 ★</option>
          </select>
        </div>

        <div className="form__content">
          <label className="form__label">Пробуждение (Конста)</label>
          <select
            value={formData.constellation}
            onChange={(e) =>
              setFormData({
                ...formData,
                constellation: Number(e.target.value),
              })
            }
            className="form__input"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                C{n} (Вес: {n + 1})
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Вес этого оружия в составе команды: <strong>{unitCost}</strong>
          </p>
        </div>

        <div className="form__content">
          <label className="form__label">URL изображения</label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="form__input"
            placeholder="https://..."
            required
          />
        </div>

        <div className="form__btn-container">
          <button type="submit" className="form__btn form__btn-create">
            Создать
          </button>
          <button
            type="button"
            onClick={() => onClose()}
            className="form__btn form__btn-close"
          >
            Отмена
          </button>
        </div>
      </form>
    </>
  );
}