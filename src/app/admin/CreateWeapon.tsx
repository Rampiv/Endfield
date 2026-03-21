// src/app/admin/characters/new/page.tsx
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
    type: "",
    rarity: "",
    image: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(addWeapon(formData));
    onClose();
    toast.success("✅ Персонаж создан!");
    router.push("/admin");
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
          />
        </div>

        <div className="form__content">
          <label className="form__label">Тип</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form__input"
          >
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
            onChange={(e) =>
              setFormData({ ...formData, rarity: e.target.value })
            }
            className="form__input"
          >
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
          </select>
        </div>
        <div className="form__content">
          <label className="form__label">URL</label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) =>
              setFormData({ ...formData, image: e.target.value })
            }
            className="form__input"
            placeholder="https://..."
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
