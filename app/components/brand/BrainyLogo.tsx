import Image from "next/image";

/**
 * Brainy mark: the white "b" on its blue rounded tile (public/brainy-mark.png, 96 px for sharp
 * rendering up to 48 px). It carries its own tile, so it sits on any surface in both themes.
 * `unoptimized` serves the file as is: no image-optimisation quota on Vercel's free plan.
 */
export function BrainyLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <Image className={`brainy-logo ${className}`} src="/brainy-mark.png" width={size} height={size} alt="" aria-hidden="true" unoptimized priority />;
}
