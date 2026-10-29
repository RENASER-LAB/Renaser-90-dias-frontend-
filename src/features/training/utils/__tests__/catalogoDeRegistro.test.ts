import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import { accionDeLaHoja, accionSecundariaDeLaHoja, controlDeLaFila, destinoDelToque } from '../filaDelDia';
import type { ItemDelDia } from '../itemsDelDia';
import { CLAVES_CON_FLUJO_PROPIO, seRegistraConFoto } from '../registroConFotoEnTraining';

/**
 * Spec 014, observación del dueño (2026-10-29): «modificaste las reglas de hábitos: alguno no es solo foto, sino también
 * escritura». En master la tarjeta de CADA hábito tenía el ✓ (`toggleHabitState`) y la píldora de `accionDeLaTarjeta`
 * (`openEvidenceModal`); en un hábito de evidencia OPCIONAL sin flujo propio el ✓ cierra sin evidencia y «Subir» abre las
 * cuatro formas (Foto, Texto, Audio, Video). La lista nueva les había dejado solo el ✓.
 *
 * Esta prueba recorre los 20 hábitos ACTIVOS del catálogo (`habitos`: `clave_sistema` y `exigencia_evidencia`, con V99
 * GIMNASIO) y demuestra que cada uno termina en el mismo camino de registro que master. Las dos funciones `…EnMaster` copian
 * las decisiones de `toggleHabitState` y `openEvidenceModal` de master (`git show master:src/screens/TrainingScreen.tsx`).
 */

type Camino =
  | 'camara' // cámara directa + «¿Qué sentiste?» o los km (RegistroConFotoModal)
  | 'cuatro-formas' // EvidenciaHabitoModal: Foto, Texto, Audio, Video
  | 'check-sin-evidencia' // completarHabitoSimple: cierra sin evidencia
  | 'pastilla'
  | 'audioterapia'
  | 'clase'
  | 'muro'
  | 'solo-hora';

interface HabitoDelCatalogo {
  titulo: string;
  systemKey: string | null;
  requerida: boolean;
}

const CATALOGO: HabitoDelCatalogo[] = [
  { titulo: 'DESPERTAR', systemKey: 'WAKE_UP', requerida: false },
  { titulo: 'AGUA TIBIA CON LIMÓN', systemKey: 'WARM_LEMON_WATER', requerida: true },
  { titulo: 'RITUAL TIERRA - AGUA - FUEGO (mañana)', systemKey: 'RITUAL_MORNING', requerida: true },
  { titulo: 'DÍA SIN CELULAR', systemKey: 'PHONE_FREE_DAY', requerida: false },
  { titulo: 'Clase diaria', systemKey: 'DAILY_CLASS', requerida: true },
  { titulo: 'JUGO VERDE', systemKey: 'GREEN_JUICE', requerida: true },
  { titulo: 'PRIMERA COMIDA (ROMPO EL AYUNO)', systemKey: null, requerida: true },
  { titulo: 'RITUAL TIERRA - AGUA - FUEGO (mediodía)', systemKey: 'RITUAL_MIDDAY', requerida: true },
  { titulo: 'ÚLTIMA COMIDA DEL DÍA', systemKey: null, requerida: true },
  { titulo: 'RITUAL TIERRA - AGUA - FUEGO (noche)', systemKey: 'RITUAL_NIGHT', requerida: true },
  { titulo: 'ESCRITURA LIBRE NOCTURNA', systemKey: null, requerida: false },
  { titulo: 'POST DIARIO EN COMUNIDAD', systemKey: 'COMMUNITY_POST', requerida: false },
  { titulo: 'Pastilla Renacer', systemKey: 'PASTILLA_RENACER', requerida: false },
  { titulo: 'DORMIR', systemKey: 'SLEEP', requerida: false },
  { titulo: 'AUDIOTERAPIA SEMANAL', systemKey: 'AUDIO_THERAPY_WEEKLY', requerida: false },
  { titulo: 'GIMNASIO', systemKey: 'GYM', requerida: true },
  { titulo: 'DESCANSO PROFUNDO', systemKey: null, requerida: false },
  { titulo: 'KILÓMETROS DIARIOS', systemKey: 'DAILY_KM', requerida: true },
  { titulo: 'RITUAL DE MAÑANA (domingo)', systemKey: null, requerida: false },
  { titulo: 'AGUA E HIDRATACIÓN (domingo)', systemKey: null, requerida: false },
];
// Un hábito PROPIO opcional (Meditar, Leer…): `systemKey` nulo, evidencia opcional.
const PROPIO: HabitoDelCatalogo = { titulo: 'Meditar 10 minutos', systemKey: null, requerida: false };

