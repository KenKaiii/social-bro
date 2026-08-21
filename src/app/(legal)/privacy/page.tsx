import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Social Bro',
  description: 'What Social Bro collects, why, and how to get it deleted.',
};

/**
 * NOT LEGAL ADVICE. Drafted from what the code actually does; have a lawyer
 * review it before relying on it. The third-party list must be kept in sync
 * with what the app actually calls — adding a vendor means editing this page.
 *
 * The YouTube-specific paragraphs are not optional decoration: the YouTube API
 * Services Developer Policies (III.A.2) require an API client's privacy policy
 * to say it uses YouTube API Services, to link Google's Privacy Policy, and to
 * explain what data is collected and how long it is kept.
 */
export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-medium text-white">Privacy Policy</h1>
      <p className="text-white/60">Last updated: 22 August 2026</p>

      <p>
        Social Bro is run by Ken Kai&apos;s Group, Australia. If you have any question about this
        policy or want your data deleted, email <strong>ken@kenkais.com</strong>.
      </p>
      <p>
        Access is invite-only and free. This app also uses YouTube API Services — see the YouTube
        section below.
      </p>

      <h2>What we store about you</h2>
      <ul>
        <li>Your email address, and your name if you gave one.</li>
        <li>A hash of your password (we never store the password itself).</li>
        <li>Your searches, saved searches, and saved results.</li>
        <li>Transcripts you extract and scripts you create or generate.</li>
        <li>Any API keys you enter in Settings, encrypted before storage.</li>
        <li>
          A first-party session cookie so you stay signed in. There are no analytics, advertising,
          or third-party tracking cookies on this site.
        </li>
      </ul>

      <h2>Why we are allowed to hold it</h2>
      <p>
        We hold it to provide the app you were invited to use, and for no other purpose. We do not
        sell it, share it for advertising, or use it to train any model.
      </p>

      <h2>Who else sees your data</h2>
      <ul>
        <li>
          <strong>Google / YouTube</strong> — search terms you run against the YouTube Data API.
        </li>
        <li>
          <strong>RapidAPI and its TikTok/Instagram data providers</strong> — search terms and
          usernames you look up on those platforms.
        </li>
        <li>
          <strong>OpenRouter and the AI model provider you select</strong> — the transcript or
          script text you ask the app to rewrite, plus any notes it contains. Do not paste anything
          confidential into it.
        </li>
        <li>
          <strong>Railway</strong> — hosts both the app and its PostgreSQL database. Servers run in
          Southeast Asia, EU West, US East and US West.
        </li>
      </ul>

      <h2>YouTube API Services</h2>
      <p>
        This app uses YouTube API Services. By using it you agree to be bound by the{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          YouTube Terms of Service
        </a>
        . Google&apos;s handling of your information is described in the{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Google Privacy Policy
        </a>
        . You can review and revoke this app&apos;s access to your Google data at any time via the{' '}
        <a
          href="https://security.google.com/settings/security/permissions"
          target="_blank"
          rel="noreferrer"
        >
          Google security settings page
        </a>
        .
      </p>
      <p>
        View, like and comment counts retrieved from the YouTube API are kept for no longer than 30
        days, after which they are erased from our database.
      </p>

      <h2>How long we keep things</h2>
      <p>
        Your account, your saved searches and the scripts you create are kept until you ask us to
        delete them. Platform statistics attached to saved items are erased after 30 days, as
        described above; the item itself — title, creator and link — stays until you remove it.
      </p>

      <h2>Your rights</h2>
      <p>
        Email <strong>ken@kenkais.com</strong> and you can get a copy of everything we hold about
        you, have it corrected, or have your account and all its data deleted. We will action it
        within 30 days. If you are in Australia you can complain to the{' '}
        <a href="https://www.oaic.gov.au/" target="_blank" rel="noreferrer">
          Office of the Australian Information Commissioner
        </a>
        ; in the UK or EU, to your national data protection authority.
      </p>

      <h2>Age</h2>
      <p>
        This app is not intended for anyone under 18, and we do not knowingly invite them. Since
        access is by personal invitation only, we control who gets an account.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially we will tell invited users by email before the change
        takes effect. Questions: <strong>ken@kenkais.com</strong>.
      </p>
    </>
  );
}
