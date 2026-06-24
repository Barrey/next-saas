import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is currently unavailable. Please configure the GEMINI_API_KEY in your environment." },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    let { destination, duration, budget, category } = body;

    // Fallback for Vercel AI SDK useCompletion payloads
    if (body.prompt) {
      try {
        const parsed = JSON.parse(body.prompt);
        destination = parsed.destination;
        duration = parsed.duration;
        budget = parsed.budget;
        category = parsed.category;
      } catch {
        destination = body.prompt;
      }
    }
    if (!destination || !duration || !budget || !category) {
      return NextResponse.json({ error: "Missing required preferences." }, { status: 400 });
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 14) {
      return NextResponse.json({ error: "Duration must be between 1 and 14 days." }, { status: 400 });
    }

    // Build the Gemini prompt
    const prompt = `Create a detailed day-by-day travel itinerary for a ${durationNum}-day trip to ${destination}.
Budget Level: ${budget}
Interest Category: ${category}

Format the response using clean markdown. Use appropriate headers, bullet points, and highlight key locations. Ensure that the text color and readability are excellent.`;

    // Stream text via Vercel AI SDK
    const response = await streamText({
      model: google("gemini-2.5-flash"),
      prompt,
    });

    return response.toTextStreamResponse();
  } catch (err: any) {
    console.error("AI Planner error:", err);
    return NextResponse.json(
      { error: "An error occurred while generating your itinerary. Please try again." },
      { status: 500 }
    );
  }
}
