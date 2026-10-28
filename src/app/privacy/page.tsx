import { LegalPage } from "@/components/Legal";
import { appName } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  title: "Privacy Policy",
  ...pageMetadata({
    title: "Privacy Policy",
    description: "What Commiko stores about your account and connected Instagram accounts, and how to delete it.",
    path: "/privacy",
  }),
};
export default function Privacy() {
  const name = appName();
  return (
    <LegalPage title="Privacy Policy">
      <p>{name} lets you automate replies and direct messages for comments on your own Instagram posts. This page explains what we store and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Your account email, name and a hashed password.</li>
        <li>For each Instagram account you connect: its ID, username, profile picture URL and an encrypted access token.</li>
        <li>Comments on your posts that trigger an automation (commenter ID, username, comment text), the direct messages we sent for you, whether the person replied, and the result of each action.</li>
      </ul>
      <h2>How we use it</h2>
      <p>Only to run the automations you configure and to show you your own statistics. We do not sell data or use it for advertising.</p>
      <h2>Deletion</h2>
      <p>You can disconnect an Instagram account in the dashboard at any time, which deletes its token, automations, conversations and logs. You can also remove the app from your Instagram settings, or see the <a href="/data-deletion">data deletion page</a>.</p>
      <p className="text-sm">Contact: add your support email here before going live.</p>
    </LegalPage>
  );
}
