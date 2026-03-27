"use client";

import { useSelector, useDispatch } from "react-redux";
import { closeModal } from "@/lib/slices/modalSlice";
import { AppDispatch, RootState } from "@/lib/store";
import {
  ItemChooseModal,
  ItemEditModal,
  LoginModal,
  RegisterModal,
} from "./components/Modal";
import "./modalProvider.scss";
import NewCharacterPage from "./admin/CreateCharacter";
import NewWeaponPage from "./admin/CreateWeapon";

export default function ModalProvider() {
  const dispatch = useDispatch<AppDispatch>();
  const { isOpen, modalType, modalData } = useSelector(
    (state: RootState) => state.modal,
  );

  if (!isOpen) return null;

  const handleClose = () => dispatch(closeModal());

  const isUserMode = modalData?.isUserMode === true;

  return (
    <>
      {/* Затемнение фона */}
      <div className="modal__background" onClick={handleClose} />

      {/* Контейнер модального окна */}
      <div className="modal">
        <div className="modal__content">
          {modalType === "login" && <LoginModal onClose={handleClose} />}
          {modalType === "register" && <RegisterModal onClose={handleClose} />}
          {modalType === "characterAdd" && (
            <NewCharacterPage onClose={handleClose} />
          )}

          {modalType === "weaponAdd" && <NewWeaponPage onClose={handleClose} />}

          {modalType === "chooseCharacters" && (
            <ItemChooseModal onClose={handleClose} itemType="character" />
          )}
          {modalType === "chooseWeapons" && (
            <ItemChooseModal onClose={handleClose} itemType="weapon" />
          )}
          {modalType === "itemEdit" && modalData && (
            <ItemEditModal
              onClose={handleClose}
              itemType={modalData.itemType}
              itemId={modalData.itemId}
              isUserMode={isUserMode}
            />
          )}
        </div>
      </div>
    </>
  );
}
