import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Commiko character. public/logo-mark.png is a trimmed 128px copy of public/logo.png. */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={128} height={128} priority className={cn("h-11 w-11 shrink-0 object-contain", className)} />;
}

export function Logo({ name, href = "/", className }: { name: string; href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark />
      <span className="font-display text-[21px] font-bold leading-none tracking-tight text-foreground">{name}</span>
    </Link>
  );
}
