import Link from "next/link";
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.jpeg" alt="WAY House Church" className="h-40 w-40 rounded-3xl shadow-2xl shadow-way-yellow/10" />
      <h1 className="mt-8 text-3xl font-extrabold tracking-wide">WAY HOUSE CHURCH</h1>
      <p className="mt-2 text-sm tracking-[0.25em] text-way-yellow">WAY | EQUIPE DE FOTOGRAFIA</p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Link href="/disponibilidade" className="btn-primary text-lg">INFORMAR DISPONIBILIDADE</Link>
        <Link href="/escala" className="btn-ghost">Ver escala do mês</Link>
      </div>
      <Link href="/admin" className="mt-16 text-xs text-white/30 hover:text-white/60">Acesso administrativo</Link>
    </main>
  );
}
