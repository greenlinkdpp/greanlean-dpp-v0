import { BrandWordmark } from "@/components/BrandWordmark";

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
  // The legacy image remains in the repository for the future formal-logo swap.
  // It is intentionally not rendered in the Round A UI (no /brand/greanlean-wordmark.png, object-contain, or crop).
  return <BrandWordmark href={href} size={size} variant={variant} className={`${className} ${markClassName} ${wordmarkClassName}`} />;
}
