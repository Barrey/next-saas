# Design Specification: NextSaas WanderRoute AI Travel Planner (Phase 6)

* **Date**: 2026-06-19
* **Topic**: AI Travel Planner (WanderRoute) - Individual Ephemeral Planning via Vercel AI SDK & Gemini
* **Status**: Proposed / Awaiting Execution

---

## 1. Goal & Context

The goal is to build an interactive AI-driven travel planner called **WanderRoute** that showcases the integration of AI capabilities (specifically the Vercel AI SDK and Google Gemini API) on top of the `NextSaas` boilerplate foundation. 

For the MVP, this feature is kept simple and focused:
- **Individual-only:** Each user generates and views their own travel plans; no team sharing or cross-org visibility.
- **Ephemeral:** Itineraries are generated dynamically and displayed on the screen, but are not saved to the database.
- **Boilerplate Integration:** The feature relies on existing boilerplate systems such as authentication, page layouts, themes (Light/Dark/Cyberpunk), and route-protection middleware.

---

## 2. Layout & Visual Design

### 2.1 Navigation & Placement
- A navigation link will be added to the `/dashboard` page pointing to `/dashboard/planner`.
- The planner page will be laid out inside a clean, centered single-column layout, similar to the main dashboard.
- The interface will be fully responsive and support the light, dark, and cyberpunk theme modes.

### 2.2 Travel Planner Interface
The page at `/dashboard/planner` will consist of two main sections:
1. **The Planner Form (Card Component):**
   - **Destination:** A text input for the destination.
   - **Duration:** A numeric input for the number of days (range 1-14 days).
   - **Budget Level:** A select dropdown (Economy, Standard, Luxury).
   - **Interest Category:** A select dropdown (Adventure, Relaxation, Foodie, Culture, Shopping).
   - **Submit Button:** A button labeled "Generate Itinerary".

2. **The Output Display (Card Component, conditionally rendered):**
   - Shows the generated itinerary in real-time.
   - Uses Vercel AI SDK streaming to create a smooth "typing" effect.
   - Formatted in clean, readable markdown (using Tailwind's typography `prose` classes, matching the current theme).

---

## 3. Pages & Components

### 3.1 File Structure

```text
src/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── planner/
│   │           └── route.ts      # API endpoint for streaming AI responses
│   └── dashboard/
│       └── planner/
│           └── page.tsx          # Travel Planner UI (Client Component)
```

### 3.2 `/dashboard/planner` Page (Client Component)
- **Component**: Client (`"use client"`)
- **State Management**:
  - `destination` (string)
  - `duration` (number)
  - `budget` (string)
  - `category` (string)
  - Vercel AI SDK's `useCompletion` hook (to handle stream consumption, loading states, and error handling)
- **Form Submission**:
  - Sends a POST request to `/api/ai/planner` containing the form data.
  - Triggers the streaming response, rendering the incoming text.

### 3.3 `/api/ai/planner` Route (Route Handler)
- **Component**: Server-side Route Handler
- **Authentication**: Checks the request cookies for the `session_token`. If the user is unauthenticated, returns a `401 Unauthorized` response.
- **AI Integration**:
  - Uses the Vercel AI SDK (`ai` package) with the Google Gemini provider (`@ai-sdk/google`).
  - Calls `streamText` using the `gemini-2.5-flash` model.
  - Passes a structured prompt combining the user's form inputs (Destination, Duration, Budget, Category) requesting a day-by-day markdown-formatted itinerary.

---

## 4. AI Service & Error Handling

### 4.1 Environment Variables
To enable the AI planner, the developer/operator must add their Google Gemini API key to `.env.local`:
```env
GEMINI_API_KEY=your_api_key_here
```

### 4.2 Error Handling
- **Missing API Key:** If the `GEMINI_API_KEY` is missing in the environment, the API route returns a friendly error message: "AI service is currently unavailable. Please configure the GEMINI_API_KEY in your environment."
- **Network / API Failures:** Standard error catch-blocks return a `500 Internal Server Error` with a generic message: "An error occurred while generating your itinerary. Please try again."

---

## 5. Routing & Middleware

- The new route `/dashboard/planner` falls under the `/dashboard/*` path.
- Consequently, the existing Next.js middleware in `src/middleware.ts` automatically protects it, redirecting unauthenticated users to `/login?redirected_from=1`.

---

## 6. Verification Plan

### 6.1 Automated Tests
Add a new Playwright integration test at `tests/integration/ai-planner.spec.ts` verifying:
- Unauthenticated access to `/dashboard/planner` redirects to `/login`.
- Submitting the form with a mock environment (e.g. mocking the stream response) renders the generated itinerary on-screen.
- Clicking the "Generate Itinerary" button disables the button and displays a loading state during generation.

### 6.2 Manual Verification
- Run `npm run build` and ensure the project compiles cleanly.
- Configure a local `GEMINI_API_KEY` in `.env.local`.
- Open `http://localhost:3000/dashboard/planner`, fill out the form, and verify that the itinerary is streamed onto the screen in real-time.
- Switch themes (Light, Dark, Cyberpunk) to ensure the generated text is readable in all color modes.
