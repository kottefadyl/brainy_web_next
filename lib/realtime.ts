// Real-time data synchronisation: listens to the change signals of the collections I can open
// (Cloud Firestore, written by the API after every change; see api/src/realtime). Vercel's free plan
// keeps no socket open: the live connection is Firebase's own.
import { request } from "./api";

let emulatorsConnected = false;

export type ChangeSignal = { collectionId: string; by?: string; kind?: string; removed: boolean };

/** Starts listening; returns the function that stops. Does nothing when the API has real-time sync off. */
export async function listenToChanges(userId: string, onChange: (signal: ChangeSignal) => void): Promise<() => void> {
  const { realtimeToken } = await request<{ realtimeToken: string | null }>("query{realtimeToken}");
  if (!realtimeToken) return () => {};
  const [{ firebaseApp }, { getAuth, signInWithCustomToken, connectAuthEmulator }, { getFirestore, collection, query, where, onSnapshot, connectFirestoreEmulator }] = await Promise.all([
    import("./firebase-client"), import("firebase/auth"), import("firebase/firestore"),
  ]);
  const app = firebaseApp();
  const auth = getAuth(app), db = getFirestore(app);
  // Local tests only: the Firebase emulators (see api/scripts/realtime-smoke.mjs).
  const emulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS;
  if (emulators && !emulatorsConnected) { emulatorsConnected = true; connectAuthEmulator(auth, `http://${emulators}:9099`, { disableWarnings: true }); connectFirestoreEmulator(db, emulators, 8085); }
  await signInWithCustomToken(auth, realtimeToken);
  let first = true;
  return onSnapshot(query(collection(db, "brainy_signals"), where("readers", "array-contains", userId)), (snapshot) => {
    // The first answer lists the current state: only later changes matter.
    if (first) { first = false; return; }
    for (const change of snapshot.docChanges()) {
      const data = change.doc.data() as { by?: string; kind?: string };
      onChange({ collectionId: change.doc.id, by: data.by, kind: data.kind, removed: change.type === "removed" });
    }
  }, () => { /* the next load still shows the changes */ });
}

/** The list after a live update: a changed collection is replaced in place, a new one (just shared with me) comes first, and one missing from the answer (access ended, deleted) leaves. */
export function mergeChangedCollections<T extends { id: string }>(current: T[], changedIds: Set<string>, fresh: T[]): T[] {
  const byId = new Map(fresh.map((item) => [item.id, item]));
  const known = new Set(current.map((item) => item.id));
  return [
    ...fresh.filter((item) => !known.has(item.id)),
    ...current.flatMap((item) => !changedIds.has(item.id) ? [item] : byId.has(item.id) ? [byId.get(item.id)!] : []),
  ];
}
