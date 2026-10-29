import Image from "next/image";

/**
 * O letreiro do bar — a placa da fachada, não o símbolo do app.
 *
 * A arte é 3,2:1 (banner), então ela nunca é um ícone: no login ela é o
 * elemento de maior massa da tela e o nome do app aparece como legenda abaixo
 * ("Pedidos · Caderno da equipe"). O caderninho (BrandMark) continua sendo o
 * símbolo do *aplicativo* — ícone da PWA, /sem-acesso, telas internas — porque
 * um banner não sobrevive a 16px.
 *
 * Larguras vêm de fora de propósito: no celular em pé a placa ocupa a largura
 * da coluna (288px em 320 de viewport = 90px de altura, o teto que cabe acima
 * da dobra); na composição de duas colunas ela é limitada pelo espaço que sobra
 * ao lado do card (176px em 640, 224px em 768, 352px no desktop).
 *
 * `priority` porque, sempre que aparece, é o maior elemento acima da dobra.
 * O raio de 4px é o único tratamento: a placa já traz o filete duplo dourado,
 * então moldura, sombra ou brilho viram ruído por cima da própria arte.
 */
export function BrandSign({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-bar-do-santos.png"
      alt="Bar do Santos"
      width={800}
      height={250}
      priority
      sizes="(min-width: 1024px) 352px, (min-width: 768px) 224px, (min-width: 640px) 176px, 100vw"
      className={`block h-auto max-w-full rounded-[4px] ${className}`}
    />
  );
}
