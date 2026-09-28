import {
  cajaIncompletaSchema,
  type DetalleDeCaja,
  type FondoDeLaCarta,
  type MiCaja,
  type PasoDelHistorial,
} from '../api/cajaSchemas';

/**
 * Qué dice y qué ofrece cada estado de la Caja Renaser (spec §2). Todo lo que la pantalla decide
 * vive acá, sin React, para probarlo sin dibujar nada.
 *
 * Pocas palabras, a pedido del dueño: «no debe contener mucho texto que se maree el usuario o
 * administrador».
 */

/** Las pestañas de la lista del Admin, en el orden en que avanza una caja. */
export const ESTADOS_DE_LA_LISTA = [
  'EN_EVALUACION',
  'POR_REVISAR',
  'ARMANDO',
  'ENVIADA',
  'ENTREGADA',
  'CON_PROBLEMA',
  'EN_PAUSA',
  'FUERA_DE_LA_APP',
] as const;

export type EstadoDeLaLista = (typeof ESTADOS_DE_LA_LISTA)[number];

/** La pestaña con la que abre la lista: la que tiene trabajo por hacer. */
export const PESTANA_INICIAL: EstadoDeLaLista = 'POR_REVISAR';

const PARA_EL_ADMIN: Record<string, string> = {
  NO_APLICA: 'Todavía no aplica',
  EN_EVALUACION: 'En evaluación',
  POR_REVISAR: 'Por revisar',
  ARMANDO: 'Armando',
  ENVIADA: 'Enviada',
  ENTREGADA: 'Entregada',
  CON_PROBLEMA: 'Con problema',
  EN_PAUSA: 'En pausa',
  FUERA_DE_LA_APP: 'Fuera de la app',
};

/** El nombre del estado para el Admin y el mentor. Uno desconocido se ve crudo, no en blanco. */
export function etiquetaDelEstado(estado: string): string {
  return PARA_EL_ADMIN[estado] ?? estado;
}

const PARA_EL_APRENDIZ: Record<string, string> = {
  EN_EVALUACION: 'En evaluación',
  POR_REVISAR: 'En revisión',
  ARMANDO: 'Armando tu caja',
  ENVIADA: 'En camino',
  ENTREGADA: 'Entregada',
  CON_PROBLEMA: 'Estamos resolviendo tu envío',
};

/**
 * Lo que ve el aprendiz, o `null` si no ve nada: `NO_APLICA` (antes del día 8), `EN_PAUSA` y
 * `FUERA_DE_LA_APP` no se le muestran (spec §2). Un estado desconocido tampoco: mejor nada que un
 * nombre interno en la cara de un aprendiz.
 */
export function etiquetaParaElAprendiz(estado: string | null | undefined): string | null {
  return estado ? PARA_EL_APRENDIZ[estado] ?? null : null;
}

/** El chip de la ficha (Admin y mentor): sin chip antes del día 8. */
export function etiquetaDelChip(estado: string | null | undefined): string | null {
  if (!estado || estado === 'NO_APLICA') return null;
  return `Caja: ${etiquetaDelEstado(estado)}`;
}

// ─── Acciones del Admin ─────────────────────────────────────────────────────

export type AccionDeCaja = 'aprobar' | 'armar' | 'enviar' | 'entregada' | 'previa' | 'problema' | 'reenviar';

export const ETIQUETA_DE_ACCION: Record<AccionDeCaja, string> = {
  aprobar: 'Aprobar para la caja',
  armar: 'Empezar a armar',
  enviar: 'Marcar enviada',
  entregada: 'Marcar entregada',
  previa: 'Ya se envió antes',
  problema: 'Reportar problema',
  reenviar: 'Reenviar',
};

/**
 * Los botones de cada estado: uno principal (relleno) y los secundarios. Cada botón hace una sola
 * cosa. Si el servidor no la acepta (otro Admin se adelantó), responde 409 y se muestra su motivo.
 *
 * «Ya se envió antes» (spec §8) es para el padrón que ya recibió su caja a mano: se ofrece mientras
 * la caja no salió por la app.
 */
