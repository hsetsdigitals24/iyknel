import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

export type WelcomeEmailProps = {
  name?: string | null;
};

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Your Iyknel account is ready" heading="Your account is ready">
      <Text style={styles.paragraph}>Hi {name ?? "there"},</Text>
      <Text style={styles.paragraph}>
        Your Iyknel business account is ready. You can now browse products, build a cart, and submit
        orders.
      </Text>
      <Text style={styles.paragraph}>Sign in any time from your dashboard to get started.</Text>
      <Text style={styles.muted}>— Iyknel</Text>
    </EmailLayout>
  );
}
