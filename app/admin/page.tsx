import type { Metadata } from "next";
import AdminPanel from "./admin-panel";

// Brainy administration: reserved to the administrator (BRAINY_ADMIN_EMAILS on the API), never indexed.
export const metadata: Metadata = {
  title: "Brainy — Administration",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
