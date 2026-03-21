"use client";

import { login } from "@/lib/slices/authSlice";
import { AppDispatch, RootState } from "@/lib/store";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./LoginModal.scss";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
}

export function LoginModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      toast.success(
        `✅ С возвращением, ${user?.displayName || "Endministrator"}!`,
      );
      onClose();
    } else if (login.rejected.match(result)) {
      toast.error(
        `❌ Ошибка входа: ${result.payload || "Неверный email или пароль"}`,
      );
    }
  };

  return (
    <>
      <h2 className="form-login__title">Вход</h2>

      <form onSubmit={handleSubmit} className="form-login">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className=""
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className=""
          required
        />

        <div className="form-login__btns">
          <button type="submit" className="">
            Войти
          </button>
          <button type="button" onClick={onClose} className="">
            Отмена
          </button>
        </div>
      </form>
    </>
  );
}
