"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ScheduleView from "@/components/ScheduleView";
import { monthLabel, supabase, type Month, type Row } from "@/lib/supabase";

export default function Escala() {
  const [months, setMonths] = useState<Month[]>([]);
  const [id, setId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.from("months").select("*").order("year", { ascending: false }).order("month", { ascending: false }).then(({ data }) => {
      const list = (data ?? []) as Month[];
      setMonths(list);
      const q = new URLSearchParams(window.location.search).get("m");
      setId(q && list.some((m) => m.id === q) ? q : list[0]?.id ?? "");
    });
  }, []);
  useEffect(() => {
    if (!id) return;
    supabase.from("schedule").select("*").eq("month_id", id).order("service_date").order("slot").then(({ data }) => setRows((data ?? []) as Row[]));
  }, [id]);

  const m = months.find((x) => x.id === id);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-center text-2xl font-extrabold">ESCALA DA EQUIPE DE FOTOGRAFIA</h1>
        <p className="text-center tracking-widest text-way-yellow">WAY HOUSE CHURCH</p>
        {months.length > 1 && (
          <select className="input mx-auto mt-4 max-w-xs" value={id} onChange={(e) => setId(e.target.value)}>
            {months.map((x) => <option key={x.id} value={x.id}>{monthLabel(x)}</option>)}
          </select>
        )}
        {m && <p className="my-4 text-center text-lg">{monthLabel(m)}</p>}
        {m && <ScheduleView year={m.year} month={m.month} rows={rows} />}
      </main>
    </>
  );
}
