import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

export type BankBlock = {
  name: string;
  accountName: string;
  accountNumber: string;
  reference: string;
};

export type OrderStatusEmailProps = {
  heading: string;
  preview: string;
  name?: string | null;
  /** Intro sentence(s) shown before any details. */
  intro: string;
  totalText?: string | null;
  bank?: BankBlock | null;
  reason?: string | null;
  cta?: { href: string; label: string } | null;
  /** Optional closing sentence after the details. */
  outro?: string | null;
};

/**
 * One parameterised template for every customer-facing order email
 * (submitted / invoice / approved / paid / dispatched / delivered / cancelled).
 */
export function OrderStatusEmail({
  heading,
  preview,
  name,
  intro,
  totalText,
  bank,
  reason,
  cta,
  outro,
}: OrderStatusEmailProps) {
  return (
    <EmailLayout preview={preview} heading={heading}>
      <Text style={styles.paragraph}>Hi {name ?? "there"},</Text>
      <Text style={styles.paragraph}>{intro}</Text>

      {totalText ? (
        <Text style={styles.paragraph}>
          <strong>Total due:</strong> {totalText}
        </Text>
      ) : null}

      {reason ? <Text style={styles.callout}>Reason: {reason}</Text> : null}

      {bank ? (
        <Section style={styles.callout}>
          <Text style={{ margin: 0, fontWeight: 600 }}>Bank transfer details</Text>
          <Text style={{ margin: "6px 0 0", whiteSpace: "pre-line" }}>
            {`${bank.name}\n${bank.accountName}\n${bank.accountNumber}\nReference: ${bank.reference}`}
          </Text>
        </Section>
      ) : null}

      {cta ? (
        <Section style={{ margin: "8px 0 16px" }}>
          <Button href={cta.href} style={styles.button}>
            {cta.label}
          </Button>
        </Section>
      ) : null}

      {outro ? <Text style={styles.paragraph}>{outro}</Text> : null}

      <Text style={styles.muted}>— Iyknel</Text>
    </EmailLayout>
  );
}
