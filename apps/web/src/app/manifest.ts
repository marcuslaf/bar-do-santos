import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pedidos",
    short_name: "Pedidos",
    description:
      "Caderno de pedidos da equipe: anote, acompanhe e feche o caixa do dia.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f5ec",
    theme_color: "#f9f5ec",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
