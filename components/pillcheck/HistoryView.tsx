"use client";

import { useEffect, useState } from "react";

type HistoryItem = {
  created_at: string;
  imprint: string | null;
  shape: string | null;
  color: string | null;
  result_count: number;
};

export function HistoryView() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(JSON.parse(localStorage.getItem("pillcheck.history") ?? "[]"));
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Recent anonymous searches</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This device keeps a short local history. Do not store personal medical notes here.
      </p>

      <div className="mt-5 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No searches on this device yet.
          </div>
        ) : null}
        {items.map((item) => (
          <article key={`${item.created_at}-${item.imprint}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              {new Date(item.created_at).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Imprint {item.imprint ?? "unknown"} · {item.shape ?? "shape unknown"} · {item.color ?? "color unknown"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {item.result_count} possible match{item.result_count === 1 ? "" : "es"}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
