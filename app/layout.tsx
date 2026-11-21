import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers, type Locale } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "RailConnect | Smart Railway Reservation Demo",
  description: "An academic demonstration of a railway reservation platform. All journeys and transactions are simulated.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preference = (await cookies()).get("railconnect_locale")?.value;
  const locale: Locale = preference === "hi" || preference === "kn" ? preference : "en";
  return <html lang={locale} suppressHydrationWarning><body><Providers initialLocale={locale}><SiteHeader />{children}</Providers></body></html>;
}
