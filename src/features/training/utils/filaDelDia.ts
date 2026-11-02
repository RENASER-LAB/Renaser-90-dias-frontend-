import type { IconName } from '../../../components/Icon';
import type { RelacionConHoy } from './semanaDeTraining';
import type { MarcaDelPrimero } from './listaDelDia';
import { TEXTO_DE_LA_MARCA } from './listaDelDia';
import type { ItemDelDia } from './itemsDelDia';
import { ETIQUETA_DEL_BOTON_DEL_RITUAL, seRegistraConTexto } from '../../habits/utils/registroConFoto';
import { CLAVES_CON_FLUJO_PROPIO } from './registroConFotoEnTraining';

/**
 * Qué hace cada fila de Training y qué dice (spec 014). Lógica pura: no registra nada, solo decide a dónde lleva
 * el toque y qué se dibuja; el registro en sí sigue siendo el de siempre (`TrainingScreen`).
 */

/** En qué estado se mira la fila: define el control de la derecha y qué pasa al tocarla. */
export type ModoDeLaFila = 'hoy' | 'atrasado' | 'hecho' | 'cerrado' | 'planificado';

/** Los hábitos que se cierran con el ✓ sin abrir nada: Despertar/Dormir (registran la hora) y los de evidencia opcional. */
const CLAVES_SOLO_HORA: ReadonlySet<string> = new Set(['WAKE_UP', 'SLEEP']);

export function esSoloHora(systemKey: string | null | undefined): boolean {
  return !!systemKey && CLAVES_SOLO_HORA.has(systemKey);
}

/**
 * ¿El ✓ de la fila cierra el hábito sin abrir nada? Es el camino de `toggleHabitState` que termina en
 * `registrarSoloHora` o `completarHabitoSimple`: Despertar y Dormir, y los hábitos de evidencia opcional que no
 * tienen flujo propio. Los que exigen la foto, la Pastilla, la Audioterapia, la Clase y el post abren su registro.
 */
export function seCierraConElCheck(item: Pick<ItemDelDia, 'tipo' | 'habit'>): boolean {
  const h = item.habit;
  if (item.tipo !== 'habito' || !h) return false;
  if (esSoloHora(h.systemKey)) return true;
  if (h.systemKey && CLAVES_CON_FLUJO_PROPIO.has(h.systemKey)) return false;
  return h.evidenceRequirement !== 'REQUIRED';
}

/**
 * ¿Es un hábito de evidencia OPCIONAL sin flujo propio? (Escritura libre nocturna, Día sin celular, Descanso profundo,
 * los dos del domingo y cualquier hábito propio opcional.) Tiene las DOS cosas de la tarjeta de master: el ✓, que lo
 * cierra sin evidencia (`completarHabitoSimple`), y «Subir», que abre `EvidenciaHabitoModal` con las cuatro formas.
 * Despertar y Dormir (solo la hora) y los de flujo propio no entran.
 */
export function esOpcionalConEvidencia(item: Pick<ItemDelDia, 'tipo' | 'habit'>): boolean {
  const h = item.habit;
  if (item.tipo !== 'habito' || !h) return false;
  if (esSoloHora(h.systemKey)) return false;
  if (h.systemKey && CLAVES_CON_FLUJO_PROPIO.has(h.systemKey)) return false;
  return h.evidenceRequirement !== 'REQUIRED';
}

/**
 * La plantilla de catálogo de «Última comida del día» (`habitos.id`, el mismo en todos los entornos: los ids de producción se
 * preservaron en V4). Es opcional y el dueño la quiere con el círculo (2026-10-31), no con «Subir»: se reconoce por su id de
 * plantilla, **nunca por el título** (no tiene `clave_sistema`, y el título se muestra en tipo oración y el aprendiz lo puede
 * cambiar). En otro entorno donde el id no coincida la fila simplemente queda con «Subir», como los demás opcionales.
 */
export const ID_DE_LA_PLANTILLA_ULTIMA_COMIDA = '3a8a82a0-787d-46bc-a69e-b29c110a37bc';

/** ¿Es la «Última comida del día»? Por el id de su plantilla de catálogo. */
export function esUltimaComidaDelDia(item: Pick<ItemDelDia, 'tipo' | 'habit'>): boolean {
  return item.tipo === 'habito' && item.habit?.habitoId === ID_DE_LA_PLANTILLA_ULTIMA_COMIDA;
}

