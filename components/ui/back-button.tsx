"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({
  href,
  className,
  label = "Back",
}: {
  href: string;
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), className)}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}