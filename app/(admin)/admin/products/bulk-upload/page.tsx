import Link from "next/link";
import { BulkForm } from "./bulk-form";

const TEMPLATE_CSV =
  "sku,name,category,price_naira,weight_grams,stock_delta,description\n" +
  "EX-001,Example product,Beverages,1500.00,1200,50,A short description\n";

export default function BulkUploadPage() {
  const dataHref =
    "data:text/csv;charset=utf-8," + encodeURIComponent(TEMPLATE_CSV);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/products"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All products
      </Link>
      <header className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Catalog
        </span>
        <h1 className="font-serif text-3xl">Bulk upload</h1>
        <p className="text-sm text-muted-foreground">
          Create or update products in bulk via CSV. The whole upload is committed only if every
          row is valid.
        </p>
      </header>

      <p className="text-sm">
        <a
          href={dataHref}
          download="iyknel-products-template.csv"
          className="underline-offset-4 hover:underline"
        >
          Download CSV template
        </a>
      </p>

      <div className="max-w-xl">
        <BulkForm />
      </div>
    </div>
  );
}
