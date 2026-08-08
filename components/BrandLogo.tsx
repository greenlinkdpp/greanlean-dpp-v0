import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "light";
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  href = "/",
  size = "md",
  variant = "brand",
  className = "",
  markClassName = "",
  wordmarkClassName = "",
}: BrandLogoProps) {
  const frameSize = size === "lg"
    ? "h-12 w-[210px]"
    : size === "sm"
      ? "h-8 w-[142px]"
      : "h-10 w-[176px]";
  const imageSize = size === "lg"
    ? "w-[360px]"
    : size === "sm"
      ? "w-[252px]"
      : "w-[312px]";

  return (
    <Link href={href} aria-label="GreanLean" className={`inline-flex shrink-0 ${className}`}>
      <span className={`relative block overflow-hidden ${frameSize} ${markClassName}`}>
        <img
          src="/brand/greanlean-wordmark.png"
          alt="GreanLean"
          className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 ${imageSize} ${
            variant === "light" ? "brightness-0 invert" : ""
          } ${wordmarkClassName}`}
        />
      </span>
    </Link>
  );
}
