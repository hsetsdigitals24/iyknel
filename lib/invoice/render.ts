import "server-only";
import fs from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceProps } from "./pdf";

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
