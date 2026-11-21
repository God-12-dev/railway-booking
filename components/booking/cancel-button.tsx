"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function cancel() {
    if (!window.confirm("Cancel this demo booking? A simulated refund will be calculated and the seats released.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/booking/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Cancellation failed.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Cancellation failed."); }
    finally { setBusy(false); }
  }
  return <div><Button size="sm" variant="ghost" disabled={busy} onClick={() => void cancel()}><Ban size={14} />{busy ? "Cancelling…" : "Cancel"}</Button>{error && <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-700"><AlertCircle size={12} />{error}</p>}</div>;
}
