import { describe, expect, it } from '@jest/globals';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import {
  accionDeLaHoja,
  accionSecundariaDeLaHoja,
  controlDeLaFila,
  destinoDelToque,
  lineaDelCumplido,
  metaDeLaHoja,
  modoDeHoy,
  modoEnOtroDia,
  seCierraConElCheck,
  subtituloDeLaFila,
  type ModoDeLaFila,
} from '../filaDelDia';
import type { ItemDelDia } from '../itemsDelDia';

const habit = (extra: Partial<HabitItem> = {}): HabitItem => ({
  id: 'r1',
  habitoId: 'h1',
  dimension: 'CUERPO',
  title: 'Agua tibia',
  time: '06:00',
  tag: 'Innegociable',
  streak: null,
  done: false,
  hasEvidence: false,
  tieneTrackHoy: true,
  estado: 'PENDIENTE',
  ...extra,
});

const item = (extra: Partial<ItemDelDia> = {}, h: Partial<HabitItem> | null = {}): ItemDelDia => ({
  clave: 'r1',
  tipo: 'habito',
  titulo: 'Agua tibia',
  hora: '06:00',
  hecho: false,
  icono: null,
  dimension: 'Cuerpo',
  puntos: 10,
  guia: null,
  ...(h ? { habit: habit(h) } : {}),
  ...extra,
});
const conGuia = { secciones: [{ titulo: 'Qué hacer', texto: 'Beber.' }] };

describe('qué hábitos se cierran con el ✓ sin abrir nada', () => {
  it('Despertar y Dormir (registran la hora)', () => {
    expect(seCierraConElCheck(item({}, { systemKey: 'WAKE_UP' }))).toBe(true);
    expect(seCierraConElCheck(item({}, { systemKey: 'SLEEP' }))).toBe(true);
  });
  it('los de evidencia opcional y sin flujo propio', () => {
    expect(seCierraConElCheck(item({}, { evidenceRequirement: 'OPTIONAL' }))).toBe(true);
    expect(seCierraConElCheck(item({}, {}))).toBe(true);
  });
  it('los que exigen foto, no', () => {
    expect(seCierraConElCheck(item({}, { evidenceRequirement: 'REQUIRED' }))).toBe(false);
  });
  it('la Pastilla, la Audioterapia, la Clase y el post abren su registro, no se cierran con el ✓', () => {
    for (const systemKey of ['PASTILLA_RENACER', 'AUDIO_THERAPY_WEEKLY', 'DAILY_CLASS', 'COMMUNITY_POST']) {
      expect(seCierraConElCheck(item({}, { systemKey }))).toBe(false);
    }
  });
  it('una acción o un evento nunca', () => {
    expect(seCierraConElCheck(item({ tipo: 'accion' }, { dimension: 'VIDA Y NEGOCIO' }))).toBe(false);
    expect(seCierraConElCheck(item({ tipo: 'evento' }, null))).toBe(false);
  });
});

describe('el control de la derecha', () => {
  it('hoy: ✓ en lo que registra la hora, píldora Y ✓ en lo opcional, la píldora en lo que abre su registro, chevron en el evento', () => {
    expect(controlDeLaFila(item({}, { systemKey: 'WAKE_UP' }), 'hoy')).toBe('check');
    expect(controlDeLaFila(item({}, { systemKey: 'SLEEP' }), 'hoy')).toBe('check');
    // Evidencia OPCIONAL sin flujo propio: las dos cosas de la tarjeta de hoy de master (✓ sin evidencia y «Subir»).
    expect(controlDeLaFila(item({}, {}), 'hoy')).toBe('check-y-accion');
    expect(controlDeLaFila(item({}, { evidenceRequirement: 'OPTIONAL' }), 'hoy')).toBe('check-y-accion');
    expect(controlDeLaFila(item({}, { evidenceRequirement: 'REQUIRED' }), 'hoy')).toBe('accion');
    expect(controlDeLaFila(item({ tipo: 'evento' }, null), 'hoy')).toBe('evento');
  });
  it('lo atrasado se registra igual que lo de hoy', () => {
    expect(controlDeLaFila(item({}, {}), 'atrasado')).toBe('check-y-accion');
    expect(controlDeLaFila(item({}, { systemKey: 'SLEEP' }), 'atrasado')).toBe('check');
  });
  it('lo hecho lleva ✓; lo cerrado, candado; lo planificado, nada', () => {
    expect(controlDeLaFila(item({ hecho: true }, {}), 'hecho')).toBe('hecho');
    expect(controlDeLaFila(item({ cerrado: true }, {}), 'cerrado')).toBe('candado');
    expect(controlDeLaFila(item({}, null), 'planificado')).toBe('nada');
  });
  it('un registro de hoy cuyo día ya cerró lleva candado', () => {
    expect(controlDeLaFila(item({ cerrado: true }, { estado: 'EXPIRADO' }), 'hoy')).toBe('candado');
  });

  it('en un día que no es hoy NUNCA hay ✓ ni píldora de registro, en ningún modo', () => {
    const modos: ModoDeLaFila[] = ['hoy', 'atrasado', 'hecho', 'cerrado', 'planificado'];
    const permitidos = ['hecho', 'candado', 'nada'];
    for (const modo of modos) {
      for (const it of [item({}, {}), item({}, { evidenceRequirement: 'REQUIRED' }), item({ tipo: 'accion' }, { dimension: 'VIDA Y NEGOCIO' }), item({ tipo: 'evento' }, null)]) {
        expect(permitidos).toContain(controlDeLaFila(it, modo, false));
      }
    }
  });
});

