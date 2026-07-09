import Link from "next/link";
import { AppFrame } from "@/components/pillcheck/AppFrame";
import { SafetyNotice } from "@/components/pillcheck/SafetyNotice";
import { APP_NAME } from "@/lib/pillcheck/constants";

export default function Home() {
  return (
    <AppFrame>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:py-12">
        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Pill identification assistant
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              {APP_NAME}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Capture or upload one pill photo, confirm visible traits, and get
              ranked possible matches from structured reference data.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary text-center" href="/scan">
                Start scan
              </Link>
              <Link className="btn-secondary text-center" href="/history">
                View history
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-md bg-slate-950 p-4 text-white">
              <div className="grid gap-3">
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-xs uppercase text-emerald-200">Step 1</p>
                  <p className="mt-1 font-semibold">Photo captures traits only</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-xs uppercase text-emerald-200">Step 2</p>
                  <p className="mt-1 font-semibold">You confirm imprint, shape, color</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-xs uppercase text-emerald-200">Step 3</p>
                  <p className="mt-1 font-semibold">Results stay possible matches</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SafetyNotice />

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Camera first", "Uses the mobile browser camera with upload fallback."],
            ["AI constrained", "Vision output is structured traits, not medication decisions."],
            ["RLS friendly", "Anonymous searches and feedback can write through Supabase policies."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </section>
      </main>
    </AppFrame>
  );
}
