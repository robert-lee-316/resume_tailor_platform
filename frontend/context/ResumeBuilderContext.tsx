"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useResumeBuilderController } from "@/hooks/useResumeBuilderController";
import type { ResumeBuilderController } from "@/hooks/useResumeBuilderController";

const ResumeBuilderContext = createContext<ResumeBuilderController | null>(null);

export function ResumeBuilderProvider({ children }: { children: ReactNode }) {
  const controller = useResumeBuilderController();
  return <ResumeBuilderContext.Provider value={controller}>{children}</ResumeBuilderContext.Provider>;
}

export function useResumeBuilder(): ResumeBuilderController {
  const context = useContext(ResumeBuilderContext);
  if (!context) throw new Error("Resume builder components must be rendered inside ResumeBuilderProvider");
  return context;
}
