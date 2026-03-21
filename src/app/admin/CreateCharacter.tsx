// src/app/admin/characters/new/page.tsx
"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addCharacter } from "@/lib/slices/charactersSlice";
import { AppDispatch } from "@/lib/store";

interface Props {
  onClose: () => void;
}

export default function NewCharacterPage({ onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    element: "",
    rarity: "",
    image: "",
    constellation: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(addCharacter(formData));
    onClose();
    toast.success("✅ Персонаж создан!");
    router.push("/admin");
  };

  return (
    <>
      <h2 className="h2-common">Добавить персонажа</h2>

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
          <label className="form__label">Элемент</label>
          <select
            value={formData.element}
            onChange={(e) =>
              setFormData({ ...formData, element: e.target.value })
            }
            className="form__input"
          >
            <option value="cryo">Крио</option>
            <option value="heat">Пиро</option>
            <option value="physical">Физ</option>
            <option value="nature">Природа</option>
            <option value="electric">Электричество</option>
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
          <label className="form__label">Пробуждение</label>
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
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
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
