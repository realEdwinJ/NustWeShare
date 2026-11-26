import { ProsePage } from "@/components/layout/ProsePage";

export const metadata = { title: "Copyright & takedown" };

export default function CopyrightPage() {
  return (
    <ProsePage title="Copyright & takedown" intro="NustWeShare is an independent student project. It is not affiliated with, operated by or endorsed by the Namibia University of Science and Technology." updated="November 2026">
      <section>
        <h2>What belongs here</h2>
        <p>Past assessments — tests, exams, supplementaries, quizzes, assignments, labs and tutorials — shared by students for revision. Please don&apos;t upload textbooks, lecture slides you weren&apos;t given permission to share, or personal information.</p>
      </section>
      <section>
        <h2>Requesting removal</h2>
        <p>If you hold rights to a document, or believe it shouldn&apos;t be public, tell us:</p>
        <ul>
          <li>the paper link (e.g. <span className="font-mono text-sm">/papers/…</span>),</li>
          <li>your relationship to the material, and</li>
          <li>why it should be removed.</li>
        </ul>
        <p className="mt-3">Open a takedown issue on <a href="https://github.com/realEdwinJ/NustWeShare/issues/new?title=Takedown%20request" target="_blank" rel="noopener noreferrer">GitHub</a>. We review requests promptly and, where in doubt, remove the paper.</p>
      </section>
      <section>
        <h2>Community moderation</h2>
        <p>Every paper has a Report button. Moderators review reports, and a paper that receives five independent reports is taken down automatically and its file deleted.</p>
      </section>
    </ProsePage>
  );
}
