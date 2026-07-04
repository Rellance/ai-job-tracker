import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getArtifact } from "@/lib/services/aiArtifact";

/** GET /api/ai/artifacts/:id — polled by the client while PENDING/RUNNING. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const artifact = await getArtifact(session.user.id, id);
  if (!artifact) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Artifact not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: artifact.id,
    kind: artifact.kind,
    status: artifact.status,
    result: artifact.status === "COMPLETE" ? artifact.result : null,
    errorMessage: artifact.errorMessage,
    model: artifact.model,
    tokensIn: artifact.tokensIn,
    tokensOut: artifact.tokensOut,
    costCents: artifact.costCents,
    applicationId: artifact.applicationId,
    createdAt: artifact.createdAt,
  });
}
