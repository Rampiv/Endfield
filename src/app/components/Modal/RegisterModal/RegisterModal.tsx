"use client";

import { register } from "@/lib/slices/authSlice";
import { AppDispatch } from "@/lib/store";
import { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import '../LoginModal/LoginModal'

interface Props {
  onClose: () => void;
}

export function RegisterModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const dispatch = useDispatch<AppDispatch>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(register({ email, password, displayName }));
    if (register.fulfilled.match(result)) {
      onClose();
      toast.success(
        `✅ Добро пожаловать, ${displayName || 'Endministrator'}!`,
      );
      onClose();
    } else if (register.rejected.match(result)) {
      toast.error(
        `❌ Ошибка входа: ${result.payload || "Неверный email или пароль"}`,
      );
    }
  };

  return (
    <>
      <h2 className="form-login__title">Регистрация</h2>

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
        <input
          type="text"
          placeholder="NickName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className=""
          required
        />

        <div className="form-login__btns">
          <button type="submit" className="">
            Регистрация
          </button>
          <button type="button" onClick={onClose} className="">
            Отмена
          </button>
        </div>
      </form>
    </>
  );
}