export type ControlDeLaFila =
  /** El ✓ de la derecha: marca sin abrir nada (Despertar y Dormir, que registran la hora). */
  | 'check'
  /**
   * Los hábitos de evidencia OPCIONAL sin flujo propio: solo la píldora «Subir», como botón aparte, que abre las cuatro
   * formas (foto, texto, audio o video). Tocar el nombre abre la hoja con «Subir evidencia» y «Marcar como hecho».
   * > Corregido 2026-10-30 (el dueño eligió «Solo «Subir»»: el círculo al lado le quitaba lo simple). Antes era
   * > `check-y-accion`: la píldora y el ✓ en la misma fila.
   * > Corregido 2026-10-31: «Última comida del día» (`esUltimaComidaDelDia`) vuelve a llevar el círculo (`check`) en lugar de
   * > «Subir»; los demás opcionales siguen con «Subir».
   */
  | 'subir'
  /** La píldora con lo que pasa al tocar la fila («Tomar foto»…): no es un botón aparte, la fila entera lo es. */
  | 'accion'
  | 'hecho'
  | 'candado'
  | 'evento'
  | 'nada';

export function controlDeLaFila(item: ItemDelDia, modo: ModoDeLaFila, esHoy = true): ControlDeLaFila {
  if (modo === 'planificado') return 'nada';
  if (modo === 'hecho') return 'hecho';
  if (modo === 'cerrado') return 'candado';
  // Regla del dueño: en un día que no es hoy NUNCA hay ✓, ni «Subir», ni nada con lo que registrar. Aunque
  // `modoEnOtroDia` ya no devuelve `hoy` ni `atrasado`, la regla se dice aquí y se prueba.
  if (!esHoy) return 'nada';
  if (item.tipo === 'evento') return 'evento';
  if (item.cerrado) return 'candado';
  /* «Última comida del día» es opcional pero se marca con el círculo, como Despertar y Dormir (2026-10-31, pedido del dueño):
     es la corrección del ajuste del 30/10, que dejó solo «Subir» en la evidencia opcional; solo para esta. */
  if (esOpcionalConEvidencia(item)) return esUltimaComidaDelDia(item) ? 'check' : 'subir';
  return seCierraConElCheck(item) ? 'check' : 'accion';
}

/** El modo de una fila en el día de HOY. */
export function modoDeHoy(seccion: 'enCurso' | 'sinHora' | 'atrasados' | 'cerrados' | 'hechos'): ModoDeLaFila {
  if (seccion === 'hechos') return 'hecho';
  if (seccion === 'cerrados') return 'cerrado';
  if (seccion === 'atrasados') return 'atrasado';
  return 'hoy';
}

/** El modo de una fila en un día que no es hoy. Un día anterior leído del servidor: ✓ o candado; si no, solo planificado. */
export function modoEnOtroDia(item: ItemDelDia, relacion: RelacionConHoy, conLecturaDelServidor: boolean): ModoDeLaFila {
  if (relacion === 'pasado' && conLecturaDelServidor && item.tipo !== 'evento') return item.hecho ? 'hecho' : 'cerrado';
  return 'planificado';
}

/* ------------------------------------------------------------------------------------------------
 * A dónde lleva el toque
 * ---------------------------------------------------------------------------------------------- */

export type DestinoDelToque =
  /** La hoja del hábito: nombre, guía plegada y el registro de su tipo. Solo HOY. */
  | 'hoja'
  /** El registro de siempre, sin pasar por la hoja (no hay guía que mostrar, o es la ventana de solo lectura). Solo HOY. */
  | 'registro'
  /** El detalle del evento en Comunidad → Eventos. Solo HOY. */
  | 'evento'
  /** Un día anterior, lo cumplido: solo se dice «Ya hecho». No abre nada. */
  | 'ya-hecho'
  /** Un día anterior, lo no cumplido: solo se dice que ese día ya cerró. No abre nada. */
  | 'candado'
  | 'nada';