describe('los modos', () => {
  it('hoy: cada sección tiene el suyo', () => {
    expect(modoDeHoy('enCurso')).toBe('hoy');
    expect(modoDeHoy('sinHora')).toBe('hoy');
    expect(modoDeHoy('atrasados')).toBe('atrasado');
    expect(modoDeHoy('cerrados')).toBe('cerrado');
    expect(modoDeHoy('hechos')).toBe('hecho');
  });
  it('un día anterior con lectura: ✓ o candado; sin lectura, planificado', () => {
    expect(modoEnOtroDia(item({ hecho: true }, null), 'pasado', true)).toBe('hecho');
    expect(modoEnOtroDia(item({ hecho: false }, null), 'pasado', true)).toBe('cerrado');
    expect(modoEnOtroDia(item({}, null), 'pasado', false)).toBe('planificado');
  });
  it('los eventos no llevan ✓ ni candado: sin estado', () => {
    expect(modoEnOtroDia(item({ tipo: 'evento' }, null), 'pasado', true)).toBe('planificado');
  });
  it('un día que viene es solo planificado, haya lectura o no', () => {
    expect(modoEnOtroDia(item({}, null), 'futuro', false)).toBe('planificado');
    expect(modoEnOtroDia(item({}, null), 'futuro', true)).toBe('planificado');
  });
  it('en un día que no es hoy nunca sale un modo con el que se registre', () => {
    for (const relacion of ['pasado', 'futuro'] as const) {
      for (const conLectura of [true, false]) {
        for (const it of [item({ hecho: true }, null), item({ hecho: false }, null), item({ tipo: 'evento' }, null)]) {
          expect(['hecho', 'cerrado', 'planificado']).toContain(modoEnOtroDia(it, relacion, conLectura));
        }
      }
    }
  });
});

describe('a dónde lleva el toque (HOY)', () => {
  it('con guía, abre la hoja', () => {
    expect(destinoDelToque(item({ guia: conGuia }, { evidenceRequirement: 'REQUIRED' }), 'hoy')).toBe('hoja');
  });
  it('sin guía, el registro de siempre directo: no hay dos pasos donde hoy hay uno', () => {
    expect(destinoDelToque(item({}, { evidenceRequirement: 'REQUIRED' }), 'hoy')).toBe('registro');
    expect(destinoDelToque(item({}, { systemKey: 'PASTILLA_RENACER' }), 'atrasado')).toBe('registro');
  });
  it('Despertar y Dormir pasan por la hoja aunque no tengan guía: «Marcar como hecho» pide confirmación', () => {
    expect(destinoDelToque(item({}, { systemKey: 'WAKE_UP' }), 'hoy')).toBe('hoja');
  });
  it('una acción abre su hoja', () => {
    expect(destinoDelToque(item({ tipo: 'accion' }, { dimension: 'VIDA Y NEGOCIO' }), 'hoy')).toBe('hoja');
  });
  it('un evento lleva a su detalle', () => {
    expect(destinoDelToque(item({ tipo: 'evento' }, null), 'hoy')).toBe('evento');
  });
  it('lo hecho abre la hoja con lo que se registró; la Pastilla y la Clase conservan su ventana de solo lectura', () => {
    expect(destinoDelToque(item({ hecho: true }, { done: true }), 'hecho')).toBe('hoja');
    expect(destinoDelToque(item({ hecho: true }, { done: true, systemKey: 'PASTILLA_RENACER' }), 'hecho')).toBe('registro');
    expect(destinoDelToque(item({ hecho: true }, { done: true, systemKey: 'DAILY_CLASS' }), 'hecho')).toBe('registro');
  });
  it('un registro de hoy cuyo día ya cerró abre el aviso de siempre', () => {
    expect(destinoDelToque(item({ cerrado: true }, { estado: 'EXPIRADO' }), 'cerrado')).toBe('registro');
  });
});

