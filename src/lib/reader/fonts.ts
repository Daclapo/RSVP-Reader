import type { ReaderFontFamily } from "@/lib/reader/types";

export const readerFontStacks: Record<ReaderFontFamily, string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
  times: "\"Times New Roman\", Times, var(--font-serif)",
  arial: "Arial, Helvetica, var(--font-sans)",
  "open-sans": "\"Open Sans\", Arial, var(--font-sans)",
  georgia: "Georgia, var(--font-serif)",
  baskerville: "Baskerville, \"Libre Baskerville\", \"Times New Roman\", var(--font-serif)",
  garamond: "Garamond, \"EB Garamond\", Georgia, var(--font-serif)",
  literata: "Literata, Georgia, var(--font-serif)",
  merriweather: "Merriweather, Georgia, var(--font-serif)",
  lora: "Lora, Georgia, var(--font-serif)",
  crimson: "\"Crimson Text\", Georgia, var(--font-serif)",
  raleway: "Raleway, var(--font-sans)",
};
