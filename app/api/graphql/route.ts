import { NextRequest, NextResponse } from "next/server";

const sessionName = "brainy_session";
const noStore = { "Cache-Control": "no-store" };

function findSessionToken(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findSessionToken(item);
      if (token) return token;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.token === "string" && record.user && typeof record.user === "object") return record.token;
  for (const item of Object.values(record)) {
    const token = findSessionToken(item);
    if (token) return token;
  }
  return null;
}

/** Hides the session token only: other tokens, such as a contribution link's, are meant for the page. */
function withoutTokens(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutTokens);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const isSession = typeof record.token === "string" && !!record.user && typeof record.user === "object";
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !(isSession && key === "token"))
      .map(([key, item]) => [key, withoutTokens(item)]),
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ errors: [{ message: "Invalid origin" }] }, { status: 403, headers: noStore });
  }
  const backupRequest = request.nextUrl.searchParams.get("backup") === "1" && !!request.cookies.get(sessionName)?.value;
  if (Number(request.headers.get("content-length") ?? 0) > (backupRequest ? 60_000_000 : 12_582_912)) {
    return NextResponse.json({ errors: [{ message: "Request too large" }] }, { status: 413, headers: noStore });
  }
  let body: { query?: unknown; variables?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: [{ message: "Invalid request" }] }, { status: 400, headers: noStore });
  }
  if (typeof body?.query !== "string" || body.query.length > 50000) {
    return NextResponse.json({ errors: [{ message: "Invalid query" }] }, { status: 400, headers: noStore });
  }
  if (JSON.stringify(body.variables ?? {}).length > (backupRequest && body.query.includes("restoreWorkspaceBackup") ? 55_000_000 : 11_000_000)) {
    return NextResponse.json({ errors: [{ message: "Request too large" }] }, { status: 413, headers: noStore });
  }

  try {
    const upstream = await fetch(process.env.GRAPHQL_API_URL ?? "http://127.0.0.1:3000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.cookies.get(sessionName)?.value
          ? { Authorization: `Bearer ${request.cookies.get(sessionName)!.value}` }
          : {}),
      },
      body: JSON.stringify({ query: body.query, variables: body.variables ?? {} }),
      cache: "no-store",
      // A large analysis takes up to about 33 s on one million entries (T22).
      signal: AbortSignal.timeout(backupRequest ? 120000 : /\banalyseCollection\b/.test(body.query) ? 60000 : 12000),
    });
    const payload = await upstream.json() as Record<string, unknown>;
    const token = findSessionToken(payload.data);
    const response = NextResponse.json(withoutTokens(payload), {
      status: upstream.status,
      headers: noStore,
    });
    if (token) {
      response.cookies.set(sessionName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } else if (Array.isArray(payload.errors) && payload.errors.some((error) =>
      (error as { extensions?: { code?: string } }).extensions?.code === "UNAUTHENTICATED")) {
      response.cookies.delete(sessionName);
    }
    return response;
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Brainy is temporarily unavailable. Please try again." }] },
      { status: 502, headers: noStore },
    );
  }
}
