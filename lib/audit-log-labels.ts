import type { AuditLog, CollectionMember, Language } from "./brainy";
import { operationLabel } from "./analysis-operations";

/** Natural wording for the privacy journal (T43/3). Codes the clients do not know are shown as they are. */
const labels: Record<string, [string, string]> = {
  READ_SENSITIVE_AGGREGATE: ["Sensitive analysis served", "Analyse sensible servie"],
  REFUSED_SENSITIVE_AGGREGATE: ["Sensitive analysis refused", "Analyse sensible refusée"],
  SENSITIVE_AGGREGATE_ALERT: ["Alert: repeated sensitive queries", "Alerte : requêtes sensibles répétées"],
  READ_PROTECTED_DATA: ["Protected values read", "Valeurs protégées lues"],
  SHARE_PROTECTED_FIELDS: ["Protected fields shared", "Champs protégés partagés"],
  EXPORT_PROTECTED_DATA: ["Protected values exported", "Valeurs protégées exportées"],
  SET_SENSITIVITY: ["Sensitivity level changed", "Niveau de sensibilité modifié"],
  SET_AGGREGATE_MINIMUM: ["Minimum group size changed", "Taille minimale des groupes modifiée"],
  REVOKE_MEMBER: ["Member removed", "Membre retiré"],
};

const reasons: Record<string, [string, string]> = {
  DIFFERENCING: ["the same question returned totals that differ by fewer observations than the threshold", "la même question a donné des totaux qui diffèrent de moins d’observations que le seuil"],
  BURST: ["the same question was asked many times within an hour", "la même question a été posée de nombreuses fois en une heure"],
  PROBING: ["several sensitive analyses were refused within an hour", "plusieurs analyses sensibles ont été refusées en une heure"],
};

export const PRIVACY_ACTIONS = new Set(Object.keys(labels));

export function auditActionLabel(action: string, language: Language): string {
  const known = labels[action];
  return known ? known[language === "fr" ? 1 : 0] : action.toLowerCase().replaceAll("_", " ");
}

/**
 * The alert reason in plain words. Other details lose the technical query key and data format id,
 * and the API's "operation X; observations N" becomes "Average · 57 observations" in the person's language.
 */
export function auditDetailText(log: AuditLog, language: Language): string {
  const fr = language === "fr";
  const details = log.details ?? "";
  if (log.action === "SENSITIVE_AGGREGATE_ALERT") {
    const reason = reasons[details.split(":")[0]];
    if (reason) return reason[fr ? 1 : 0];
  }
  const rest = details.replace(/;?\s*query [0-9a-f]{16}/, "").replace(/^Data format [^;]+;\s*/, "").trim();
  return rest.split(/;\s*/).filter(Boolean).map((part) => {
    const operation = /^operation (\w+)$/.exec(part);
    if (operation) return operationLabel(operation[1], language);
    const observations = /^observations (\d+)$/.exec(part);
    if (observations) return `${observations[1]} observation${observations[1] === "1" ? "" : "s"}`;
    const refused = /^refused: (.*)$/.exec(part);
    if (refused) return `${fr ? "refusée : " : "refused: "}${refused[1]}`;
    return part;
  }).join(" · ");
}

export function auditActor(log: AuditLog, members: CollectionMember[] | undefined, ownerId: string | undefined, language: Language): string {
  const member = members?.find((item) => item.userId === log.userId);
  if (member) return member.name || member.email;
  if (ownerId && log.userId === ownerId) return language === "fr" ? "Propriétaire" : "Owner";
  return language === "fr" ? "Membre" : "Member";
}