const habit = (h: HabitoDelCatalogo): HabitItem => ({
  id: `r-${h.titulo}`,
  habitoId: `h-${h.titulo}`,
  dimension: 'CUERPO',
  title: h.titulo,
  time: '06:00',
  tag: 'x',
  streak: null,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  estado: 'PENDIENTE',
  systemKey: h.systemKey,
  evidenceRequirement: h.requerida ? 'REQUIRED' : 'OPTIONAL',
});

const filaDe = (h: HabitoDelCatalogo, conGuia = false): ItemDelDia => ({
  clave: `r-${h.titulo}`,
  tipo: 'habito',
  titulo: h.titulo,
  hora: '06:00',
  hecho: false,
  icono: null,
  dimension: 'Cuerpo',
  puntos: 10,
  guia: conGuia ? { secciones: [{ titulo: 'Qué hacer', texto: 'Hazlo.' }] } : null,
  habit: habit(h),
});

/** `openEvidenceModal` de master (la píldora «Subir/Escuchar/Clase/Publicar» y el cuerpo de la tarjeta), ya sin cumplir ni vencer. */
function caminoDeLaPildoraEnMaster(h: HabitoDelCatalogo): Camino {
  if (h.systemKey === 'AUDIO_THERAPY_WEEKLY') return 'audioterapia';
  if (h.systemKey === 'PASTILLA_RENACER') return 'pastilla';
  if (h.systemKey === 'DAILY_CLASS') return 'clase';
  if (h.systemKey === 'COMMUNITY_POST') return 'muro';
  if (h.systemKey === 'WAKE_UP' || h.systemKey === 'SLEEP') return 'solo-hora';
  return seRegistraConFoto(habit(h), false) ? 'camara' : 'cuatro-formas';
}

/** `toggleHabitState` de master (el ✓), sin cumplir. */
function caminoDelCheckEnMaster(h: HabitoDelCatalogo): Camino {
  if (h.systemKey === 'DAILY_CLASS') return 'clase';
  if (h.systemKey === 'COMMUNITY_POST') return 'muro';
  if (h.systemKey === 'WAKE_UP' || h.systemKey === 'SLEEP') return 'solo-hora';
  if (h.requerida) return caminoDeLaPildoraEnMaster(h);
  return 'check-sin-evidencia';
}

/**
 * Lo que ofrece la fila de la rama. `TrainingScreen` le pasa `onRegistrar={openEvidenceModal}` y
 * `onMarcar={habit => toggleHabitState(habit.id)}` (se comprueba abajo contra el archivo): la píldora y el toque de la fila
 * hacen lo de `openEvidenceModal`, y el ✓ lo de `toggleHabitState`.
 */
function ofrecidoEnLaRama(h: HabitoDelCatalogo): { pildora: Camino | null; check: Camino | null } {
  const control = controlDeLaFila(filaDe(h), 'hoy');
  const pildora = control === 'accion' || control === 'check-y-accion' ? caminoDeLaPildoraEnMaster(h) : null;
  const check = control === 'check' || control === 'check-y-accion' ? caminoDelCheckEnMaster(h) : null;
  return { pildora, check };
}

