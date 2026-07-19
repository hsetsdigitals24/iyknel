import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const brand = {
  bg: "#f5f3ee",
  card: "#ffffff",
  ink: "#1c1917",
  muted: "#6b6b6b",
  accent: "#166534",
  border: "#e7e3da",
};

/**
 * Contact details shown in the email footer. Injected once at render time
 * (see `renderEmail` in lib/mail.ts) from the admin-editable SiteSetting row,
 * falling back to env vars so template previews still render.
 *
 * Held in a module-level variable rather than React Context: this module is
 * imported into the React Server Components graph (via lib/mail.ts), where
 * `react`'s `react-server` build has no `createContext`. The contact is a
 * single global value identical for every email in a request, so a shared
 * holder set synchronously before render is safe and avoids that failure.
 */
type EmailContact = { email?: string | null; phone?: string | null };
let currentContact: EmailContact = {};
export function setEmailContact(contact: EmailContact) {
  currentContact = contact;
}

export type EmailLayoutProps = {
  /** Text shown in the inbox preview line. */
  preview: string;
  heading: string;
  children: React.ReactNode;
};

/**
 * Shared branded shell for all Iyknel transactional emails. Keep the markup
 * inline-styled — email clients ignore <style>/external CSS.
 */
export function EmailLayout({ preview, heading, children }: EmailLayoutProps) {
  const injected = currentContact;
  const contactEmail = injected.email ?? process.env.CONTACT_EMAIL;
  const contactPhone = injected.phone ?? process.env.CONTACT_PHONE;
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.bg,
          margin: 0,
          padding: "24px 0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: brand.ink,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: brand.card,
            borderRadius: "12px",
            border: `1px solid ${brand.border}`,
            overflow: "hidden",
          }}
        >
          <Section style={{ padding: "28px 32px 8px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: brand.accent,
              }}
            >
              Iyknel
            </Text>
          </Section>
          <Section style={{ padding: "8px 32px 24px" }}>
            <Text
              style={{
                margin: "0 0 16px",
                fontSize: "20px",
                fontWeight: 600,
                lineHeight: "1.3",
              }}
            >
              {heading}
            </Text>
            {children}
          </Section>
          <Hr style={{ borderColor: brand.border, margin: 0 }} />
          <Section style={{ padding: "20px 32px" }}>
            <Text style={{ margin: 0, fontSize: "12px", color: brand.muted, lineHeight: "1.6" }}>
              Iyknel — B2B FMCG distribution.
              {contactEmail ? (
                <>
                  {" "}
                  Questions? <Link href={`mailto:${contactEmail}`} style={{ color: brand.accent }}>{contactEmail}</Link>
                </>
              ) : null}
              {contactPhone ? <> · {contactPhone}</> : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable inline text styles for template bodies.
export const styles = {
  paragraph: {
    margin: "0 0 14px",
    fontSize: "15px",
    lineHeight: "1.6",
    color: brand.ink,
  } as React.CSSProperties,
  muted: {
    margin: "0 0 14px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: brand.muted,
  } as React.CSSProperties,
  callout: {
    margin: "0 0 16px",
    padding: "16px",
    backgroundColor: brand.bg,
    borderRadius: "8px",
    border: `1px solid ${brand.border}`,
    fontSize: "14px",
    lineHeight: "1.7",
    color: brand.ink,
    whiteSpace: "pre-line" as const,
  } as React.CSSProperties,
  code: {
    margin: "4px 0 16px",
    fontSize: "30px",
    fontWeight: 700,
    letterSpacing: "0.35em",
    color: brand.accent,
  } as React.CSSProperties,
  button: {
    display: "inline-block",
    backgroundColor: brand.accent,
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    padding: "11px 20px",
    borderRadius: "8px",
  } as React.CSSProperties,
  brand,
};
