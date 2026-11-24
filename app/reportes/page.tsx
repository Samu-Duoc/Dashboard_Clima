"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import { apiFetch, normalizeText } from "@/src/services/api";
import type { ClimateRecord, EarthquakeRecord } from "@/src/types/meteorology";

type ClimateResponse = { total: number; datos: ClimateRecord[] };
type EarthquakeResponse = { total: number; datos: EarthquakeRecord[] };

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function createPieImage(counts: Map<string, number>) {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 380;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111827";
  context.font = "bold 22px Arial";
  context.fillText("Distribución por semáforo", 35, 40);
  const entries = Array.from(counts);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const colors = ["#22c55e", "#f59e0b", "#ef4444", "#64748b"];
  let start = -Math.PI / 2;
  const centerX = 230;
  const centerY = 210;
  const radius = 125;
  entries.forEach(([, value], index) => {
    const angle = (value / total) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, radius, start, start + angle);
    context.closePath();
    context.fillStyle = colors[index % colors.length];
    context.fill();
    start += angle;
  });
  entries.forEach(([label, value], index) => {
    const y = 155 + index * 42;
    context.fillStyle = colors[index % colors.length];
    context.fillRect(430, y - 14, 18, 18);
    context.fillStyle = "#1f2937";
    context.font = "16px Arial";
    context.fillText(`${label}: ${value}`, 460, y);
  });
  return canvas.toDataURL("image/png").split(",")[1];
}

