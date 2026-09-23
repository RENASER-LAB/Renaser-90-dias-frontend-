import type {
  AccionMotora, Area, AvisoCalidad, BloqueDia, DiaHito, DiaSemana, EvidenciaAccion, Hito,
  MapaRenacimiento, Objetivo, ObjetivoNegocio, ObjetivoRelaciones, ObjetivoSalud, PeriodoMedicion,
  ProtocoloReemplazo, TipoResultadoNegocio, TipoResultadoSalud, Vinculo,
} from './tipos';
import { AREAS } from './tipos';

/**
 * Las reglas del manual (§3 por vista, §4 motor SMART, §1.2 definición de terminado), en código
 * y sin IA. El manual lo exige textualmente en el checklist de liberación: "El mapa puede
 * completarse sin IA y sin permiso de micrófono". Cuando el backend exponga el contrato de §4.2,
 * estas reglas siguen valiendo como primera línea; la IA aporta redacción, no invención.
 */

// ------------------------------------------------------------------------------------------
// Catálogos (§3). Las claves son las del manual; las etiquetas, lo que ve la persona.
// ------------------------------------------------------------------------------------------

export const ETIQUETA_AREA: Record<Area, string> = {
  salud: 'Cuerpo y salud',
  negocio_dinero: 'Negocio y dinero',
  relaciones: 'Relaciones',
};

export const SUBTITULO_AREA: Record<Area, string> = {
  salud: 'Más energía, enfoque y vitalidad',
  negocio_dinero: 'Más libertad y oportunidades',
  relaciones: 'Conexiones más profundas',
};

export const RESULTADOS_SALUD: { clave: TipoResultadoSalud; etiqueta: string; unidadSugerida: string }[] = [
  { clave: 'peso', etiqueta: 'peso', unidadSugerida: 'kg' },
  { clave: 'medidas', etiqueta: 'medidas', unidadSugerida: 'cm' },
  { clave: 'energia', etiqueta: 'energía', unidadSugerida: '/10' },
  { clave: 'fuerza', etiqueta: 'fuerza', unidadSugerida: 'kg' },
  { clave: 'resistencia', etiqueta: 'resistencia', unidadSugerida: 'min' },
  { clave: 'sueno', etiqueta: 'sueño', unidadSugerida: 'h' },
  { clave: 'condicion_clinica', etiqueta: 'condición clínica', unidadSugerida: '' },
  { clave: 'otro', etiqueta: 'otro', unidadSugerida: '' },
];

export const RESULTADOS_NEGOCIO: { clave: TipoResultadoNegocio; etiqueta: string }[] = [
  { clave: 'facturacion', etiqueta: 'facturación' },
  { clave: 'utilidad', etiqueta: 'utilidad' },
  { clave: 'ventas', etiqueta: 'ventas' },
  { clave: 'clientes', etiqueta: 'clientes' },
  { clave: 'ahorro', etiqueta: 'ahorro' },
  { clave: 'deuda', etiqueta: 'deuda' },
  { clave: 'ingreso_personal', etiqueta: 'ingreso personal' },
  { clave: 'otro', etiqueta: 'otro' },
];

export const VINCULOS: { clave: Vinculo; etiqueta: string }[] = [
  { clave: 'pareja', etiqueta: 'pareja' }, { clave: 'hijos', etiqueta: 'hijos' },
  { clave: 'padres', etiqueta: 'padres' }, { clave: 'familia', etiqueta: 'familia' },
  { clave: 'socios', etiqueta: 'socios' }, { clave: 'equipo', etiqueta: 'equipo' },
  { clave: 'amistades', etiqueta: 'amistades' }, { clave: 'otro', etiqueta: 'otro' },
];

export const PERIODOS: { clave: PeriodoMedicion; etiqueta: string }[] = [
  { clave: 'semanal', etiqueta: 'Semanal' },
  { clave: 'mensual', etiqueta: 'Mensual' },
  { clave: 'acumulado_dia_90', etiqueta: 'Acumulado al Día 90' },
];

export const MONEDAS = ['S/', 'USD', 'EUR', 'MXN', 'COP', 'CLP', 'ARS'];

