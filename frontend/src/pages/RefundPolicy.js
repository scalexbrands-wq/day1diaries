import React from 'react'
import LegalPage from './LegalPage'

export default function RefundPolicy() {
  return (
    <LegalPage title="Membership & Refund Policy" updated="June 20, 2026">
      <p>
        This policy explains how Day1 Diaries Premium Membership works — pricing, billing, cancellation,
        and refunds — for plans purchased via manual approval, UPI, bank transfer, or online payment
        (Razorpay).
      </p>

      <h2>1. Membership Plans</h2>
      <p>
        Day1 Diaries offers paid Premium Membership plans (e.g. Monthly, Quarterly, Annual, Lifetime) at
        prices shown on the Membership page at the time of purchase. Each plan's price, duration, and
        benefits are set by Day1 Diaries and may change for future purchases — changes do not affect an
        already-active membership until it expires or is renewed.
      </p>

      <h2>2. Application & Approval</h2>
      <p>
        All membership applications — including those paid instantly online — are reviewed by our team
        before activation. Submitting payment does not guarantee approval. If an application is rejected,
        any payment already collected is eligible for a full refund under Section 4 below.
      </p>

      <h2>3. Payment Methods</h2>
      <ul>
        <li><strong>Online Payment (Razorpay):</strong> Card, UPI, netbanking, or wallet — processed securely by Razorpay. We never store your card or bank details.</li>
        <li><strong>UPI QR / Bank Transfer:</strong> You pay directly via the QR code or bank details shown at checkout and upload a payment screenshot for manual verification.</li>
        <li><strong>Manual / Sponsor:</strong> For partners and sponsors approved without a payment step.</li>
      </ul>

      <h2>4. Refund Policy</h2>
      <p>You are eligible for a full refund if:</p>
      <ul>
        <li>Your membership application is <strong>rejected</strong> after payment, or</li>
        <li>You were charged in error (e.g. duplicate payment), or</li>
        <li>You cancel within <strong>48 hours</strong> of approval and have not made substantial use of premium features (e.g. no premium-only stories posted, no certificate generated).</li>
      </ul>
      <p>
        Beyond the 48-hour window, membership fees are <strong>non-refundable</strong> for the remainder of
        the active billing period, since access is granted immediately upon approval. To request a refund,
        contact us via the <a href="/contact">Contact page</a> with your membership number.
      </p>
      <p>
        Approved refunds for online (Razorpay) payments are processed back to your original payment method
        and typically reflect within 5–7 business days, depending on your bank or card issuer. Refunds for
        UPI/bank transfer payments are issued via bank transfer to the account you paid from.
      </p>

      <h2>5. Cancellation</h2>
      <p>
        You may cancel your membership at any time from your Membership Dashboard or by contacting support.
        Cancelling stops future renewals but does not automatically refund the current billing period
        (see Section 4). Your premium access continues until the current period's end date.
      </p>

      <h2>6. Renewals & Expiry</h2>
      <p>
        Memberships do not auto-renew by default — you'll receive a reminder email before expiry (the
        reminder window is configurable by us) and can renew manually from your Membership Dashboard.
        Once expired, your account reverts to free-tier access limits until renewed.
      </p>

      <h2>7. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Changes apply to memberships purchased after the
        update; existing active memberships keep the terms they were purchased under.
      </p>

      <h2>8. Contact</h2>
      <p>
        For refund requests, billing questions, or membership support, reach us via the
        {' '}<a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  )
}