function createBarImage(records: ClimateRecord[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 380;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111827";
  context.font = "bold 22px Arial";
  context.fillText("Registros climáticos por ciudad", 35, 40);
  const counts = new Map<string, number>();
  records.forEach((record) => counts.set(normalizeText(record.ciudad), (counts.get(normalizeText(record.ciudad)) ?? 0) + 1));
  const entries = Array.from(counts).slice(0, 12);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, value]) => value));
  const chartLeft = 55;
  const chartBottom = 330;
  const chartHeight = 240;
  const chartWidth = 600;
  const slot = chartWidth / entries.length;
  context.strokeStyle = "#d1d5db";
  context.beginPath();
  context.moveTo(chartLeft, chartBottom);
  context.lineTo(chartLeft + chartWidth, chartBottom);
  context.stroke();
  entries.forEach(([label, value], index) => {
    const height = (value / max) * chartHeight;
    const x = chartLeft + index * slot + 10;
    context.fillStyle = "#38bdf8";
    context.fillRect(x, chartBottom - height, Math.max(20, slot - 18), height);
    context.fillStyle = "#374151";
    context.font = "11px Arial";
    context.save();
    context.translate(x + 12, chartBottom + 16);
    context.rotate(-0.45);
    context.fillText(label.slice(0, 14), 0, 0);
    context.restore();
  });
  return canvas.toDataURL("image/png").split(",")[1];
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const task = window.setTimeout(() => {
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      setFrom(dateInputValue(monthAgo));
      setTo(dateInputValue(today));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  async function generateReport() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const fechaDesde = `${from}T00:00:00Z`;
      const fechaHasta = `${to}T23:59:59Z`;
      const [climateResult, earthquakeResult] = await Promise.all([
        apiFetch<ClimateResponse>(`/api/clima/rango?fecha_desde=${encodeURIComponent(fechaDesde)}&fecha_hasta=${encodeURIComponent(fechaHasta)}`),
        apiFetch<EarthquakeResponse>(`/api/sismos/rango?fecha_desde=${encodeURIComponent(fechaDesde)}&fecha_hasta=${encodeURIComponent(fechaHasta)}`),
      ]);
      if (!climateResult.datos.length && !earthquakeResult.datos.length) {
        setMessage("No existen datos reales para el período seleccionado.");
        return;
      }
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "MeteoStream";

      const summary = workbook.addWorksheet("RESUMEN");
      summary.columns = [{ width: 34 }, { width: 28 }];
      summary.addRow(["MeteoStream — Reporte", `Generado: ${new Date().toLocaleString("es-CL")}`]);
      summary.addRow(["Fecha del reporte", new Date().toLocaleDateString("es-CL")]);
      summary.addRow(["Total de estaciones", new Set(climateResult.datos.map((item) => normalizeText(item.ciudad))).size]);
      summary.addRow(["Total de sismos", earthquakeResult.datos.length]);
      summary.addRow(["Total de alertas", earthquakeResult.datos.filter((item) => item.semaforo).length]);
      summary.addRow(["Estado general", "Datos disponibles en el período"]);

      const climateSheet = workbook.addWorksheet("CLIMA");
      climateSheet.columns = [
        { header: "Ciudad", key: "ciudad", width: 24 }, { header: "Temperatura", key: "temperatura", width: 15 },
        { header: "Humedad", key: "humedad", width: 12 }, { header: "Viento km/h", key: "viento", width: 15 },
        { header: "Dirección", key: "direccion", width: 12 }, { header: "Presión", key: "presion", width: 12 },
        { header: "UV", key: "uv", width: 10 }, { header: "PM2.5", key: "pm25", width: 12 },
        { header: "Precipitacion", key: "precipitacion", width: 16 }, { header: "Condición", key: "condicion", width: 28 },
      ];
      climateResult.datos.forEach((item) => climateSheet.addRow({ ciudad: normalizeText(item.ciudad), temperatura: item.temperatura, humedad: item.humedad, viento: item.viento_velocidad, direccion: normalizeText(item.viento_direccion), presion: item.presion, uv: item.radiacion_uv, pm25: item.calidad_aire_pm25, precipitacion: item.precipitacion_mm, condicion: normalizeText(item.condicion) }));

      const seismicSheet = workbook.addWorksheet("SISMOS");
      seismicSheet.columns = [
        { header: "ID", key: "id", width: 16 }, { header: "Lugar", key: "lugar", width: 36 }, { header: "Magnitud", key: "magnitud", width: 12 },
        { header: "Semáforo", key: "semaforo", width: 14 }, { header: "Fecha y hora", key: "hora", width: 24 },
        { header: "Latitud", key: "latitud", width: 14 }, { header: "Longitud", key: "longitud", width: 14 },
        { header: "Profundidad", key: "profundidad", width: 14 }, { header: "URL", key: "url", width: 52 },
      ];
      earthquakeResult.datos.forEach((item) => seismicSheet.addRow({ id: item.id_externo, lugar: normalizeText(item.lugar), magnitud: item.magnitud, semaforo: normalizeText(item.semaforo) || "Sin clasificar", hora: item.hora, latitud: item.latitud, longitud: item.longitud, profundidad: item.profundidad_km, url: item.url_usgs }));

      const alertSheet = workbook.addWorksheet("ALERTAS");
      alertSheet.columns = [{ header: "Zona", key: "zona", width: 36 }, { header: "Tipo de alerta", key: "tipo", width: 18 }, { header: "Nivel", key: "nivel", width: 16 }, { header: "Fecha", key: "fecha", width: 24 }, { header: "Descripción", key: "descripcion", width: 52 }];
      earthquakeResult.datos.filter((item) => item.semaforo).forEach((item) => alertSheet.addRow({ zona: normalizeText(item.lugar), tipo: "Sismo", nivel: normalizeText(item.semaforo), fecha: item.hora, descripcion: `Magnitud ${item.magnitud}; profundidad ${item.profundidad_km} km` }));

      const semaforoCounts = new Map<string, number>();
      earthquakeResult.datos.forEach((item) => { const level = normalizeText(item.semaforo) || "Sin clasificar"; semaforoCounts.set(level, (semaforoCounts.get(level) ?? 0) + 1); });
      const pieBase64 = createPieImage(semaforoCounts);
      if (pieBase64) {
        const pieId = workbook.addImage({ base64: pieBase64, extension: "png" });
        summary.addImage(pieId, { tl: { col: 4, row: 1 }, ext: { width: 600, height: 325 } });
      }
      const barBase64 = createBarImage(climateResult.datos);
      if (barBase64) {
        const barId = workbook.addImage({ base64: barBase64, extension: "png" });
        summary.addImage(barId, { tl: { col: 4, row: 18 }, ext: { width: 600, height: 325 } });
      }
      [summary, climateSheet, seismicSheet, alertSheet].forEach((sheet) => {
        sheet.getRow(1).font = { bold: true, color: { argb: "FF0F172A" } };
        sheet.autoFilter = sheet === climateSheet || sheet === seismicSheet || sheet === alertSheet ? { from: "A1", to: `${String.fromCharCode(64 + sheet.columns.length)}1` } : undefined;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MeteoStream_Reporte_${to}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      setMessage("Reporte generado y descargado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible generar el reporte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">EXPORTACIÓN</p><h1>Excel y reportes</h1></div></div>
      {error && <div className="error-banner"><AlertTriangle size={18} /><div><strong>Error al generar</strong><span>{error}</span></div></div>}
      {message && <div className="info-banner"><FileSpreadsheet size={18} /><span>{message}</span></div>}
      <section className="report-layout">
        <article className="panel report-config">
          <div className="panel-heading"><div><span>PERÍODO</span><h2>Datos del reporte</h2></div></div>
          <div className="date-grid">
            <label><span>Desde</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
            <label><span>Hasta</span><input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
          </div>
          <button className="primary-button full-button" onClick={() => void generateReport()} disabled={loading || !from || !to}><Download size={17} />{loading ? "Generando…" : "Generar y descargar Excel"}</button>
        </article>
        <article className="panel report-preview">
          <div className="preview-icon"><FileSpreadsheet size={32} /></div>
          <h2>Contenido del archivo</h2>
          <div className="sheet-list"><span>RESUMEN</span><span>CLIMA</span><span>SISMOS</span><span>ALERTAS</span></div>
          <p>Incluye dos gráficos incorporados como imágenes: distribución por semáforo y registros por ciudad.</p>
        </article>
      </section>
    </div>
  );
}
