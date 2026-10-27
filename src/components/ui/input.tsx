import * as React from "react";
import { cn } from "@/lib/utils";

// 16px text (no iOS zoom), 12px radius, coral focus ring: the /tools field style.
const field =
  "w-full rounded-xl border border-input bg-card px-3.5 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ash/80 hover:border-foreground/25 focus-visible:border-coral focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(field, "flex h-11 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium", className)} {...props} />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, "flex min-h-[88px] py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
