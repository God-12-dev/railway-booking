import { RadioTower } from "lucide-react";
import { TrackingSearch } from "@/components/tracking/tracking-search";

export default function TrackPage() {
  return <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><div className="mb-7 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-950 text-orange-300"><RadioTower size={23} /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.17em] text-orange-600">Seeded movement demo</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Track a sample train</h1><p className="mt-3 text-sm leading-6 text-slate-500">Watch route progress calculated from the sample timetable. The map does not show live GPS.</p></div><TrackingSearch /></div></main>;
}
