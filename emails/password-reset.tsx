import * as React from "react";
import { Text } from "@react-email/components";
import { EmailLayout, styles } from "./layout";

export type PasswordResetEmailProps = {
  name?: string | null;
  code: string;
  /** Minutes until the code expires. */
  expiresMinutes: number;
};

export function PasswordResetEmail({ name, code, expiresMinutes }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Your Iyknel password reset code" heading="Reset your password">
      <Text style={styles.paragraph}>Hi {name ?? "there"},</Text>
      <Text style={styles.paragraph}>
        Use the code below to reset your Iyknel password. It expires in {expiresMinutes} minutes.
      </Text>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.muted}>
        If you didn&apos;t request this, you can safely ignore this email — your password stays
        unchanged.
      </Text>
      <Text style={styles.muted}>— Iyknel</Text>
    </EmailLayout>
  );
}
