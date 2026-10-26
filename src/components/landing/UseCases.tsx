"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const CASES = [
  { id: "creators", label: "Creators", keyword: "GUIDE", post: "Reel: how I plan a month of content", dm: "Hey! Reply YES and I’ll send my free content calendar.", follow: "Here it is: yourname.com/calendar. Tell me what you’d add!", why: "Turn views into an email list without answering each comment by hand." },
  { id: "shops", label: "Online shops", keyword: "PRICE", post: "Post: new linen collection", dm: "Thanks for asking! Reply YES for the price list and a 10% code.", follow: "Prices: shop.com/linen. Code WELCOME10 works for 48 hours.", why: "Answer “how much?” the second it is asked, while people are still interested." },
  { id: "coaches", label: "Coaches", keyword: "READY", post: "Carousel: 5 signs you need a coach", dm: "Love that. Reply YES and I’ll send the link to book a free call.", follow: "Book here: cal.com/you/intro. Pick any slot that suits you.", why: "Qualify warm people into your calendar instead of your inbox." },
] as const;

export default function UseCases() {
  return (
    <Tabs defaultValue="creators">
      <TabsList className="h-auto flex-wrap">
        {CASES.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.label}</TabsTrigger>)}
      </TabsList>
      {CASES.map((c) => (
        <TabsContent key={c.id} value={c.id}>
          <div className="grid gap-8 rounded-2xl border bg-card p-6 sm:p-8 md:grid-cols-2">
            <div className="flex flex-col justify-between gap-6">
              <p className="font-display text-3xl leading-tight sm:text-4xl">{c.why}</p>
              <dl className="space-y-3 text-sm">
                <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted-foreground">Post</dt><dd>{c.post}</dd></div>
                <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted-foreground">Keyword</dt><dd><span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-xs font-medium text-primary">{c.keyword}</span></dd></div>
              </dl>
            </div>
            <div className="space-y-2 rounded-2xl bg-muted/60 p-4 text-sm">
              <Msg mine>{c.dm}</Msg>
              <Msg>YES</Msg>
              <Msg mine>{c.follow}</Msg>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Msg({ mine, children }: { mine?: boolean; children: React.ReactNode }) {
  return <div className={cn("flex", mine ? "justify-end" : "justify-start")}><p className={cn("max-w-[85%] rounded-2xl px-3.5 py-2", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card border")}>{children}</p></div>;
}
