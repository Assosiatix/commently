import SettingsForm from "@/components/SettingsForm";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Settings" description="Your profile and preferences." />
      <SettingsForm name={user.name ?? ""} email={user.email} />
    </>
  );
}
