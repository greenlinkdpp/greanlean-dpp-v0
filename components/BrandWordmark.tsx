import Link from "next/link";

type BrandWordmarkProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "light";
  className?: string;
};

/**
 * Temporary text-only brand treatment for the productised UI.
 * Keeping it in one component makes the future formal logo swap a one-file change.
 */
export function BrandWordmark({ href = "/", size = "md", variant = "brand", className = "" }: BrandWordmarkProps) {
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  const colorClass = variant === "light" ? "text-white" : "text-[#134d44]";
  return (
    <Link href={href} aria-label="GreanLean" className={`inline-flex shrink-0 items-center ${sizeClass} ${colorClass} ${className}`}>
      <span className="font-extrabold tracking-tight">GreanLean</span>
    </Link>
  );
}