/**
 * A dónde lleva tocar una fila.
 *
 * - **Una sola hoja**: con guía, la hoja muestra la guía plegada y el registro de su tipo. Sin guía no hay nada
 *   que mostrar antes: el toque abre directo el registro de siempre (que es su propia hoja o la cámara), sin otro
 *   «Subir» de por medio. Despertar y Dormir sí pasan por la hoja: «Marcar como hecho» registra la hora al
 *   instante y pide una confirmación.
 * - **Lo hecho** abre la hoja con lo que se registró; la Pastilla y la Clase diaria conservan su ventana de solo
 *   lectura (`muestraElCumplidoEnLaTarjeta`) y la Audioterapia y el post, la hoja.
 * - **Lo cerrado de hoy** (su día ya cerró) abre el aviso de siempre («Este hábito era del 5 de octubre; ese día ya cerró»).
 * - **Los eventos de hoy** llevan a su detalle.
 * - **Un día que no es hoy** (regla del dueño: «nunca debería llegar» a subir algo): tocar una fila solo dice «Ya
 *   hecho» o que ese día ya cerró. No abre hoja, ni cámara, ni evento, ni nada más; lo que viene no tiene botones.
 */
export function destinoDelToque(item: ItemDelDia, modo: ModoDeLaFila, esHoy = true): DestinoDelToque {
  if (!esHoy) {
    if (modo === 'hecho') return 'ya-hecho';
    if (modo === 'cerrado') return 'candado';
    return 'nada';
  }
  if (item.tipo === 'evento') return 'evento';
  if (modo === 'planificado') return 'nada';
  if (modo === 'cerrado') return 'registro';
  if (modo === 'hecho') {
    const h = item.habit;
    const seReleeEnSuVentana = !!h && (h.systemKey === 'PASTILLA_RENACER' || h.systemKey === 'DAILY_CLASS');
    return seReleeEnSuVentana ? 'registro' : 'hoja';
  }
  if (item.tipo === 'accion') return 'hoja';
  if (item.guia || esSoloHora(item.habit?.systemKey)) return 'hoja';
  // Evidencia opcional: la hoja trae «Subir evidencia» y «Marcar como hecho» (la fila ya no tiene el ✓; 30/10).
  if (esOpcionalConEvidencia(item)) return 'hoja';
  return 'registro';
}

/* ------------------------------------------------------------------------------------------------
 * Lo que dice la fila
 * ---------------------------------------------------------------------------------------------- */

/**
 * La segunda línea de la fila: de qué es y cuánto paga («Cuerpo · 8 pts»). Atrasada, lo de D-259: «Todavía puedes
 * registrarlo hoy, con menos puntos» (que ya existe en `avisoDeHoraPasada`). El primero de la lista la abre con
 * «Te toca ahora» o «Lo que sigue».
 */
export function subtituloDeLaFila(
  item: ItemDelDia,
  modo: ModoDeLaFila,
  marca: MarcaDelPrimero | null,
  ahoraMs: number,
): { marca: string | null; texto: string; tonoDeAviso: boolean } {
  const textoDeLaMarca = marca ? TEXTO_DE_LA_MARCA[marca] : null;
  // Pedido del dueño (2026-10-29, dos veces): la fila es solo el nombre, sin «Cuerpo · 8 pts», «Acción de tus
  // objetivos», «Evento · Zoom» ni «Te toca ahora» a la vista; eso va en la hoja o en lo que oye el lector de pantalla.
  // Lo atrasado tampoco repite nada: el encabezado de su sección ya dice «Se te pasó la hora · todavía puedes cumplir tu
  // compromiso» una vez, y la hoja lo vuelve a decir al abrirlo. Repetido en cada fila era ruido (E2E del 29/10). El
  // lector de pantalla lo oye en cada fila (`etiquetaDeLaFila`).
  void ahoraMs;
  return { marca: textoDeLaMarca, texto: '', tonoDeAviso: false };
}

/* ------------------------------------------------------------------------------------------------
 * La hoja
 * ---------------------------------------------------------------------------------------------- */

export interface AccionDeLaHoja {
  /** `marcar` cierra al instante (registra la hora); `registrar` abre el registro de su tipo. */
  tipo: 'marcar' | 'registrar';
  etiqueta: string;
  icono: IconName;
  /** Una línea chica bajo el botón. */
  nota: string | null;
}