export function accionesDelEstado(estado: string): { principal: AccionDeCaja | null; secundarias: AccionDeCaja[] } {
  switch (estado) {
    case 'EN_EVALUACION':
      return { principal: 'aprobar', secundarias: ['previa'] };
    case 'POR_REVISAR':
      return { principal: 'armar', secundarias: ['previa'] };
    case 'ARMANDO':
      return { principal: 'enviar', secundarias: ['previa'] };
    case 'ENVIADA':
      return { principal: 'entregada', secundarias: ['problema'] };
    case 'CON_PROBLEMA':
      return { principal: 'reenviar', secundarias: ['entregada'] };
    default:
      return { principal: null, secundarias: [] };
  }
}

/** En `ARMANDO` se marca el contenido, se sube la foto y se llenan los datos del envío. */
export function seEstaArmando(estado: string): boolean {
  return estado === 'ARMANDO';
}

// ─── Qué falta para marcarla enviada ────────────────────────────────────────

export interface FormularioDeEnvio {
  medio: string;
  courier: string;
  codigo: string;
  costo: string;
}

export const FORMULARIO_VACIO: FormularioDeEnvio = { medio: '', courier: '', codigo: '', costo: '' };

const FALTA: Record<string, string> = {
  CONTENIDO: 'contenido',
  FOTO: 'foto de la caja',
  COMPROBANTE: 'comprobante',
};

/**
 * Lo que falta, en palabras cortas y en el orden de la pantalla: lo que dice el servidor
 * (`faltaParaEnviar`) y lo del formulario que el servidor exige (medio y código, spec §9). Vacío = se
 * puede marcar enviada.
 */
export function queFaltaParaEnviar(detalle: Pick<DetalleDeCaja, 'faltaParaEnviar'>, formulario: FormularioDeEnvio): string[] {
  const falta = (detalle.faltaParaEnviar ?? []).map(f => FALTA[f] ?? f.toLowerCase());
  if (!formulario.medio.trim()) falta.push('por dónde se envió');
  if (!formulario.codigo.trim()) falta.push('código');
  if (costoDelTexto(formulario.costo) === 'invalido') falta.push('costo válido');
  return falta;
}

/**
 * El 409 de «Marcar enviada» cuando falta algo trae `faltan` (`['FOTO', 'COMPROBANTE']`) y un
 * `message` con las claves en crudo («Para enviarla falta: [FOTO, COMPROBANTE]»). Esto lo dice con
 * las palabras de la pantalla, o `null` si el error no es ese (se muestra el mensaje de siempre).
 */
export function faltaSegunElServidor(error: unknown): string | null {
  const cuerpo = (error as { status?: number; body?: unknown } | null) ?? null;
  if (cuerpo?.status !== 409) return null;
  const leido = cajaIncompletaSchema.safeParse(cuerpo.body);
  if (!leido.success || leido.data.faltan.length === 0) return null;
  return textoDeLoQueFalta(leido.data.faltan.map(f => FALTA[f] ?? f.toLowerCase()));
}

export function textoDeLoQueFalta(falta: string[]): string | null {
  return falta.length > 0 ? `Falta: ${falta.join(', ')}` : null;
}

/** «12,50» o «12.50» → 12.5; vacío → `null`; lo que no es un número positivo → `'invalido'`. */
export function costoDelTexto(texto: string): number | null | 'invalido' {
  const limpio = texto.trim().replace(/^S\/\s*/i, '').replace(',', '.');
  if (!limpio) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return 'invalido';
  return Number(limpio);
}

/** El costo como se muestra: «S/ 12.50». */
export function textoDelCosto(costo: number | string | null | undefined): string | null {
  if (costo === null || costo === undefined || costo === '') return null;
  const n = typeof costo === 'number' ? costo : Number(String(costo).replace(',', '.'));
  return Number.isFinite(n) ? `S/ ${n.toFixed(2)}` : `S/ ${costo}`;
}

/** Los couriers que la app conoce (spec §6): se ofrecen como atajo, pero se puede escribir otro. */
export const COURIERS_CONOCIDOS = ['Olva', 'Shalom'] as const;

// ─── Problemas ──────────────────────────────────────────────────────────────

