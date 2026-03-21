"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import toast from "react-hot-toast";
import { Loading } from "../../Loading";
import { fetchCharacters } from "@/lib/slices/charactersSlice";
import { fetchWeapons } from "@/lib/slices/weaponsSlice";
import { Character, Weapon } from "@/lib/types";
import { addUserItemId, fetchUserItemIds } from "@/lib/slices/userItemsSlice";
import "./itemChooseModal.scss";

interface Props {
  onClose: () => void;
  itemType: "weapon" | "character";
}

type Item = Character | Weapon;

export function ItemChooseModal({ onClose, itemType }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [search, setSearch] = useState("");

  const allItems = useSelector((state: RootState) =>
    itemType === "character" ? state.characters.items : state.weapons.items,
  );

  const itemsStatus = useSelector((state: RootState) =>
    itemType === "character" ? state.characters.status : state.weapons.status,
  );

  const userItems = useSelector((state: RootState) =>
    itemType === "character"
      ? state.userItems.characterIds
      : state.userItems.weaponIds,
  );

  const userItemsStatus = useSelector(
    (state: RootState) => state.userItems.status,
  );

  const availableItems = useMemo(() => {
    const userIds = new Set(
      userItems
        .map((item) => item)
        .filter((id): id is string => id !== undefined),
    );
    return allItems.filter((item) => item.id && !userIds.has(item.id));
  }, [allItems, userItems]);

  // Поиск
  const filteredItems = useMemo(() => {
    if (!search.trim()) return availableItems;

    const searchLower = search.toLowerCase();

    return availableItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const extraField = (item as Character).element || (item as Weapon).type;
      const extraMatch = extraField?.toLowerCase().includes(searchLower);

      return nameMatch || !!extraMatch;
    });
  }, [availableItems, search]);

  // Загружаем данные при открытии
  useEffect(() => {
    if (user?.uid) {
      if (itemType === "character") {
        dispatch(fetchCharacters());
      } else {
        dispatch(fetchWeapons());
      }
      dispatch(fetchUserItemIds(user.uid));
    }
  }, [dispatch, user, itemType]);

  const handleAddItem = async (item: Item) => {
    if (!user || !item.id) return;

    try {
      await dispatch(
        addUserItemId({
          userId: user.uid,
          type: itemType,
          itemId: item.id,
        }),
      ).unwrap();

      toast.success(`✅ ${item.name} добавлен в коллекцию!`);
    } catch (error) {
      toast.error("❌ Ошибка добавления");
      console.error(error);
    }
  };

  // 📝 Тексты в зависимости от типа
  const texts = {
    title: itemType === "character" ? "Выберите персонажа" : "Выберите оружие",
    placeholder:
      itemType === "character" ? "Поиск персонажа..." : "Поиск оружия...",
    empty:
      itemType === "character"
        ? "Все персонажи уже добавлены!"
        : "Всё оружие уже добавлено!",
    notFound: "Не найдено по запросу",
  };

  // ⏳ Загрузка
  if (itemsStatus === "loading" || userItemsStatus === "loading") {
    return (
      <div>
        <h2 className="h2-common">{texts.title}</h2>
        <Loading />
      </div>
    );
  }

  // ❌ Ошибка
  if (itemsStatus === "failed" || userItemsStatus === "failed") {
    return (
      <div>
        <h2 className="h2-common">❌ Ошибка загрузки</h2>
        <button onClick={onClose}>Закрыть</button>
      </div>
    );
  }

  return (
    <>
      <h2 className="h2-common">{texts.title}</h2>

      {/* 🔍 Поиск */}
      <input
        type="text"
        placeholder={texts.placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      {/* Список */}
      {filteredItems.length === 0 ? (
        <p className="item-choose__empty">
          {search ? texts.notFound : texts.empty}
        </p>
      ) : (
        <ul className="item-choose__list">
          {filteredItems.map((item) => (
            <li className="item-choose__item" key={item.id}>
              <button
                onClick={() => handleAddItem(item)}
                className="item-choose__btn"
              >
                {/* Изображение */}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="item-choose__img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/150?text=No+Image";
                    }}
                  />
                ) : (
                  <div className="item-choose__img-error">Нет изображения</div>
                )}

                {/* Информация */}
                <h3 className="item-choose__h3">{item.name}</h3>
                <p className="item-choose__descr">
                  {itemType === "character"
                    ? `${(item as Character).element || "Rarity:"} • ${(item as Character).rarity || "N/A"}★`
                    : `${(item as Weapon).type || "Rarity:"} • ${(item as Weapon).rarity || "N/A"}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Кнопка закрытия */}
      <div className="item-choose__close-container">
        <button
          onClick={onClose}
          className="item-choose__btn-close"
        >
          Закрыть
        </button>
      </div>
    </>
  );
}
