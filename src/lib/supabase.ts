import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const configured = Boolean(url && key);
export const supabase = createClient(url || "http://localhost", key || "missing");

export interface Month { id: string; year: number; month: number; status: "open" | "closed"; per_service: number }
export interface Availability { id: string; month_id: string; name: string; name_key: string; slots: string[] }
export interface Row { id: string; month_id: string; service_date: string; slot: import("./scheduler.ts").Slot; names: string[]; needed: number }

export const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const monthLabel = (m: { year: number; month: number }) => `${MONTHS_PT[m.month - 1]} de ${m.year}`;
export const fmtDate = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
