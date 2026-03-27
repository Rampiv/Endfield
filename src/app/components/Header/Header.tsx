"use client";

import { useAdmin } from "@/lib/hook/useAdmin";
import { logoutUser } from "@/lib/slices/authSlice";
import { openModal } from "@/lib/slices/modalSlice";
import { AppDispatch, RootState } from "@/lib/store";
import Link from "next/link";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import "./Header.scss";

export const Header = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { isAdmin } = useAdmin();
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      toast.success(`✅ Вы вышли из аккаунта!`);
    } else if (logoutUser.rejected.match(result)) {
      toast.error(`❌ Ошибка выхода"}`);
    }
  };

  return (
    <header className="header">
      <div className="header__content">
      <Link href={"/"} className="header__btn header__return">На главную</Link>
        {user && <Link href="/user" className="header__btn header__btn-name">{user.displayName}</Link>}
        {!user && (
          <>
            <button
              onClick={() => dispatch(openModal({ type: "login" }))}
              className="header__btn"
            >
              Войти
            </button>
            <button
              className="header__btn"
              onClick={() => dispatch(openModal({ type: "register" }))}
            >
              Регистрация
            </button>
          </>
        )}
        {isAdmin && <Link href="/admin" className="header__btn">Admin панель</Link>}
        {user && (
          <button className="header__btn header__btn-exit" onClick={() => handleLogout()}>
            Выйти
          </button>
        )}
      </div>
    </header>
  );
};