describe('a dónde lleva el toque (un día que NO es hoy)', () => {
  const todos: ItemDelDia[] = [
    item({ guia: conGuia }, { evidenceRequirement: 'REQUIRED' }),
    item({}, { systemKey: 'WAKE_UP' }),
    item({ tipo: 'accion' }, { dimension: 'VIDA Y NEGOCIO' }),
    item({ tipo: 'evento' }, null),
    item({ hecho: true }, null),
  ];

  it('lo hecho solo dice «Ya hecho»; lo cerrado, el candado', () => {
    expect(destinoDelToque(item({ hecho: true }, null), 'hecho', false)).toBe('ya-hecho');
    expect(destinoDelToque(item({ cerrado: true }, null), 'cerrado', false)).toBe('candado');
  });

  it('en NINGÚN modo abre la hoja, el registro ni el evento', () => {
    const modos: ModoDeLaFila[] = ['hoy', 'atrasado', 'hecho', 'cerrado', 'planificado'];
    for (const modo of modos) {
      for (const it of todos) {
        expect(['hoja', 'registro', 'evento']).not.toContain(destinoDelToque(it, modo, false));
      }
    }
  });

  it('lo planificado no hace nada al tocarlo', () => {
    for (const it of todos) expect(destinoDelToque(it, 'planificado', false)).toBe('nada');
  });
});

describe('lo que dice la fila', () => {
  it('«Cuerpo · 8 pts»; el primero de la lista abre con «Te toca ahora» o «Lo que sigue»', () => {
    const ahora = Date.now();
    expect(subtituloDeLaFila(item({ puntos: 8 }), 'hoy', null, ahora)).toEqual({ marca: null, texto: 'Cuerpo · 8 pts', tonoDeAviso: false });
    expect(subtituloDeLaFila(item({ puntos: 8 }), 'hoy', 'ahora', ahora).marca).toBe('Te toca ahora');
    expect(subtituloDeLaFila(item({ puntos: 8 }), 'hoy', 'sigue', ahora).marca).toBe('Lo que sigue');
  });

  it('atrasado, usa el texto de menos puntos de D-259 que ya existe', () => {
    const ahora = Date.parse('2026-10-29T12:00:00Z');
    const atrasado = item({}, { estado: 'PENDIENTE', pointsAtStake: 6, maxPoints: 10, deadline: '2026-10-29T20:00:00Z' });
    const sub = subtituloDeLaFila(atrasado, 'atrasado', null, ahora);
    expect(sub.texto).toBe('Cuerpo · Todavía puedes registrarlo hoy, con menos puntos');
    expect(sub.tonoDeAviso).toBe(true);
  });

  it('un evento dice dónde es; una acción, que es de los objetivos', () => {
    const ahora = Date.now();
    expect(subtituloDeLaFila(item({ tipo: 'evento', lugar: 'Zoom' }, null), 'hoy', null, ahora).texto).toBe('Evento · Zoom');
    expect(subtituloDeLaFila(item({ tipo: 'evento', lugar: null }, null), 'hoy', null, ahora).texto).toBe('Evento');
    expect(subtituloDeLaFila(item({ tipo: 'accion' }, null), 'hoy', null, ahora).texto).toBe('Acción de tus objetivos');
  });

  it('un día planificado no promete puntos', () => {
    expect(subtituloDeLaFila(item({ puntos: 10 }, null), 'planificado', null, Date.now()).texto).toBe('Cuerpo');
  });
});

