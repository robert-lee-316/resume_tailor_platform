"use client";

import { Activity, X } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";

export default function Toast() {
  const { notification, setNotification } = useResumeBuilder();
  return (
    <>{notification && <div className="toast" role="status"><span className="toast-icon"><Activity size={17} /></span>{notification}<button aria-label="Dismiss notification" onClick={() => setNotification("")}><X size={15} /></button></div>}</>
  );
}
