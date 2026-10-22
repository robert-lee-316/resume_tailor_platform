"use client";

import ResumeStudio from "@/components/ResumeStudio";
import { ResumeBuilderProvider } from "@/context/ResumeBuilderContext";

export default function HomePage() {
  return <ResumeBuilderProvider><ResumeStudio /></ResumeBuilderProvider>;
}
