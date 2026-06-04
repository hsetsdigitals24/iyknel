"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { FormState } from "@/lib/validation";

export function FormStateToast({ state }: { state: FormState }) {
  const last = useRef<FormState>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);
  return null;
}