/** V07, catálogo textual del manual. */
export const PATRONES: { clave: string; etiqueta: string }[] = [
  { clave: 'postergar', etiqueta: 'postergar' },
  { clave: 'dormir_tarde', etiqueta: 'dormir tarde' },
  { clave: 'alimentacion_desordenada', etiqueta: 'alimentación desordenada' },
  { clave: 'celular_redes', etiqueta: 'celular/redes' },
  { clave: 'evitar_conversaciones', etiqueta: 'evitar conversaciones' },
  { clave: 'gastar_sin_plan', etiqueta: 'gastar sin plan' },
  { clave: 'no_hacer_seguimiento', etiqueta: 'no hacer seguimiento' },
  { clave: 'querer_hacerlo_todo', etiqueta: 'querer hacerlo todo' },
  { clave: 'abandonar_rapido', etiqueta: 'abandonar rápido' },
  { clave: 'otro', etiqueta: 'otro' },
];

export const EVIDENCIAS_ACCION: { clave: EvidenciaAccion; etiqueta: string }[] = [
  { clave: 'check', etiqueta: 'Check' }, { clave: 'foto', etiqueta: 'Foto' },
  { clave: 'video', etiqueta: 'Video' }, { clave: 'registro', etiqueta: 'Registro' },
  { clave: 'documento', etiqueta: 'Documento' }, { clave: 'otro', etiqueta: 'Otro' },
];

export const BLOQUES: { clave: BloqueDia; etiqueta: string }[] = [
  { clave: 'manana', etiqueta: 'Mañana' }, { clave: 'tarde', etiqueta: 'Tarde' }, { clave: 'noche', etiqueta: 'Noche' },
];

