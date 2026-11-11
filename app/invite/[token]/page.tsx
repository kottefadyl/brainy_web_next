import { Suspense } from "react";
import InviteAccept from "./invite-accept";

// T52: page opened from a collaboration link sent by WhatsApp, Facebook, e-mail…
async function InviteRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAccept token={token} />;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<main className="invite-page" role="status">Loading… / Chargement…</main>}><InviteRoute params={params} /></Suspense>;
}
