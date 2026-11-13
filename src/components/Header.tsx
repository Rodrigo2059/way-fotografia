import Link from "next/link";
export default function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-way-line bg-way-black/95 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpeg" alt="WAY House Church" className="h-10 w-10 rounded-lg" />
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide">WAY HOUSE CHURCH</div>
          <div className="text-[11px] tracking-widest text-way-yellow">WAY | EQUIPE DE FOTOGRAFIA</div>
        </div>
      </Link>
      {right}
    </header>
  );
}
