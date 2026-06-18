import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary: "border-transparent bg-[var(--muted)] text-[var(--foreground)]",
        outline: "border-[var(--border)] text-[var(--muted-foreground)]",
        success: "border-transparent bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--success)]",
        warning: "border-transparent bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)]",
        danger: "border-transparent bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-[var(--danger)]",
        brand: "border-transparent bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--brand-400)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
