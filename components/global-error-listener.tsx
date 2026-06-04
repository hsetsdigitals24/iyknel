"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function GlobalErrorListener() {
  useEffect(() => {
    const onError = () =>
      toast.error("Something went wrong. Please refresh and try again.");
    const onReject = () =>
      toast.error("Network or background task failed. Please try again.");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  return null;
}
