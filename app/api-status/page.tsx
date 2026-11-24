"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw, Server, Timer } from "lucide-react";
import { apiFetch, getApiBaseUrl } from "@/src/services/api";

type HealthResult = { status: string; database: string };

export default function ApiStatusPage() {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [checkedAt, setCheckedAt] = useState("");
  const baseUrl = getApiBaseUrl();

  const verify = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    const start = performance.now();
    try {
      const data = await apiFetch<HealthResult>("/health");
      setLatency(Math.round(performance.now() - start));
      setResult(data);
      setCheckedAt(new Date().toLocaleString("es-CL"));
    } catch (caught) {
      setLatency(Math.round(performance.now() - start));
      setError(caught instanceof Error ? caught.message : "No fue posible conectar con FastAPI");
      setCheckedAt(new Date().toLocaleString("es-CL"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void verify(); }, 0);
    return () => window.clearTimeout(task);
  }, [verify]);
  const connected = Boolean(result?.status === "ok");

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">DIAGNÓSTICO</p><h1>Verificación de API</h1></div><button className="primary-button" onClick={() => void verify()} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} />Verificar conexión</button></div>
      {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>Conexión fallida</strong><span>{error}</span></div></div>}
      <section className="status-grid">
        <article className="panel status-card"><div className={`status-icon ${connected ? "good" : "bad"}`}><Server size={22} /></div><div><span>FastAPI</span><strong>{loading ? "Verificando…" : connected ? "Conectada" : "Desconectada"}</strong></div></article>
        <article className="panel status-card"><div className={`status-icon ${result?.database === "connected" ? "good" : "bad"}`}><Database size={22} /></div><div><span>PostgreSQL / Neon</span><strong>{loading ? "Verificando…" : result?.database === "connected" ? "Conectada" : "No confirmada"}</strong></div></article>
        <article className="panel status-card"><div className="status-icon cyan"><Timer size={22} /></div><div><span>Tiempo de respuesta</span><strong>{latency == null ? "—" : `${latency} ms`}</strong></div></article>
      </section>
      <section className="panel detail-panel">
        <div className="panel-heading"><div><span>RESULTADO</span><h2>Última verificación</h2></div></div>
        <dl className="detail-grid">
          <div><dt>URL configurada</dt><dd>{baseUrl}</dd></div>
          <div><dt>Fecha y hora</dt><dd>{checkedAt || "Pendiente"}</dd></div>
          <div><dt>Estado HTTP</dt><dd>{loading ? "Consultando /health" : connected ? "200 OK" : "Sin respuesta válida"}</dd></div>
          <div><dt>Último error</dt><dd>{error || "Ninguno"}</dd></div>
        </dl>
      </section>
    </div>
  );
}
