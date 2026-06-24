import { NextResponse } from "next/server";
import { sentEmails, clearEmailHistory } from "@/lib/email";

// Guard to ensure endpoint is only accessible during development or local unit/integration tests
function isAllowed() {
  return process.env.NODE_ENV === "development" || process.env.MOCK_DB === "true";
}

export async function GET() {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ emails: sentEmails });
}

export async function DELETE() {
  if (!isAllowed()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  clearEmailHistory();
  return NextResponse.json({ success: true });
}