export const DIAS_SEMANA: DiaSemana[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DIAS_HITO: DiaHito[] = [30, 60, 90];

export const LIMITES = {
  motivo: { min: 20, max: 180 },
  cambioObservable: { min: 20, max: 180 },
  accion: { min: 5, max: 100 },
  retorno: { min: 5, max: 120 },
  textoCorto: { min: 3, max: 180 },
  accionesPorObjetivo: 2,
  accionesTotales: 6,
  reemplazos: 3,
  /** UNREALISTIC_LOAD: más de esto por semana entre todas las acciones no se sostiene 83 días. */
  cargaSemanalMaxima: 28,
} as const;

// ------------------------------------------------------------------------------------------
// Detección de lenguaje vago y de control de terceros (§3 V03/V05/V06/V09, §4.4).
// Heurísticas deliberadamente simples y en español; la IA del backend las refina después.
// ------------------------------------------------------------------------------------------

const VAGO = /\b(pensar|intentar|intentar[eé]|mejorar|esforzar|esforzarme|esforzarme m[aá]s|ponerme las pilas|motivarme|hacerlo mejor|sentirme mejor|estar saludable|ser mejor|tener m[aá]s energ[ií]a)\b/i;
const TERCEROS = /\b(que (mi|mis|el|la|los|las|[eé]l|ella|ellos|ellas)\b[^.]{0,40}\b(cambie|cambien|valore|valoren|obedezca|obedezcan|entienda|entiendan|me quiera|me quieran|deje de|dejen de|haga caso|hagan caso|me respete|me respeten|me escuche|me escuchen))/i;

export function esVago(texto: string): boolean {
  return VAGO.test(texto.trim());
}

export function dependeDeUnTercero(texto: string): boolean {
  return TERCEROS.test(texto.trim());
}

/**
 * Toda coma seguida de exactamente tres dígitos, de punta a punta: `"15,000"`, `"1,234,567"`.
 * Escrito así, la coma solo puede ser separador de miles — nadie mide 78,500 kg queriendo decir
 * 78 kg y medio.
 */
const COMA_DE_MILES = /^-?\d{1,3}(,\d{3})+$/;

/**
 * Lee el número que escribió la persona, en las dos convenciones que conviven en el mismo
 * formulario: `"78"`, `"78.5"`, `"78,5"`, `"S/ 15,000"` → 78 / 78.5 / 78.5 / 15000.
 *
 * > **Corregido el 2026-09-22.** Acá iba `.replace(/,/g, '')`: la coma se borraba SIEMPRE, como si
 * > solo pudiera ser separador de miles, y `"78,5"` se leía **785**. La otra mitad de la app hacía
 * > lo contrario — `aNumeroDeMeta` en `useMapaRenacimiento` hacía `.replace(',', '.')` y leía
 * > **78,5** —, así que el MISMO texto valía dos cosas distintas según quién lo mirara: la Roca
 * > Maestra mostraba 78,5 kg mientras la validación, los hitos y la cifra del mes calculaban sobre
 * > 785 kg. Ahora hay **un solo lector**: `aNumeroDeMeta` delega acá y no pueden volver a
 * > contradecirse.
 *
 * **La regla.** Coma seguida de exactamente tres dígitos → miles (`"S/ 15,000"` → 15000): así se
 * escribe la plata, y es lo que este mismo docstring ya prometía. Con una o dos cifras detrás →
 * decimal (`"78,5"` → 78.5): así se escribe el peso, y es la convención que el resto de la app ya
 * declara (`cifraDelObjetivo.SEPARADOR_MILES` usa un espacio duro justamente para no chocar con
 * ella). Con coma Y punto juntos, la coma es de miles: `"15,000.50"` → 15000.5.
 *
 * **Lo que NO cubre, a propósito.** El punto se sigue leyendo como decimal siempre, así que
 * `"15.000"` escrito a la europea da 15, no 15000. Es el caso espejo, nadie lo reportó, y la app
 * MUESTRA los miles con espacio duro — no le enseña a nadie a escribirlos con punto.
 */
export function aNumero(texto: string): number | null {
  const limpio = (texto ?? '').replace(/[^0-9.,-]/g, '');
  if (!limpio || limpio === '-' || limpio === '.') return null;

  const tienePunto = limpio.includes('.');
  const comaEsDeMiles = tienePunto || COMA_DE_MILES.test(limpio);
  const normalizado = comaEsDeMiles ? limpio.replace(/,/g, '') : limpio.replace(/,/g, '.');

  if (!normalizado || normalizado === '-' || normalizado === '.') return null;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function largoEntre(texto: string, min: number, max: number): boolean {
  const l = texto.trim().length;
  return l >= min && l <= max;
}

// ------------------------------------------------------------------------------------------
// Calidad de cada objetivo (§4.3). Devuelve la lista de avisos; "válido" = ningún bloqueante.
// ------------------------------------------------------------------------------------------

const MENSAJE: Record<AvisoCalidad['codigo'], string> = {
  MISSING_BASELINE: 'Para medir tu avance, indica desde dónde empiezas.',
  MISSING_TARGET: '¿A qué número o resultado concreto quieres llegar?',
  VAGUE_RESULT: '¿Qué tendría que ocurrir para demostrar que lo lograste?',
  MISSING_EVIDENCE: '¿Con qué registro o evidencia comprobarás el resultado?',
  THIRD_PARTY_CONTROL: 'Reformula la meta desde una acción o decisión que dependa de ti.',
  UNSAFE_HEALTH: 'Ajusta esta meta con acompañamiento profesional y define una conducta segura.',
  UNIT_MISMATCH: 'Usa la misma unidad para tu situación actual y tu meta.',
  UNREALISTIC_LOAD: 'Revisa si esta frecuencia puede sostenerse durante 83 días.',
  MISSING_TYPE: 'Elige primero qué vas a medir, arriba.',
  MISSING_PERIOD: 'Indica cada cuánto se mide: semanal, mensual o acumulado al Día 90.',
  MISSING_LINK: 'Elige con quién es el vínculo que quieres fortalecer.',
  OUT_OF_SCALE: 'En una escala del 1 al 10, usa valores entre 1 y 10.',
};

/**
 * Un objetivo de salud medido en escala del 1 al 10.
 *
 * Espeja a `Magnitud.deSalud` del backend, que es quien decide cómo se reparte el avance: `energia`
 * siempre es escala, y `otro` lo es cuando la persona escribió una unidad que lo declara. Si esta
 * lista se separa de aquélla, el formulario valida una cosa y el servidor calcula otra.
 */
function esEscala(o: ObjetivoSalud): boolean {
  if (o.tipoResultado === 'energia') return true;
  if (o.tipoResultado !== 'otro') return false;
  return UNIDADES_DE_ESCALA.has(o.unidad.trim().toLowerCase());
}

/** Las mismas que reconoce `Magnitud.UNIDADES_DE_ESCALA` en el backend. */
const UNIDADES_DE_ESCALA = new Set(['/10', '/ 10', '10', 'pt', 'pts', 'puntos']);

/** `null` no es "fuera de rango": eso ya lo avisan MISSING_BASELINE y MISSING_TARGET. */
function fueraDeEscala(base: number | null, meta: number | null): boolean {
  return [base, meta].some(v => v !== null && (v < 1 || v > 10));
}

function aviso(codigo: AvisoCalidad['codigo'], bloquea: boolean): AvisoCalidad {
  return { codigo, mensaje: MENSAJE[codigo], bloquea };
}

export function calidadSalud(o: ObjetivoSalud): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];
  if (!o.tipoResultado) avisos.push(aviso('MISSING_TYPE', true));
  const base = aNumero(o.lineaBase);
  const meta = aNumero(o.resultadoDia90);
  if (base === null) avisos.push(aviso('MISSING_BASELINE', true));
  if (meta === null) avisos.push(aviso('MISSING_TARGET', true));
  else if (base !== null && meta === base) avisos.push(aviso('VAGUE_RESULT', true));
  if (!o.unidad.trim()) avisos.push(aviso('UNIT_MISMATCH', true));
  if (esEscala(o) && fueraDeEscala(base, meta)) avisos.push(aviso('OUT_OF_SCALE', true));
  if (!o.evidencia.trim()) avisos.push(aviso('MISSING_EVIDENCE', true));
  if (!largoEntre(o.motivo, LIMITES.motivo.min, LIMITES.motivo.max)) avisos.push(aviso('VAGUE_RESULT', true));
  else if (esVago(o.motivo)) avisos.push(aviso('VAGUE_RESULT', false));
  // Para condiciones clínicas el plan no sustituye atención profesional: se avisa, no se bloquea.
  if (o.tipoResultado === 'condicion_clinica') avisos.push(aviso('UNSAFE_HEALTH', false));
  return dedupe(avisos);
}

