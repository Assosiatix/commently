import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// One button norm, same as assosiatix.com/tools: pill shape, black primary that turns coral on hover.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 active:scale-[.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-coral hover:text-white",
        ink: "bg-foreground text-background hover:bg-coral hover:text-white",
        coral: "bg-coral text-white hover:bg-foreground hover:text-background",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-card text-foreground hover:border-foreground/30 hover:bg-surface",
        secondary: "bg-muted text-foreground hover:bg-coral-soft",
        ghost: "text-foreground hover:bg-muted",
        link: "rounded-none px-0 text-foreground underline decoration-coral underline-offset-4 hover:text-coral",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3.5 text-[13px]", lg: "h-12 px-6 text-[15px]", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
