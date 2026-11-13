import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSchedule, servicesOfMonth, type Person, type Slot } from "./scheduler.ts";

const ALL: Slot[] = ["qui_noite", "dom_manha", "dom_noite"];
const nov = servicesOfMonth(2026, 11);

test("novembro/2026 tem 4 quintas + 5 domingos x2 = 14 cultos", () => {
  assert.equal(nov.length, 14);
  assert.equal(nov[0].date, "2026-11-01");
});

test("só escala quem marcou o culto", () => {
  const people: Person[] = [
    { name: "Ana", slots: ["dom_manha"] },
    { name: "João", slots: ["qui_noite", "dom_noite"] },
    { name: "Maria", slots: ALL },
  ];
  const { assignments } = generateSchedule(nov, people, 2);
  for (const a of assignments)
    for (const nm of a.names) assert.ok(people.find((p) => p.name === nm)!.slots.includes(a.slot), `${nm} em ${a.date} ${a.slot}`);
});

test("voluntários insuficientes: não inventa nomes e informa a falta", () => {
  const people: Person[] = [{ name: "Ana", slots: ["dom_noite"] }, { name: "Pedro", slots: ["dom_noite"] }];
  const { assignments } = generateSchedule(nov, people, 3);
  const noite = assignments.find((a) => a.slot === "dom_noite")!;
  assert.equal(noite.names.length, 2);
  assert.equal(noite.missing, 1);
  const manha = assignments.find((a) => a.slot === "dom_manha")!;
  assert.deepEqual(manha.names, []);
  assert.equal(manha.missing, 3);
});

test("distribuição equilibrada quando todos estão disponíveis", () => {
  const people: Person[] = ["Ana", "Bia", "Caio", "Davi", "Eva"].map((name) => ({ name, slots: ALL }));
  const { counts } = generateSchedule(nov, people, 2);
  const v = Object.values(counts);
  assert.ok(Math.max(...v) - Math.min(...v) <= 1, JSON.stringify(counts));
});

test("evita cultos consecutivos quando há voluntários suficientes", () => {
  const people: Person[] = ["Ana", "Bia", "Caio", "Davi", "Eva"].map((name) => ({ name, slots: ALL }));
  const { assignments } = generateSchedule(nov, people, 2);
  for (let i = 1; i < assignments.length; i++)
    for (const nm of assignments[i].names) assert.ok(!assignments[i - 1].names.includes(nm), `${nm} repetido em ${i}`);
});

test("ninguém é escalado duas vezes no mesmo culto", () => {
  const people: Person[] = [{ name: "Ana", slots: ALL }, { name: "Bia", slots: ALL }];
  const { assignments } = generateSchedule(nov, people, 3);
  for (const a of assignments) assert.equal(new Set(a.names).size, a.names.length);
});

test("disponibilidades diferentes: prioriza quem tem menos participações", () => {
  const people: Person[] = [
    { name: "Ana", slots: ALL },
    { name: "Bia", slots: ["dom_manha"] },
    { name: "Caio", slots: ["dom_manha", "dom_noite"] },
  ];
  const { counts } = generateSchedule(nov, people, 1);
  assert.ok(counts["Ana"] <= 8, JSON.stringify(counts));
  assert.ok(counts["Bia"] >= 1);
});

test("sem ninguém disponível retorna escala vazia sem erro", () => {
  const { assignments } = generateSchedule(nov, [], 2);
  assert.ok(assignments.every((a) => a.names.length === 0 && a.missing === 2));
});
