import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

import { AppI18nProvider } from "@/components/i18n/AppI18nProvider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "WeWIN Quiz Games",
  description: "WeWIN English practice platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`${nunito.variable} antialiased`} suppressHydrationWarning>
        <AppI18nProvider>{children}</AppI18nProvider>
      </body>
    </html>
  );
}
