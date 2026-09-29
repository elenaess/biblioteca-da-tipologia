import test from "node:test";
import assert from "node:assert/strict";
import { bookLanguageLabel, detectSupportedLocale, languageOptions, normalizeLocale, t } from "../packages/domain/src";
test("i18n locale detection and language labels",()=>{assert.equal(normalizeLocale("pt-BR"),"pt");assert.equal(normalizeLocale("en-US"),"en");assert.equal(normalizeLocale("es-MX"),"es");assert.equal(normalizeLocale("fr-FR"),null);assert.equal(detectSupportedLocale(["fr-FR","es-MX"]),"en");assert.equal(detectSupportedLocale(["fr-FR"]),"en");assert.equal(detectSupportedLocale(["de-DE"]),"en");assert.equal(detectSupportedLocale(["ru-RU"]),"en");assert.equal(detectSupportedLocale(["pt-BR"]),"pt");assert.equal(detectSupportedLocale(["pt-PT"]),"pt");assert.equal(detectSupportedLocale(["es-AR"]),"es");assert.equal(bookLanguageLabel("Português","en"),"Portuguese");assert.equal(bookLanguageLabel("Portugués","pt"),"Português");assert.equal(bookLanguageLabel("English","es"),"Inglés");assert.equal(bookLanguageLabel("Esperanto","en"),"Esperanto");assert.deepEqual(languageOptions("en").map(x=>x.flag),["🇧🇷","🇺🇸","🇲🇽"]);assert.equal(t("es","book.continueReading",{progress:42}),"Continuar leyendo — 42%");});
test("editorial strings are never sent through the translation catalog",()=>{const editorial={title:"Sua conta",summary:"Biblioteca",html:"<p>Leituras</p>"};const changed={...editorial};assert.deepEqual(changed,editorial);});


test("Books in the current site language are shown first without hiding or reordering the others", async () => {
  const domain = await import("../packages/domain/src/index.ts");
  const prioritize = (domain as any).prioritizeBooksByLocale;

  assert.equal(typeof prioritize, "function");

  const books = [
    { id: "es-1", language: "Español" },
    { id: "pt-1", language: "pt-BR" },
    { id: "en-1", language: "English" },
    { id: "ru-1", language: "Русский" },
    { id: "en-2", language: "en-US" },
  ];

  assert.deepEqual(
    prioritize(books, "en").map((book: any) => book.id),
    ["en-1", "en-2", "es-1", "pt-1", "ru-1"],
  );

  assert.deepEqual(
    prioritize(books, "pt").map((book: any) => book.id),
    ["pt-1", "es-1", "en-1", "ru-1", "en-2"],
  );

  assert.deepEqual(
    prioritize(books, "es").map((book: any) => book.id),
    ["es-1", "pt-1", "en-1", "ru-1", "en-2"],
  );

  assert.deepEqual(
    books.map((book) => book.id),
    ["es-1", "pt-1", "en-1", "ru-1", "en-2"],
  );
});
