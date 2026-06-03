import { LegalShell, legalMetadata } from "@/components/legal-shell";

export const metadata = legalMetadata("Terms of Service");

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="2026-06-03">
      <p>
        These Terms govern your use of the Iyknel wholesale platform. By opening an account or
        placing an order you accept these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        Iyknel is offered to registered Nigerian businesses only. You confirm that you have
        authority to bind the business named on the account and that the RC number and contact
        details you provide are correct. Consumer accounts and resellers without a verifiable
        business registration are not eligible.
      </p>

      <h2>2. Pricing and currency</h2>
      <p>
        All prices are in Nigerian Naira (NGN) and are exclusive of logistics unless stated.
        Prices may change without notice; the price applied to your order is the price displayed
        at the time of submission and shown on the invoice.
      </p>

      <h2>3. Logistics</h2>
      <p>
        Delivery cost is computed by our back office after submission, based on total order
        weight and the delivery address. The vehicle is auto-selected from our fleet matrix; the
        per-band cost is set by management and visible on your invoice. Orders at or above the
        published free-logistics threshold ship without a logistics charge at our discretion.
      </p>

      <h2>4. Payment</h2>
      <p>
        Payment is made by bank transfer to the account named on the invoice. We do not accept
        cards, online wallets, or third-party payment links. Orders move to dispatch only after
        funds are confirmed received.
      </p>

      <h2>5. Cancellations, returns and refunds</h2>
      <p>
        You may cancel before dispatch by submitting a cancellation through your dashboard. Once
        an order is dispatched it cannot be cancelled. Returns are accepted only for goods that
        are damaged in transit or materially different from what was invoiced, and must be
        flagged within forty-eight (48) hours of delivery. Refunds, where due, are paid by bank
        transfer within ten (10) business days.
      </p>

      <h2>6. Stock</h2>
      <p>
        We may decline or partially fulfil an order if stock changes between submission and
        approval. In that case we notify you and offer a substitute, a backorder, or a refund of
        the affected lines.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        You agree not to use the platform to place fraudulent orders, scrape data, or attempt to
        compromise other accounts. We may suspend or terminate accounts that breach this
        clause.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the maximum extent permitted by Nigerian law, our aggregate liability for any claim
        arising from the platform is limited to the value of the affected order. We are not
        liable for indirect or consequential loss.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes are
        subject to the exclusive jurisdiction of the courts of Lagos State.
      </p>
    </LegalShell>
  );
}
