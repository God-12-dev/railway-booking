"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PaymentChoice({ bookingId, fare }: { bookingId: string; fare: { base: number; fee: number; total: number } }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [failed, setFailed] = useState(false);
  async function simulate(outcome: "SUCCESS" | "FAILURE") {
    setBusy(true); setError(""); setFailed(false);
    try {
      const response = await fetch("/api/booking/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, outcome }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Payment simulation failed.");
      if (result.success) router.push(`/booking/confirmation?bookingId=${bookingId}`);
      else setFailed(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Payment simulation failed."); }
    finally { setBusy(false); }
  }
  return <Card className="h-fit p-6"><div className="flex items-center gap-2"><CreditCard size={18} className="text-orange-600" /><h2 className="font-semibold">Simulated payment</h2></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Fare</span><span>₹{fare.base.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span className="text-slate-500">Demo service fee</span><span>₹{fare.fee.toLocaleString("en-IN")}</span></div><div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold dark:border-slate-800"><span>Total</span><span>₹{fare.total.toLocaleString("en-IN")}</span></div></div>{error && <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200"><AlertCircle size={15} />{error}</p>}{failed && <div role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"><p className="flex items-center gap-2 font-semibold"><AlertCircle size={16} />Simulated payment failed</p><p className="mt-1 text-xs leading-5">The booking was not confirmed and its seat holds have been released.</p><Button className="mt-3" variant="secondary" onClick={() => router.push("/dashboard")}>View booking history<ArrowRight size={15} /></Button></div>}<div className="mt-6 space-y-2"><Button className="w-full" disabled={busy || failed} onClick={() => void simulate("SUCCESS")}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Simulate successful payment</Button><Button className="w-full" variant="secondary" disabled={busy || failed} onClick={() => void simulate("FAILURE")}>Simulate payment failure</Button></div><p className="mt-4 text-center text-[11px] leading-5 text-slate-400">No real payment provider is connected. No card details are requested.</p></Card>;
}
