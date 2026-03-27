"use client";

import { Provider } from "react-redux";
import AuthProvider from "@/lib/authProvider";
import { store } from "@/lib/store";
import ModalProvider from "./modalProvider";
import { Toaster } from "react-hot-toast";
import background from './assets/back.webp'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ModalProvider />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#22c55e",
                secondary: "#fff",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
        {children}
        <img src={background.src} className="background-img" alt="background"/>
      </AuthProvider>
    </Provider>
  );
}
