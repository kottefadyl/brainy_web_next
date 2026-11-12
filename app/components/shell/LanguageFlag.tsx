// Flags of the two interface languages: the United Kingdom for English, France for French.
// Drawn in SVG because flag emojis show as plain letters on Windows.
import type { Language } from "../../../lib/brainy";

export function LanguageFlag({ language, size = 20 }: { language: Language; size?: number }) {
  const height = Math.round(size * 2 / 3);
  if (language === "fr") return <svg className="language-flag" width={size} height={height} viewBox="0 0 3 2" aria-hidden="true">
    <rect width="1" height="2" fill="#002654" /><rect x="1" width="1" height="2" fill="#FFFFFF" /><rect x="2" width="1" height="2" fill="#CE1126" />
  </svg>;
  return <svg className="language-flag" width={size} height={height} viewBox="0 0 60 40" aria-hidden="true">
    <clipPath id="uk-flag-clip"><rect width="60" height="40" /></clipPath>
    <g clipPath="url(#uk-flag-clip)">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
    </g>
  </svg>;
}
