"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import ScheduleView from "@/components/ScheduleView";
import { downloadPdf, whatsappText, whatsappUrl } from "@/lib/export";
import { generateSchedule, servicesOfMonth, SLOTS, SLOT_INFO, type Slot, type NeededBySlot } from "@/lib/scheduler.ts";
import { MONTHS_PT, monthLabel, supabase, type Availability, type Month, type Row } from "@/lib/supabase";

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <Header />;
  if (!session) return <Login />;
  return <Panel />;
}

function Login() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false); if (error) setErr("E-mail ou senha inválidos.");
  }
  return (
    <>
      <Header />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-2xl font-extrabold">Área administrativa</h1>
        <form onSubmit={go} className="mt-6 space-y-4">
          <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Entrando..." : "ENTRAR"}</button>
          {err && <p className="text-red-300">{err}</p>}
        </form>
      </main>
    </>
  );
}

type Tab = "resumo" | "meses" | "equipe" | "escala";

function Panel() {
  const [tab, setTab] = useState<Tab>("resumo");
  const [months, setMonths] = useState<Month[]>([]);
  const [monthId, setMonthId] = useState("");
  const [avail, setAvail] = useState<Availability[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const loadMonths = useCallback(async () => {
    const { data } = await supabase.from("months").select("*").order("year", { ascending: false }).order("month", { ascending: false });
    const list = (data ?? []) as Month[];
    setMonths(list);
    setMonthId((cur) => (cur && list.some((m) => m.id === cur) ? cur : list[0]?.id ?? ""));
  }, []);
  const loadMonth = useCallback(async () => {
    if (!monthId) { setAvail([]); setRows([]); return; }
    const [a, s] = await Promise.all([
      supabase.from("availabilities").select("*").eq("month_id", monthId).order("name"),
      supabase.from("schedule").select("*").eq("month_id", monthId).order("service_date").order("slot"),
    ]);
    setAvail((a.data ?? []) as Availability[]); setRows((s.data ?? []) as Row[]);
  }, [monthId]);
  useEffect(() => { loadMonths(); }, [loadMonths]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  const month = months.find((m) => m.id === monthId);
  const tabs: [Tab, string][] = [["resumo", "Resumo"], ["meses", "Meses"], ["equipe", "Equipe"], ["escala", "Escala"]];

  return (
    <>
      <Header right={<button className="text-sm text-white/60" onClick={() => supabase.auth.signOut()}>Sair</button>} />
      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <select className="input max-w-xs" value={monthId} onChange={(e) => setMonthId(e.target.value)}>
            {months.length === 0 && <option value="">Nenhum mês criado</option>}
            {months.map((m) => <option key={m.id} value={m.id}>{monthLabel(m)} · {m.status === "open" ? "aberto" : "encerrado"}</option>)}
          </select>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-full px-5 py-2 font-semibold ${tab === k ? "bg-way-yellow text-way-black" : "border border-way-line"}`}>{l}</button>
          ))}
        </nav>
        <div className="mt-5">
          {tab === "meses" && <Meses months={months} reload={loadMonths} />}
          {tab !== "meses" && !month && <p className="text-white/60">Crie um mês na aba “Meses”.</p>}
          {month && tab === "resumo" && <Resumo month={month} avail={avail} rows={rows} />}
          {month && tab === "equipe" && <Equipe month={month} avail={avail} reload={loadMonth} />}
          {month && tab === "escala" && <Escala month={month} avail={avail} rows={rows} reload={() => { loadMonth(); loadMonths(); }} />}
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return <div className="card"><div className="text-xs uppercase tracking-wider text-white/50">{label}</div><div className={`mt-1 text-3xl font-extrabold ${warn ? "text-red-300" : "text-way-yellow"}`}>{value}</div></div>;
}

function Resumo({ month, avail, rows }: { month: Month; avail: Availability[]; rows: Row[] }) {
  const services = servicesOfMonth(month.year, month.month);
  const missing = rows.filter((r) => r.names.length < r.needed).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Integrantes (mês)" value={avail.length} />
        <Stat label="Pessoas disponíveis" value={avail.filter((a) => a.slots.length > 0).length} />
        <Stat label="Cultos do mês" value={services.length} />
        <Stat label="Cultos sem equipe completa" value={rows.length ? missing : "—"} warn={missing > 0} />
        <Stat label="Recebimento" value={month.status === "open" ? "Aberto" : "Encerrado"} />
      </div>
      <div className="card">
        <div className="mb-3 font-semibold">Disponíveis por culto</div>
        {SLOTS.map((s) => {
          const n = avail.filter((a) => a.slots.includes(s)).length;
          const max = Math.max(1, avail.length);
          return (
            <div key={s} className="mb-3">
              <div className="flex justify-between text-sm"><span>{SLOT_INFO[s].label}</span><span>{n}</span></div>
              <div className="mt-1 h-3 rounded-full bg-way-black"><div className="h-3 rounded-full" style={{ width: `${(n / max) * 100}%`, background: SLOT_INFO[s].color }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Meses({ months, reload }: { months: Month[]; reload: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear()); const [mon, setMon] = useState(now.getMonth() + 1); const [err, setErr] = useState("");
  async function create() {
    setErr("");
    const { error } = await supabase.from("months").insert({ year, month: mon });
    if (error) setErr(error.code === "23505" ? "Este mês já existe." : error.message); else reload();
  }
  async function toggle(m: Month) {
    await supabase.from("months").update({ status: m.status === "open" ? "closed" : "open" }).eq("id", m.id); reload();
  }
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 font-semibold">Criar novo mês</div>
        <div className="flex flex-wrap gap-3">
          <select className="input max-w-[200px]" value={mon} onChange={(e) => setMon(+e.target.value)}>{MONTHS_PT.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
          <input className="input max-w-[120px]" type="number" value={year} onChange={(e) => setYear(+e.target.value)} />
          <button className="btn-primary" onClick={create}>Criar (já aberto)</button>
        </div>
        {err && <p className="mt-2 text-red-300">{err}</p>}
      </div>
      {months.map((m) => (
        <div key={m.id} className="card flex items-center justify-between">
          <div><div className="font-semibold">{monthLabel(m)}</div><div className={m.status === "open" ? "text-green-300" : "text-white/50"}>{m.status === "open" ? "Recebendo disponibilidades" : "Encerrado"}</div></div>
          <button className="btn-ghost" onClick={() => toggle(m)}>{m.status === "open" ? "Encerrar" : "Reabrir"}</button>
        </div>
      ))}
    </div>
  );
}

const keyOf = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();

function SlotChecks({ value, onChange }: { value: Slot[]; onChange: (v: Slot[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SLOTS.map((s) => {
        const on = value.includes(s);
        return <button key={s} type="button" onClick={() => onChange(on ? value.filter((x) => x !== s) : [...value, s])}
          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-way-yellow bg-way-yellow text-way-black" : "border-way-line"}`}>{on ? "✓ " : ""}{SLOT_INFO[s].label}</button>;
      })}
    </div>
  );
}

