import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

export type AdminNoticeEmailProps = {
  heading: string;
  preview: string;
  /** Main sentence describing what happened. */
  body: string;
  /** Optional pre-formatted detail block (e.g. edit summary, totals). */
  detail?: string | null;
  /** Optional call-to-action line, e.g. "Review it in the back office." */
  action?: string | null;
};

/**
 * One parameterised template for every admin-facing order alert
 * (new order / payment declared / edited / status changes).
 */
export function AdminNoticeEmail({
  heading,
  preview,
  body,
  detail,
  action,
}: AdminNoticeEmailProps) {
  return (
    <EmailLayout preview={preview} heading={heading}>
      <Text style={styles.paragraph}>{body}</Text>
      {detail ? <Text style={styles.callout}>{detail}</Text> : null}
      {action ? <Text style={styles.muted}>{action}</Text> : null}
    </EmailLayout>
  );
}
