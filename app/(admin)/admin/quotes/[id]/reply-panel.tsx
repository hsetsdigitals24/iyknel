"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStateToast } from "@/components/form-state-toast";
import type { FormState } from "@/lib/validation";

import { closeQuoteAction, sendQuoteReplyAction } from "../actions";

type Props = {
  id: string;
  defaultSubject: string;
};

export function ReplyPanel({ id, defaultSubject }: Props) {
  const replyAction = (prev: FormState, formData: FormData) =>
    sendQuoteReplyAction(id, prev, formData);
  const closeAction = (prev: FormState, formData: FormData) =>
    closeQuoteAction(id, prev, formData);

  const [replyState, replyDispatch] = useFormState(replyAction, null);
  const [closeState, closeDispatch] = useFormState(closeAction, null);

  return (
    <div className="space-y-6">
      <form action={replyDispatch} className="space-y-3 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Send a reply</h3>
        <p className="text-xs text-muted-foreground">
          The customer receives this as an email. The back-office (ADMIN_NOTIFY_EMAIL) is BCC&apos;d.
        </p>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" defaultValue={defaultSubject} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea id="body" name="body" rows={8} required />
        </div>
        <FormStateToast state={replyState} />
        <ReplySubmit />
      </form>

      <form action={closeDispatch} className="space-y-3 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Close without reply</h3>
        <p className="text-xs text-muted-foreground">
          Use when this was spam, a duplicate, or the customer was handled out-of-band.
        </p>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" name="reason" placeholder="e.g. Spam, duplicate, handled offline" required />
        </div>
        <FormStateToast state={closeState} />
        <CloseSubmit />
      </form>
    </div>
  );
}

function ReplySubmit() {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reply"}
      </Button>
    </div>
  );
}

function CloseSubmit() {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Closing…" : "Close quote"}
      </Button>
    </div>
  );
}
