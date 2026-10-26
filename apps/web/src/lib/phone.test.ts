import { describe, expect, it } from "vitest";

import {
  digitsOnly,
  formatPhone,
  normalizePhone,
  phoneFromAuthEmail,
  phoneToAuthEmail,
} from "@/lib/phone";

describe("digitsOnly", () => {
  it("remove máscara e qualquer ruído", () => {
    expect(digitsOnly("(11) 91234-5678")).toBe("11912345678");
    expect(digitsOnly("+55 11 91234-5678")).toBe("5511912345678");
    expect(digitsOnly("abc")).toBe("");
  });
});

describe("normalizePhone", () => {
  it("aceita 10 e 11 dígitos", () => {
    expect(normalizePhone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizePhone("(11) 1234-5678")).toBe("1112345678");
  });

  it("remove o prefixo 55 de números com 12 ou 13 dígitos", () => {
    expect(normalizePhone("+55 (11) 91234-5678")).toBe("11912345678");
    expect(normalizePhone("5511912345678")).toBe("11912345678");
    expect(normalizePhone("+55 11 1234-5678")).toBe("1112345678");
  });

  it("rejeita entrada inválida", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("119123456")).toBeNull(); // 9 dígitos
    expect(normalizePhone("119123456789")).toBeNull(); // 12 dígitos sem 55
    expect(normalizePhone("551191234567890")).toBeNull(); // longo demais
  });
});

describe("formatPhone", () => {
  it("formata celular de 11 dígitos", () => {
    expect(formatPhone("11912345678")).toBe("(11) 91234-5678");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatPhone("1112345678")).toBe("(11) 1234-5678");
  });

  it("devolve a entrada como veio quando inválida", () => {
    expect(formatPhone("119123456")).toBe("119123456");
    expect(formatPhone("")).toBe("");
  });
});

describe("phoneToAuthEmail", () => {
  it("deriva o e-mail sintético", () => {
    expect(phoneToAuthEmail("11912345678")).toBe("11912345678@celular.local");
  });
});

describe("phoneFromAuthEmail", () => {
  it("faz o roundtrip com phoneToAuthEmail", () => {
    const digits = "11912345678";
    expect(phoneFromAuthEmail(phoneToAuthEmail(digits))).toBe(
      "(11) 91234-5678",
    );
  });

  it("devolve null para e-mail comum ou vazio", () => {
    expect(phoneFromAuthEmail("dono@restaurante.com")).toBeNull();
    expect(phoneFromAuthEmail(null)).toBeNull();
    expect(phoneFromAuthEmail(undefined)).toBeNull();
    expect(phoneFromAuthEmail("")).toBeNull();
  });
});