describe('cada hábito del catálogo termina en el mismo camino de registro que en master', () => {
  it('son los 20 hábitos activos del catálogo, con GIMNASIO', () => {
    expect(CATALOGO).toHaveLength(20);
    expect(new Set(CATALOGO.map(h => h.titulo)).size).toBe(20);
  });

  it('TrainingScreen entrega a la lista los MISMOS caminos de siempre: openEvidenceModal para la píldora y la fila, toggleHabitState para el ✓', () => {
    const texto = readFileSync(join(__dirname, '../../../../screens/TrainingScreen.tsx'), 'utf8');
    expect(texto).toMatch(/onRegistrar=\{openEvidenceModal\}/);
    expect(texto).toMatch(/onMarcar=\{habit => toggleHabitState\(habit\.id\)\}/);
  });

  for (const h of [...CATALOGO, PROPIO]) {
    it(`${h.titulo}${h.systemKey ? ` (${h.systemKey})` : ''}`, () => {
      const enMaster = { pildora: caminoDeLaPildoraEnMaster(h), check: caminoDelCheckEnMaster(h) };
      const enLaRama = ofrecidoEnLaRama(h);

      // 1. La píldora (o el toque de la fila) lleva a lo mismo que en master. Solo Despertar y Dormir no la tienen: su ✓ es
      //    el registro de la hora, y es lo que master hacía con los dos.
      if (enMaster.pildora === 'solo-hora') {
        expect(enLaRama.pildora).toBeNull();
        expect(enLaRama.check).toBe('solo-hora');
      } else {
        expect(enLaRama.pildora).toBe(enMaster.pildora);
      }

      // 2. El ✓, cuando se ofrece, hace lo mismo que en master.
      if (enLaRama.check) expect(enLaRama.check).toBe(enMaster.check);

      // 3. Los obligatorios (cámara directa) y los de flujo propio NO ganan nada nuevo: la fila sigue siendo «solo la píldora».
      const conFlujoPropio = h.systemKey !== null && CLAVES_CON_FLUJO_PROPIO.has(h.systemKey);
      if (h.requerida || (conFlujoPropio && enMaster.pildora !== 'solo-hora')) {
        expect(controlDeLaFila(filaDe(h), 'hoy')).toBe('accion');
        expect(accionSecundariaDeLaHoja(filaDe(h, true))).toBeNull();
      }

      // 4. Lo opcional sin flujo propio tiene las DOS cosas: «Subir» (cuatro formas) y el ✓ (sin evidencia), en la fila y en la hoja.
      if (!h.requerida && !conFlujoPropio) {
        expect(enLaRama).toEqual({ pildora: 'cuatro-formas', check: 'check-sin-evidencia' });
        expect(controlDeLaFila(filaDe(h), 'hoy')).toBe('check-y-accion');
        expect(controlDeLaFila(filaDe(h), 'atrasado')).toBe('check-y-accion');
        expect(destinoDelToque(filaDe(h), 'hoy')).toBe('registro'); // sin guía: directo a las cuatro formas
        expect(destinoDelToque(filaDe(h, true), 'hoy')).toBe('hoja'); // con guía: la hoja…
        expect(accionDeLaHoja(filaDe(h, true))).toMatchObject({ tipo: 'registrar', etiqueta: 'Subir evidencia' }); // …abre las cuatro formas
        expect(accionSecundariaDeLaHoja(filaDe(h, true))).toMatchObject({ tipo: 'marcar', etiqueta: 'Marcar como hecho' }); // …y cierra sin evidencia
      }
    });
  }

  it('lo único que la rama NO ofrece de master es el ✓ de la Pastilla y la Audioterapia, que cerraba sin su audio ni sus preguntas', () => {
    const sinCheckEnLaRama: string[] = [];
    for (const h of [...CATALOGO, PROPIO]) {
      const enMaster = caminoDelCheckEnMaster(h);
      const { check } = ofrecidoEnLaRama(h);
      if (check === null && enMaster !== caminoDeLaPildoraEnMaster(h)) sinCheckEnLaRama.push(h.systemKey ?? h.titulo);
    }
    expect(sinCheckEnLaRama.sort()).toEqual(['AUDIO_THERAPY_WEEKLY', 'PASTILLA_RENACER']);
  });

  it('los hábitos de la observación del dueño tienen píldora y ✓', () => {
    for (const titulo of [
      'ESCRITURA LIBRE NOCTURNA',
      'DÍA SIN CELULAR',
      'DESCANSO PROFUNDO',
      'RITUAL DE MAÑANA (domingo)',
      'AGUA E HIDRATACIÓN (domingo)',
    ]) {
      const h = CATALOGO.find(x => x.titulo === titulo)!;
      expect(controlDeLaFila(filaDe(h), 'hoy')).toBe('check-y-accion');
    }
    expect(controlDeLaFila(filaDe(PROPIO), 'hoy')).toBe('check-y-accion');
  });
});
