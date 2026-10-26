import type { Metadata, Viewport } from "next";
import { Bitter, IBM_Plex_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-face",
  display: "swap",
});

const displayFont = Bitter({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pedidos",
    template: "%s · Pedidos",
  },
  description:
    "Caderno de pedidos da equipe: anote, acompanhe e feche o caixa do dia.",
  applicationName: "Pedidos",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pedidos",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // A status bar do celular acompanha o tema resolvido (não só o do SO).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f5ec" },
    { media: "(prefers-color-scheme: dark)", color: "#19120e" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning`: o script do next-themes aplica `.dark` antes da
    // primeira pintura (evita flash claro), o que diverge do HTML do servidor.
    <html
      lang="pt-BR"
      className={`${bodyFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
