"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Search } from "lucide-react";
import { apiFetch } from "@/src/services/api";
import SupervisorPanel from "@/src/components/dashboard/SupervisorPanel";

type Execution = {
  id: number;
  clave_ejecucion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  estaciones_procesadas: number | null;
  alertas_detectadas: number | null;
  semaforo_global: string | null;
  duracion_segundos: number | null;
  mensaje: string | null;
};
type ExecutionsResponse = { total: number; datos: Execution[] };

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
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
      const response = await apiFetch<ExecutionsResponse>(`/api/ejecuciones?${params}`);
      setExecutions(response.datos);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible consultar las ejecuciones");
    } finally {
      setLoading(false);
    }
  }, [date, query, status]);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 350);
    return () => window.clearTimeout(task);
  }, [load]);

  const successful = executions.filter((item) => item.estado?.toLowerCase().includes("complet")).length;
  const failed = executions.filter((item) => item.estado?.toLowerCase().includes("fall")).length;
  const days = new Set(executions.map((item) => item.fecha_inicio.slice(0, 10))).size;
  const durations = executions.map((item) => item.duracion_segundos).filter((value): value is number => value != null);
  const average = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">HISTORIAL RPA</p><h1>Ejecuciones</h1></div></div>
      <SupervisorPanel />
      <section className="stats-grid compact">
        {[["Total", executions.length], ["Exitosas", successful], ["Fallidas", failed], ["Días con ejecución", days]].map(([label, value]) => <article className="stat-card" key={String(label)}><div className="stat-icon violet"><Activity size={20} /></div><div><span>{label}</span><strong>{loading ? "—" : value}</strong></div></article>)}
      </section>
      {average != null && <div className="info-banner"><Activity size={18} /><span>Duración promedio: {average} segundos</span></div>}
      <section className="filter-bar">
        <label><span>Buscar ID</span><div className="input-with-icon"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID de ejecución" /></div></label>
        <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos</option><option value="completada">Exitosa</option><option value="fallida">Fallida</option><option value="abandonada">Abandonada</option></select></label>
        <label><span>Fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </section>
      {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>Error al consultar ejecuciones</strong><span>{error}</span></div></div>}
      <article className="panel">
        {loading ? <div className="empty-state">Consultando registros reales…</div> : executions.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Fecha</th><th>Estado</th><th>Estaciones</th><th>Alertas</th><th>Semáforo</th><th>Duración</th><th>Mensaje</th></tr></thead><tbody>
            {executions.map((item) => <tr key={item.id}>
              <td>{item.clave_ejecucion ?? `#${item.id}`}</td>
              <td>{new Date(item.fecha_inicio).toLocaleString("es-CL")}</td>
              <td><span className={`table-status ${item.estado?.toLowerCase()}`}>{item.estado}</span></td>
              <td>{item.estaciones_procesadas ?? "—"}</td>
              <td>{item.alertas_detectadas ?? "—"}</td>
              <td>{item.semaforo_global ?? "—"}</td>
              <td>{item.duracion_segundos == null ? "En curso" : `${item.duracion_segundos}s`}</td>
              <td>{item.mensaje ?? "—"}</td>
            </tr>)}
          </tbody></table></div>
        ) : <div className="empty-state">No existen ejecuciones para los filtros seleccionados.</div>}
      </article>
    </div>
  );
}
