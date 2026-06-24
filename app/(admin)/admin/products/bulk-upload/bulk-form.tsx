"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkUploadAction, type BulkUploadState } from "./actions";

export function BulkForm() {
  const [state, action] = useFormState<BulkUploadState, FormData>(bulkUploadAction, null);
  const last = useRef<BulkUploadState>(null);

  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state) return;
    if (!state.ok) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-4" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="csv">CSV or Excel file</Label>
        <Input
          id="csv"
          name="csv"
          type="file"
          accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel"
          required
        />
        <p className="text-xs text-muted-foreground">
          Required headers: sku, name, category, price_naira, weight_grams, units_per_carton,
          cartons_delta, pieces_delta, description.
        </p>
      </div>
      {state && !state.ok && state.rowErrors && state.rowErrors.length > 0 && (
        <div className="space-y-2 rounded-md border bg-secondary/40 p-3">
          <p className="text-sm font-medium">Rows that need attention</p>
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
