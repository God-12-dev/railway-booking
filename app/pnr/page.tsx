import { SearchPnr } from "@/components/booking/search-pnr";
import { Card } from "@/components/ui/card";

export default function PnrPage() {
  return <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-14 sm:px-6 lg:px-8"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Simulated reservation lookup</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Check demo PNR status</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Enter the 10-digit sample PNR and a passenger name from the booking to view its simulated status.</p></div><Card className="mx-auto mt-8 max-w-xl rounded-3xl p-6 sm:p-8"><SearchPnr /></Card><p className="mx-auto mt-5 max-w-xl text-center text-xs leading-5 text-slate-400">PNR statuses and seat details are sample data. This lookup does not connect to railway reservation systems.</p></main>;
}
