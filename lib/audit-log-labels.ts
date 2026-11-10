import type { AuditLog, CollectionMember, Language } from "./brainy";

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

/** The alert reason in plain words; other details stay as the API wrote them, without the technical query key. */
export function auditDetailText(log: AuditLog, language: Language): string {
  const details = log.details ?? "";
  if (log.action === "SENSITIVE_AGGREGATE_ALERT") {
    const reason = reasons[details.split(":")[0]];
    if (reason) return reason[language === "fr" ? 1 : 0];
  }
  return details.replace(/;?\s*query [0-9a-f]{16}/, "").replace(/^Data format [^;]+;\s*/, "").trim();
}

export function auditActor(log: AuditLog, members: CollectionMember[] | undefined, ownerId: string | undefined, language: Language): string {
  const member = members?.find((item) => item.userId === log.userId);
  if (member) return member.name || member.email;
  if (ownerId && log.userId === ownerId) return language === "fr" ? "Propriétaire" : "Owner";
  return language === "fr" ? "Membre" : "Member";
}
