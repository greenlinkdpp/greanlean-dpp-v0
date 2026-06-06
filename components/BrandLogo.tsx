import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  href = "/",
  size = "md",
  className = "",
  markClassName = "",
  wordmarkClassName = "",
}: BrandLogoProps) {
  const markSize = size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-9 w-9 text-base" : "h-10 w-10 text-lg";
  const wordmarkSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";

  return (
    <Link href={href} className={`inline-flex items-center gap-3 font-black ${className}`}>
      <span className={`grid shrink-0 place-items-center rounded-lg bg-brand-600 font-black text-white shadow-sm ${markSize} ${markClassName}`}>
        G
      </span>
      <span className={`brand-wordmark ${wordmarkSize} ${wordmarkClassName}`}>GREANLEAN</span>
    </Link>
  );
}
