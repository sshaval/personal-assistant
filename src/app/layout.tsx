import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { RailGate } from "./components/RailGate";
import { loadTasks } from "@/lib/data";
import { torontoTodayISO } from "@/lib/util";
import { getSessionUser, type SessionUser } from "@/lib/auth";

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
  // When auth is configured, only signed-in visitors get the app shell + data.
  // If it's NOT configured, show the app (ungated) only in development — never in
  // production, so a missing key on a host can't serialize data into the page.
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const user = authConfigured ? await getSessionUser() : null;
  const showShell = authConfigured
    ? Boolean(user)
    : process.env.NODE_ENV !== "production";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {showShell ? (
          <AppShell user={user}>{children}</AppShell>
        ) : (
          // Signed-out: a bare page (the /login screen). No sidebar, and crucially
          // no app data is loaded into the payload.
          <div className="min-h-[100dvh]">{children}</div>
        )}
      </body>
    </html>
  );
}

async function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const { tasks, error } = await loadTasks();
  const todayIso = torontoTodayISO();
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar isAdmin={user?.role === "admin"} user={user} />
      <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
        <main className="min-w-0 flex-1">{children}</main>
        <RailGate tasks={tasks} error={error} todayIso={todayIso} />
      </div>
    </div>
  );
}
