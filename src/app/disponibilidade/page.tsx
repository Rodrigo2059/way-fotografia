"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { SLOTS, SLOT_INFO, type Slot } from "@/lib/scheduler.ts";
import { configured, monthLabel, supabase, type Month } from "@/lib/supabase";

const ERR: Record<string, string> = {
  periodo_encerrado: "O período de preenchimento deste mês está encerrado.",
  nome_invalido: "Informe seu nome completo.",
  sem_disponibilidade: "Selecione pelo menos uma disponibilidade.",
};

export default function Disponibilidade() {
  const [months, setMonths] = useState<Month[]>([]);
  const [monthId, setMonthId] = useState("");
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Slot[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("months").select("*").order("year").order("month").then(({ data }) => {
      const list = (data ?? []) as Month[];
      setMonths(list); setLoaded(true);
      const open = list.find((m) => m.status === "open") ?? list[list.length - 1];
      if (open) setMonthId(open.id);
    });
  }, []);

  const month = months.find((m) => m.id === monthId);
  const closed = month?.status === "closed";

  async function prefill() {
    if (!monthId || name.trim().length < 2) return;
    const { data } = await supabase.rpc("get_my_availability", { p_month: monthId, p_name: name });
    if (Array.isArray(data)) { setSel(data as Slot[]); setMsg({ ok: true, text: "Encontramos sua resposta deste mês. Você pode atualizá-la." }); }
  }

  async function submit() {
    setMsg(null);
    if (name.trim().length < 2) return setMsg({ ok: false, text: ERR.nome_invalido });
    if (!sel.length) return setMsg({ ok: false, text: ERR.sem_disponibilidade });
    setBusy(true);
    const { error } = await supabase.rpc("submit_availability", { p_month: monthId, p_name: name, p_slots: sel });
    setBusy(false);
    if (error) {
      const key = Object.keys(ERR).find((k) => error.message.includes(k));
      return setMsg({ ok: false, text: key ? ERR[key] : "Não foi possível enviar. Tente novamente." });
    }
    setMsg({ ok: true, text: "Disponibilidade enviada com sucesso! Obrigado por fazer parte da equipe de fotografia da WAY." });
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-extrabold">Sua disponibilidade</h1>
        <p className="mt-1 text-white/60">Marque os cultos em que você pode servir.</p>
        {!configured && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-300">Supabase não configurado (veja o README).</p>}
        {loaded && months.length === 0 && <p className="mt-6 card">Nenhum período foi criado ainda. Fale com o administrador.</p>}
        {months.length > 0 && (
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-1 block text-sm text-white/70">Mês de referência</span>
              <select className="input" value={monthId} onChange={(e) => { setMonthId(e.target.value); setMsg(null); }}>
                {months.map((m) => <option key={m.id} value={m.id}>{monthLabel(m)}{m.status === "closed" ? " (encerrado)" : ""}</option>)}
              </select>
            </label>
            {closed && <div className="rounded-xl bg-red-500/15 p-3 text-red-300">O período de preenchimento deste mês está encerrado.</div>}
            <label className="block">
              <span className="mb-1 block text-sm text-white/70">Nome completo</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={prefill} placeholder="Ex.: Letícia Souza" autoComplete="name" />
            </label>
            <div>
              <span className="mb-2 block text-sm text-white/70">Disponibilidade</span>
              <div className="space-y-3">
                {SLOTS.map((s) => {
                  const on = sel.includes(s);
                  return (
                    <button key={s} type="button" disabled={closed} onClick={() => setSel(on ? sel.filter((x) => x !== s) : [...sel, s])}
                      className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${on ? "border-way-yellow bg-way-yellow/10" : "border-way-line bg-way-gray"}`}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md border-2 text-lg font-bold ${on ? "border-way-yellow bg-way-yellow text-way-black" : "border-white/40"}`}>{on ? "✓" : ""}</span>
                      <span className="text-lg font-semibold">{SLOT_INFO[s].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="btn-primary w-full text-lg" onClick={submit} disabled={busy || closed}>{busy ? "Enviando..." : "ENVIAR DISPONIBILIDADE"}</button>
            {msg && <div className={`rounded-xl p-4 ${msg.ok ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>{msg.text}</div>}
          </div>
        )}
      </main>
    </>
  );
}
