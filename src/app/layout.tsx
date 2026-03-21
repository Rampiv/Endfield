import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "./styles/global.scss";

export const metadata: Metadata = {
  title: "Endfield турниры",
  description: "Приложение для проведения турниров в Endfield",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
