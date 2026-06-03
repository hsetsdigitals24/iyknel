import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceProps } from "./pdf";

export async function renderInvoiceToBuffer(props: InvoiceProps): Promise<Buffer> {
  return renderToBuffer(InvoiceDocument(props));
}
