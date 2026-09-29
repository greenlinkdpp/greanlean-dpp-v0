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

  return (
    <Link href={href} aria-label="GreanLean" className={`inline-flex shrink-0 ${className}`}>
      <span className={`relative block ${frameSize} ${markClassName}`}>
        <img
          src="/brand/greanlean-wordmark.png"
          alt="GreanLean"
          className={`h-full w-full object-contain ${
            variant === "light" ? "brightness-0 invert" : ""
          } ${wordmarkClassName}`}
        />
      </span>
    </Link>
  );
}
