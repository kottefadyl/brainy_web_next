import type { Collection, Language } from "./brainy";

/** The API answers in English; the rest of the formula editor speaks the language of the interface. */
const fixed: Record<string, string> = {
  "Formula is too complex": "La formule est trop complexe.",
  "Formula is too deep": "La formule est trop imbriquée.",
  "Formula is too long": "La formule est trop longue.",
  "Invalid formula expression": "Cette formule n'est pas valide.",
  "Unknown formula operation": "Cette opération n'est pas reconnue.",
  "Unknown date operation": "Cette opération de date n'est pas reconnue.",
  "Unknown text operation": "Cette opération de texte n'est pas reconnue.",
  "Invalid formula condition": "Cette condition n'est pas valide.",
  "Cannot divide by zero": "Division par zéro impossible.",
  "Convert currencies with an explicit dated rate first": "Convertissez d'abord les devises avec un taux daté.",
  "Convert temperatures before adding them": "Convertissez les températures avant de les additionner.",
  "Convert temperatures before comparing them": "Convertissez les températures avant de les comparer.",
  "This formula gives a date, not a number": "Cette valeur est une date, un nombre est attendu.",
  "This formula gives text, not a number": "Cette valeur est un texte, un nombre est attendu.",
  "Choose one numeric property from a single object reference": "Choisissez une propriété numérique d'une référence à un seul objet.",
  "Choose a numeric property from an object reference": "Choisissez une propriété numérique d'une référence d'objet.",
  "This property does not exist on the linked object": "Cette propriété n'existe pas sur l'objet lié.",
  "A snapshot reference cannot be followed further": "Une référence figée ne peut pas être suivie plus loin.",
  "Follow at most five linked objects": "Suivez au plus cinq objets liés.",
  "Choose a duration": "Choisissez une durée.",
  "Give the number of days as a plain number or a duration": "Indiquez le nombre de jours avec un nombre simple ou une durée.",
  "Use a whole number of days": "Utilisez un nombre entier de jours.",
  "Use whole numbers for the start (from 1) and the length (from 0)": "Utilisez des nombres entiers pour le début (à partir de 1) et la longueur (à partir de 0).",
  "Use a valid date": "Utilisez une date valide.",
  "Use a date format such as DD/MM/YYYY": "Utilisez un format de date comme DD/MM/YYYY.",
  "Use a number format such as 0.00 or #,##0.00": "Utilisez un format de nombre comme 0.00 ou #,##0.00.",
  "Choose English or French formatting": "Choisissez la mise en forme \"fr\" ou \"en\".",
  "Choose 0 to 6 decimal places and a rounding rule": "Choisissez de 0 à 6 décimales et une règle d'arrondi.",
  "Conditions cannot be compared": "Des conditions ne peuvent pas être comparées.",
  "Text can only be tested for equal or different": "Un texte peut seulement être testé égal ou différent.",
  "Formula names must be unique in a data format": "Ce nom de formule existe déjà dans ce format de données.",
  "Formula name must be 1 to 80 characters": "Le nom de la formule doit compter de 1 à 80 caractères.",
  "Formula changed. Refresh and try again": "Cette formule a changé. Actualisez puis réessayez.",
  "This collection has 100 formulas": "Cette collection a atteint 100 formules.",
  "Another formula uses this formula": "Une autre formule utilise celle-ci.",
};

const nouns: Record<string, string> = { "a number": "un nombre", text: "un texte", "a date": "une date", "a condition": "une condition" };
const noun = (value: string): string => nouns[value] ?? value;
const noUnit = (value: string): string => (value === "no unit" ? "sans unité" : value);

const patterns: [RegExp, (match: RegExpExecArray) => string][] = [
  [/^Cannot add incompatible units: (.+) and (.+)$/, (m) => `Impossible d'additionner ${noUnit(m[1])} et ${noUnit(m[2])}.`],
  [/^Cannot compare incompatible units: (.+) and (.+)$/, (m) => `Impossible de comparer ${noUnit(m[1])} et ${noUnit(m[2])}.`],
  [/^Cannot compare (.+) with (.+)$/, (m) => `Impossible de comparer ${noun(m[1])} avec ${noun(m[2])}.`],
  [/^Expected a date but found (.+)$/, (m) => `Une date est attendue, pas ${noun(m[1])}.`],
  [/^Expected text but found (.+)$/, (m) => `Un texte est attendu, pas ${noun(m[1])}.`],
  [/^Expected a number but found (.+)$/, (m) => `Un nombre est attendu, pas ${noun(m[1])}.`],
  [/^Expected a condition but found (.+)$/, (m) => `Une condition est attendue, pas ${noun(m[1])}.`],
  [/^Dividing by a unit requires compatible quantities, or the unit (.+) in this collection$/, (m) => `Pour diviser par cette unité, ajoutez l'unité ${m[1]} à la collection ou utilisez des grandeurs compatibles.`],
  [/^Formula cycle detected: (.+)$/, (m) => `Boucle entre formules : ${m[1]}`],
  [/^Unknown unit: (.+)$/, (m) => `Unité inconnue : ${m[1]}`],
];

export function formulaErrorMessage(cause: unknown, collection: Collection, language: Language): string {
  let message = cause instanceof Error ? cause.message : String(cause);
  // Local units travel as identifiers, which mean nothing to a reader.
  for (const unit of collection.units) message = message.replaceAll(unit.id, unit.symbol);
  if (language !== "fr") return message;
  if (fixed[message]) return fixed[message];
  for (const [pattern, translate] of patterns) {
    const match = pattern.exec(message);
    if (match) return translate(match);
  }
  return message;
}
