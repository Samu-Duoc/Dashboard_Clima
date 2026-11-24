"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Bot, CalendarClock, Clock3, ShieldCheck } from "lucide-react";
import {
  getSupervisorEvents,
  getSupervisorState,
  type SupervisorEvent,
  type SupervisorState,
} from "@/src/services/api";
import {
  formatCountdown,
  formatDateTime,
  useMiniAgent,
} from "@/src/components/dashboard/MiniAgentContext";

function formatDate(value: string | null) {
  return formatDateTime(value);
}

const futureCapabilities = [
  ["Supervisión de ejecuciones", "En desarrollo"],
  ["Detección de errores", "En desarrollo"],
  ["Aviso de token vencido", "En desarrollo"],
  ["Consulta del estado del robot", "En desarrollo"],
  ["Registro de eventos", "Disponible"],
  ["Preparación de próximas ejecuciones", "No disponible"],
  ["Asistencia para recuperación", "No disponible"],
  ["Ejecutar tareas autorizadas", "No disponible"],
] as const;

export default function MiniAgentPage() {
  const [state, setState] = useState<SupervisorState | null>(null);
  const [events, setEvents] = useState<SupervisorEvent[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const miniAgent = useMiniAgent();

  const load = useCallback(async () => {
    setError("");
    try {
      const [nextState, nextEvents] = await Promise.all([
        getSupervisorState(),
        getSupervisorEvents(50),
      ]);
      setState(nextState);
      setEvents(nextEvents.datos);
      setApiConnected(true);
    } catch (caught) {
      setState(null);
      setEvents([]);
      setApiConnected(false);
      setError(caught instanceof Error ? caught.message : "Sin conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load();
    }, 0);
    const interval = window.setInterval(() => {
      void load();
    }, 5000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  const heartbeat = state?.agente?.ultimo_heartbeat ?? null;
  const pendingAlerts = state?.alertas?.length ?? 0;

  return (
    <div className="page mini-agent-page">
      <div className="page-heading mini-agent-page-heading">
        <div>
          <p className="eyebrow">MODO MONITOR</p>
          <h1>Mini Agente Supervisor</h1>
          <p className="mini-agent-description">
            Centro de supervisión y gestión asistida de las automatizaciones MeteoStream.
          </p>
        </div>
        <span className="development-badge">En desarrollo</span>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>Sin conexión con el servidor</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <section className="mini-agent-page-grid">
        <article className="panel mini-agent-status-card">
          <div className="mini-agent-status-icon"><Bot size={21} /></div>
          <span>Estado del Mini Agente</span>
          <strong>{loading ? "Consultando…" : state?.agente?.estado ?? "Sin datos"}</strong>
        </article>
        <article className="panel mini-agent-status-card">
          <div className={`mini-agent-status-icon ${apiConnected ? "good" : "neutral"}`}><Activity size={21} /></div>
          <span>Conexión con FastAPI</span>
          <strong className={apiConnected ? "text-good" : "text-bad"}>{loading ? "Consultando…" : apiConnected ? "Conectada" : "Sin conexión"}</strong>
        </article>
        <article className="panel mini-agent-status-card">
          <div className="mini-agent-status-icon blue"><Clock3 size={21} /></div>
          <span>Último heartbeat</span>
          <strong>{formatDate(heartbeat)}</strong>
        </article>
        <article className="panel mini-agent-status-card">
          <div className="mini-agent-status-icon amber"><ShieldCheck size={21} /></div>
          <span>Última actividad registrada</span>
          <strong>{formatDate(events[0]?.fecha ?? null)}</strong>
        </article>
        <article className="panel mini-agent-status-card">
          <div className="mini-agent-status-icon red"><AlertTriangle size={21} /></div>
          <span>Alertas pendientes</span>
          <strong>{pendingAlerts}</strong>
        </article>
        <article className="panel mini-agent-status-card">
          <div className="mini-agent-status-icon neutral"><CalendarClock size={21} /></div>
          <span>Próxima ejecución programada</span>
          <strong>No disponible</strong>
        </article>
      </section>

      <section className="grid-2 mini-agent-content-grid">
        <article className="panel">
          <div className="panel-heading"><div><span>PROGRAMACIÓN</span><h2>Próxima ejecución</h2></div></div>
          <div className="mini-agent-empty-detail">
            <CalendarClock size={28} />
            <strong>No hay una próxima ejecución programada.</strong>
            <span>FastAPI no entrega actualmente una programación verificable.</span>
          </div>
        </article>

        <article className="panel" id="vencimiento-token">
          <div className="panel-heading"><div><span>TOKEN</span><h2>Estado de atención</h2></div></div>
          <div className={`mini-agent-empty-detail ${miniAgent.tokenExpired ? "token-expired" : ""}`}>
            <ShieldCheck size={28} />
            {miniAgent.tokenExpiryEpoch == null ? (
              <>
                <strong>Estado del token no disponible</strong>
                <span>No existe una fuente verificable de vencimiento o renovación en la API.</span>
              </>
            ) : miniAgent.tokenExpired ? (
              <>
                <strong>El token se venció.</strong>
                <span>Si desea obtener nuevos resultados, ejecute el robot manualmente desde Rocketbot.</span>
              </>
            ) : (
              <>
                <strong>Vencimiento del token</strong>
                <span className="token-countdown-large">{formatCountdown(miniAgent.remainingSeconds)}</span>
                {miniAgent.tokenExpiryEpoch && (
                  <span>Expira: {formatDateTime(new Date(miniAgent.tokenExpiryEpoch * 1000))}</span>
                )}
              </>
            )}
          </div>
        </article>
      </section>

      <article className="panel mini-agent-alert-panel">
        <div className="panel-heading"><div><span>MONITOR</span><h2>Alertas y notificaciones</h2></div></div>
        {loading ? (
          <div className="empty-state">Consultando alertas reales…</div>
        ) : state?.alertas?.length ? (
          <div className="mini-agent-alert-list">
            {state.alertas.map((alert) => (
              <div key={alert.id}>
                <div className="mini-agent-alert-level">{alert.tipo}</div>
                <div>
                  <strong>{alert.descripcion ?? "Evento registrado sin descripción."}</strong>
                  <span>{formatDate(alert.fecha)} · Trabajo {alert.trabajo_id ?? "sin identificador"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No existen alertas registradas.</div>
        )}
      </article>

      <section>
        <div className="mini-agent-section-heading">
          <div><p className="eyebrow">ROADMAP</p><h2>Funciones futuras del Mini Agente</h2></div>
        </div>
        <div className="future-capabilities-grid">
          {futureCapabilities.map(([name, status]) => (
            <article className="panel future-capability-card" key={name}>
              <strong>{name}</strong>
              <span className={status === "Disponible" ? "status available" : "status development"}>{status}</span>
            </article>
          ))}
        </div>
      </section>

      <article className="panel future-controls-panel">
        <div className="panel-heading"><div><span>FUTURA INTEGRACIÓN</span><h2>Panel de control futuro</h2></div></div>
        <div className="future-controls">
          {["Iniciar supervisión", "Detener supervisión", "Consultar estado", "Revisar historial", "Autorizar una tarea"].map((label) => (
            <button type="button" disabled key={label}>{label}</button>
          ))}
        </div>
        <p>Las funciones de ejecución y control avanzado estarán disponibles en una futura versión del Mini Agente.</p>
      </article>
    </div>
  );
}
