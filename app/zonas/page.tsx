"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Droplets, Gauge, Thermometer, Wind } from "lucide-react";
import { apiFetch, normalizeText } from "@/src/services/api";
import type { ClimateRecord, EarthquakeRecord } from "@/src/types/meteorology";

type ClimateResponse = { datos: ClimateRecord[] };
type EarthquakeResponse = { datos: EarthquakeRecord[] };

export default function ZonesPage() {
  const [climate, setClimate] = useState<ClimateRecord[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [climateResult, earthquakeResult] = await Promise.all([
        apiFetch<ClimateResponse>("/api/clima?limite=100"),
        apiFetch<EarthquakeResponse>("/api/sismos?limite=100"),
      ]);
      const normalized = climateResult.datos.map((item) => ({ ...item, ciudad: normalizeText(item.ciudad) }));
      setClimate(normalized);
      setEarthquakes(earthquakeResult.datos);
      if (!selected && normalized[0]) setSelected(normalized[0].ciudad);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al consultar la API");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(() => Array.from(new Set(climate.map((item) => item.ciudad))).sort((a, b) => a.localeCompare(b)), [climate]);
  const [zoneRecords, setZoneRecords] = useState<ClimateRecord[]>([]);
  const latest = zoneRecords[0];

  const zoneEarthquakes = earthquakes.filter((item) => normalizeText(item.lugar).toLowerCase().includes(selected.toLowerCase()));

  const climateChart = zoneRecords.map((item) => ({ date: new Date(item.fecha_creacion).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }), temperatura: item.temperatura }));
  const seismicChart = zoneEarthquakes.map((item) => ({ date: new Date(item.hora).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }), magnitud: item.magnitud }));

  const loadZone = useCallback(async (city: string) => {
    if (!city) {
      setZoneRecords([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<ClimateResponse & { ciudad: string }>(`/api/clima/ciudad/${encodeURIComponent(city)}?limite=100`);
      setZoneRecords(
        result.datos
          .map((item) => ({ ...item, ciudad: normalizeText(item.ciudad) }))
          .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
      );
    } catch (caught) {
      setZoneRecords([]);
      setError(caught instanceof Error ? caught.message : "Error al consultar la zona");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) {
      const task = window.setTimeout(() => { void loadZone(selected); }, 0);
      return () => window.clearTimeout(task);
    }
  }, [selected, loadZone]);

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">ANÁLISIS GEOGRÁFICO</p><h1>Zonas</h1></div></div>
      {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>Error de consulta</strong><span>{error}</span></div></div>}
      <section className="zone-layout zone-layout-filter">
        <aside className="panel zone-selector">
          <label className="zone-filter-label">
            <span>Filtrar por zona</span>
            <select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={loading && !cities.length}>
              <option value="">Seleccione una zona</option>
              {cities.map((city) => <option key={city} value={city}>{normalizeText(city)}</option>)}
            </select>
          </label>
        </aside>
        <div className="zone-content">
          {loading ? <div className="panel loading-panel">Consultando datos reales…</div> : latest ? (
            <>
              <div className="zone-title"><div><p>ÚLTIMO REGISTRO DISPONIBLE</p><h2>{normalizeText(selected)}</h2></div><span>{new Date(latest.fecha_registro).toLocaleString("es-CL")}</span></div>
              <section className="zone-metrics">
                <article><div className="stat-icon amber"><Thermometer size={19} /></div><span>Temperatura</span><strong>{latest.temperatura == null ? "—" : `${latest.temperatura} °C`}</strong></article>
                <article><div className="stat-icon cyan"><Droplets size={19} /></div><span>Humedad</span><strong>{latest.humedad == null ? "—" : `${latest.humedad} %`}</strong></article>
                <article><div className="stat-icon violet"><Wind size={19} /></div><span>Viento</span><strong>{latest.viento_velocidad == null ? "—" : `${latest.viento_velocidad} km/h`}</strong></article>
                <article><div className="stat-icon green"><Gauge size={19} /></div><span>Presión</span><strong>{latest.presion == null ? "—" : `${latest.presion} hPa`}</strong></article>
              </section>
              <section className="zone-details panel">
                <div><span>Radiación UV</span><strong>{latest.radiacion_uv ?? "—"}</strong></div>
                <div><span>Calidad PM2.5</span><strong>{latest.calidad_aire_pm25 ?? "—"}</strong></div>
                <div><span>Precipitación</span><strong>{latest.precipitacion_mm ?? "—"} mm</strong></div>
                <div><span>Condición</span><strong>{normalizeText(latest.condicion) || "—"}</strong></div>
                <div><span>Registros</span><strong>{zoneRecords.length}</strong></div>
                <div><span>Sismos asociados</span><strong>{zoneEarthquakes.length}</strong></div>
              </section>
              <section className="grid-2">
                <article className="panel"><div className="panel-heading"><div><span>HISTÓRICO</span><h2>Temperaturas</h2></div></div><div className="chart-wrap">{climateChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={climateChart}><CartesianGrid stroke="#26364c" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill:"#91a4bd", fontSize:11 }} /><YAxis tick={{ fill:"#91a4bd", fontSize:11 }} /><Tooltip contentStyle={{ background:"#101a29", border:"1px solid #26364c" }} /><Bar dataKey="temperatura" fill="#38bdf8" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer> : <div className="empty-state">Sin histórico.</div>}</div></article>
                <article className="panel"><div className="panel-heading"><div><span>SISMOS</span><h2>Magnitudes asociadas</h2></div></div><div className="chart-wrap">{seismicChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={seismicChart}><CartesianGrid stroke="#26364c" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill:"#91a4bd", fontSize:11 }} /><YAxis tick={{ fill:"#91a4bd", fontSize:11 }} /><Tooltip contentStyle={{ background:"#101a29", border:"1px solid #26364c" }} /><Bar dataKey="magnitud" fill="#a78bfa" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer> : <div className="empty-state">No hay sismos asociados al nombre de esta zona.</div>}</div></article>
              </section>
              <article className="panel summary-panel"><span>RESUMEN AUTOMÁTICO</span><p>{`En ${normalizeText(selected)} se dispone de ${zoneRecords.length} registro(s) climático(s). El último disponible indica ${latest.temperatura ?? "temperatura no disponible"} °C, ${latest.humedad ?? "humedad no disponible"}% de humedad y ${latest.viento_velocidad ?? "viento no disponible"} km/h de velocidad del viento. Se encontraron ${zoneEarthquakes.length} sismo(s) cuyo lugar coincide con esta búsqueda.`}</p></article>
            </>
          ) : <div className="panel empty-state">No existen registros climáticos para esta ubicación.</div>}
        </div>
      </section>
    </div>
  );
}
