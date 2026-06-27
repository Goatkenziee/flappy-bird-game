import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline";
const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90 glow",
  ghost: "bg-transparent hover:bg-muted text-foreground",
  outline: "border bg-transparent hover:bg-muted text-foreground",
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";