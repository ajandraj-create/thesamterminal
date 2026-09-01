import CompareClient from "./CompareClient";

export const metadata = {
  title: "Compare coins side-by-side — TheSamTerminal",
  description:
    "Line up price, quant score, signal, key levels and trade plan for up to three coins at once. Educational analysis only — not financial advice.",
};

export default function ComparePage() {
  return <CompareClient />;
}
