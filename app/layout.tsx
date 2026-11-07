import type { Metadata } from "next";
import "./globals.css";
import "./formats.css";
import "./profile.css";
import "./theme.css";
import "./quick-capture.css";
import "./workspace-refresh.css";
import "./workspace-data.css";
import "./foundation.css";
import "./shell.css";
import "./dialog-fixes.css";
import "./phase-two.css";
import "./phase-two-b.css";
import "./workspace-identity.css";

export const metadata: Metadata = {
  title: "Brainy — Your space to remember",
  description: "Create collections with your own data formats and keep your ideas close.",
  applicationName: "Brainy",
  icons: { icon: [{ url: "/brainy-app-icon.svg", type: "image/svg+xml" }, { url: "/brainy-mark.png", type: "image/png" }], apple: "/brainy-icon-192.png" },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{var saved=localStorage.getItem('brainy_theme');document.documentElement.dataset.theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}" }} /></head>
      <body>{children}</body>
    </html>
  );
}
