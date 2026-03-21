"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/lib/store";
import { useAdmin } from "@/lib/hook/useAdmin";
import { deleteCharacter, fetchCharacters } from "@/lib/slices/charactersSlice";
import { deleteWeapon, fetchWeapons } from "@/lib/slices/weaponsSlice";
import { openModal } from "@/lib/slices/modalSlice";
import { Header, ItemCard, Loading } from "../components";
import "./adminpage.scss";
import "../user/userpage.scss";

export default function AdminPage() {
  const { isAdmin, loading, user } = useAdmin();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const characters = useSelector((state: RootState) => state.characters.items);
  const weapons = useSelector((state: RootState) => state.weapons.items);

  useEffect(() => {
    if (!loading && isAdmin) {
      dispatch(fetchCharacters());
      dispatch(fetchWeapons());
    }
  }, [isAdmin, loading, dispatch]);

  // Показываем загрузку пока Firebase проверяет сессию
  if (loading) {
    return <Loading />;
  }

  // Если не админ — redirect (useAdmin уже сделал это)
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="admin">
        <div className="container">
          <h1 className="admin-h1">🛡️ Админ-панель</h1>
          <section className="section admin__characters">
            <h2 className="h2-common">Персонажи</h2>
            <button
              onClick={() => dispatch(openModal({ type: "characterAdd" }))}
              className="user__btn-add"
            >
              Добавить персонажа
            </button>

            <ul className="user__list">
              {characters.map((char) => (
                <li key={char.id} className="user__item">
                  <ItemCard item={char} />
                  <div className="admin__btn-container">
                    <button
                      onClick={() =>
                        dispatch(
                          openModal({
                            type: "itemEdit",
                            data: { itemType: "character", itemId: char.id },
                          }),
                        )
                      }
                      className="admin__btn admin__btn-edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Вы уврены?")) return;
                        dispatch(deleteCharacter(char.id!));
                        toast.success("Персонаж удалён");
                      }}
                      className="admin__btn admin__btn-dell"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {/* Оружие */}
          <section className="section admin__weapons">
            <h2 className="h2-common">Оружие</h2>
            <button
              onClick={() => dispatch(openModal({ type: "weaponAdd" }))}
              className="user__btn-add"
            >
              Добавить оружие
            </button>
            <ul className="user__list">
              {weapons.map((weapon) => (
                <li key={weapon.id} className="user__item">
                  <ItemCard item={weapon} />
                  <div className="admin__btn-container">
                    <button
                      onClick={() =>
                        dispatch(
                          openModal({
                            type: "itemEdit",
                            data: { itemType: "weapon", itemId: weapon.id },
                          }),
                        )
                      }
                      className="admin__btn admin__btn-edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Вы уврены?")) return;
                        dispatch(deleteWeapon(weapon.id!));
                        toast.success("Оружие удалено");
                      }}
                      className="admin__btn admin__btn-dell"
                    >
                      🗑️
                    </button>
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
