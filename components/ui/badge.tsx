import { cn } from "@/lib/utils";
export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline" }) {
  const styles = { default: "bg-primary/10 text-primary", secondary: "bg-secondary text-secondary-foreground", success: "bg-emerald-500/10 text-emerald-600", warning: "bg-amber-500/10 text-amber-600", danger: "bg-red-500/10 text-red-600", outline: "border border-border" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[variant], className)} {...props} />;
}
