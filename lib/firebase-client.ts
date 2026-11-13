import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBqx6YAjxqEBuli7sKDvkOlfo-tI4uVblU",
  authDomain: "brainy-6d65c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "brainy-6d65c",
  appId: "1:828931163138:web:8b284f9f24f3cc8834531b",
};

/** The shared Firebase web app (sign-in, push, real-time signals). */
export function firebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function auth() {
  return getAuth(firebaseApp());
}

export async function browserPushToken(): Promise<string> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) throw new Error("Push notifications are unavailable in this browser");
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error("Web push is not configured");
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!await isSupported()) throw new Error("Push notifications are unavailable in this browser");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");
  const registration = await navigator.serviceWorker.register("/brainy-messaging-sw.js");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Could not register this browser for push notifications");
  return token;
}

export async function listenForForegroundReminders(): Promise<() => void> {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return () => {};
  const { getMessaging, onMessage, isSupported } = await import("firebase/messaging");
  if (!await isSupported()) return () => {};
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return onMessage(getMessaging(app), (message) => {
    const title = message.notification?.title ?? "Brainy reminder";
    const body = message.notification?.body ?? "";
    const notification = new Notification(title, { body, tag: message.data?.key ?? message.messageId });
    notification.onclick = () => { window.focus(); notification.close(); };
  });
}

type PopupResolver = { _initialize?: (auth: unknown) => Promise<unknown> };

/**
 * Loads Firebase's Google sign-in helpers (Google's script loader and the sign-in frame) before the click.
 * Firebase otherwise downloads them after the click, which can take seconds: the browser then no longer
 * links the Google window to the click and blocks it as an unwanted pop-up.
 */
export async function prepareGoogleSignIn(): Promise<void> {
  const current = auth();
  await current.authStateReady();
  const resolver = (current as unknown as { _popupRedirectResolver?: PopupResolver })._popupRedirectResolver;
  await resolver?._initialize?.(current);
}

export async function googleIdToken(): Promise<string> {
  const result = await signInWithPopup(auth(), new GoogleAuthProvider());
  return result.user.getIdToken();
}

export async function googleSignOut(): Promise<void> {
  if (getApps().length) await signOut(auth());
}
