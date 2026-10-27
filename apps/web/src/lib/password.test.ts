import { describe, expect, it } from "vitest";

import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  passwordProblem,
} from "@/lib/password";

describe("passwordProblem — comprimento", () => {
  it("aceita senha no comprimento mínimo", () => {
    expect(passwordProblem("segredo1")).toBeNull();
    expect(passwordProblem("a1b2c3d4")).toBeNull();
  });

  it("recusa senha abaixo do mínimo", () => {
    expect(passwordProblem("segred1")).toBe(
      `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
    expect(passwordProblem("")).not.toBeNull();
  });

  it("conta bytes, não caracteres: acento pesa 2 e estoura o teto do bcrypt", () => {
    const acentuada = "ç".repeat(Math.floor(PASSWORD_MAX_BYTES / 2) + 1);
    expect(acentuada.length).toBeLessThan(PASSWORD_MAX_BYTES);
    expect(passwordProblem(acentuada)).toBe(
      `A senha pode ter no máximo ${PASSWORD_MAX_BYTES} caracteres.`,
    );
  });

  it("aceita acento dentro do limite de bytes", () => {
    expect(passwordProblem("coração1")).toBeNull();
  });
});

describe("passwordProblem — espaços", () => {
  it("recusa espaço nas pontas (ficaria invisível na entrega)", () => {
    expect(passwordProblem(" segredo1")).toBe(
      "A senha não pode começar nem terminar com espaço.",
    );
    expect(passwordProblem("segredo1 ")).toBe(
      "A senha não pode começar nem terminar com espaço.",
    );
  });

  it("aceita espaço no meio", () => {
    expect(passwordProblem("bar do santos")).toBeNull();
  });

  it("recusa senha composta só de espaços", () => {
    expect(passwordProblem(" ".repeat(PASSWORD_MIN_LENGTH))).not.toBeNull();
  });
});

describe("passwordProblem — senhas previsíveis", () => {
  it("recusa senha comum, inclusive com dígitos no fim", () => {
    expect(passwordProblem("senha1234")).toBe(
      "Essa senha é comum demais. Escolha outra.",
    );
    expect(passwordProblem("flamengo99")).toBe(
      "Essa senha é comum demais. Escolha outra.",
    );
  });

  it("recusa sequência de teclado ou de números", () => {
    expect(passwordProblem("01234567")).toBe(
      "Evite sequências como 12345678 ou abcdefgh.",
    );
    expect(passwordProblem("qwertyui")).toBe(
      "Evite sequências como 12345678 ou abcdefgh.",
    );
  });

  it("recusa caractere repetido", () => {
    expect(passwordProblem("aaaaaaaa")).toBe(
      "A senha não pode ser o mesmo caractere repetido.",
    );
  });

  it("não exige maiúscula, dígito nem símbolo", () => {
    expect(passwordProblem("anotaai1")).toBeNull();
  });
});

describe("passwordProblem — contexto do membro", () => {
  it("recusa o próprio celular na senha", () => {
    expect(
      passwordProblem("segredo88887777", { phone: "11988887777" }),
    ).toBe("Evite o próprio celular na senha.");
  });

  it("recusa o nome de quem vai usar a senha", () => {
    expect(
      passwordProblem("adnilson2026", { displayName: "Adnilson" }),
    ).toBe("Evite o nome de quem vai usar a senha.");
  });

  it("recusa o nome do bar", () => {
    expect(
      passwordProblem("santos2026", { orgName: "Bar do Santos" }),
    ).toBe("Evite o nome do bar na senha.");
  });

  it("ignora acento e maiúscula na comparação do contexto", () => {
    expect(
      passwordProblem("jose2026!!", { displayName: "José" }),
    ).toBe("Evite o nome de quem vai usar a senha.");
  });

  it("aceita senha que não tem relação com o contexto", () => {
    expect(
      passwordProblem("cavalo39vermelho", {
        phone: "11988887777",
        displayName: "Adnilson",
        orgName: "Bar do Santos",
      }),
    ).toBeNull();
  });
});
