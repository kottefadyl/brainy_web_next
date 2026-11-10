"use client";

import { useCallback } from "react";
import type { ClassificationCode, Language } from "../lib/brainy";
import type { CodeNode } from "../lib/code-tree";
import { CodePicker } from "./code-picker";

/** New values must be active; an obsolete code already on the entry stays selected. */
export function CodeFieldPicker({ codes, language, value, onChange, remote }: { codes: ClassificationCode[]; language: Language; value: string; onChange: (code: string) => void; remote?: { collectionId: string; listId: string } }) {
  const canSelect = useCallback((node: CodeNode) => node.item.active || node.code === value, [value]);
  return <CodePicker codes={codes} language={language} value={value} onChange={onChange} canSelect={canSelect} remote={remote} emptyLabel={language === "fr" ? "Aucune valeur" : "No value"} />;
}
