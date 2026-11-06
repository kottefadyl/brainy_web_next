import { formatColors, type Language } from "./brainy";

const names = [
  ["Ice blue", "Bleu glacier"], ["Mint", "Menthe"], ["Peach", "Pêche"], ["Lavender", "Lavande"],
  ["Rose", "Rose"], ["Aqua", "Aqua"], ["Sand", "Sable"], ["Sage", "Sauge"],
  ["Orchid", "Orchidée"], ["Slate blue", "Bleu ardoise"], ["Apricot", "Abricot"], ["Sky", "Ciel"],
  ["Blush", "Rose pâle"], ["Powder blue", "Bleu poudré"], ["Lime", "Citron vert"], ["Coral", "Corail"],
  ["Periwinkle", "Pervenche"], ["Seafoam", "Écume"], ["Almond", "Amande"], ["Mist", "Brume"],
  ["Salmon", "Saumon"], ["Olive", "Olive"], ["Lilac", "Lilas"], ["Celadon", "Céladon"],
] as const;

export function formatColorName(color: string, language: Language): string {
  const index = formatColors.indexOf(color as (typeof formatColors)[number]);
  return index < 0 ? (language === "fr" ? "Couleur personnalisée" : "Custom color") : names[index][language === "fr" ? 1 : 0];
}

export function formatColorOptions(language: Language, unavailable: readonly string[] = []) {
  return formatColors.filter((color) => !unavailable.includes(color)).map((color) => ({ id: color, label: formatColorName(color, language), swatch: color }));
}
