export function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ??
    "https://api-clima-fgit.vercel.app";
  return configured.replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", ...init?.headers },
    });

    if (!response.ok) {
      throw new ApiError(`La API respondió con HTTP ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("La API no respondió antes de 12 segundos");
    }
    throw new ApiError("No fue posible conectar con FastAPI");
  } finally {
    window.clearTimeout(timeout);
  }
}

export function normalizeText(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (!/[ÃÂ]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, (character) => character.charCodeAt(0));
    return new TextDecoder("windows-1252").decode(bytes);
  } catch {
    return text;
  }
}

export type SupervisorAgent = {
  id: string;
  estado: string;
  detalle: string | null;
  ultimo_heartbeat: string | null;
  fecha_actualizacion: string;
  trabajo_actual_id: number | null;
};

export type SupervisorWork = {
  id: number;
  clave_solicitud: string;
  tipo: string;
  robot: string;
  estado: string;
  agente_id: string | null;
  mensaje: string | null;
  fecha_creacion: string;
  fecha_reclamado: string | null;
  fecha_inicio: string | null;
  fecha_expiracion: string | null;
  fecha_finalizacion: string | null;
  etapa_actual: string | null;
  etapa_fallida: string | null;
  etapas_completadas: string[];
  intentos: number;
  intentos_maximos: number;
};

export type SupervisorAlert = {
  id: number;
  trabajo_id: number | null;
  fecha: string;
  tipo: string;
  descripcion: string | null;
};

export type SupervisorState = {
  agente: SupervisorAgent | null;
  trabajo: SupervisorWork | null;
  alertas: SupervisorAlert[];
  totem_exp_epoch?: number | string | null;
};

export type SupervisorEvent = {
  id: number;
  trabajo_id: number | null;
  agente_id: string;
  fecha: string;
  evento: string;
  descripcion: string | null;
};

export type SupervisorEventsResponse = {
  total: number;
  datos: SupervisorEvent[];
};

export function getSupervisorState(): Promise<SupervisorState> {
  return apiFetch<SupervisorState>("/api/robot/supervisor/estado");
}

export function getSupervisorEvents(limit = 30): Promise<SupervisorEventsResponse> {
  return apiFetch<SupervisorEventsResponse>(
    `/api/robot/supervisor/eventos?limite=${limit}`
  );
}
