// Administration calls (web /admin). The API checks the administrator on every call.
import { request } from "./api";

export type AdminUser = {
  id: string; name: string; email: string; createdAt?: string | null; lastActiveAt?: string | null;
  blocked: boolean; blockedAt?: string | null; admin: boolean; googleSignIn: boolean;
  collections: number; entries: number; databaseBytes: number; fileBytes: number; totalBytes: number;
};
export type AdminOverview = { users: AdminUser[]; userCount: number; blockedCount: number; totalBytes: number; generatedAt: string };
export type AdminErasure = { collections: number; documents: number; files: number; accountDeleted: boolean };

export const adminApi = {
  async access(): Promise<boolean> {
    return (await request<{ adminAccess: boolean }>("query { adminAccess }")).adminAccess;
  },
  async overview(): Promise<AdminOverview> {
    return (await request<{ adminOverview: AdminOverview }>(
      "query { adminOverview { userCount blockedCount totalBytes generatedAt users { id name email createdAt lastActiveAt blocked blockedAt admin googleSignIn collections entries databaseBytes fileBytes totalBytes } } }",
    )).adminOverview;
  },
  async setBlocked(userId: string, blocked: boolean): Promise<boolean> {
    return (await request<{ adminSetUserBlocked: boolean }>("mutation($userId: String!, $blocked: Boolean!) { adminSetUserBlocked(userId: $userId, blocked: $blocked) }", { userId, blocked })).adminSetUserBlocked;
  },
  async erase(userId: string, confirmEmail: string, deleteAccount: boolean): Promise<AdminErasure> {
    return (await request<{ adminEraseUser: AdminErasure }>(
      "mutation($userId: String!, $confirmEmail: String!, $deleteAccount: Boolean!) { adminEraseUser(userId: $userId, confirmEmail: $confirmEmail, deleteAccount: $deleteAccount) { collections documents files accountDeleted } }",
      { userId, confirmEmail, deleteAccount },
    )).adminEraseUser;
  },
};

/** 1536 → "1.5 KB"; decimal units, as storage plans count them. */
export function formatBytes(bytes: number, language: "en" | "fr"): string {
  const units = language === "fr" ? ["o", "Ko", "Mo", "Go", "To"] : ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit++; }
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 }).format(value)} ${units[unit]}`;
}
