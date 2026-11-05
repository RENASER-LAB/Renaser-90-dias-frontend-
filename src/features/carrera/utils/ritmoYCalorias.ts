/**
 * Ritmo, velocidad, calorías y el formato de los números de la carrera (spec 042, FR-008 y FR-015). Puras.
 *
 * Los números van en español de Perú: coma decimal («3,25 km»), ritmo «5:42 min/km» y duración «00:14:32».
 */

/** Peso que se usa si no se conoce el de la persona (FR-015, supuesto 8 del dueño). */
export const PESO_POR_DEFECTO_KG = 70;

/** Segundos por km, o `null` si todavía no hay distancia suficiente para que el número signifique algo. */
export function ritmoSegPorKm(metros: number, segundos: number): number | null {
  if (!(metros >= 20) || !(segundos > 0)) return null;
  return (segundos / metros) * 1000;
}

/** «5:42» (min:seg por km), o «–:––» sin ritmo. */
export function formatoRitmo(segPorKm: number | null): string {
  if (segPorKm == null || !Number.isFinite(segPorKm) || segPorKm <= 0 || segPorKm >= 60 * 60) return '–:––';
  const total = Math.round(segPorKm);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

/** «00:14:32». Por encima de 99 h queda en 99:59:59 (la carrera tiene tope de 12 h, FR-026). */
export function formatoDuracion(ms: number): string {
  const total = Math.max(0, Math.min(Math.floor(ms / 1000), 99 * 3600 + 59 * 60 + 59));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

/** «3,25» (dos decimales, coma). */
export function formatoKm(metros: number): string {
  const km = Math.max(0, metros) / 1000;
  return km.toFixed(2).replace('.', ',');
}

/** «8,4» km/h con un decimal. */
export function formatoVelocidad(kmh: number | null): string {
  if (kmh == null || !Number.isFinite(kmh) || kmh < 0) return '–';
  return kmh.toFixed(1).replace('.', ',');
}

/** Velocidad media en km/h. */
export function velocidadKmh(metros: number, segundos: number): number | null {
  if (!(segundos > 0)) return null;
  return (metros / segundos) * 3.6;
}

/** Miles con espacio duro, como el resto de la app: «7 480». */
export function formatoEntero(n: number): string {
  return Math.round(Math.max(0, n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * MET según la velocidad (Compendium of Physical Activities, caminata y carrera): de 3,0 a paso lento hasta 14,5 a 16 km/h.
 * Por debajo de 1 km/h es estar parado (1,0: no se suman calorías de ejercicio que no hay).
 */
export function metPorVelocidad(kmh: number): number {
  if (!(kmh >= 1)) return 1.0;
  const tabla: Array<[number, number]> = [
    [3.2, 2.8],
    [4.0, 3.0],
    [4.8, 3.5],
    [5.6, 4.3],
    [6.4, 5.0],
    [8.0, 8.3],
    [9.7, 9.8],
    [11.3, 11.0],
    [12.9, 11.8],
    [14.5, 12.8],
    [16.1, 14.5],
  ];
  if (kmh <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    const [v1, m1] = tabla[i - 1];
    const [v2, m2] = tabla[i];
    if (kmh <= v2) return m1 + ((m2 - m1) * (kmh - v1)) / (v2 - v1);
  }
  return tabla[tabla.length - 1][1];
}

/** kcal = MET × peso (kg) × horas (FR-015). */
export function caloriasDelTramo(kmh: number, pesoKg: number, segundos: number): number {
  if (!(segundos > 0) || !(pesoKg > 0)) return 0;
  return metPorVelocidad(kmh) * pesoKg * (segundos / 3600);
}

/**
 * El peso para las calorías (decisión del dueño, 2026-11-05): el del objetivo de 90 días de Cuerpo si se mide en kilos —lo
 * último anotado (`avance`) o, si no hay, de dónde partió (`lineaBase`)—; si no, 70 kg. Un número fuera de 30–300 kg no se cree (FR-015).
 */
export function pesoParaCalorias(
  objetivoDeCuerpo: { unidad: string | null; avance: number | null; lineaBase: number | null } | null | undefined,
): number {
  if (!objetivoDeCuerpo) return PESO_POR_DEFECTO_KG;
  const unidad = (objetivoDeCuerpo.unidad ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(unidad)) return PESO_POR_DEFECTO_KG;
  const peso = objetivoDeCuerpo.avance ?? objetivoDeCuerpo.lineaBase;
  return peso != null && peso >= 30 && peso <= 300 ? peso : PESO_POR_DEFECTO_KG;
}
