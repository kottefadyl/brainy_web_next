import { Suspense } from "react";
import PublicContributionForm from "./contribution-form";

async function ContributionRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicContributionForm token={token} />;
}

export default function PublicContributionPage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<main className="contribution-public" role="status">Loading… / Chargement…</main>}><ContributionRoute params={params} /></Suspense>;
}
