"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import {
  formatCountdown,
  formatDateTime,
  useMiniAgent,
} from "@/src/components/dashboard/MiniAgentContext";

export default function MiniAgentWidget() {
  const [open, setOpen] = useState(false);
  const {
    state,
    apiConnected,
    loading,
    lastUpdate,
    remainingSeconds,
    tokenExpiryEpoch,
    tokenExpired,
  } = useMiniAgent();

  const heartbeat = state?.agente?.ultimo_heartbeat ?? null;
  const agentConnected = Boolean(
    heartbeat &&
    ["ACTIVO", "EJECUTANDO", "COMPLETADO"].includes(
      state?.agente?.estado?.toUpperCase() ?? ""
    )
  );
  const alertCount = state?.alertas?.length ?? 0;

  return (
    <div className="mini-agent-widget">
      {open && (
        <section className="mini-agent-popover" aria-label="Mini Agente Supervisor">
          <div className="mini-agent-popover-header">
            <div className="mini-agent-avatar"><Bot size={20} /></div>
            <div>
              <strong>Mini Agente</strong>
              <span>Información de monitoreo</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar Mini Agente">
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="mini-agent-status-row">
            <span>FastAPI</span>
            <strong className={apiConnected ? "text-good" : "text-bad"}>
              {loading ? "Consultando…" : apiConnected ? "Conectada" : "Sin conexión"}
            </strong>
          </div>
          <div className="mini-agent-status-row">
            <span>Agente</span>
            <strong className={agentConnected ? "text-good" : "text-muted"}>
              {loading ? "Consultando…" : agentConnected ? "Conectado" : "Desconectado"}
            </strong>
          </div>

          <div className="mini-agent-summary">
            <div><span>Último heartbeat</span><strong>{formatDateTime(heartbeat)}</strong></div>
            <div><span>Alertas pendientes</span><strong>{alertCount}</strong></div>
            <div><span>Última actualización</span><strong>{lastUpdate || "Pendiente"}</strong></div>
          </div>

          <div className={`mini-agent-token-status ${tokenExpired ? "expired" : ""}`}>
            <ShieldAlert size={16} />
            {tokenExpiryEpoch == null ? (
              <div>
                <strong>Vencimiento del token no disponible</strong>
                <span>FastAPI no entrega totem_exp_epoch.</span>
              </div>
            ) : tokenExpired ? (
              <Link href="/mini-agente#vencimiento-token">
                <strong>El token se venció</strong>
                <span>Ver mensaje de atención en el panel de control.</span>
              </Link>
            ) : (
              <div>
                <strong>Vencimiento del token</strong>
                <span className="token-countdown">{formatCountdown(remainingSeconds)}</span>
              </div>
            )}
          </div>
          <button className="mini-agent-future-button" type="button" disabled>
            Mini Agente <span>En desarrollo</span>
          </button>
        </section>
      )}

      <button
        type="button"
        className={`mini-agent-fab ${alertCount > 0 ? "has-alert" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Cerrar Mini Agente" : "Abrir Mini Agente"}
      >
        <span className="mini-agent-fab-icon"><Bot size={20} /></span>
        <span className="mini-agent-fab-copy">
          <strong>Mini Agente</strong>
          <small>Supervisor</small>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </div>
  );
}