export function calidadNegocio(o: ObjetivoNegocio): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];
  if (!o.tipoResultado) avisos.push(aviso('MISSING_TYPE', true));
  const base = aNumero(o.lineaBase);
  const meta = aNumero(o.resultadoDia90);
  // Admite 0 como línea base (manual): lo que no admite es que falte.
  if (base === null) avisos.push(aviso('MISSING_BASELINE', true));
  if (meta === null) avisos.push(aviso('MISSING_TARGET', true));
  else if (base !== null && meta === base) avisos.push(aviso('VAGUE_RESULT', true));
  if (!o.periodo) avisos.push(aviso('MISSING_PERIOD', true));
  if (!o.moneda.trim()) avisos.push(aviso('UNIT_MISMATCH', true));
  if (!o.evidencia.trim()) avisos.push(aviso('MISSING_EVIDENCE', true));
  if (!largoEntre(o.motivo, LIMITES.motivo.min, LIMITES.motivo.max)) avisos.push(aviso('VAGUE_RESULT', true));
  return dedupe(avisos);
}

export function calidadRelaciones(o: ObjetivoRelaciones): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];
  if (!o.vinculo) avisos.push(aviso('MISSING_LINK', true));
  if (o.situacionActual === null) avisos.push(aviso('MISSING_BASELINE', true));
  if (o.resultadoDia90 === null) avisos.push(aviso('MISSING_TARGET', true));
  if (!largoEntre(o.cambioObservable, LIMITES.cambioObservable.min, LIMITES.cambioObservable.max)) {
    avisos.push(aviso('VAGUE_RESULT', true));
  } else if (dependeDeUnTercero(o.cambioObservable)) {
    avisos.push(aviso('THIRD_PARTY_CONTROL', true));
  } else if (esVago(o.cambioObservable)) {
    avisos.push(aviso('VAGUE_RESULT', false));
  }
  if (!o.evidencia.trim()) avisos.push(aviso('MISSING_EVIDENCE', true));
  if (!largoEntre(o.motivo, LIMITES.motivo.min, LIMITES.motivo.max)) avisos.push(aviso('VAGUE_RESULT', true));
  else if (dependeDeUnTercero(o.motivo)) avisos.push(aviso('THIRD_PARTY_CONTROL', false));
  return dedupe(avisos);
}

export function calidadObjetivo(o: Objetivo): AvisoCalidad[] {
  if (o.area === 'salud') return calidadSalud(o);
  if (o.area === 'negocio_dinero') return calidadNegocio(o);
  return calidadRelaciones(o);
}

export function objetivoValido(o: Objetivo): boolean {
  return !calidadObjetivo(o).some(a => a.bloquea);
}

