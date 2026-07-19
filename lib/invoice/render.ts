import "server-only";
import fs from "node:fs";
import path from "node:path";
import { renderToBuffer, Font } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceProps } from "./pdf";

// The built-in Helvetica has no glyph for the Naira symbol (₦, U+20A6), so it
// renders as tofu. Register Inter (which includes ₦ and matches the site UI).
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Inter-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"), fontWeight: 700 },
  ],
});
// Naira (₦) sits in a run react-pdf may try to hyphenate; disable word breaking.
Font.registerHyphenationCallback((w) => [w]);

function loadLogo(): Buffer | undefined {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", "main_logo.png"));
  } catch {
    return undefined;
  }
}

export async function renderInvoiceToBuffer(props: InvoiceProps): Promise<Buffer> {
  return renderToBuffer(InvoiceDocument({ ...props, logo: loadLogo() }));
}
