"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkUploadAction, type BulkUploadState } from "./actions";

export function BulkForm() {
  const [state, action] = useFormState<BulkUploadState, FormData>(bulkUploadAction, null);

  return (
    <form action={action} className="space-y-4" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">
          Required headers: sku, name, category, price_naira, weight_grams, stock_delta,
          description.
        </p>
      </div>
      {state && !state.ok && (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">{state.message}</p>
          {state.rowErrors && state.rowErrors.length > 0 && (
            <ul className="space-y-1 text-xs">
              {state.rowErrors.slice(0, 30).map((e) => (
                <li key={e.rowIndex}>
                  <span className="font-medium">Row {e.rowIndex}:</span> {e.messages.join("; ")}
                </li>
              ))}
              {state.rowErrors.length > 30 && (
                <li className="text-muted-foreground">
                  + {state.rowErrors.length - 30} more…
                </li>
              )}
            </ul>
          )}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}
