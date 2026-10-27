import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = [
  ["Is this allowed by Instagram?", "Yes. It uses Instagram’s official API with Instagram Login. You sign in on Instagram’s own page, so your password never touches us, and there is no scraping or browser automation that could get an account flagged."],
  ["Which accounts work?", "Instagram Business and Creator accounts. Personal accounts are not supported by Instagram’s messaging API. Switching is free in Instagram under Settings → Account type."],
  ["Why do follow-ups wait for a reply?", "Instagram allows exactly one private message per comment, and only lets you send more after the person answers. That is why the first DM asks a tiny question (like “Reply YES”) and the follow-up carries the link. It also keeps your messages wanted."],
  ["How fast is the first DM?", "It goes out as soon as Instagram tells us about the comment, usually within a few seconds. Instagram allows private replies for up to 7 days after the comment."],
  ["Can it message people who didn’t comment?", "No, and we would not want it to. Everything starts with a comment on your own post, which is what keeps this on the right side of Meta’s rules."],
  ["What counts towards my DM limit?", "Each first DM and each follow-up counts once. The counter resets on the 1st of every month, and automations pause politely (never fail silently) when you reach the limit."],
  ["What if Instagram or the webhook has a hiccup?", "Every event from Instagram is stored before we respond, and failed ones are retried. You can see each delivery in the Webhooks page."],
  ["Can I cancel any time?", "Yes. Disconnecting an Instagram account deletes its token, automations and conversation history right away."],
] as const;

export default function Faq() {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {FAQ.map(([q, a], i) => (
        <AccordionItem key={q} value={`i${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>
      ))}
    </Accordion>
  );
}
