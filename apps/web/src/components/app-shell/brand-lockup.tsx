import { BrandMark } from "@/components/app-shell/brand-mark";

/**
 * Assinatura vetorial do lugar para telas onde a placa não cabe: caderninho
 * (símbolo do app) + "Bar do Santos" (nome do bar) + a legenda de 13px que diz
 * qual é o caderno.
 *
 * Existe porque, abaixo de 768px de largura — e em qualquer largura quando a
 * altura fica em 480px ou menos — a placa de 3,2:1 custa 90px de altura em
 * 320px de largura e é exatamente o que empurra o botão "Entrar" para fora da
 * dobra no estado de erro de senha. O par nome/subtítulo é o mesmo que o header
 * já usa (`account-link.tsx`), então o login deixa de trocar de assinatura a
 * cada orientação do aparelho.
 *
 * Só tokens semânticos: a marca desenha com `--brand`/`--mark-paper` e o texto
 * usa `text-ink`/`text-ink-soft`, então o componente acompanha os dois temas
 * sem cor literal.
 */
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandMark className="h-10 w-10 shrink-0" />
      <div className="min-w-0">
        <p className="font-display text-[24px] leading-none text-ink">
          Bar do Santos
        </p>
        <p className="text-[13px] leading-tight text-ink-soft">
          Pedidos · Caderno da equipe
        </p>
      </div>
    </div>
  );
}
