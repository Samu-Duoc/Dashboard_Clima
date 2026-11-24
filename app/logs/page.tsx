"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download, RefreshCw, Search } from "lucide-react";
import { apiFetch } from "@/src/services/api";

type ExecutionLog = {
  id: number;
  clave_ejecucion: string | null;
  fecha_inicio: string;
  estado: string;
  mensaje: string | null;
  duracion_segundos: number | null;
  origen: string | null;
};
type LogsResponse = { total: number; datos: ExecutionLog[] };

export default function LogsPage() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limite: "100" });
    if (date) {
      params.set("fecha_desde", `${date}T00:00:00Z`);
      params.set("fecha_hasta", `${date}T23:59:59Z`);
    }
    if (query.trim()) params.set("busqueda", query.trim());
    if (status !== "todos") params.set("estado", status);
    try {
      const response = await apiFetch<LogsResponse>(`/api/logs?${params}`);
      setLogs(response.datos);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible consultar los logs");
    } finally {
      setLoading(false);
    }
  }, [date, query, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 350);
    return () => window.clearTimeout(task);
  }, [load]);

  function downloadCsv() {
    if (!logs.length) return;
    const header = ["Fecha", "ID ejecucion", "Estado", "Duracion segundos", "Mensaje"];
    const rows = logs.map((log) => [
      log.fecha_inicio,
      log.clave_ejecucion ?? log.id,
      log.estado,
      log.duracion_segundos ?? "",
      log.mensaje ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "MeteoStream_logs.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div><p className="eyebrow">AUDITORÍA RPA</p><h1>Logs de ejecución</h1></div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} />Actualizar</button>
          <button className="secondary-button" onClick={downloadCsv} disabled={!logs.length}><Download size={16} />Descargar</button>
        </div>
      </div>
      <section className="filter-bar">
        <label><span>Buscar ID</span><div className="input-with-icon"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej: ejecucion-2026" /></div></label>
        <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos</option><option value="completada">OK</option><option value="fallida">Error</option><option value="abandonada">Abandonada</option></select></label>
        <label><span>Fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </section>
      {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>Error al consultar logs</strong><span>{error}</span></div></div>}
      <article className="panel">
        {loading ? <div className="empty-state">Consultando registros reales…</div> : logs.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha y hora</th><th>ID ejecución</th><th>Origen</th><th>Estado</th><th>Duración</th><th>Mensaje</th></tr></thead><tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.fecha_inicio).toLocaleString("es-CL")}</td>
                <td>{log.clave_ejecucion ?? `#${log.id}`}</td>
                <td>{log.origen ?? "—"}</td>
                <td><span className={`table-status ${log.estado?.toLowerCase()}`}>{log.estado}</span></td>
                <td>{log.duracion_segundos == null ? "En curso" : `${log.duracion_segundos}s`}</td>
                <td>{log.mensaje ?? "Sin mensaje"}</td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <div className="empty-state">No existen registros de ejecución para los filtros seleccionados.</div>}
      </article>
    </div>
  );
}