describe('la hoja', () => {
  it('Despertar y Dormir: «Marcar como hecho», que registra la hora', () => {
    expect(accionDeLaHoja(item({}, { systemKey: 'WAKE_UP' }))).toMatchObject({ tipo: 'marcar', etiqueta: 'Marcar como hecho', nota: 'Registra la hora en que lo hiciste.' });
  });
  it('los demás abren el registro de su tipo', () => {
    expect(accionDeLaHoja(item({}, { evidenceRequirement: 'REQUIRED' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Tomar foto' });
    expect(accionDeLaHoja(item({}, { systemKey: 'PASTILLA_RENACER' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Escuchar el audio' });
    expect(accionDeLaHoja(item({}, { systemKey: 'AUDIO_THERAPY_WEEKLY' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Escuchar el audio' });
    expect(accionDeLaHoja(item({}, { systemKey: 'DAILY_CLASS' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Ver la clase' });
    expect(accionDeLaHoja(item({}, { systemKey: 'COMMUNITY_POST' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Publicar en el Muro' });
    expect(accionDeLaHoja(item({ tipo: 'accion' }, { dimension: 'VIDA Y NEGOCIO' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Marcar como hecha' });
    expect(accionDeLaHoja(item({}, { evidenceRequirement: 'OPTIONAL' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Subir evidencia' });
  });
  it('los de evidencia opcional suman «Marcar como hecho» (cierra sin evidencia, como el ✓); el resto, no', () => {
    expect(accionSecundariaDeLaHoja(item({}, { evidenceRequirement: 'OPTIONAL' }))).toMatchObject({ tipo: 'marcar', etiqueta: 'Marcar como hecho' });
    expect(accionDeLaHoja(item({}, { evidenceRequirement: 'OPTIONAL' }))).toMatchObject({ tipo: 'registrar', etiqueta: 'Subir evidencia' });
    for (const habit of [
      { evidenceRequirement: 'REQUIRED' },
      { systemKey: 'WAKE_UP' },
      { systemKey: 'SLEEP' },
      { systemKey: 'PASTILLA_RENACER' },
      { systemKey: 'AUDIO_THERAPY_WEEKLY' },
      { systemKey: 'DAILY_CLASS' },
      { systemKey: 'COMMUNITY_POST' },
    ]) {
      expect(accionSecundariaDeLaHoja(item({}, habit))).toBeNull();
    }
    expect(accionSecundariaDeLaHoja(item({ tipo: 'accion' }, { dimension: 'VIDA Y NEGOCIO' }))).toBeNull();
    expect(accionSecundariaDeLaHoja(item({ tipo: 'evento' }, null))).toBeNull();
  });
  it('«Cumplido a las 06:12 · +8 pts»; sin hora o sin puntos no se inventan', () => {
    expect(lineaDelCumplido({ hora: '06:12', puntos: 8, escrito: null })).toBe('Cumplido a las 06:12 · +8 pts');
    expect(lineaDelCumplido({ hora: null, puntos: 0, escrito: null })).toBe('Cumplido');
  });
  it('la meta: «Cuerpo · 06:00 · 10 pts», y «sin hora»', () => {
    expect(metaDeLaHoja(item(), 'hoy')).toBe('Cuerpo · 06:00 · 10 pts');
    expect(metaDeLaHoja(item({ hora: null, puntos: null }), 'hoy')).toBe('Cuerpo · sin hora');
  });
  it('la racha del servidor (D-254) se dice en la hoja; sin el dato, no se dibuja ni un «0 días»', () => {
    expect(metaDeLaHoja(item({}, { streak: 12 }), 'hoy')).toBe('Cuerpo · 06:00 · 10 pts · racha de 12 días');
    expect(metaDeLaHoja(item({}, { streak: 1 }), 'hoy')).toContain('racha de 1 día');
    expect(metaDeLaHoja(item({}, { streak: 0 }), 'hoy')).toContain('racha de 0 días');
    expect(metaDeLaHoja(item({}, { streak: null }), 'hoy')).not.toContain('racha');
    expect(metaDeLaHoja(item({}, null), 'hoy')).not.toContain('racha');
  });
  it('nunca la racha ni los puntos en juego en un día que no es hoy', () => {
    expect(metaDeLaHoja(item({}, { streak: 12 }), 'cerrado')).not.toContain('racha');
    expect(metaDeLaHoja(item({}, { streak: 12 }), 'planificado')).not.toContain('racha');
    expect(metaDeLaHoja(item({}, { streak: 12 }), 'cerrado')).not.toContain('pts');
  });
});
