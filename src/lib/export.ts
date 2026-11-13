import { SLOT_INFO } from "./scheduler.ts";
import { fmtDate, monthLabel, type Row } from "./supabase";

export function whatsappText(m: { year: number; month: number }, rows: Row[], link?: string) {
  let t = `*ESCALA DA EQUIPE DE FOTOGRAFIA*\n*WAY HOUSE CHURCH*\n${monthLabel(m)}\n`;
  let last = "";
  for (const r of rows) {
    const i = SLOT_INFO[r.slot];
    if (r.service_date !== last) { t += `\n*${i.day} – ${fmtDate(r.service_date)}*\n`; last = r.service_date; }
    t += `${r.slot === "dom_manha" ? "☀️ Manhã" : "🌙 Noite"}: ${r.names.length ? r.names.join(", ") : "—"}\n`;
  }
  if (link) t += `\nVer online: ${link}`;
  return t;
}
export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

async function logoDataUrl(): Promise<string> {
  const blob = await (await fetch("/logo.jpeg")).blob();
  return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
}

export async function downloadPdf(m: { year: number; month: number }, rows: Row[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await logoDataUrl();
  const bg = () => { doc.setFillColor(23, 23, 23); doc.rect(0, 0, 210, 297, "F"); };
  bg();
  doc.addImage(logo, "JPEG", 85, 12, 40, 38);
  doc.setTextColor(255, 185, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("ESCALA DA EQUIPE DE FOTOGRAFIA", 105, 62, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "normal");
  doc.text("WAY HOUSE CHURCH", 105, 69, { align: "center" });
  doc.setFontSize(14); doc.text(monthLabel(m), 105, 78, { align: "center" });
  let y = 92;
  const dates = Array.from(new Set(rows.map((r) => r.service_date)));
  for (const d of dates) {
    const day = rows.filter((r) => r.service_date === d);
    const h = 12 + day.length * 9;
    if (y + h > 285) { doc.addPage(); bg(); y = 20; }
    doc.setFillColor(41, 41, 41); doc.roundedRect(15, y, 180, h - 3, 2, 2, "F");
    doc.setFillColor(255, 185, 0); doc.rect(15, y, 2.5, h - 3, "F");
    doc.setTextColor(255, 185, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`${SLOT_INFO[day[0].slot].day} – ${fmtDate(d)}`, 22, y + 7);
    let yy = y + 14;
    for (const r of day) {
      doc.setTextColor(180, 180, 180); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(r.slot === "dom_manha" ? "Manhã" : "Noite", 22, yy);
      doc.setTextColor(255, 255, 255);
      doc.text(r.names.length ? r.names.join("  •  ") : "—", 50, yy);
      yy += 9;
    }
    y += h;
  }
  doc.save(`escala-fotografia-${m.year}-${String(m.month).padStart(2, "0")}.pdf`);
}