function dedupe(avisos: AvisoCalidad[]): AvisoCalidad[] {
  const vistos = new Set<string>();
  return avisos.filter(a => {
    if (vistos.has(a.codigo)) return false;
    vistos.add(a.codigo);
    return true;
  });
}

// ------------------------------------------------------------------------------------------
// Redacción SMART (§4). Determinista, con los datos declarados y nada más: "sin invención".
// ------------------------------------------------------------------------------------------

const VERBO_SALUD: Record<TipoResultadoSalud, string> = {
  peso: 'pesaré', medidas: 'mediré', energia: 'tendré una energía de', fuerza: 'levantaré',
  resistencia: 'sostendré', sueno: 'dormiré', condicion_clinica: 'tendré', otro: 'alcanzaré',
};

const VERBO_NEGOCIO: Record<TipoResultadoNegocio, string> = {
  facturacion: 'facturaré', utilidad: 'tendré una utilidad de', ventas: 'venderé', clientes: 'tendré',
  ahorro: 'habré ahorrado', deuda: 'habré reducido mi deuda a', ingreso_personal: 'tendré un ingreso personal de',
  otro: 'alcanzaré',
};

const ETIQUETA_PERIODO: Record<PeriodoMedicion, string> = {
  semanal: 'semanales', mensual: 'mensuales', acumulado_dia_90: 'acumulados al Día 90',
};

function sinPuntoFinal(texto: string): string {
  return texto.trim().replace(/[.。]+$/, '');
}

export function redactarSalud(o: ObjetivoSalud): string {
  if (!o.tipoResultado || !o.resultadoDia90.trim() || !o.lineaBase.trim()) return '';
  const unidad = o.unidad.trim();
  const con = unidad ? ` ${unidad}` : '';
  const partes = [`Al Día 90 ${VERBO_SALUD[o.tipoResultado]} ${o.resultadoDia90.trim()}${con}, partiendo de ${o.lineaBase.trim()}${con}`];
  if (o.evidencia.trim()) partes.push(`con evidencia en ${sinPuntoFinal(o.evidencia)}`);
  if (o.motivo.trim()) partes.push(`porque ${sinPuntoFinal(o.motivo)}`);
  return partes.join(', ') + '.';
}

export function redactarNegocio(o: ObjetivoNegocio): string {
  if (!o.tipoResultado || !o.resultadoDia90.trim() || !o.lineaBase.trim()) return '';
  const m = o.moneda.trim();
  const periodo = o.periodo ? ` ${ETIQUETA_PERIODO[o.periodo]}` : '';
  const partes = [
    `Al Día 90 ${VERBO_NEGOCIO[o.tipoResultado]} ${m} ${o.resultadoDia90.trim()}${periodo}, partiendo de ${m} ${o.lineaBase.trim()}`,
  ];
  if (o.evidencia.trim()) partes.push(`con evidencia en ${sinPuntoFinal(o.evidencia)}`);
  if (o.motivo.trim()) partes.push(`porque ${sinPuntoFinal(o.motivo)}`);
  return partes.join(', ') + '.';
}

export function redactarRelaciones(o: ObjetivoRelaciones): string {
  if (!o.vinculo || o.situacionActual === null || o.resultadoDia90 === null) return '';
  const vinculo = VINCULOS.find(v => v.clave === o.vinculo)?.etiqueta ?? o.vinculo;
  const partes = [`Al Día 90 mi conexión con ${vinculo} pasará de ${o.situacionActual}/10 a ${o.resultadoDia90}/10`];
  if (o.cambioObservable.trim()) partes.push(sinPuntoFinal(o.cambioObservable));
  if (o.evidencia.trim()) partes.push(`con evidencia en ${sinPuntoFinal(o.evidencia)}`);
  if (o.motivo.trim()) partes.push(`porque ${sinPuntoFinal(o.motivo)}`);
  return partes.join(', ') + '.';
}

export function redactar(o: Objetivo): string {
  if (o.area === 'salud') return redactarSalud(o);
  if (o.area === 'negocio_dinero') return redactarNegocio(o);
  return redactarRelaciones(o);
}

// ------------------------------------------------------------------------------------------
// Hitos sugeridos (§3 V08): progresión, NO división lineal. 40 % al Día 30, 75 % al Día 60.
// ------------------------------------------------------------------------------------------

const AVANCE_ESPERADO: Record<DiaHito, number> = { 30: 0.4, 60: 0.75, 90: 1 };

