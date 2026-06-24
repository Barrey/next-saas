"use client";

import * as React from "react";
import Link from "next/link";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Sparkles, MapPin, Calendar, DollarSign, Compass, AlertCircle, RefreshCw } from "lucide-react";

// Budget options
const BUDGET_OPTIONS = [
  { value: "Economy", label: "Economy", desc: "Budget-friendly" },
  { value: "Mid-range", label: "Mid-range", desc: "Balanced comfort" },
  { value: "Luxury", label: "Luxury", desc: "Premium experience" },
];

// Interest categories
const CATEGORY_OPTIONS = [
  { value: "Adventure", label: "Adventure", desc: "Action & outdoors" },
  { value: "Culture", label: "Culture", desc: "History & sightseeing" },
  { value: "Relaxation", label: "Relaxation", desc: "Leisure & beaches" },
  { value: "Food", label: "Food", desc: "Culinary journeys" },
  { value: "Family", label: "Family", desc: "Kid-friendly activities" },
];

export default function AIPlannerPage() {
  const [destination, setDestination] = React.useState("");
  const [duration, setDuration] = React.useState(3);
  const [budget, setBudget] = React.useState("Mid-range");
  const [category, setCategory] = React.useState("Culture");
  const [clientError, setClientError] = React.useState("");

  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/demo/planner",
    streamProtocol: "text",
    onError: (err) => {
      setClientError(err.message || "An unexpected error occurred. Please check your connection.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");

    if (!destination.trim()) {
      setClientError("Please enter a destination.");
      return;
    }

    if (duration < 1 || duration > 14) {
      setClientError("Duration must be between 1 and 14 days.");
      return;
    }

    const payload = JSON.stringify({
      destination: destination.trim(),
      duration,
      budget,
      category,
    });

    complete(payload);
  };

  // Safe markdown-to-JSX line parser to render streamed content nicely
  const renderItineraryLine = (line: string, index: number) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="h-3" />;
    }

    // Bold parser helper
    const parseBoldText = (text: string) => {
      const parts = text.split(/\*\*([^*]+)\*\*/g);
      return parts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return (
            <strong key={partIdx} className="font-semibold text-foreground">
              {part}
            </strong>
          );
        }
        return part;
      });
    };

    // Header 1
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={index} className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mt-8 mb-4 flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary shrink-0" />
          {parseBoldText(trimmed.slice(2))}
        </h1>
      );
    }

    // Header 2 (Days)
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="text-lg md:text-xl font-bold text-primary mt-6 mb-3 pb-2 border-b border-border flex items-center gap-2">
          <Calendar className="h-5 w-5 shrink-0" />
          {parseBoldText(trimmed.slice(3))}
        </h2>
      );
    }

    // Header 3
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index} className="text-md font-semibold text-foreground mt-4 mb-2">
          {parseBoldText(trimmed.slice(4))}
        </h3>
      );
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.startsWith("- ") ? trimmed.slice(2) : trimmed.slice(2);
      return (
        <li key={index} className="ml-5 list-disc text-muted-foreground pl-1 py-1.5 leading-relaxed">
          {parseBoldText(content)}
        </li>
      );
    }

    // Horizontal Rule
    if (trimmed === "---") {
      return <hr key={index} className="my-6 border-t border-border" />;
    }

    // Standard paragraph
    return (
      <p key={index} className="text-muted-foreground leading-relaxed mb-3">
        {parseBoldText(trimmed)}
      </p>
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono bg-accent px-2 py-1 rounded">DEMO MODE</span>
            <ThemeToggle />
          </div>
        </div>

        {/* Title Block */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            WanderRoute <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">AI Travel Planner</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create optimized, personalized day-by-day itineraries tailored to your unique style.
          </p>
        </div>

        {/* Core Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Preferences Form */}
          <Card className="lg:col-span-5 border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Trip Preferences</CardTitle>
              <CardDescription>Specify details to generate your curated trip timeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-sm font-semibold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Where to?
                  </Label>
                  <Input
                    id="destination"
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g., Kyoto, Japan or Rome, Italy"
                    className="w-full"
                    disabled={isLoading}
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Duration (Days)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={14}
                    required
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 3)}
                    className="w-full"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Select a duration between 1 and 14 days.</p>
                </div>

                {/* Budget Level */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Budget Level
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {BUDGET_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBudget(opt.value)}
                        disabled={isLoading}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                          budget === opt.value
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                            : "border-border hover:bg-accent/50 text-muted-foreground"
                        }`}
                      >
                        <span className="text-sm font-medium text-foreground">{opt.label}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category / Interests */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Trip Focus
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        disabled={isLoading}
                        className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                          category === opt.value
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                            : "border-border hover:bg-accent/50 text-muted-foreground"
                        }`}
                      >
                        <span className="text-sm font-medium text-foreground">{opt.label}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  id="generate-itinerary-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-5"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Weaving Itinerary...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Itinerary
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>

          {/* Right Column: Dynamic Itinerary Display */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Error notifications */}
            {(clientError || error) && (
              <div id="planner-error-box" className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Planning Request Failed</h4>
                  <p className="mt-1 opacity-90">{clientError || error?.message}</p>
                </div>
              </div>
            )}

            {/* Main Result Card */}
            <Card className="border border-border min-h-[450px] shadow-md flex flex-col">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Your Travel Plan</CardTitle>
                    <CardDescription>Generated in real-time by AI.</CardDescription>
                  </div>
                  {isLoading && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Streaming...
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-6 relative">
                
                {/* Empty State placeholder */}
                {!completion && !isLoading && (
                  <div id="planner-empty-state" className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <Compass className="h-16 w-16 text-muted-foreground/30 stroke-[1.5]" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No Itinerary Generated Yet</h3>
                    <p className="text-sm text-muted-foreground/75 max-w-sm">
                      Fill out your travel preferences and click &quot;Generate Itinerary&quot; to design your custom travel route.
                    </p>
                  </div>
                )}

                {/* Custom Styled Streamed Content */}
                {(completion || isLoading) && (
                  <div id="planner-output-container" className="space-y-1 prose prose-neutral dark:prose-invert max-w-none">
                    {completion.split("\n").map((line, idx) => renderItineraryLine(line, idx))}
                  </div>
                )}

              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </main>
  );
}