function Equipe({ month, avail, reload }: { month: Month; avail: Availability[]; reload: () => void }) {
  const [q, setQ] = useState(""); const [newName, setNewName] = useState(""); const [newSlots, setNewSlots] = useState<Slot[]>([]);
  const [hist, setHist] = useState<{ name: string; items: { m: string; slots: string[] }[] } | null>(null);
  const list = avail.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));

  async function add() {
    if (newName.trim().length < 2) return alert("Informe o nome.");
    if (!newSlots.length) return alert("Selecione ao menos uma disponibilidade.");
    const { error } = await supabase.from("availabilities").upsert({ month_id: month.id, name: newName.trim(), name_key: keyOf(newName), slots: newSlots }, { onConflict: "month_id,name_key" });
    if (error) return alert(error.message);
    setNewName(""); setNewSlots([]); reload();
  }
  async function setSlots(a: Availability, slots: Slot[]) {
    await supabase.from("availabilities").update({ slots, updated_at: new Date().toISOString() }).eq("id", a.id); reload();
  }
  async function rename(a: Availability) {
    const n = prompt("Novo nome:", a.name); if (!n || n.trim().length < 2) return;
    const { error } = await supabase.from("availabilities").update({ name: n.trim(), name_key: keyOf(n) }).eq("id", a.id);
    if (error) alert(error.code === "23505" ? "Já existe alguém com esse nome neste mês." : error.message); else reload();
  }
  async function remove(a: Availability) {
    if (!confirm(`Remover ${a.name} deste mês?`)) return;
    await supabase.from("availabilities").delete().eq("id", a.id); reload();
  }
  async function history(a: Availability) {
    const { data } = await supabase.from("availabilities").select("slots, months(year, month)").eq("name_key", a.name_key);
    const items = ((data ?? []) as unknown as { slots: string[]; months: { year: number; month: number } }[])
      .sort((x, y) => y.months.year * 12 + y.months.month - (x.months.year * 12 + x.months.month))
      .map((d) => ({ m: monthLabel(d.months), slots: d.slots }));
    setHist({ name: a.name, items });
  }

  return (
    <div className="space-y-4">
      <input className="input" placeholder="Pesquisar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card space-y-3">
        <div className="font-semibold">Adicionar integrante ({monthLabel(month)})</div>
        <input className="input" placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <SlotChecks value={newSlots} onChange={setNewSlots} />
        <button className="btn-primary" onClick={add}>Adicionar</button>
      </div>
      {list.length === 0 && <p className="text-white/60">Nenhum integrante neste mês.</p>}
      {list.map((a) => (
        <div key={a.id} className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg font-semibold">{a.name}</div>
            <div className="flex gap-2 text-sm"><button className="text-way-yellow" onClick={() => rename(a)}>Editar nome</button><button className="text-white/60" onClick={() => history(a)}>Histórico</button><button className="text-red-300" onClick={() => remove(a)}>Remover</button></div>
          </div>
          <SlotChecks value={a.slots as Slot[]} onChange={(v) => setSlots(a, v)} />
        </div>
      ))}
      {hist && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-4 md:items-center" onClick={() => setHist(null)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-lg font-bold">Histórico · {hist.name}</div>
            {hist.items.map((i) => <div key={i.m} className="mb-2"><div className="font-semibold text-way-yellow">{i.m}</div><div className="text-sm text-white/70">{i.slots.map((s) => SLOT_INFO[s as Slot].label).join(" · ") || "—"}</div></div>)}
            <button className="btn-ghost mt-2 w-full" onClick={() => setHist(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Escala({ month, avail, rows, reload }: { month: Month; avail: Availability[]; rows: Row[]; reload: () => void }) {
  const defaults: NeededBySlot = { qui_noite: 2, dom_manha: 2, dom_noite: 2 };
  const [per, setPer] = useState<NeededBySlot>({ ...defaults, ...(month.per_service_by_slot ?? {}) });
  const [exception, setException] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setPer({ ...defaults, ...(month.per_service_by_slot ?? {}) });
    setSaved(false);
  }, [month.id, month.per_service_by_slot]);

  function changeNeeded(slot: Slot, delta: number) {
    setPer((current) => ({ ...current, [slot]: Math.min(10, Math.max(1, current[slot] + delta)) }));
    setSaved(false);
  }

  async function salvarQuantidades() {
    setBusy(true);
    const { error } = await supabase.from("months").update({ per_service_by_slot: per }).eq("id", month.id);
    setBusy(false);
    if (error) return alert(`Não foi possível salvar as quantidades: ${error.message}`);
    setSaved(true);
    reload();
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}; avail.forEach((a) => (c[a.name] = 0));
    rows.forEach((r) => r.names.forEach((n) => (c[n] = (c[n] ?? 0) + 1))); return c;
  }, [avail, rows]);
  const link = typeof window !== "undefined" ? `${window.location.origin}/escala?m=${month.id}` : "";

  async function gerar() {
    if (rows.length && !confirm("Já existe uma escala para este mês. Regerar vai substituir tudo, inclusive ajustes manuais. Continuar?")) return;
    if (!avail.length) return alert("Ainda não há disponibilidades neste mês.");
    setBusy(true);
    const { assignments } = generateSchedule(servicesOfMonth(month.year, month.month), avail.map((a) => ({ name: a.name, slots: a.slots as Slot[] })), per);
    const settings = await supabase.from("months").update({ per_service_by_slot: per }).eq("id", month.id);
    if (settings.error) { setBusy(false); return alert(`Erro ao salvar configurações: ${settings.error.message}`); }
    const del = await supabase.from("schedule").delete().eq("month_id", month.id);
    const ins = await supabase.from("schedule").insert(assignments.map((a) => ({ month_id: month.id, service_date: a.date, slot: a.slot, names: a.names, needed: a.needed })));
    setBusy(false);
    if (del.error || ins.error) alert((del.error ?? ins.error)!.message);
    reload();
  }
  async function save(r: Row, names: string[]) {
    const { error } = await supabase.from("schedule").update({ names }).eq("id", r.id);
    if (error) alert(error.message); reload();
  }
  function add(r: Row, name: string) {
    if (!name) return;
    const a = avail.find((x) => x.name === name);
    const ok = a?.slots.includes(r.slot);
    if (!ok && !exception) return alert(`${name} não marcou disponibilidade para ${SLOT_INFO[r.slot].label}. Ative “permitir exceções” para forçar.`);
    save(r, [...r.names, name]);
  }
  function replace(r: Row, from: string, to: string) {
    if (!to) return;
    const a = avail.find((x) => x.name === to);
    if (!a?.slots.includes(r.slot) && !exception) return alert(`${to} não está disponível neste culto.`);
    save(r, r.names.map((n) => (n === from ? to : n)));
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">Fotógrafos por culto</h2>
          <p className="mt-1 text-sm text-white/60">Use os botões para definir quantas pessoas serão escaladas em cada tipo de culto.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SLOTS.map((slot) => (
            <div key={slot} className="rounded-xl border border-way-line bg-way-black/40 p-3">
              <div className="min-h-10 text-sm font-semibold" style={{ color: SLOT_INFO[slot].color }}>{SLOT_INFO[slot].label}</div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" aria-label={`Diminuir fotógrafos de ${SLOT_INFO[slot].label}`} onClick={() => changeNeeded(slot, -1)} disabled={per[slot] <= 1 || busy} className="h-11 w-11 rounded-xl border border-way-line text-2xl font-bold hover:border-way-yellow disabled:opacity-30">−</button>
                <div className="text-center"><div className="text-3xl font-extrabold text-way-yellow tabular-nums">{per[slot]}</div><div className="text-xs text-white/50">fotógrafo(s)</div></div>
                <button type="button" aria-label={`Aumentar fotógrafos de ${SLOT_INFO[slot].label}`} onClick={() => changeNeeded(slot, 1)} disabled={per[slot] >= 10 || busy} className="h-11 w-11 rounded-xl border border-way-line text-2xl font-bold hover:border-way-yellow disabled:opacity-30">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn-ghost flex-1" onClick={salvarQuantidades} disabled={busy || saved}>{busy ? "SALVANDO..." : saved ? "CONFIGURAÇÕES SALVAS ✓" : "SALVAR QUANTIDADES"}</button>
          <button className="btn-primary flex-1" onClick={gerar} disabled={busy}>{busy ? "PROCESSANDO..." : rows.length ? "REGERAR ESCALA" : "GERAR ESCALA AUTOMATICAMENTE"}</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={exception} onChange={(e) => setException(e.target.checked)} /> Permitir exceções (escalar quem não marcou o culto) nas edições manuais</label>
      </div>
      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => downloadPdf(month, rows)}>Baixar PDF</button>
            <a className="btn-ghost" href={whatsappUrl(whatsappText(month, rows, link))} target="_blank" rel="noreferrer">Compartilhar no WhatsApp</a>
            <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(link); alert("Link copiado: " + link); }}>Copiar link de consulta</button>
          </div>
          <div className="card">
            <div className="mb-2 font-semibold">Participações por pessoa</div>
            <div className="flex flex-wrap gap-2">{Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n, c]) => <span key={n} className="rounded-full bg-way-black px-3 py-1 text-sm">{n}: <b className="text-way-yellow">{c}</b></span>)}</div>
          </div>
          <ScheduleView year={month.year} month={month.month} rows={rows} actions={(r) => (
            <div className="mt-3 space-y-2 border-t border-way-line pt-3 text-sm">
              {r.names.map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="flex-1">{n}</span>
                  <select className="input !w-auto !py-1.5 text-sm" value="" onChange={(e) => replace(r, n, e.target.value)}>
                    <option value="">Substituir…</option>
                    {avail.filter((a) => !r.names.includes(a.name)).map((a) => <option key={a.id} value={a.name}>{a.name}{a.slots.includes(r.slot) ? "" : " (indisp.)"}</option>)}
                  </select>
                  <button className="text-red-300" onClick={() => save(r, r.names.filter((x) => x !== n))}>Remover</button>
                </div>
              ))}
              <select className="input !py-1.5 text-sm" value="" onChange={(e) => add(r, e.target.value)}>
                <option value="">+ Adicionar fotógrafo…</option>
                {avail.filter((a) => !r.names.includes(a.name)).map((a) => <option key={a.id} value={a.name}>{a.name}{a.slots.includes(r.slot) ? "" : " (indisp.)"}</option>)}
              </select>
            </div>
          )} />
        </>
      )}
    </div>
  );
}
