import { LegalShell, legalMetadata } from "@/components/legal-shell";

export const metadata = legalMetadata("Privacy Policy");

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="2026-06-03">
      <p>
        This Privacy Policy explains how Iyknel (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects,
        uses, and protects information from businesses that register and transact on iyknel.ng.
        We operate in Nigeria and comply with the Nigeria Data Protection Act (NDPA, 2023) and
        the Nigeria Data Protection Regulation (NDPR).
      </p>

      <h2>1. What we collect</h2>
      <p>
        When you open a wholesale account we collect: registered business name, RC number,
        contact person name, business email and phone, and delivery address. When you place
        orders we additionally collect cart contents, order history, and payment-confirmation
        notes. We do not collect card details — payment is by bank transfer.
      </p>

      <h2>2. How we use it</h2>
      <p>
        Information is used solely to fulfil orders, compute logistics, raise invoices, contact
        you about your account, and meet our legal and tax obligations. We do not sell
        information to third parties.
      </p>

      <h2>3. Third parties</h2>
      <p>
        Operational data passes through service providers we have contracts with: Cloudflare R2
        (file storage for invoices and product images), our SMTP provider (transactional email
        only), and BulkSMS Nigeria (order status SMS). Each handles data on our behalf under
        their own published terms.
      </p>

      <h2>4. Retention</h2>
      <p>
        We retain order and invoice records for at least seven (7) years to comply with FIRS tax
        requirements. Account contact details are retained for the life of your account and
        deleted within thirty (30) days of a verified deletion request, except where law
        requires longer retention.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Under the NDPA you may request access to, correction of, or deletion of your personal
        data, and you may withdraw consent for non-essential processing. Write to us using the
        contact details in the footer.
      </p>

      <h2>6. Security</h2>
      <p>
        Access to customer data is limited to authenticated administrators. Passwords are
        salted-and-hashed; files in R2 are served via short-lived signed URLs. We disclose any
        material breach to affected accounts and to the Nigeria Data Protection Commission
        within the timelines set by the NDPA.
      </p>

      <h2>7. Updates</h2>
      <p>
        We may update this Policy from time to time. Material changes will be announced by email
        to active accounts at least fourteen (14) days before taking effect.
      </p>
    </LegalShell>
  );
}
