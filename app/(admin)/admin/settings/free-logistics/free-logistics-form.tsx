"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStateToast } from "@/components/form-state-toast";
import { formatNaira } from "@/lib/utils";
import { updateFreeLogisticsAction } from "./actions";

export function FreeLogisticsForm({
  initial,
}: {
  initial: { thresholdNaira: number; bannerText: string };
}) {
  const [state, action] = useFormState(updateFreeLogisticsAction, null);
  const [thresholdNaira, setThresholdNaira] = useState(String(initial.thresholdNaira));
  const [bannerText, setBannerText] = useState(initial.bannerText);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  const kobo = Math.round((Number(thresholdNaira) || 0) * 100);
  const preview = bannerText.replaceAll("{amount}", formatNaira(kobo));

  return (
    <form action={action} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="thresholdNaira">Threshold (₦)</Label>
        <Input
          id="thresholdNaira"
          name="thresholdNaira"
          type="number"
          min={1}
          step="0.01"
          required
          value={thresholdNaira}
          onChange={(e) => setThresholdNaira(e.target.value)}
          aria-invalid={!!fieldErrors?.thresholdNaira?.[0]}
        />
        {fieldErrors?.thresholdNaira?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.thresholdNaira[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bannerText">Banner text</Label>
        <Textarea
          id="bannerText"
          name="bannerText"
          rows={2}
          required
          value={bannerText}
          onChange={(e) => setBannerText(e.target.value)}
          aria-invalid={!!fieldErrors?.bannerText?.[0]}
        />
        <p className="text-xs text-muted-foreground">
          Use{" "}
          <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">{"{amount}"}</code>{" "}
          to insert the formatted threshold.
        </p>
        {fieldErrors?.bannerText?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.bannerText[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Preview
        </span>
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-info/10 px-3 py-1 text-xs font-medium text-info ring-1 ring-info/30">
          {preview || "Banner text"}
        </p>
      </div>

      <FormStateToast state={state} />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}
