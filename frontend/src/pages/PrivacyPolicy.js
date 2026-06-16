import React from 'react'
import LegalPage from './LegalPage'

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="June 15, 2026">
      <p>
        Day1 Diaries ("we", "us", or "our") respects your privacy and is committed to protecting the
        personal information you share with us. This Privacy Policy explains what information we collect,
        how we use it, and the choices you have.
      </p>

      <h2>1. Information We Collect</h2>
      <p>When you create an account and use Day1 Diaries, we may collect:</p>
      <ul>
        <li><strong>Account information:</strong> your name, username, email address, and password (stored securely via Amazon Cognito — we never see your raw password).</li>
        <li><strong>Profile information:</strong> bio, location, avatar image, and any other details you choose to add to your profile.</li>
        <li><strong>Content you create:</strong> stories, comments, likes, saves, habit logs, and challenge participation.</li>
        <li><strong>Usage information:</strong> pages visited, features used, and general interaction data to help us improve the platform.</li>
        <li><strong>Technical information:</strong> IP address, browser type, and device information, collected automatically for security and analytics purposes.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, operate, and maintain the Day1 Diaries platform</li>
        <li>Create and manage your account, including authentication via Amazon Cognito</li>
        <li>Display your stories, profile, and activity to other users as intended by the platform's features</li>
        <li>Calculate scores, levels, streaks, and leaderboard rankings</li>
        <li>Send important account-related notifications (e.g., email verification codes, password resets)</li>
        <li>Monitor and improve the security, performance, and usability of the platform</li>
        <li>Enforce our Terms of Service, Content Policy, and Posting Guidelines</li>
      </ul>

      <h2>3. How We Store and Protect Your Data</h2>
      <p>
        Your data is stored on Amazon Web Services (AWS) infrastructure, including Amazon RDS (PostgreSQL)
        for application data and Amazon Cognito for authentication credentials. We use encryption at rest
        and in transit (HTTPS/TLS) wherever possible. Access to production systems is restricted to
        authorized administrators.
      </p>
      <p>
        While we take reasonable steps to protect your information, no method of transmission or storage
        is 100% secure. We cannot guarantee absolute security.
      </p>

      <h2>4. Sharing Your Information</h2>
      <p>We do not sell your personal information. We may share information:</p>
      <ul>
        <li><strong>Publicly, as part of the platform's design:</strong> your username, profile, published stories, comments, likes, follower/following counts, level, and leaderboard position are visible to other users by design.</li>
        <li><strong>With service providers:</strong> such as AWS, which hosts our infrastructure, strictly to operate the platform.</li>
        <li><strong>For legal reasons:</strong> if required by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of Day1 Diaries, our users, or the public.</li>
      </ul>

      <h2>5. Your Choices and Rights</h2>
      <p>You can:</p>
      <ul>
        <li>Update your profile information at any time from your account settings</li>
        <li>Delete individual stories, comments, or saved items you've created</li>
        <li>Request deletion of your account and associated personal data by contacting us (note: some content may remain visible if it has been interacted with by others, such as comments on your stories made by other users)</li>
        <li>Opt out of non-essential communications</li>
      </ul>

      <h2>6. Children's Privacy</h2>
      <p>
        Day1 Diaries is not directed at children under 13 (or the applicable minimum age in your region).
        We do not knowingly collect personal information from children. If you believe a child has provided
        us with personal information, please contact us so we can take appropriate action.
      </p>

      <h2>7. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will indicate the date of the most recent
        revision at the top of this page. Continued use of Day1 Diaries after changes take effect
        constitutes acceptance of the revised policy.
      </p>

      <h2>8. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or how your data is handled, please reach out
        through the contact options available on the platform.
      </p>
    </LegalPage>
  )
}
