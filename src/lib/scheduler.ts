export type Slot = "qui_noite" | "dom_manha" | "dom_noite";
export interface Service { date: string; slot: Slot }
export interface Person { name: string; slots: Slot[] }
export type NeededBySlot = Record<Slot, number>;
export interface Assignment extends Service {
  names: string[];
  needed: number;
  available: number;
  missing: number;
}

export const SLOT_INFO: Record<Slot, { day: string; label: string; short: string; color: string }> = {
  qui_noite: { day: "QUINTA-FEIRA", label: "Quinta-feira à noite", short: "Culto da noite", color: "#9CA3AF" },
  dom_manha: { day: "DOMINGO", label: "Domingo pela manhã", short: "Culto da manhã", color: "#FFB900" },
  dom_noite: { day: "DOMINGO", label: "Domingo à noite", short: "Culto da noite", color: "#F97316" },
};
export const SLOTS: Slot[] = ["qui_noite", "dom_manha", "dom_noite"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Todos os cultos do mês (month = 1..12), em ordem cronológica. */
export function servicesOfMonth(year: number, month: number): Service[] {
  const out: Service[] = [];
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const date = `${year}-${pad(month)}-${pad(d)}`;
    if (dow === 4) out.push({ date, slot: "qui_noite" });
    if (dow === 0) {
      out.push({ date, slot: "dom_manha" });
      out.push({ date, slot: "dom_noite" });
    }
  }
  return out;
}

/**
 * Gera a escala do mês. Regras: só escala quem marcou o culto; equilibra o total;
 * evita cultos consecutivos; prioriza quem tem menos participações; nunca inventa nomes.
 */
export function generateSchedule(services: Service[], people: Person[], perService: number | NeededBySlot) {
  const neededFor = (slot: Slot) => typeof perService === "number" ? perService : perService[slot];
  const n = services.length;
  const avail: string[][] = services.map((s) => people.filter((p) => p.slots.includes(s.slot)).map((p) => p.name));
  const options = new Map<string, number>(); // em quantos cultos cada pessoa está disponível
  avail.forEach((l) => l.forEach((nm) => options.set(nm, (options.get(nm) ?? 0) + 1)));

  const assigned: string[][] = services.map(() => []);
  const counts: Record<string, number> = {};
  people.forEach((p) => (counts[p.name] = 0));

  const seats = services.reduce((t, service, i) => t + Math.min(neededFor(service.slot), avail[i].length), 0);
  const cap = Math.max(1, Math.ceil(seats / Math.max(1, people.length)));

  const adjacent = (idx: number, nm: string) =>
    (idx > 0 && assigned[idx - 1].includes(nm)) || (idx < n - 1 && assigned[idx + 1].includes(nm));

  // cultos mais restritos primeiro, para não "gastar" quem tem poucas opções
  const order = services.map((_, i) => i).sort((a, b) => avail[a].length - avail[b].length || a - b);
  for (const idx of order) {
    for (let k = 0; k < neededFor(services[idx].slot); k++) {
      const cands = avail[idx].filter((nm) => !assigned[idx].includes(nm));
      if (!cands.length) break;
      cands.sort((a, b) => {
        const ka = [counts[a] >= cap ? 1 : 0, adjacent(idx, a) ? 1 : 0, counts[a], options.get(a)!];
        const kb = [counts[b] >= cap ? 1 : 0, adjacent(idx, b) ? 1 : 0, counts[b], options.get(b)!];
        for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
        return a.localeCompare(b, "pt-BR");
      });
      assigned[idx].push(cands[0]);
      counts[cands[0]]++;
    }
  }

  // Refinamento: move vagas de quem tem mais para quem tem menos, quando possível.
  for (let iter = 0; iter < 500; iter++) {
    let moved = false;
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    outer: for (const hi of names) {
      for (const lo of [...names].reverse()) {
        if (counts[hi] - counts[lo] < 2) continue;
        for (let idx = 0; idx < n; idx++) {
          if (!assigned[idx].includes(hi) || assigned[idx].includes(lo) || !avail[idx].includes(lo)) continue;
          if (adjacent(idx, lo)) continue;
          assigned[idx] = assigned[idx].map((x) => (x === hi ? lo : x));
          counts[hi]--; counts[lo]++;
          moved = true;
          break outer;
        }
      }
    }
    if (!moved) break;
  }

  const assignments: Assignment[] = services.map((s, i) => ({
    ...s,
    names: assigned[i],
    needed: neededFor(s.slot),
    available: avail[i].length,
    missing: Math.max(0, neededFor(s.slot) - assigned[i].length),
  }));
  return { assignments, counts };
}
