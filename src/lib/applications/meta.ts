import { ApplicationPriority, ApplicationStatus } from "@prisma/client";

export type StatusTone =
  "wishlist" | "applied" | "interview" | "offer" | "rejected";

export type BoardColumn =
  "WISHLIST" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";

/** The 9 detailed statuses, each mapped to a label, a color tone, and one of
 *  the 5 Kanban columns (Screening/Technical/Final collapse into "Interview"). */
export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: StatusTone; column: BoardColumn }
> = {
  WISHLIST: { label: "Wishlist", tone: "wishlist", column: "WISHLIST" },
  APPLIED: { label: "Applied", tone: "applied", column: "APPLIED" },
  SCREENING: { label: "Screening", tone: "interview", column: "INTERVIEW" },
  INTERVIEW: { label: "Interview", tone: "interview", column: "INTERVIEW" },
  TECHNICAL_INTERVIEW: {
    label: "Technical",
    tone: "interview",
    column: "INTERVIEW",
  },
  FINAL_INTERVIEW: { label: "Final", tone: "interview", column: "INTERVIEW" },
  OFFER: { label: "Offer", tone: "offer", column: "OFFER" },
  ACCEPTED: { label: "Accepted", tone: "offer", column: "OFFER" },
  REJECTED: { label: "Rejected", tone: "rejected", column: "REJECTED" },
};

export const STATUS_ORDER: ApplicationStatus[] = [
  ApplicationStatus.WISHLIST,
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.TECHNICAL_INTERVIEW,
  ApplicationStatus.FINAL_INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
];

export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  wishlist: "bg-status-wishlist/10 text-status-wishlist",
  applied: "bg-status-applied/10 text-status-applied",
  interview: "bg-status-interview/10 text-status-interview",
  offer: "bg-status-offer/10 text-status-offer",
  rejected: "bg-status-rejected/10 text-status-rejected",
};

export const BOARD_COLUMNS: { id: BoardColumn; label: string }[] = [
  { id: "WISHLIST", label: "Wishlist" },
  { id: "APPLIED", label: "Applied" },
  { id: "INTERVIEW", label: "Interview" },
  { id: "OFFER", label: "Offer" },
  { id: "REJECTED", label: "Rejected" },
];

/** Default status assigned when a card is dropped into a board column. */
export const COLUMN_DEFAULT_STATUS: Record<BoardColumn, ApplicationStatus> = {
  WISHLIST: ApplicationStatus.WISHLIST,
  APPLIED: ApplicationStatus.APPLIED,
  INTERVIEW: ApplicationStatus.INTERVIEW,
  OFFER: ApplicationStatus.OFFER,
  REJECTED: ApplicationStatus.REJECTED,
};

export const PRIORITY_META: Record<
  ApplicationPriority,
  { label: string; className: string }
> = {
  LOW: { label: "Low", className: "text-muted-foreground" },
  MEDIUM: { label: "Medium", className: "text-foreground" },
  HIGH: { label: "High", className: "text-status-interview font-medium" },
};
