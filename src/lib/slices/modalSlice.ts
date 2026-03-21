import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ModalType =
  | "login"
  | "register"
  | "logout"
  | "characterAdd"
  | "weaponAdd"
  | "chooseCharacters"
  | "chooseWeapons"
  | "itemEdit"
  | null;

interface ModalState {
  isOpen: boolean;
  modalType: ModalType;
  modalData: any;
}

const initialState: ModalState = {
  isOpen: false,
  modalType: null,
  modalData: null,
};

const modalSlice = createSlice({
  name: "modal",
  initialState,
  reducers: {
    openModal: (
      state,
      action: PayloadAction<{ type: ModalType; data?: any, isUserMode?: boolean;  }>,
    ) => {
      state.isOpen = true;
      state.modalType = action.payload.type;
      state.modalData = action.payload.data || null;
      if (action.payload.isUserMode !== undefined) {
        state.modalData = {
          ...state.modalData,
          isUserMode: action.payload.isUserMode,
        };
      }
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.modalType = null;
      state.modalData = null;
    },
  },
});

export const { openModal, closeModal } = modalSlice.actions;
export default modalSlice.reducer;
