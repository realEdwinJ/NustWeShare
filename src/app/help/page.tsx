import { ProsePage } from "@/components/layout/ProsePage";

export const metadata = { title: "Help & FAQ", description: "How to find, read, download and share NUST past papers on NustWeShare." };

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "Do I need an account?", a: "No. Searching, reading, downloading and uploading all work without one. A free profile (username + 5-digit PIN, no email) adds leaderboard credit, saved papers on every device and module following." },
  { q: "How do I download a whole module?", a: <>Open the module page and press <b>Download all as ZIP</b>. Use the filters first to grab, say, only exams from 2023, or tick individual papers and use <b>Download ZIP</b> in the bar that appears. Files are neatly named like <span className="font-mono text-sm">MCI511S_2024_S1_Exam.pdf</span> and grouped in year folders (change this in Settings).</> },
  { q: "What can the reader do?", a: <>Zoom (or Ctrl + scroll), fit to width or page, rotate, thumbnails, full-screen and <b>find in document</b> (Ctrl F). Use ← → to change page. It remembers where you stopped and offers to resume.</> },
  { q: "How should I name files before uploading?", a: <>Anything works, but names like <span className="font-mono text-sm">ELC511S_2024_Test_1.pdf</span> let us pre-fill the year and type for you. Always double-check before sharing.</> },
  { q: "Why was my upload marked as a duplicate?", a: "The exact same file (or the same text in a different scan) already exists, so we link you to the existing paper instead of storing a copy." },
  { q: "A paper is wrong or broken — what do I do?", a: "Press Report on the paper. Moderators review reports and five independent reports remove a paper automatically. If you uploaded it, you can fix the details yourself from your dashboard." },
  { q: "The paper I need isn't here.", a: "Use Request on the module page. Classmates who have it can upload it straight from your request, and it's marked as fulfilled automatically." },
  { q: "I forgot my PIN.", a: "Because we never collect an email, PINs can't be reset automatically. Open a GitHub issue from the Contact page and a moderator will help verify you." },
  { q: "Keyboard shortcuts", a: <><b>/</b> or <b>Ctrl K</b> search anywhere · in the reader <b>← →</b> pages, <b>+ −</b> zoom, <b>0</b> fit width, <b>R</b> rotate, <b>F</b> full screen, <b>Ctrl F</b> find.</> },
];

export default function HelpPage() {
  return (
    <ProsePage title="Help & FAQ" intro="Everything you need to make the most of NustWeShare.">
      <div className="divide-y rounded-2xl border bg-card">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {f.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="mt-2 text-sm text-muted-foreground">{f.a}</div>
          </details>
        ))}
      </div>
    </ProsePage>
  );
}
