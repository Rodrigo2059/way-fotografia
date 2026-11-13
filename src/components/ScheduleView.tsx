"use client";
import { useState } from "react";
import { SLOT_INFO } from "@/lib/scheduler.ts";
import { fmtDate, type Row } from "@/lib/supabase";

export default function ScheduleView({ year, month, rows, actions }: { year: number; month: number; rows: Row[]; actions?: (r: Row) => React.ReactNode }) {
  const [mode, setMode] = useState<"list" | "cal">("list");
  const dates = Array.from(new Set(rows.map((r) => r.service_date)));

  const Slot = ({ r }: { r: Row }) => (
    <div className="mt-3 rounded-xl bg-way-black/60 p-3" style={{ borderLeft: `4px solid ${SLOT_INFO[r.slot].color}` }}>
      <div className="text-sm font-semibold" style={{ color: SLOT_INFO[r.slot].color }}>{SLOT_INFO[r.slot].short}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-white/50">Fotógrafos</div>
      <ul className="mt-1 space-y-0.5">
        {r.names.map((n) => <li key={n}>• {n}</li>)}
        {r.names.length === 0 && <li className="text-white/40">Ninguém escalado</li>}
      </ul>
      {r.names.length < r.needed && <div className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">⚠ Faltam {r.needed - r.names.length} fotógrafo(s) (necessário: {r.needed})</div>}
      {actions?.(r)}
    </div>
  );

  const first = new Date(year, month - 1, 1).getDay();
  const total = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["list", "cal"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === m ? "bg-way-yellow text-way-black" : "border border-way-line"}`}>
            {m === "list" ? "Lista" : "Calendário"}
          </button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-white/60">Nenhuma escala gerada para este mês.</p>}
      {mode === "list" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {dates.map((d) => {
            const day = rows.filter((r) => r.service_date === d);
            return (
              <div key={d} className="card">
                <div className="text-lg font-bold"><span className="text-way-yellow">{SLOT_INFO[day[0].slot].day}</span> – {fmtDate(d)}</div>
                {day.map((r) => <Slot key={r.id} r={r} />)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-1 text-xs">
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <div key={d} className="py-1 text-center text-white/50">{d}</div>)}
            {cells.map((day, i) => {
              const iso = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const rs = rows.filter((r) => r.service_date === iso);
              return (
                <div key={i} className={`min-h-[84px] rounded-lg p-1.5 ${day ? "bg-way-gray" : ""}`}>
                  {day && <div className="mb-1 text-white/60">{day}</div>}
                  {rs.map((r) => (
                    <div key={r.id} className="mb-1 rounded px-1 py-0.5 text-[11px] leading-tight text-way-black" style={{ background: SLOT_INFO[r.slot].color }}>
                      {r.slot === "dom_manha" ? "☀" : "🌙"} {r.names.join(", ") || "—"}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
