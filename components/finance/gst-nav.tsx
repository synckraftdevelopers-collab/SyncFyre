import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const links = [
  { label: "GST Dashboard", href: "/admin/finance/gst" },
  { label: "GST Summary", href: "/admin/finance/gst/summary" },
  { label: "CA Export", href: "/admin/finance/gst/ca-export" },
];

export function GstNav({ currentPath }: { currentPath: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={buttonVariants({ variant: currentPath === link.href ? "default" : "outline", size: "sm" })}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
