import { ProsePage } from "@/components/layout/ProsePage";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy" intro="We collect as little as possible. No ads, no trackers, no selling data." updated="November 2026">
      <section>
        <h2>Without a profile</h2>
        <ul>
          <li>Reading, searching, downloading and uploading work without an account.</li>
          <li>We store a one-way hash of your IP address with uploads, reports and requests — only to stop spam and duplicate reports. It can&apos;t be turned back into your IP.</li>
          <li>Read and download counts are approximate and de-duplicated with short-lived cookies.</li>
          <li>Your reading history, recent searches and guest saves live only in your browser (localStorage). Clear them any time from <a href="/library">My library</a>.</li>
        </ul>
      </section>
      <section>
        <h2>With an optional profile</h2>
        <ul>
          <li>We store your username, display name, optional bio, avatar, programme and year, your preferences, and a bcrypt hash of your PIN — never the PIN itself.</li>
          <li>No email address or phone number is ever requested.</li>
          <li>You control whether your profile is public, whether you appear on the leaderboard, and whether each upload shows your name.</li>
          <li>You can export everything we hold as JSON, or delete your profile, from <a href="/settings#data">Settings</a>. Uploaded papers remain for other students but become anonymous.</li>
        </ul>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>One sign-in cookie (only if you log in) and short-lived counters that stop refreshes being counted as extra reads or downloads. Nothing else.</p>
      </section>
    </ProsePage>
  );
}
