"use client";

import { useState } from "react";
import DiagnosticFlow from "@/components/app/Pronunciation/DiagnosticFlow";
import DiagnosticResultsSetup from "@/components/app/Pronunciation/DiagnosticResultsSetup";

export default function DiagnosticPage() {
  const [result, setResult] = useState<{
    overallScore: number | null;
    worthWorkingOn: { tag: string; label: string; score: number }[];
  } | null>(null);

  if (result) {
    return (
      <DiagnosticResultsSetup
        overallScore={result.overallScore}
        worthWorkingOn={result.worthWorkingOn}
      />
    );
  }

  return (
    <DiagnosticFlow
      passLabel="day1"
      onFinished={(r) => setResult(r)}
    />
  );
}
