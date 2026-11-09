import type { Language } from "./brainy";

const kinds: Record<string, [string, string]> = {
  IN: ["Receipt", "Entrée"],
  OUT: ["Outgoing", "Sortie"],
  TRANSFER: ["Transfer", "Transfert"],
  CORRECTION: ["Correction", "Correction"],
  RETURN: ["Return", "Retour"],
};

const frenchReasons: Record<string, string> = {
  "Stock would become negative": "Le stock deviendrait négatif",
  "The sale movement was not found": "La sortie d’origine est introuvable",
  "Return to the sale location and lot": "Le retour doit reprendre le lieu et le lot de la sortie",
  "Return quantity exceeds the sale": "La quantité retournée dépasse la sortie",
};

export const stockKindLabel = (kind: string, language: Language) => kinds[kind]?.[language === "fr" ? 1 : 0] ?? kind;

export const stockReasonLabel = (reason: string, language: Language) => language === "fr" ? frenchReasons[reason] ?? reason : reason;
