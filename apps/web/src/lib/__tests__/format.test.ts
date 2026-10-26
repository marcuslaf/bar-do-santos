import { describe, expect, it } from "vitest";

import {
  centsFromDigits,
  centsFromPastedText,
  formatAmount,
  MAX_AMOUNT_CENTS,
} from "@/lib/format";

describe("centsFromDigits (máscara de PDV)", () => {
  it("preenche da direita para a esquerda", () => {
    expect(centsFromDigits("3")).toBe(3); // 0,03
    expect(centsFromDigits("32")).toBe(32); // 0,32
    expect(centsFromDigits("325")).toBe(325); // 3,25
    expect(centsFromDigits("3250")).toBe(3250); // 32,50
  });

  it("ignora os separadores que a própria máscara insere", () => {
    expect(centsFromDigits("32,50")).toBe(3250);
    expect(centsFromDigits("1.234,56")).toBe(123456);
    expect(centsFromDigits("R$ 32,50")).toBe(3250);
  });

  it("trata backspace como menos um dígito", () => {
    // "32,50" → backspace deixa "32,5" no input
    expect(centsFromDigits("32,5")).toBe(325);
    // "3,25" → backspace deixa "3,2"
    expect(centsFromDigits("3,2")).toBe(32);
  });

  it("lida com zero e com zeros à esquerda", () => {
    expect(centsFromDigits("0")).toBe(0);
    expect(centsFromDigits("0005")).toBe(5);
    expect(centsFromDigits("0,00")).toBe(0);
  });

  it("devolve null para entrada vazia ou sem dígitos", () => {
    expect(centsFromDigits("")).toBeNull();
    expect(centsFromDigits("   ")).toBeNull();
    expect(centsFromDigits("abc")).toBeNull();
  });

  it("não devolve valor fora do inteiro seguro", () => {
    expect(centsFromDigits("99999999999999999999")).toBeNull();
  });
});

describe("centsFromPastedText (colar/completar)", () => {
  it("respeita os centavos quando há separador decimal", () => {
    expect(centsFromPastedText("32,50")).toBe(3250);
    expect(centsFromPastedText("32.50")).toBe(3250);
    expect(centsFromPastedText("R$ 1.234,56")).toBe(123456);
    expect(centsFromPastedText("0,05")).toBe(5);
  });

  it("sem separador decimal cai na máscara de dígitos", () => {
    expect(centsFromPastedText("3250")).toBe(3250);
    expect(centsFromPastedText("3 2 5 0")).toBe(3250);
  });

  it("texto vazio vira null", () => {
    expect(centsFromPastedText("")).toBeNull();
    expect(centsFromPastedText("   ")).toBeNull();
  });
});

describe("formatAmount", () => {
  it("mostra o valor sem o prefixo R$", () => {
    expect(formatAmount(3250)).toBe("32,50");
    expect(formatAmount(0)).toBe("0,00");
    expect(formatAmount(5)).toBe("0,05");
    expect(formatAmount(123456)).toBe("1.234,56");
  });

  it("campo vazio quando não há valor", () => {
    expect(formatAmount(null)).toBe("");
    expect(formatAmount(undefined)).toBe("");
  });
});

describe("MAX_AMOUNT_CENTS", () => {
  it("espelha o limite do banco (R$ 100.000,00)", () => {
    expect(MAX_AMOUNT_CENTS).toBe(10_000_000);
  });
});