/**
 * El botón principal de la hoja de un hábito o una acción pendiente. Lo que hace es lo mismo que el botón de la
 * derecha de la tarjeta de antes (`openEvidenceModal`): la hoja no inventa un registro nuevo.
 */
export function accionDeLaHoja(item: ItemDelDia): AccionDeLaHoja {
  const h = item.habit;
  if (item.tipo === 'habito' && esSoloHora(h?.systemKey)) {
    return { tipo: 'marcar', etiqueta: 'Marcar como hecho', icono: 'check', nota: 'Registra la hora en que lo hiciste.' };
  }
  switch (h?.systemKey) {
    case 'PASTILLA_RENACER':
    case 'AUDIO_THERAPY_WEEKLY':
      return { tipo: 'registrar', etiqueta: 'Escuchar el audio', icono: 'headphones', nota: null };
    case 'DAILY_CLASS':
      return { tipo: 'registrar', etiqueta: 'Ver la clase', icono: 'bookOpen', nota: null };
    case 'COMMUNITY_POST':
      return { tipo: 'registrar', etiqueta: 'Publicar en el Muro', icono: 'newspaper', nota: null };
    default:
      break;
  }
  if (item.tipo === 'accion') {
    return { tipo: 'registrar', etiqueta: 'Marcar como hecha', icono: 'check', nota: 'Para cambiar su hora: Plan → Agendar.' };
  }
  // Los rituales piden solo texto (2026-10-31): en lugar de «Tomar foto», un botón para escribir.
  if (seRegistraConTexto(h?.systemKey)) {
    return { tipo: 'registrar', etiqueta: ETIQUETA_DEL_BOTON_DEL_RITUAL, icono: 'pencil', nota: null };
  }
  if (h?.evidenceRequirement === 'REQUIRED') {
    return { tipo: 'registrar', etiqueta: 'Tomar foto', icono: 'camera', nota: null };
  }
  return { tipo: 'registrar', etiqueta: 'Subir evidencia', icono: 'camera', nota: 'Foto, texto, audio o video. Es opcional.' };
}

/**
 * El segundo botón de la hoja, solo en los hábitos de evidencia opcional: «Marcar como hecho» los cierra sin evidencia, igual
 * que el ✓ de la fila. El principal (`accionDeLaHoja`) abre las cuatro formas. En el resto no hay segundo botón.
 */
export function accionSecundariaDeLaHoja(item: ItemDelDia): AccionDeLaHoja | null {
  if (!esOpcionalConEvidencia(item)) return null;
  return { tipo: 'marcar', etiqueta: 'Marcar como hecho', icono: 'check', nota: null };
}

/** «Cumplido a las 06:12 · +8 pts»: lo que registró el servidor. Sin la hora o los puntos, no se inventan. */
export function lineaDelCumplido(cumplido: NonNullable<ItemDelDia['cumplido']>): string {
  const puntos = typeof cumplido.puntos === 'number' && cumplido.puntos > 0 ? ` · +${cumplido.puntos} pts` : '';
  return `Cumplido${cumplido.hora ? ` a las ${cumplido.hora}` : ''}${puntos}`;
}

/** La línea de meta de la hoja: «Cuerpo · 06:00 · 8 pts». */
export function metaDeLaHoja(item: ItemDelDia, modo: ModoDeLaFila): string {
  const partes: string[] = [];
  if (item.dimension) partes.push(item.dimension);
  partes.push(item.hora ?? 'sin hora');
  if (item.puntos != null && modo === 'hoy') partes.push(`${item.puntos} pts`);
  // La racha (D-254) la calcula el servidor; sin el dato —un backend anterior, una acción— no se dibuja, nunca «0 días».
  const racha = item.habit?.streak;
  if (racha != null && (modo === 'hoy' || modo === 'atrasado' || modo === 'hecho')) {
    partes.push(`racha de ${racha} ${racha === 1 ? 'día' : 'días'}`);
  }
  return partes.join(' · ');
}

export const TEXTO_DE_DIA_CERRADO = 'Ese día ya cerró. No se puede registrar.';
export const TEXTO_YA_HECHO = 'Ya hecho';
export const TEXTO_SIN_LECTURA_DEL_DIA = 'Lo que hiciste ese día está en Yo → Mis evidencias.';
