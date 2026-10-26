"use client";
import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = M.Root;
const DropdownMenuTrigger = M.Trigger;

const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof M.Content>, React.ComponentPropsWithoutRef<typeof M.Content>>(({ className, sideOffset = 6, ...props }, ref) => (
  <M.Portal>
    <M.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("z-50 min-w-[10rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className)}
      {...props}
    />
  </M.Portal>
));
DropdownMenuContent.displayName = M.Content.displayName;

const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof M.Item>, React.ComponentPropsWithoutRef<typeof M.Item>>(({ className, ...props }, ref) => (
  <M.Item ref={ref} className={cn("relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4", className)} {...props} />
));
DropdownMenuItem.displayName = M.Item.displayName;

const DropdownMenuLabel = React.forwardRef<React.ElementRef<typeof M.Label>, React.ComponentPropsWithoutRef<typeof M.Label>>(({ className, ...props }, ref) => (
  <M.Label ref={ref} className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
));
DropdownMenuLabel.displayName = M.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<React.ElementRef<typeof M.Separator>, React.ComponentPropsWithoutRef<typeof M.Separator>>(({ className, ...props }, ref) => (
  <M.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
DropdownMenuSeparator.displayName = M.Separator.displayName;

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
