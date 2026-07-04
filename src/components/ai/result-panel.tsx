import { Badge } from "@/components/ui/badge";

/** Presentational renderers for each AiArtifact.result shape (no hooks —
 *  usable from both server and client components). */

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-medium">{title}</h4>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-muted-foreground flex gap-2 text-sm">
            <span className="bg-primary/60 mt-1.5 size-1.5 shrink-0 rounded-full" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-medium">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s, i) => (
          <Badge key={i} variant="secondary">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const angle = Math.round((score / 100) * 360);
  const color =
    score >= 75
      ? "var(--status-offer)"
      : score >= 50
        ? "var(--status-interview)"
        : "var(--status-rejected)";
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid size-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${angle}deg, var(--muted) ${angle}deg)`,
        }}
        role="img"
        aria-label={`Match score ${score} out of 100`}
      >
        <div className="bg-card grid size-16 place-items-center rounded-full text-lg font-semibold tabular-nums">
          {score}
        </div>
      </div>
      <p className="text-muted-foreground text-sm">match score / 100</p>
    </div>
  );
}

function Questions({
  title,
  items,
}: {
  title: string;
  items?: { question: string; hint: string }[];
}) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-medium">{title}</h4>
      <ul className="space-y-2">
        {items.map((q, i) => (
          <li key={i} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{q.question}</p>
            <p className="text-muted-foreground mt-1 text-xs">💡 {q.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResult = any;

export function ResultPanel({
  kind,
  result,
}: {
  kind: string;
  result: unknown;
}) {
  const r = result as AnyResult;
  if (!r) return null;

  switch (kind) {
    case "JD_ANALYSIS":
      return (
        <div className="space-y-4">
          <p className="text-sm">{r.summary}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Seniority:</span>
            <Badge>{r.seniority}</Badge>
          </div>
          <Chips title="Skills" items={r.skills} />
          <Chips title="Technologies" items={r.technologies} />
          <List title="Requirements" items={r.requirements} />
          <List title="Responsibilities" items={r.responsibilities} />
        </div>
      );
    case "RESUME_GAP":
      return (
        <div className="space-y-4">
          <ScoreRing score={Number(r.matchScore ?? 0)} />
          <Chips title="Matching skills" items={r.matchingSkills} />
          <Chips title="Missing skills" items={r.missingSkills} />
          <List title="Suggestions" items={r.suggestions} />
        </div>
      );
    case "MATCH_SCORE":
      return (
        <div className="space-y-4">
          <ScoreRing score={Number(r.score ?? 0)} />
          <p className="text-muted-foreground text-sm">{r.rationale}</p>
          <List title="Strengths" items={r.strengths} />
          <List title="Gaps" items={r.gaps} />
        </div>
      );
    case "COVER_LETTER":
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            AI-generated draft · {r.wordCount} words — edit before sending.
          </p>
          <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap">
            {r.content}
          </div>
        </div>
      );
    case "INTERVIEW_PREP":
      return (
        <div className="space-y-4">
          <Questions title="Technical" items={r.technical} />
          <Questions title="Behavioral" items={r.behavioral} />
          <Questions title="Role-specific" items={r.roleSpecific} />
        </div>
      );
    case "RESUME_OPTIMIZE":
      return (
        <div className="space-y-4">
          <List title="Weak areas" items={r.weakAreas} />
          <Chips title="Missing keywords" items={r.missingKeywords} />
          <List title="ATS improvements" items={r.atsImprovements} />
        </div>
      );
    default:
      return (
        <pre className="overflow-x-auto rounded-lg border p-3 text-xs">
          {JSON.stringify(r, null, 2)}
        </pre>
      );
  }
}
