import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AdminCatalog, type CatalogData } from "@/components/admin/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");
  let initialData: CatalogData = { stations: [], trains: [], routes: [] };
  let initialError: string | undefined;
  try {
    const [stations, trains, routes] = await Promise.all([
      prisma.station.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] }),
      prisma.train.findMany({ orderBy: { number: "asc" } }),
      prisma.trainRoute.findMany({ include: { train: true, origin: true, destination: true }, orderBy: { train: { number: "asc" } } }),
    ]);
    initialData = { stations, trains, routes };
  } catch { initialError = "The database is unavailable. Start PostgreSQL, then refresh this catalog."; }
  return <AdminCatalog initialData={initialData} initialError={initialError} />;
}
