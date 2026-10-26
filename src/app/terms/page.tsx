import { LegalPage } from "@/components/Legal";
import { appName } from "@/lib/utils";

export const metadata = { title: "Terms of Service" };
export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>By using {appName()} you agree to use it only with Instagram accounts you own or are authorised to manage, and to follow Instagram and Meta platform terms and applicable law.</p>
      <ul>
        <li>Do not use the service for spam, harassment or deceptive messages.</li>
        <li>You are responsible for the content of the messages your automations send.</li>
        <li>The service is provided as is, and Meta may limit or change API access at any time.</li>
        <li>We may suspend accounts that abuse the service.</li>
      </ul>
      <p className="text-sm">Add your legal entity name and contact details here before going live.</p>
    </LegalPage>
  );
}