function redondear(n: number): string {
  const abs = Math.abs(n);
  const decimales = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return String(Number(n.toFixed(decimales)));
}

export function hitosSugeridos(o: Objetivo): Hito[] {
  if (o.area === 'relaciones') {
    const a = o.situacionActual ?? 0;
    const b = o.resultadoDia90 ?? a;
    return DIAS_HITO.map(dia => ({
      area: o.area, dia, valor: `${Math.round(a + (b - a) * AVANCE_ESPERADO[dia])}/10`,
    }));
  }
  const base = aNumero(o.lineaBase);
  const meta = aNumero(o.resultadoDia90);
  const unidad = o.area === 'salud' ? o.unidad.trim() : o.moneda.trim();
  if (base === null || meta === null) {
    return DIAS_HITO.map(dia => ({ area: o.area, dia, valor: '' }));
  }
  return DIAS_HITO.map(dia => {
    const valor = base + (meta - base) * AVANCE_ESPERADO[dia];
    const texto = o.area === 'salud' ? `${redondear(valor)} ${unidad}`.trim() : `${unidad} ${redondear(valor)}`.trim();
    return { area: o.area, dia, valor: texto };
  });
}

/** Mantiene lo que la persona ya editó y solo sugiere para los hitos vacíos. */
export function completarHitos(mapa: MapaRenacimiento): Hito[] {
  const existentes = new Map(mapa.hitos.map(h => [`${h.area}-${h.dia}`, h]));
  const resultado: Hito[] = [];
  for (const area of AREAS) {
    const objetivo = area === 'salud' ? mapa.salud : area === 'negocio_dinero' ? mapa.negocio : mapa.relaciones;
    const sugeridos = hitosSugeridos(objetivo);
    for (const s of sugeridos) {
      const previo = existentes.get(`${area}-${s.dia}`);
      resultado.push(previo && previo.valor.trim() ? previo : s);
    }
  }
  return resultado;
}

// ------------------------------------------------------------------------------------------
// Acciones (§3 V06), reemplazos (V07), retorno (V09), definición de terminado (§1.2).
// ------------------------------------------------------------------------------------------

export function accionValida(a: AccionMotora): boolean {
  return largoEntre(a.texto, LIMITES.accion.min, LIMITES.accion.max)
    && !esVago(a.texto)
    && a.frecuenciaSemanal >= 1 && a.frecuenciaSemanal <= 7
    && a.dias.length === a.frecuenciaSemanal
    && a.evidencia !== null;
}

export function accionesPorArea(acciones: AccionMotora[], area: Area): AccionMotora[] {
  return acciones.filter(a => a.area === area);
}

export function sistemaEjecucionValido(acciones: AccionMotora[]): boolean {
  if (acciones.length < 3 || acciones.length > LIMITES.accionesTotales) return false;
  for (const area of AREAS) {
    const n = accionesPorArea(acciones, area).length;
    if (n < 1 || n > LIMITES.accionesPorObjetivo) return false;
  }
  return acciones.every(accionValida);
}

export function avisosDeCarga(acciones: AccionMotora[]): AvisoCalidad[] {
  const total = acciones.reduce((s, a) => s + a.frecuenciaSemanal, 0);
  return total > LIMITES.cargaSemanalMaxima ? [aviso('UNREALISTIC_LOAD', false)] : [];
}

export function reemplazoValido(r: ProtocoloReemplazo): boolean {
  return r.patron.trim().length > 0
    && largoEntre(r.disparador, LIMITES.textoCorto.min, LIMITES.textoCorto.max)
    && largoEntre(r.conductaActual, LIMITES.textoCorto.min, LIMITES.textoCorto.max)
    && largoEntre(r.respuestaAlternativa, LIMITES.textoCorto.min, LIMITES.textoCorto.max)
    && !esVago(r.respuestaAlternativa);
}

/**
 * El "Cuando" que la persona ya escribió al principio de su disparador.
 *
 * La plantilla antepone «Cuando », y el campo se pide con el placeholder *"Cuándo, dónde o ante qué
 * ocurre"* — que invita justamente a empezar la frase con "Cuando". El resultado era
 * *"**Cuando Cuando** abro el celular en la cama"*, visible en el resumen del paso 10 y en el panel
 * del mentor. Se quita del dato al redactar y no del campo al escribir: lo que la persona tipeó es
 * suyo y se respeta; lo que se corrige es cómo se compone la frase.
 *
 * Con y sin tilde, porque las dos formas se escriben: `Cuando` y `Cuándo`.
 */
