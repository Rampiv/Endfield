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

  // ✅ Расчет "веса" персонажа для лимита команды: Конста + 1
  const unitCost = formData.constellation + 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await dispatch(addCharacter(formData));
    onClose();
    toast.success(`✅ Персонаж создан! (Вес в команде: ${unitCost})`);
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
            placeholder="Например: Эндминистратор"
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
            required
          >
            <option value="" disabled>Выберите элемент...</option>
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
            Вес этого персонажа в составе команды: <strong>{unitCost}</strong>
            <br/>
            <span style={{fontSize: '0.75rem'}}>Лимит команды обычно 10. C0=1, C6=7.</span>
          </p>
        </div>

        <div className="form__content">
          <label className="form__label">URL изображения</label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) =>
              setFormData({ ...formData, image: e.target.value })
            }
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