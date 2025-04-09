import Image from "next/image";
import { getGradientFromId } from "~/lib/utils";
import { cn } from "~/lib/utils";

interface LogoProps {
  id?: string;
  name?: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
  imageClassName?: string;
  containerClassName?: string;
}

export function Logo({ 
  id = "", 
  name = "Organization", 
  logoUrl, 
  size = "sm",
  showName = false,
  className = "",
  imageClassName = "",
  containerClassName = ""
}: LogoProps) {
  const sizeMap = {
    xs: "size-4",
    sm: "size-6",
    md: "size-8",
    lg: "size-10"
  };
  
  const sizeClass = sizeMap[size];;
  
  return (
    <div className={cn(`flex items-center gap-2`, containerClassName)}>
      <div
        style={{ background: getGradientFromId(id) }}
        className={cn(`relative ${sizeClass} rounded-full shrink-0 overflow-hidden`, className)}
      >
        {logoUrl && (
          <Image
            src={logoUrl}
            alt={`${name} logo`}
            className={cn("size-full object-cover", imageClassName)}
            fill
          />
        )}
      </div>
      {showName && <span className="text-sm truncate">{name}</span>}
    </div>
  );
} 