import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  { variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(255,48,36,.22)] hover:-translate-y-0.5 hover:bg-[#e9281e]",
      outline: "border border-border bg-background hover:bg-muted",
      ghost: "hover:bg-muted hover:text-foreground",
      destructive: "bg-destructive text-white hover:bg-destructive/90",
    },
    size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", icon: "size-10" },
  }, defaultVariants: { variant: "default", size: "default" } },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";
export { buttonVariants };
