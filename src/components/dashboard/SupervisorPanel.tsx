"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock3, Radio, ShieldAlert } from "lucide-react";
import {
  getSupervisorEvents,
  getSupervisorState,
  type SupervisorEvent,
  type SupervisorState,
} from "@/src/services/api";
import { formatDateTime } from "@/src/components/dashboard/MiniAgentContext";

function formatDate(value: string | null) {
  return formatDateTime(value);
}

function isAgentConnected(agent: SupervisorState["agente"]) {
  if (!agent?.ultimo_heartbeat) return false;
  const heartbeat = new Date(agent.ultimo_heartbeat).getTime();
  if (Number.isNaN(heartbeat)) return false;
  return Date.now() - heartbeat < 5 * 60 * 1000;
}

export default function SupervisorPanel() {
  const [state, setState] = useState<SupervisorState | null>(null);
  const [events, setEvents] = useState<SupervisorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [nextState, nextEvents] = await Promise.all([
        getSupervisorState(),
        getSupervisorEvents(30),
      ]);
      setState(nextState);
      setEvents(nextEvents.datos);
      setLastUpdate(formatDateTime(new Date()));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Sin conexión con el servidor"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTask = window.setTimeout(() => {
      void load();
    }, 0);
    const interval = window.setInterval(() => {
      void load();
    }, 5000);
    return () => {
      window.clearTimeout(initialTask);
      window.clearInterval(interval);
    };
  }, [load]);

  const agentConnected = isAgentConnected(state?.agente ?? null);
  const work = state?.trabajo ?? null;
  const agentStatus = !state
    ? "Sin datos"
    : agentConnected
      ? "CONECTADO"
      : "DESCONECTADO";

  return (
    <section className="supervisor-section">
      <div className="supervisor-heading">
        <div>
          <p className="eyebrow">MONITOR LOCAL</p>
          <h2>Supervisor del Robot</h2>
        </div>
        <span className="last-update">
          Última actualización: {lastUpdate || "Pendiente"}
        </span>
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

      <div className="supervisor-grid">
        <article className="panel supervisor-card">
          <div className="supervisor-card-title">
            <div className={`supervisor-icon ${agentConnected ? "good" : "neutral"}`}>
              <Radio size={19} />
            </div>
            <span>Estado del agente</span>
          </div>
          <strong className={agentConnected ? "text-good" : "text-muted"}>
            {loading ? "Consultando…" : agentStatus}
          </strong>
          <dl>
            <div><dt>Último heartbeat</dt><dd>{formatDate(state?.agente?.ultimo_heartbeat ?? null)}</dd></div>
            <div><dt>Identificador</dt><dd>{state?.agente?.id ?? "Sin dato"}</dd></div>
          </dl>
        </article>

        <article className="panel supervisor-card">
          <div className="supervisor-card-title">
            <div className="supervisor-icon blue"><Activity size={19} /></div>
            <span>Estado del trabajo</span>
          </div>
          <strong>{loading ? "Consultando…" : work?.estado ?? "Sin trabajo"}</strong>
          <dl>
            <div><dt>Identificador</dt><dd>{work?.id ?? "Sin dato"}</dd></div>
            <div><dt>Robot</dt><dd>{work?.robot ?? "Sin dato"}</dd></div>
            <div><dt>Etapa actual</dt><dd>{work?.etapa_actual ?? "Sin dato"}</dd></div>
            <div><dt>Etapa fallida</dt><dd>{work?.etapa_fallida ?? "Ninguna"}</dd></div>
          </dl>
        </article>

        <article className="panel supervisor-card">
          <div className="supervisor-card-title">
            <div className="supervisor-icon amber"><Clock3 size={19} /></div>
            <span>Etapas completadas</span>
          </div>
          <strong>{work?.etapas_completadas?.length ?? 0}</strong>
          {work?.etapas_completadas?.length ? (
            <ul className="stage-list">
              {work.etapas_completadas.map((stage) => <li key={stage}>{stage}</li>)}
            </ul>
          ) : <p className="small-muted">Sin etapas registradas.</p>}
        </article>

        <article className="panel supervisor-card">
          <div className="supervisor-card-title">
            <div className="supervisor-icon red"><ShieldAlert size={19} /></div>
            <span>Alertas que requieren intervención</span>
          </div>
          <strong>{state?.alertas?.length ?? 0}</strong>
          {state?.alertas?.length ? (
            <ul className="alert-list">
              {state.alertas.slice(0, 5).map((alert) => (
                <li key={alert.id}>
                  <span>{alert.tipo}</span>
                  <small>{formatDate(alert.fecha)}</small>
                  {alert.descripcion && <p>{alert.descripcion}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="small-muted">Sin alertas registradas.</p>}
        </article>
      </div>

      <article className="panel supervisor-history">
        <div className="panel-heading">
          <div><span>SUPERVISOR</span><h2>Historial de eventos</h2></div>
        </div>
        {loading ? (
          <div className="empty-state">Consultando eventos reales…</div>
        ) : events.length ? (
          <div className="table-wrap">
            <table className="data-table supervisor-events-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Trabajo</th>
                  <th>Evento</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.fecha)}</td>
                    <td>{event.trabajo_id ?? "—"}</td>
                    <td><span className="table-status">{event.evento}</span></td>
                    <td>{event.descripcion ?? "Sin descripción"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No existen eventos del supervisor.</div>
        )}
      </article>
    </section>
  );
}
