import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUserId } from "@/lib/session";
import { appName } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  title: "Create account",
  ...pageMetadata({
    title: "Create account",
    description: "Start free on Commiko — automate Instagram comment replies, DMs and follow-ups.",
    path: "/signup",
  }),
};
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSessionUserId()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  return <AuthForm mode="signup" appName={appName()} next={next} />;
}
