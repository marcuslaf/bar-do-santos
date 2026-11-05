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
 * Larguras vêm de fora de propósito: ela só é renderizada com largura e altura
 * sobrando (>= 768px e altura > 480px), onde é limitada pelo espaço que sobra ao
 * lado do card (224px em 768, 352px no desktop). Abaixo disso quem assina a tela
 * é o `BrandLockup` — nenhuma imagem no caminho crítico do celular.
 *
 * Sem `priority`: a placa não é o LCP em nenhum tier em que aparece, e o
 * `priority` injeta `<link rel="preload">` que baixa o arquivo mesmo quando o
 * CSS esconde o elemento. Sem raio na imagem: os cantos da arte são retos e o
 * arco de 4px cortava o filete duplo dourado em DPR 3; se um dia entrar mat, o
 * raio vive nele, não no recorte da arte.
 *
 * Um único <Image>, e `className` vai para ele: o mini-letreiro do tier
 * `max-height:22rem` saiu junto com a placa escondida por CSS — como ele era
 * irmão do banner, o `hidden` do banner não o alcançava e ele voltava a aparecer
 * (37,5px de altura) em 480×320 e 568×320.
 */
export function BrandSign({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-bar-do-santos.png"
      alt="Bar do Santos"
      width={800}
      height={250}
      sizes="(min-width: 1024px) 352px, (min-width: 768px) 224px, 100vw"
      className={`block h-auto max-w-full ${className}`}
    />
  );
}
