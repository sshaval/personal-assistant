import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { RailGate } from "./components/RailGate";
import { loadTasks } from "@/lib/data";
import { torontoTodayISO } from "@/lib/util";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claudia",
  description: "Your daily prep and tasks",
};

// Always render against live Supabase data (and a live clock), never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { tasks, error } = await loadTasks();
  const todayIso = torontoTodayISO();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="flex min-h-full flex-col md:flex-row">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
            <main className="min-w-0 flex-1">{children}</main>
            <RailGate tasks={tasks} error={error} todayIso={todayIso} />
          </div>
        </div>
      </body>
    </html>
  );
}
