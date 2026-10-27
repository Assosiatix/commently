// Run: npx tsx scripts/live-ai.ts   asks the real Gemini a set of customer questions against a sample product. No database, nothing is sent.
import "dotenv/config";
import { answerComment } from "../src/lib/ai-reply";

const jacket = { title: "Summer Jacket", url: "https://shop.test/products/jacket", currency: "PKR", description: "Light jacket for warm evenings. Breathable fabric, two side pockets.", vendor: "Acme", productType: "Jackets", tags: ["summer", "men"],
  options: [{ name: "Color", values: ["Red", "Black", "Navy"] }, { name: "Size", values: ["S", "M", "L"] }], facts: [{ key: "material", value: "100% cotton" }, { key: "fit", value: "relaxed" }],
  variants: [
    { title: "Red / S", price: "4500", qty: 4, available: true }, { title: "Red / M", price: "4500", qty: 2, available: true }, { title: "Red / L", price: "4500", qty: 0, available: false },
    { title: "Black / M", price: "4500", qty: 6, available: true }, { title: "Navy / L", price: "4800", qty: 3, available: true } ] };
const notes = "Delivery: 3-5 working days across Pakistan, 1-2 days in Karachi and Lahore. Cash on delivery available. Exchange within 7 days if unworn.";

const questions = [
  "kaun kaun se colors hain?", "M size red mein hai?", "L size available hai?", "kitne ka hai?", "material kya hai?",
  "delivery kitne din mein hogi aur COD hai?", "return ho jayega agar fit na aya?", "ye waterproof hai?", "Navy L ka price kya hai aur kab tak aa jayega?", "Do you have it in yellow?",
];

async function main() {
for (const q of questions) {
  const t0 = Date.now();
  const r = await answerComment({ comment: q, products: [jacket], instructions: notes, brand: "acme" });
  console.log(`\nQ: ${q}\n   ${r.usable ? "SENT   " : "BLOCKED"} intent=${r.intent ?? "-"} conf=${r.confidence ?? "-"} human=${r.needsHuman ?? "-"} missing=${"missingInfo" in r ? (r as { missingInfo: boolean }).missingInfo : "-"} ${Date.now() - t0}ms${r.usable ? "" : "  (" + (r as { reason: string }).reason + ")"}\n   A: ${r.answer ?? ""}`);
}
}
main();
