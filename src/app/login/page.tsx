import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/session";
import { appName } from "@/lib/utils";

export const metadata = { title: "Log in" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSessionUserId()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  return <AuthForm mode="login" appName={appName()} next={next} />;
}
