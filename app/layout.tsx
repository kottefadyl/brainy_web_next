import type { Metadata } from "next";
import "./globals.css";
import "./formats.css";
import "./profile.css";
import "./theme.css";
import "./quick-capture.css";
import "./workspace-refresh.css";

export const metadata: Metadata = {
  title: "Brainy — Your space to remember",
  description: "Create collections with your own data formats and keep your ideas close.",
  applicationName: "Brainy",
  icons: { icon: "/brainy-mark.png" },
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
