"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Activity, AlertTriangle, CloudSun, RadioTower, RefreshCw, Server, Thermometer } from "lucide-react";
import { apiFetch, normalizeText } from "@/src/services/api";
import type { ClimateRecord, EarthquakeRecord } from "@/src/types/meteorology";

type ClimateResponse = { total: number; datos: ClimateRecord[] };
type EarthquakeResponse = { total: number; datos: EarthquakeRecord[] };
type ExecutionResponse = {
  total: number;
  datos: Array<{
    id: number;
    clave_ejecucion: string | null;
    fecha_inicio: string;
    estado: string;
    estaciones_procesadas: number | null;
    alertas_detectadas: number | null;
    semaforo_global: string | null;
  }>;
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#64748b"];

export default function HomePage() {
  const [climate, setClimate] = useState<ClimateRecord[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeRecord[]>([]);
  const [health, setHealth] = useState<{ status: string; database: string } | null>(null);
  const [executions, setExecutions] = useState<ExecutionResponse["datos"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [climateResult, earthquakeResult, healthResult, executionResult] = await Promise.all([
        apiFetch<ClimateResponse>("/api/clima?limite=100"),
        apiFetch<EarthquakeResponse>("/api/sismos?limite=100"),
        apiFetch<{ status: string; database: string }>("/health"),
        apiFetch<ExecutionResponse>("/api/ejecuciones?limite=10"),
      ]);
      setClimate(climateResult.datos.map((item) => ({ ...item, ciudad: normalizeText(item.ciudad) })));
      setEarthquakes(earthquakeResult.datos);
      setHealth(healthResult);
      setExecutions(executionResult.datos);
      setCheckedAt(new Date().toLocaleString("es-CL"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al consultar FastAPI");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const temperatureData = climate
    .filter((item) => item.temperatura != null)
    .slice()
    .reverse()
    .map((item) => ({ name: normalizeText(item.ciudad), temperatura: item.temperatura }));

  const counts = new Map<string, number>();
  earthquakes.forEach((item) => {
    const level = item.semaforo ? normalizeText(item.semaforo).toUpperCase() : "SIN CLASIFICAR";
    counts.set(level, (counts.get(level) ?? 0) + 1);
  });
  const alertData = Array.from(counts, ([name, value]) => ({ name, value }));

  const latestClimate = climate[0];
  const latestDate = executions[0]?.fecha_inicio ?? climate[0]?.fecha_creacion ?? earthquakes[0]?.fecha_creacion;

  const statCards = [
    { label: "Estaciones monitoreadas", value: String(new Set(climate.map((item) => item.ciudad)).size), icon: RadioTower, tone: "cyan" },
    { label: "Sismos registrados", value: String(earthquakes.length), icon: Activity, tone: "violet" },
    { label: "Alertas detectadas", value: String(executions.reduce((sum, item) => sum + (item.alertas_detectadas ?? 0), 0)), icon: AlertTriangle, tone: "amber" },
    { label: "Última ejecución", value: latestDate ? new Date(latestDate).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "Sin dato", icon: CloudSun, tone: "green" },
  ];

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONITOREO EN TIEMPO REAL</p>
          <h1>Resumen general</h1>
        </div>
        <button className="primary-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Actualizar
        </button>
      </div>

      {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>FastAPI no disponible</strong><span>{error}</span></div></div>}

      <section className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.tone}`}><Icon size={20} /></div>
              <div><span>{stat.label}</span><strong>{loading ? "—" : stat.value}</strong></div>
            </article>
          );
        })}
      </section>

      <section className="status-strip">
        <div><Server size={17} /><span>Estado general</span><strong className={health ? "text-good" : "text-bad"}>{health ? "Operativo" : "Sin verificar"}</strong></div>
        <div><Activity size={17} /><span>Última conexión API</span><strong>{checkedAt || "Pendiente"}</strong></div>
        <div><Thermometer size={17} /><span>Último clima</span><strong>{latestClimate ? `${normalizeText(latestClimate.ciudad)} · ${latestClimate.temperatura ?? "—"} °C` : "Sin datos"}</strong></div>
      </section>

      <section className="grid-2">
        <article className="panel">
          <div className="panel-heading"><div><span>CLIMA</span><h2>Evolución de temperaturas</h2></div></div>
          {temperatureData.length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={temperatureData}>
                  <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.34}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid stroke="#26364c" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#91a4bd", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#91a4bd", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#101a29", border: "1px solid #26364c", borderRadius: 10 }} />
                  <Area type="monotone" dataKey="temperatura" name="Temperatura °C" stroke="#38bdf8" fill="url(#tempFill)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="empty-state">No hay registros climáticos disponibles.</div>}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><span>SISMOS</span><h2>Distribución por semáforo</h2></div></div>
          {alertData.length ? (
            <div className="chart-wrap pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={alertData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {alertData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#101a29", border: "1px solid #26364c", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">{alertData.map((item, index) => <span key={item.name}><i style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />{item.name} · {item.value}</span>)}</div>
            </div>
          ) : <div className="empty-state">No hay sismos con semáforo registrado.</div>}
        </article>
      </section>

      <section className="grid-2">
        <article className="panel">
          <div className="panel-heading"><div><span>ÚLTIMOS DATOS</span><h2>Ejecuciones disponibles</h2></div></div>
          {executions.length ? (
            <div className="data-list">
              {executions.slice(0, 5).map((item) => (
                <div className="data-row" key={item.id}>
                  <span className={`severity-dot ${item.estado?.toLowerCase().includes("complet") ? "verde" : item.estado?.toLowerCase().includes("fall") ? "rojo" : "neutral"}`} />
                  <div><strong>{item.clave_ejecucion ?? `Ejecución #${item.id}`}</strong><small>{item.estado} · {new Date(item.fecha_inicio).toLocaleString("es-CL")} · {item.estaciones_procesadas ?? 0} estaciones</small></div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state">No existen ejecuciones registradas.</div>}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span>SISMOS</span><h2>Últimos registros sísmicos</h2></div></div>
          {earthquakes.length ? (
            <div className="data-list">
              {earthquakes.slice(0, 5).map((item) => (
                <div className="data-row" key={item.id}>
                  <span className={`severity-dot ${item.semaforo?.toLowerCase() ?? "neutral"}`} />
                  <div><strong>{normalizeText(item.lugar)}</strong><small>Magnitud {item.magnitud} · {new Date(item.hora).toLocaleString("es-CL")}</small></div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state">No hay sismos registrados.</div>}
        </article>
      </section>
    </div>
  );
}
