export type ClimateRecord = {
  id: number;
  ciudad: string;
  temperatura: number | null;
  humedad: number | null;
  viento_velocidad: number | null;
  viento_direccion: string | null;
  presion: number | null;
  radiacion_uv: number | null;
  calidad_aire_pm25: number | null;
  precipitacion_mm: number | null;
  condicion: string | null;
  fecha_ingesta: string;
  fecha_registro: string;
  fecha_creacion: string;
};

export type EarthquakeRecord = {
  id: number;
  id_externo: string;
  lugar: string;
  magnitud: number;
  semaforo: string | null;
  hora: string;
  longitud: number;
  latitud: number;
  profundidad_km: number;
  url_usgs: string;
  fecha_ingesta: string;
  fecha_creacion: string;
};