function sinCuandoInicial(texto: string): string {
  return texto.trim().replace(/^cu[aá]ndo\s+/i, '');
}

/** Formato de guardado del manual: "Cuando [disparador], en lugar de [conducta], haré [respuesta]." */
export function frasearReemplazo(r: ProtocoloReemplazo): string {
  const disparador = sinCuandoInicial(sinPuntoFinal(r.disparador));
  return `Cuando ${disparador}, en lugar de ${sinPuntoFinal(r.conductaActual)}, haré ${sinPuntoFinal(r.respuestaAlternativa)}.`;
}

export function reemplazosValidos(reemplazos: ProtocoloReemplazo[]): boolean {
  return reemplazos.length >= 1 && reemplazos.length <= LIMITES.reemplazos && reemplazos.every(reemplazoValido);
}

export function retornoValido(texto: string): boolean {
  return largoEntre(texto, LIMITES.retorno.min, LIMITES.retorno.max) && !esVago(texto);
}

export function hitosCompletos(hitos: Hito[]): boolean {
  return hitos.length === 9 && hitos.every(h => h.valor.trim().length > 0);
}

/**
 * Qué le falta a UNA acción para ser válida, en las palabras del aprendiz.
 *
 * Es el compañero de `accionValida`: aquélla decide, ésta explica. Se escriben juntas a propósito —
 * si alguien agrega una condición allá y no acá, el botón vuelve a quedarse mudo.
 */
export function faltantesDeAccion(a: AccionMotora): string[] {
  const faltan: string[] = [];
  if (a.texto.trim().length < LIMITES.accion.min) faltan.push('escribir la acción');
  else if (a.texto.trim().length > LIMITES.accion.max) faltan.push('acortar la acción');
  else if (esVago(a.texto)) faltan.push('decir la acción con un verbo concreto');
  if (a.frecuenciaSemanal < 1 || a.frecuenciaSemanal > 7) faltan.push('una frecuencia de 1 a 7 veces');
  else if (a.dias.length !== a.frecuenciaSemanal) faltan.push(`marcar ${a.frecuenciaSemanal} días`);
  if (a.evidencia === null) faltan.push('elegir con qué evidencia la vas a probar');
  return faltan;
}

/** Qué falta en el paso 6, nombrando el área para que se sepa dónde mirar. */
export function faltantesDelSistema(acciones: AccionMotora[]): string[] {
  const faltan: string[] = [];
  for (const area of AREAS) {
    const propias = accionesPorArea(acciones, area);
    if (propias.length < 1) {
      faltan.push(`al menos una acción en ${ETIQUETA_AREA[area].toLowerCase()}`);
      continue;
    }
    if (propias.length > LIMITES.accionesPorObjetivo) {
      faltan.push(`dejar como máximo ${LIMITES.accionesPorObjetivo} acciones en ${ETIQUETA_AREA[area].toLowerCase()}`);
      continue;
    }
    // Se nombra el área y no el número de acción: "la segunda" no le dice nada a nadie.
    const suyos = propias.flatMap(faltantesDeAccion);
    for (const f of [...new Set(suyos)]) {
      faltan.push(`${f} en ${ETIQUETA_AREA[area].toLowerCase()}`);
    }
  }
  if (acciones.length > LIMITES.accionesTotales) {
    faltan.push(`dejar como máximo ${LIMITES.accionesTotales} acciones en total`);
  }
  return faltan;
}

/** Qué falta en el paso 7. */
export function faltantesDeReemplazos(reemplazos: ProtocoloReemplazo[]): string[] {
  if (reemplazos.length === 0) return ['elegir al menos un comportamiento'];
  if (reemplazos.length > LIMITES.reemplazos) return [`dejar como máximo ${LIMITES.reemplazos} comportamientos`];
  return reemplazos.every(reemplazoValido) ? [] : ['completar los tres campos de cada comportamiento'];
}

/** Qué falta en el paso 8. */
export function faltantesDeHitos(hitos: Hito[]): string[] {
  return hitosCompletos(hitos) ? [] : ['completar los nueve hitos (30, 60 y 90 de cada objetivo)'];
}

