/**
 * Layout para vistas imprimibles (informe → PDF vía Electron printToPDF).
 * Sin sidebar/topbar (es un route group hermano de (app)). Fondo claro fijo
 * para que el PDF se vea bien independientemente del tema de la app.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-zinc-900">{children}</div>;
}
