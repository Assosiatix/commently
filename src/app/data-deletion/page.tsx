import { LegalPage } from "@/components/Legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  title: "Data deletion",
  ...pageMetadata({
    title: "Data Deletion",
    description: "How to delete your Commiko account data and disconnect an Instagram account.",
    path: "/data-deletion",
  }),
};
export default async function DataDeletion({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <LegalPage title="Data deletion">
      {code && <p className="rounded-xl bg-success-soft p-4 text-success">Your deletion request was received and processed. Confirmation code: <b>{code}</b></p>}
      <p>To delete your data: open the dashboard, go to Instagram accounts and choose Disconnect. This removes your Instagram token, automations, conversations and activity log immediately.</p>
      <p>You can also remove the app in Instagram, under Settings, Apps and websites. Instagram then notifies us and we delete the connected account&apos;s data automatically.</p>
    </LegalPage>
  );
}
