import { cn } from "@/lib/utils";
import Image from "next/image";

type BrandLogoProps = {
  alt: string;
  variant?: "color" | "white";
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ alt, variant = "color", className, priority = false }: BrandLogoProps) {
  if (variant === "white") {
    return (
      <Image
        src="/images/logo-white.png"
        alt={alt}
        width={438}
        height={117}
        priority={priority}
        className={cn("h-12 w-auto md:h-14", className)}
      />
    );
  }

  return (
    <Image
      src="/images/logo-white.png"
      alt={alt}
      width={438}
      height={117}
      priority={priority}
        className={cn("h-8 w-auto max-w-full sm:h-10 md:h-16", className)}
    />
  );
}
