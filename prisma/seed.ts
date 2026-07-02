import {
  ActivityType,
  AiArtifactKind,
  AiArtifactStatus,
  ApplicationPriority,
  ApplicationStatus,
  CoverLetterTone,
  InterviewStatus,
  InterviewType,
  NoteType,
  Plan,
  PrismaClient,
  SubscriptionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_EMAIL = "demo@aijobtracker.dev";
const DEMO_PASSWORD = "demo1234";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

type Seed = {
  company: string;
  title: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  jobUrl: string;
  source: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  appliedDaysAgo: number | null;
};

const APPLICATIONS: Seed[] = [
  {
    company: "Google",
    title: "Senior Frontend Engineer",
    location: "Remote (US)",
    salaryMin: 180000,
    salaryMax: 230000,
    jobUrl: "https://careers.google.com/jobs/1",
    source: "LinkedIn",
    status: ApplicationStatus.INTERVIEW,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: 21,
  },
  {
    company: "Microsoft",
    title: "Full-Stack Engineer",
    location: "Seattle, WA",
    salaryMin: 165000,
    salaryMax: 205000,
    jobUrl: "https://careers.microsoft.com/jobs/2",
    source: "Referral",
    status: ApplicationStatus.TECHNICAL_INTERVIEW,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: 18,
  },
  {
    company: "Stripe",
    title: "Product Engineer",
    location: "Remote",
    salaryMin: 190000,
    salaryMax: 240000,
    jobUrl: "https://stripe.com/jobs/3",
    source: "Company site",
    status: ApplicationStatus.APPLIED,
    priority: ApplicationPriority.MEDIUM,
    appliedDaysAgo: 6,
  },
  {
    company: "Vercel",
    title: "Developer Experience Engineer",
    location: "Remote",
    salaryMin: 170000,
    salaryMax: 210000,
    jobUrl: "https://vercel.com/careers/4",
    source: "Twitter",
    status: ApplicationStatus.SCREENING,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: 10,
  },
  {
    company: "Notion",
    title: "Frontend Engineer",
    location: "San Francisco, CA",
    salaryMin: 160000,
    salaryMax: 200000,
    jobUrl: "https://notion.so/careers/5",
    source: "LinkedIn",
    status: ApplicationStatus.REJECTED,
    priority: ApplicationPriority.MEDIUM,
    appliedDaysAgo: 30,
  },
  {
    company: "Linear",
    title: "Software Engineer",
    location: "Remote",
    salaryMin: 175000,
    salaryMax: 215000,
    jobUrl: "https://linear.app/careers/6",
    source: "Company site",
    status: ApplicationStatus.WISHLIST,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: null,
  },
  {
    company: "Airbnb",
    title: "Senior Software Engineer",
    location: "Remote (US)",
    salaryMin: 200000,
    salaryMax: 250000,
    jobUrl: "https://careers.airbnb.com/7",
    source: "Referral",
    status: ApplicationStatus.OFFER,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: 40,
  },
  {
    company: "Spotify",
    title: "Backend Engineer",
    location: "New York, NY",
    salaryMin: 160000,
    salaryMax: 195000,
    jobUrl: "https://lifeatspotify.com/8",
    source: "LinkedIn",
    status: ApplicationStatus.APPLIED,
    priority: ApplicationPriority.MEDIUM,
    appliedDaysAgo: 4,
  },
  {
    company: "Figma",
    title: "Product Engineer",
    location: "San Francisco, CA",
    salaryMin: 185000,
    salaryMax: 235000,
    jobUrl: "https://figma.com/careers/9",
    source: "Company site",
    status: ApplicationStatus.FINAL_INTERVIEW,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: 25,
  },
  {
    company: "Datadog",
    title: "Frontend Engineer",
    location: "Remote",
    salaryMin: 155000,
    salaryMax: 190000,
    jobUrl: "https://careers.datadoghq.com/10",
    source: "LinkedIn",
    status: ApplicationStatus.REJECTED,
    priority: ApplicationPriority.LOW,
    appliedDaysAgo: 22,
  },
  {
    company: "Shopify",
    title: "Senior Full-Stack Developer",
    location: "Remote",
    salaryMin: 170000,
    salaryMax: 210000,
    jobUrl: "https://shopify.com/careers/11",
    source: "Twitter",
    status: ApplicationStatus.WISHLIST,
    priority: ApplicationPriority.MEDIUM,
    appliedDaysAgo: null,
  },
  {
    company: "OpenAI",
    title: "Software Engineer, Applied",
    location: "San Francisco, CA",
    salaryMin: 210000,
    salaryMax: 270000,
    jobUrl: "https://openai.com/careers/12",
    source: "Referral",
    status: ApplicationStatus.ACCEPTED,
    priority: ApplicationPriority.HIGH,
    appliedDaysAgo: 55,
  },
];

// Match scores surfaced on cards (user's example: Google 94 / Microsoft 61 / Spotify 78)
const MATCH_SCORES: Record<string, number> = {
  Google: 94,
  Microsoft: 61,
  Spotify: 78,
  Figma: 88,
};

async function main() {
  console.log("🌱 Seeding demo data…");

  // Idempotent: wipe the demo user (cascades to all owned rows) and recreate.
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      hashedPassword,
      plan: Plan.FREE,
      aiCreditsUsed: 3,
      subscription: {
        create: { plan: Plan.FREE, status: SubscriptionStatus.ACTIVE },
      },
    },
  });

  // Resumes -------------------------------------------------------
  const backendResume = await db.resume.create({
    data: {
      userId: user.id,
      label: "Backend v3",
      fileKey: "seed/backend-v3.pdf",
      mimeType: "application/pdf",
      sizeBytes: 184_320,
      isDefault: true,
      parsedText:
        "Senior software engineer with 6 years building scalable backend services in Node.js, TypeScript, PostgreSQL, and Redis. Led migration to event-driven architecture; designed REST and GraphQL APIs; mentored 4 engineers.",
    },
  });
  await db.resume.create({
    data: {
      userId: user.id,
      label: "Frontend v2",
      fileKey: "seed/frontend-v2.pdf",
      mimeType: "application/pdf",
      sizeBytes: 176_100,
      parsedText:
        "Frontend engineer specializing in React, Next.js, TypeScript, and design systems. Shipped accessible, performant UIs; comfortable with Tailwind, testing, and CI/CD.",
    },
  });

  // Job descriptions ---------------------------------------------
  const jd = await db.jobDescription.create({
    data: {
      userId: user.id,
      title: "Senior Frontend Engineer",
      company: "Google",
      rawText:
        "We are looking for a Senior Frontend Engineer with deep expertise in React, TypeScript, and modern web performance. You will build accessible, high-quality UIs, collaborate with design, and mentor other engineers. Requirements: 5+ years frontend, React, TypeScript, testing, web performance, accessibility.",
    },
  });

  // Applications --------------------------------------------------
  const boardOrder: Partial<Record<ApplicationStatus, number>> = {};
  const created: { id: string; company: string; seed: Seed }[] = [];

  for (const seed of APPLICATIONS) {
    const order = (boardOrder[seed.status] ?? 0) + 1;
    boardOrder[seed.status] = order;

    const app = await db.application.create({
      data: {
        userId: user.id,
        company: seed.company,
        title: seed.title,
        location: seed.location,
        salaryMin: seed.salaryMin,
        salaryMax: seed.salaryMax,
        currency: "USD",
        jobUrl: seed.jobUrl,
        status: seed.status,
        priority: seed.priority,
        source: seed.source,
        boardOrder: order,
        appliedAt:
          seed.appliedDaysAgo === null ? null : daysAgo(seed.appliedDaysAgo),
        resumeId:
          seed.status === ApplicationStatus.WISHLIST ? null : backendResume.id,
        createdAt: daysAgo(seed.appliedDaysAgo ?? 2),
      },
    });
    created.push({ id: app.id, company: seed.company, seed });

    // Activity: created + (if applied) status moved from wishlist
    await db.activityEvent.create({
      data: {
        userId: user.id,
        type: ActivityType.APPLICATION_CREATED,
        entityType: "Application",
        entityId: app.id,
        metadata: { company: seed.company, title: seed.title },
        createdAt: daysAgo((seed.appliedDaysAgo ?? 2) + 1),
      },
    });
    if (seed.appliedDaysAgo !== null) {
      await db.activityEvent.create({
        data: {
          userId: user.id,
          type: ActivityType.STATUS_CHANGED,
          entityType: "Application",
          entityId: app.id,
          metadata: { from: "WISHLIST", to: seed.status },
          createdAt: daysAgo(seed.appliedDaysAgo),
        },
      });
    }
  }

  const byCompany = (name: string) => created.find((c) => c.company === name)!;

  // Interviews ----------------------------------------------------
  const google = byCompany("Google");
  await db.interview.createMany({
    data: [
      {
        userId: user.id,
        applicationId: google.id,
        type: InterviewType.PHONE_SCREEN,
        status: InterviewStatus.COMPLETED,
        scheduledAt: daysAgo(14),
        durationMin: 30,
        location: "Remote",
        outcome: "Went well — moving to technical round.",
      },
      {
        userId: user.id,
        applicationId: google.id,
        type: InterviewType.TECHNICAL,
        status: InterviewStatus.SCHEDULED,
        scheduledAt: daysFromNow(3),
        durationMin: 60,
        meetingUrl: "https://meet.google.com/demo",
        reminderAt: daysFromNow(3),
      },
    ],
  });
  await db.interview.create({
    data: {
      userId: user.id,
      applicationId: byCompany("Figma").id,
      type: InterviewType.FINAL,
      status: InterviewStatus.SCHEDULED,
      scheduledAt: daysFromNow(6),
      durationMin: 90,
      location: "San Francisco, CA",
      reminderAt: daysFromNow(5),
    },
  });
  await db.activityEvent.create({
    data: {
      userId: user.id,
      type: ActivityType.INTERVIEW_SCHEDULED,
      entityType: "Application",
      entityId: google.id,
      metadata: { company: "Google", type: "TECHNICAL" },
      createdAt: daysAgo(2),
    },
  });

  // Notes ---------------------------------------------------------
  await db.note.createMany({
    data: [
      {
        userId: user.id,
        applicationId: google.id,
        type: NoteType.INTERVIEW,
        body: "Recruiter: Sarah. Focus areas: React internals, performance, accessibility. Prep system design of a data table.",
        pinned: true,
      },
      {
        userId: user.id,
        applicationId: byCompany("Microsoft").id,
        type: NoteType.FOLLOW_UP,
        body: "Send thank-you note to hiring manager after technical round.",
        pinned: false,
      },
      {
        userId: user.id,
        applicationId: byCompany("Airbnb").id,
        type: NoteType.GENERAL,
        body: "Offer received! Comp: $220k base + equity. Deadline to respond: end of week.",
        pinned: true,
      },
    ],
  });

  // Contacts ------------------------------------------------------
  await db.contact.create({
    data: {
      userId: user.id,
      applicationId: google.id,
      name: "Sarah Chen",
      role: "Technical Recruiter",
      email: "sarah.chen@example.com",
      linkedinUrl: "https://linkedin.com/in/example",
    },
  });

  // AI artifacts (match scores + a JD analysis) -------------------
  for (const [company, score] of Object.entries(MATCH_SCORES)) {
    const app = created.find((c) => c.company === company);
    if (!app) continue;
    await db.aiArtifact.create({
      data: {
        userId: user.id,
        applicationId: app.id,
        resumeId: backendResume.id,
        kind: AiArtifactKind.MATCH_SCORE,
        status: AiArtifactStatus.COMPLETE,
        input: { resumeId: backendResume.id, company },
        result: {
          score,
          rationale: `Resume aligns with ${score}% of the role's core requirements.`,
        },
        inputHash: `seed-match-${app.id}`,
        model: "gpt-4o-mini",
        tokensIn: 900,
        tokensOut: 120,
        costCents: 2,
        createdAt: daysAgo(5),
      },
    });
  }

  await db.aiArtifact.create({
    data: {
      userId: user.id,
      applicationId: google.id,
      jobDescriptionId: jd.id,
      kind: AiArtifactKind.JD_ANALYSIS,
      status: AiArtifactStatus.COMPLETE,
      input: { jobDescriptionId: jd.id },
      result: {
        skills: [
          "React",
          "TypeScript",
          "Web performance",
          "Accessibility",
          "Testing",
        ],
        technologies: ["React", "TypeScript", "Next.js"],
        requirements: [
          "5+ years frontend",
          "Strong React & TypeScript",
          "A11y experience",
        ],
        responsibilities: [
          "Build UIs",
          "Collaborate with design",
          "Mentor engineers",
        ],
        seniority: "Senior",
        summary:
          "Senior frontend role centered on React/TypeScript, performance, and accessibility.",
      },
      inputHash: `seed-jd-${jd.id}`,
      model: "gpt-4o-mini",
      tokensIn: 1200,
      tokensOut: 300,
      costCents: 3,
      createdAt: daysAgo(5),
    },
  });

  await db.activityEvent.create({
    data: {
      userId: user.id,
      type: ActivityType.AI_GENERATED,
      entityType: "AiArtifact",
      entityId: google.id,
      metadata: { kind: "JD_ANALYSIS", company: "Google" },
      createdAt: daysAgo(5),
    },
  });

  // Cover letter --------------------------------------------------
  await db.coverLetter.create({
    data: {
      userId: user.id,
      title: "Google — Senior Frontend Engineer",
      tone: CoverLetterTone.PROFESSIONAL,
      aiGenerated: true,
      content:
        "Dear Hiring Team,\n\nI'm excited to apply for the Senior Frontend Engineer role. With six years building performant, accessible React applications in TypeScript, I would bring both technical depth and a track record of mentoring…",
    },
  });

  console.log(`✅ Seeded user ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  console.log(
    `   ${APPLICATIONS.length} applications, interviews, notes, resumes, AI artifacts.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
