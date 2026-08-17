"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

interface MemberAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { container: "size-8",  icon: "size-4",  text: "text-xs",  imgSize: 32  },
  md: { container: "size-10", icon: "size-5",  text: "text-sm",  imgSize: 40  },
  lg: { container: "size-14", icon: "size-7",  text: "text-base",imgSize: 56  },
  xl: { container: "size-20", icon: "size-9",  text: "text-lg",  imgSize: 80  },
};

export function MemberAvatar({ name, photoUrl, size = "md", className }: MemberAvatarProps) {
  const s = sizeMap[size];
  const [hasImageError, setHasImageError] = useState(false);
  const showPhoto = Boolean(photoUrl) && !hasImageError;
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-background",
        s.container,
        className,
      )}
    >
      {showPhoto ? (
        <Image
          src={photoUrl!}
          alt={name}
          width={s.imgSize}
          height={s.imgSize}
          className="size-full object-cover"
          unoptimized
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className={cn("font-semibold text-primary/70", s.text)}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}
