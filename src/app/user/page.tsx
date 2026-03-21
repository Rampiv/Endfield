// src/app/user/page.tsx
"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useEffect, useState } from "react";
import { openModal } from "@/lib/slices/modalSlice";
import toast from "react-hot-toast";
import { ItemCard, Header, Loading } from "../components";
import "./userpage.scss";
import {
  fetchUserItemIds,
  removeUserItemId,
  selectUserCharacters,
  selectUserWeapons,
} from "@/lib/slices/userItemsSlice";
import { Character, Weapon } from "@/lib/types";
import { fetchCharacters } from "@/lib/slices/charactersSlice";
import { fetchWeapons } from "@/lib/slices/weaponsSlice";

type UserItem = Character | Weapon;

export default function UserPage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const userCharacters = useSelector(selectUserCharacters);
  const userWeapons = useSelector(selectUserWeapons);
  const status = useSelector((state: RootState) => state.userItems.status);

  const [isEditMode, setIsEditMode] = useState(false);

  // Загружаем данные при монтировании
  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchCharacters());
      dispatch(fetchWeapons());
      dispatch(fetchUserItemIds(user.uid));
    }
  }, [dispatch, user]);

  const handleRemoveItem = async (
    type: "character" | "weapon",
    item: UserItem,
  ) => {
    if (!user || !item.id) {
      toast.error("❌ Ошибка: у предмета нет ID");
      return;
    }
    try {
      await dispatch(
        removeUserItemId({ userId: user.uid, type, itemId: item.id }),
      ).unwrap();
      toast.success(`${item.name} удалён из коллекции`);
    } catch (error) {
      toast.error("❌ Ошибка удаления");
    }
  };

  const handleAddCharacters = () =>
    dispatch(openModal({ type: "chooseCharacters" }));

  const handleAddWeapons = () => dispatch(openModal({ type: "chooseWeapons" }));

  // Состояния загрузки и ошибок
  if (!user || status === "loading") {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  if (status === "failed") {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-red-600">❌ Ошибка загрузки данных</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="user">
        <div className="container">
          {/* === ПЕРСОНАЖИ === */}
          <section className="section">
            <h2 className="h2-common">Мои персонажи</h2>
            <button onClick={handleAddCharacters} className="user__btn-add">
              Добавить персонажа
            </button>

            {userCharacters.length === 0 ? (
              <p className="user__item-null">У вас пока нет персонажей</p>
            ) : (
              <ul className="user__list">
                {userCharacters.map((char) => (
                  <li key={char.id} className="user__item">
                    <ItemCard item={char} />

                    {isEditMode && (
                      <div className="user__item-actions">
                        {/* ✅ Кнопка редактирования консты (Открывает модалку через Redux) */}
                        <button
                          onClick={() =>
                            dispatch(
                              openModal({
                                type: "itemEdit",
                                data: {
                                  itemType: "character",
                                  itemId: char.id,
                                },
                                isUserMode: true, // ✅ Флаг для режима пользователя
                              }),
                            )
                          }
                          className="user__btn-edit-const"
                          title="Изменить консту"
                        >
                          ✦ C{char.constellation || 0}
                        </button>

                        <button
                          onClick={() => handleRemoveItem("character", char)}
                          className="user__btn-dell"
                          title="Удалить"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* === ОРУЖИЕ === */}
          <section className="section">
            <h2 className="h2-common">Моё оружие</h2>
            <button onClick={handleAddWeapons} className="user__btn-add">
              Добавить оружие
            </button>

            {userWeapons.length === 0 ? (
              <p className="user__item-null">У вас пока нет оружия</p>
            ) : (
              <ul className="user__list">
                {userWeapons.map((weapon) => (
                  <li key={weapon.id} className="user__item">
                    <ItemCard item={weapon} />

                    {isEditMode && (
                      <div className="user__item-actions">
                        {/* ✅ Кнопка редактирования консты (Открывает модалку через Redux) */}
                        <button
                          onClick={() =>
                            dispatch(
                              openModal({
                                type: "itemEdit",
                                data: {
                                  itemType: "weapon",
                                  itemId: weapon.id,
                                },
                                isUserMode: true, // ✅ Флаг для режима пользователя
                              }),
                            )
                          }
                          className="user__btn-edit-const"
                          title="Изменить консту"
                        >
                          ✦ C{weapon.constellation || 0}
                        </button>

                        <button
                          onClick={() => handleRemoveItem("weapon", weapon)}
                          className="user__btn-dell"
                          title="Удалить"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Кнопка переключения режима редактирования */}
          <div className="user__btn-container">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`user__btn-edit ${
                isEditMode ? "user__btn-edit_off" : "user__btn-edit_on"
              }`}
            >
              {isEditMode ? "Готово" : "Редактировать коллекцию"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