export const MOTIVOS_DE_PROBLEMA = [
  { valor: 'PERDIDA', etiqueta: 'Se perdió' },
  { valor: 'DANADA', etiqueta: 'Llegó dañada' },
  { valor: 'DEVUELTA', etiqueta: 'La devolvieron' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

// ─── Fechas e historial ─────────────────────────────────────────────────────

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * «28 sep». Un instante (`2026-09-28T03:10:00Z`) se lee en la zona del teléfono: esa madrugada UTC es
 * todavía el 27 en Lima. Una fecha sola (`2026-09-28`) se toma tal cual, sin pasar por `Date`, que la
 * leería como medianoche UTC y la correría un día.
 */
export function fechaCortaDe(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) return `${Number(soloFecha[3])} ${MESES[Number(soloFecha[2]) - 1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/**
 * En el historial, `POR_REVISAR` es siempre una aprobación del Admin (spec §11: el paso automático no
 * se guarda), así que se nombra por lo que pasó y no por el estado.
 */
const EN_EL_HISTORIAL: Record<string, string> = { POR_REVISAR: 'Aprobada' };

/** «Enviada · 28 sep · Ana» (y «Envío 2 ·» delante si es un reenvío). */
export function textoDelPaso(paso: PasoDelHistorial): string {
  const partes = [
    paso.envio && paso.envio > 1 ? `Envío ${paso.envio}` : null,
    EN_EL_HISTORIAL[paso.estado] ?? etiquetaDelEstado(paso.estado),
    fechaCortaDe(paso.en),
    paso.porNombre?.trim() || null,
  ];
  return partes.filter(Boolean).join(' · ');
}

// ─── Los pasos que ve el aprendiz ───────────────────────────────────────────

const PASOS_DEL_APRENDIZ = [
  { estado: 'EN_EVALUACION', etiqueta: 'En evaluación' },
  { estado: 'POR_REVISAR', etiqueta: 'En revisión' },
  { estado: 'ARMANDO', etiqueta: 'Armando' },
  { estado: 'ENVIADA', etiqueta: 'En camino' },
  { estado: 'ENTREGADA', etiqueta: 'Entregada' },
] as const;

export interface PasoDeMiCaja {
  estado: string;
  etiqueta: string;
  hecho: boolean;
  actual: boolean;
  fecha: string | null;
}

/**
 * Los cinco pasos, con cuál está hecho, cuál es el actual y su fecha (la última vez que pasó por ahí:
 * después de un reenvío vale la del envío nuevo). `CON_PROBLEMA` se muestra sobre «En camino».
 */
export function pasosDeMiCaja(caja: Pick<MiCaja, 'estado' | 'pasos'>): PasoDeMiCaja[] {
  const estadoEnLosPasos = caja.estado === 'CON_PROBLEMA' ? 'ENVIADA' : caja.estado;
  const indiceActual = PASOS_DEL_APRENDIZ.findIndex(p => p.estado === estadoEnLosPasos);
  return PASOS_DEL_APRENDIZ.map((paso, i) => {
    const registrado = [...(caja.pasos ?? [])].reverse().find(p => p.estado === paso.estado);
    return {
      estado: paso.estado,
      etiqueta: paso.etiqueta,
      hecho: indiceActual >= 0 && (i < indiceActual || (i === indiceActual && paso.estado === 'ENTREGADA')),
      actual: i === indiceActual,
      fecha: fechaCortaDe(registrado?.en ?? null),
    };
  });
}

/** «Olva · 123456», o `null` si no hay nada que decir del envío. */
export function textoDelEnvio(envio: { medio?: string | null; courier?: string | null; codigo?: string | null } | null | undefined): string | null {
  if (!envio) return null;
  const partes = [envio.courier?.trim() || envio.medio?.trim() || null, envio.codigo?.trim() || null];
  const texto = partes.filter(Boolean).join(' · ');
  return texto || null;
}

/** Solo se abre un enlace web: un `rastreoUrl` raro no se le pasa al sistema. */
export function rastreoAbrible(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

// ─── La carta ───────────────────────────────────────────────────────────────

/**
 * Qué fondo tiene la carta hoy, en pocas palabras: «Fondo original» o «Fondo nuevo · 28 sep · Ana».
 * Sin estado leído (falló la lectura), nada.
 */
export function textoDelFondo(fondo: FondoDeLaCarta | null): string | null {
  if (!fondo) return null;
  if (!fondo.cambiado) return 'Fondo original';
  return ['Fondo nuevo', fechaCortaDe(fondo.cambiadoEn), fondo.cambiadoPor?.trim() || null].filter(Boolean).join(' · ');
}