/** Qué falta en el paso 9. */
export function faltantesDelRetorno(texto: string): string[] {
  const limpio = texto.trim();
  if (limpio.length < LIMITES.retorno.min) return ['escribir tu acción de retorno'];
  if (limpio.length > LIMITES.retorno.max) return ['acortar tu acción de retorno'];
  return esVago(limpio) ? ['decir el retorno con una acción concreta'] : [];
}

/** §1.2: lo que tiene que existir, confirmado, para que el mapa pueda activarse. */
export function definicionDeTerminado(mapa: MapaRenacimiento): { listo: boolean; faltantes: string[] } {
  const faltantes: string[] = [];
  if (!mapa.prioridad) faltantes.push('la prioridad principal');
  if (!objetivoValido(mapa.salud)) faltantes.push('el objetivo de cuerpo y salud');
  if (!objetivoValido(mapa.negocio)) faltantes.push('el objetivo de negocio y dinero');
  if (!objetivoValido(mapa.relaciones)) faltantes.push('el objetivo de relaciones');
  if (!sistemaEjecucionValido(mapa.acciones)) faltantes.push('las acciones semanales (1 a 2 por objetivo)');
  if (!reemplazosValidos(mapa.reemplazos)) faltantes.push('los patrones a reemplazar (1 a 3, completos)');
  if (!hitosCompletos(mapa.hitos)) faltantes.push('los nueve hitos');
  if (!retornoValido(mapa.retorno)) faltantes.push('el protocolo de retorno');
  return { listo: faltantes.length === 0, faltantes };
}

/** Sugerencias de retorno (V09): salen de las acciones que ya eligió, no de una lista genérica. */
export function sugerenciasDeRetorno(mapa: MapaRenacimiento): string[] {
  const propias = mapa.acciones
    .map(a => a.texto.trim())
    .filter(t => t.length > 0)
    .map(t => `${t.charAt(0).toUpperCase()}${t.slice(1)} (versión corta, 10 minutos)`);
  const base = [
    'Revisar mi mapa y completar una acción pendiente en menos de 20 minutos',
    'Caminar 20 minutos',
    'Revisar mis notas',
    'Planificar el día',
  ];
  return [...propias.slice(0, 3), ...base].slice(0, 6);
}

/** Frecuencia y días coherentes (V06): al cambiar la frecuencia se recortan o se completan días. */
export function ajustarDias(dias: DiaSemana[], frecuencia: number): DiaSemana[] {
  if (dias.length === frecuencia) return dias;
  if (dias.length > frecuencia) return DIAS_SEMANA.filter(d => dias.includes(d)).slice(0, frecuencia);
  const faltan = DIAS_SEMANA.filter(d => !dias.includes(d)).slice(0, frecuencia - dias.length);
  return DIAS_SEMANA.filter(d => dias.includes(d) || faltan.includes(d));
}

// ------------------------------------------------------------------------------------------
// El objetivo del MES vivía acá. Ahora lo calcula el servidor.
//
// > **Corregido el 2026-09-22.** Esta sección traducía un objetivo del Mapa a lo que el motor de
// > `objetivos/utils/objetivoMensual.ts` necesitaba, y repartía lo que faltaba entre los meses que
// > quedaban. El problema no era la cuenta: era que había DOS. Para 84 → 78 kg, `hitosSugeridos`
// > (acá abajo, progresión 40 / 75 / 100 % del manual del cliente §3 V08) decía que el Día 30
// > cerraba en **81,6 kg**, y esta sección decía **82**. Las dos respondían "qué logro este mes".
// >
// > Quedó una sola, en `rocks.domain.rocamensual.CalculadoraObjetivoMensual`, que usa la curva de
// > los hitos y además la recalcula contra el valor real de hoy — o sea, conserva lo que aportaba
// > cada una. La app la lee por `GET /api/v1/rocks/monthly/plan`. Se borró todo lo de acá en vez de
// > dejarlo "por si acaso": una segunda implementación de la misma regla es exactamente lo que
// > produjo el bug, y el servidor además sabe algo que esta capa no —qué se mide en cada eje, que
// > vive en las respuestas del Mapa y no en la Roca Maestra—.
//
// `hitosSugeridos` SÍ se queda: dibuja la progresión el día 7, cuando la persona todavía está
// llenando el Mapa y no existe ninguna Roca Maestra que el servidor pueda repartir.
// ------------------------------------------------------------------------------------------
