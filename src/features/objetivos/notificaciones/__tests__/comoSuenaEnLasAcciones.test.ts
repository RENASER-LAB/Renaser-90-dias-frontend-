/**
 * «Cómo suena» la alarma de las acciones de los objetivos (spec 010, T006 y T007): sonido, vibración, voz y repetir,
 * por día, con las mismas reglas que los hábitos (009).
 *
 * - Cada alarma sale por el canal de la combinación de SU día: `-vib` / `-sinvib`, solo vibrar y la voz de objetivos.
 *   Vibrar por defecto (E-641) también vale para objetivos; los canales de hábitos y de eventos no se tocan.
 * - «Repetir si no la atiendo»: alarmas de fecha a +5 y +10 min, que se cancelan al tocar la alarma o al cumplir la acción.
 * - Lo ya programado antes de esta versión pasa al canal que vibra sin cambiar su hora, su id ni su texto (SC-003).
 *
 * La librería de mentira hace lo que la de verdad en Android: programar con un identificador existente lo REEMPLAZA.
 * Las pruebas corren en `America/Lima` (jest.config.js).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = {
  identifier?: string;
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Pedido & { identifier: string }>();
const mockCanales: Array<{ id: string; name?: string; sound?: unknown; enableVibrate?: boolean }> = [];
const mockEstado = { siguiente: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async (id: string, canal: { name?: string; sound?: unknown; enableVibrate?: boolean }) => {
    mockCanales.push({ id, ...canal });
    return null;
  }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    mockLista.set(identifier, { ...p, identifier });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockLista.clear();
  }),
  // Como la librería de verdad: una alarma de fecha vuelve con `value` en milisegundos.
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()].map(a => {
    const t = a.trigger as { type?: string; date?: Date | number; channelId?: string };
    return t.type === 'date' && t.date !== undefined
      ? { ...a, trigger: { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId } }
      : a;
  })),
}));

import { agruparAvisosQueCoinciden } from '../../../alarmas/avisosJuntos';
import { soltarAlarmasDeLaCuenta } from '../../../alarmas/alarmasDeLaCuenta';
import {
  esCanalAnteriorDeObjetivos,
  pasarAlarmasAlSonido,
  ponerLasAlarmasDeAccionesEnSuCanal,
} from '../../../alarmas/cambioDeSonido';
import { guardarPreferenciasDeAlarmas } from '../../../alarmas/preferenciasDeAlarmas';
import { canalDeAlarma } from '../../../alarmas/sonidoDeAlarma';
import { planDeRearmado, type AlarmaProgramada } from '../../../alarmas/rearmarAlarmas';
import type { CombinacionDeAlarma } from '../../../habits/notificaciones/utils/combinacionDeAlarma';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import {
  atenderElDiario,
  atenderLaAccion,
  atenderLaAlarmaDeObjetivos,
  idsDeRepeticionesDeAcciones,
  sincronizarRepeticionesDelDiario,
} from '../repeticionesDeAcciones';
import {
  cancelarTodasLasAlarmasDeAcciones,
  guardarPreferenciasDeAcciones,
  idsDeRecordatoriosDeAcciones,
  ponerElRecordatorioDiario,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  sincronizarAlarmasDeAcciones,
} from '../recordatoriosDeAcciones';
import type { PreferenciasDeAcciones } from '../preferenciasPorDia';

const USUARIO = 'u-1';
const LIMA = 'America/Lima';
/** 26/09 a las 03:00 UTC = viernes 25/09 a las 22:00 en Lima. */
const MADRUGADA_UTC = Date.UTC(2026, 8, 26, 3, 0);
const AHORA = new Date(MADRUGADA_UTC);
const OPCIONES = { ahoraMs: MADRUGADA_UTC, zona: LIMA };
const MIN = 60_000;

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({ sonido, vibracion, voz, repetir });

const roca = (parcial: Partial<RocaDiariaApi> & { id: string }): RocaDiariaApi => ({
  fecha: '2026-09-26', // sábado
  posicion: 1,
  titulo: 'Llamar a tres clientes',
  descripcion: null,
  color: 'VERDE',
  puntajeImpacto: 5,
  esDelegable: false,
  eje: 'TRABAJO',
  rocaSemanalId: null,
  horaInicio: '07:00:00',
  horaFin: null,
  completada: false,
  completadaEn: null,
  puntosOtorgados: 0,
  bloqueada: false,
  acciones: [],
  ...parcial,
});

const SABADO = roca({ id: 'sab' });
const DOMINGO = roca({ id: 'dom', fecha: '2026-09-27', titulo: 'Revisar la semana' });

/** Aviso a la hora, para tener una alarma por acción. */
const A_LA_HORA: PreferenciasDeAcciones = { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [0] };

const canalDe = (id: string) => (mockLista.get(id)!.trigger as { channelId: string }).channelId;
const canalesCreados = () => mockCanales.map(x => x.id);
const alarmasDeFecha = () => [...mockLista.values()].filter(a => (a.trigger as { type: string }).type === 'date');
const deAccion = (idDeRoca: string) =>
  [...mockLista.values()].filter(a => (a.content.data as { rocaId?: string } | undefined)?.rocaId === idDeRoca || a.identifier.startsWith(`accion-${idDeRoca}-`));
const repeticiones = () => [...mockLista.keys()].filter(id => id.includes('-rep-')).sort();
const instante = (id: string) => ((mockLista.get(id)!.trigger as { date: Date }).date).getTime();

beforeEach(async () => {
  mockLista.clear();
  mockCanales.length = 0;
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
  // Los canales solo existen en Android: `asegurarCanal` no hace nada en otra plataforma.
  jest.replaceProperty(Platform, 'OS', 'android');
});

describe('E-641: las acciones de los objetivos vibran por defecto', () => {
  it('el aviso de una acción sale por `recordatorios-objetivos-vib`, creado con la vibración dicha de forma explícita', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    const [alarma] = alarmasDeFecha();
    expect((alarma.trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-vib');
    expect(mockCanales.find(x => x.id === 'recordatorios-objetivos-vib')).toMatchObject({ enableVibrate: true });
    // Lo de siempre: sin combinación propia el contenido es el de antes (solo la ruta).
    expect(alarma.content.data).toEqual({ route: '/objetivos/2026-09-26?eje=TRABAJO' });
  });

  it('el recordatorio diario también', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, diarioActivo: true, horaDiaria: '07:00' });
    await ponerElRecordatorioDiario(USUARIO);
    const [diario] = [...mockLista.values()];
    expect(diario.trigger).toMatchObject({ type: 'daily', channelId: 'recordatorios-objetivos-vib' });
    expect(canalesCreados().every(id => id.endsWith('-vib') || id.endsWith('-sinvib'))).toBe(true);
  });

  it('no cambia los canales de hábitos ni de eventos', () => {
    expect(canalDeAlarma('habitos', 'sistema').id).toBe('recordatorios-habitos');
    expect(canalDeAlarma('eventos', 'sistema').id).toBe('recordatorios-eventos');
    expect(canalDeAlarma('objetivos', 'sistema').id).toBe('recordatorios-objetivos');
  });

  it('esCanalAnteriorDeObjetivos: los de antes sí; los nuevos, los de hábitos y eventos y el de avisos juntos, no', () => {
    for (const id of ['recordatorios-objetivos', 'recordatorios-objetivos-campana', 'recordatorios-objetivos-voz', 'recordatorios-objetivos-vibrar']) {
      expect(esCanalAnteriorDeObjetivos(id)).toBe(true);
    }
    for (const id of ['recordatorios-objetivos-vib', 'recordatorios-objetivos-sinvib', 'recordatorios-objetivos-vibrar-vib',
      'recordatorios-habitos', 'recordatorios-eventos', 'avisos-juntos-sin-sonido', undefined, null]) {
      expect(esCanalAnteriorDeObjetivos(id)).toBe(false);
    }
  });
});

describe('cada alarma suena como dice SU día', () => {
  it('el sábado sin vibración y el domingo como siempre: dos canales, cada acción por el suyo', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, dias: { 6: { alarma: c(true, false) } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, DOMINGO], OPCIONES);
    const porFecha = Object.fromEntries(alarmasDeFecha().map(a => [(a.content.data as { route: string }).route.slice(11, 21), a]));
    expect((porFecha['2026-09-26'].trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-sinvib');
    expect((porFecha['2026-09-27'].trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-vib');
    expect(mockCanales.find(x => x.id === 'recordatorios-objetivos-sinvib')).toMatchObject({ enableVibrate: false });
    // La combinación propia viaja en el aviso, para que el cambio de sonido y el agrupado no la pierdan.
    expect(porFecha['2026-09-26'].content.data).toMatchObject({ alarma: c(true, false) });
    expect(porFecha['2026-09-27'].content.data).toEqual({ route: '/objetivos/2026-09-27?eje=TRABAJO' });
  });

  it('solo vibrar: sin sonido y por el canal de solo vibrar, que vibra', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, alarma: c(false, true) });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    const [alarma] = alarmasDeFecha();
    expect((alarma.trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-vibrar-vib');
    expect(alarma.content.sound).toBe(false);
    expect(mockCanales.find(x => x.id === 'recordatorios-objetivos-vibrar-vib')).toMatchObject({ sound: null, enableVibrate: true });
  });

  it('con «Voz» dice la voz de objetivos que ya existe («Tienes acciones de tus objetivos por hacer»)', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, alarma: c(true, true, true) });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    const [alarma] = alarmasDeFecha();
    expect((alarma.trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-voz-vib');
    expect(alarma.content.sound).toBe('voz_objetivos.mp3');
  });

  it('el tono de Yo → Alarmas sigue mandando con «Sonido» encendido', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'campana' });
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, dias: { 6: { alarma: c(true, false) } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, DOMINGO], OPCIONES);
    expect(alarmasDeFecha().map(a => (a.trigger as { channelId: string }).channelId).sort()).toEqual([
      'recordatorios-objetivos-campana-sinvib',
      'recordatorios-objetivos-campana-vib',
    ]);
  });

  it('cambiar cómo suena un día rehace solo las alarmas de ese día (la combinación forma parte de la clave)', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, DOMINGO], OPCIONES);
    const antesDelDomingo = alarmasDeFecha().find(a => String(a.content.data?.route).includes('2026-09-27'))!.identifier;
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, dias: { 6: { alarma: c(true, false) } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, DOMINGO], OPCIONES);
    expect(alarmasDeFecha()).toHaveLength(2);
    // El domingo no se tocó: es la misma alarma.
    expect(mockLista.has(antesDelDomingo)).toBe(true);
    const sabado = alarmasDeFecha().find(a => String(a.content.data?.route).includes('2026-09-26'))!;
    expect((sabado.trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-sinvib');
  });

  it('el recordatorio diario sale por el canal de la combinación de su día', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, diarioActivo: true, horaDiaria: '07:00', dias: { 6: { alarma: c(false, true) } },
    });
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    expect(canalDe('acciones-diario-d6')).toBe('recordatorios-objetivos-vibrar-vib');
    expect(canalDe('acciones-diario-d1')).toBe('recordatorios-objetivos-vib');
    expect(mockLista.get('acciones-diario-d6')!.content.sound).toBe(false);
    expect(mockLista.get('acciones-diario-d6')!.content.data).toMatchObject({ alarma: c(false, true) });
    expect(mockLista.get('acciones-diario-d1')!.content.data).toBeUndefined();
  });

  it('con la misma combinación todos los días, sigue siendo UNA diaria, por el canal de esa combinación', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, diarioActivo: true, horaDiaria: '07:00', alarma: c(true, false),
    });
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    expect(mockLista.size).toBe(1);
    const [diario] = [...mockLista.values()];
    expect(diario.trigger).toMatchObject({ type: 'daily', channelId: 'recordatorios-objetivos-sinvib' });
  });
});

describe('Repetir si no la atiendo: alarmas de fecha a +5 y +10 min', () => {
  /** Repetir en la general; aviso a la hora. */
  const REPITE: PreferenciasDeAcciones = { ...A_LA_HORA, alarma: c(true, true, false, true) };

  it('dos repeticiones por acción, a los 5 y a los 10 minutos de su hora, por el canal de su combinación', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(repeticiones()).toEqual(['accion-sab-rep-20260926-10', 'accion-sab-rep-20260926-5']);
    // 07:00 en Lima = 12:00 UTC.
    expect(instante('accion-sab-rep-20260926-5')).toBe(Date.UTC(2026, 8, 26, 12, 5));
    expect(instante('accion-sab-rep-20260926-10')).toBe(Date.UTC(2026, 8, 26, 12, 10));
    const r = mockLista.get('accion-sab-rep-20260926-5')!;
    expect(r.content).toMatchObject({ title: 'Llamar a tres clientes', body: 'Te tocaba a las 07:00.' });
    expect(r.content.data).toEqual({ route: '/objetivos/2026-09-26?eje=TRABAJO', rocaId: 'sab', alarma: c(true, true, false, true) });
    expect(canalDe('accion-sab-rep-20260926-5')).toBe('recordatorios-objetivos-vib');
    // Más la alarma de la acción misma (a la hora), con el mismo rocaId.
    expect(alarmasDeFecha()).toHaveLength(3);
  });

  it('solo cuelgan de la HORA de la acción: el aviso 30 min antes no se repite', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...REPITE, antelaciones: [30] });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(alarmasDeFecha()).toHaveLength(3);
    expect(repeticiones()).toHaveLength(2);
  });

  it('no hay repeticiones sin aviso ese día, con la acción cumplida, sin hora o con «Repetir» apagado', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...REPITE, dias: { 7: { antelaciones: [] } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [DOMINGO, roca({ id: 'c', completada: true }), roca({ id: 'sh', horaInicio: null })], OPCIONES);
    expect(repeticiones()).toEqual([]);
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(repeticiones()).toEqual([]);
  });

  it('por día: solo repite el sábado, no el domingo', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, dias: { 6: { alarma: c(true, true, false, true) } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, DOMINGO], OPCIONES);
    expect(repeticiones().every(id => id.startsWith('accion-sab-'))).toBe(true);
    expect(repeticiones()).toHaveLength(2);
  });

  it('una repetición que ya pasó no se programa', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    // 5 min después de las 07:00 ya pasó; la de +10 todavía no.
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], { ahoraMs: Date.UTC(2026, 8, 26, 12, 7), zona: LIMA });
    expect(repeticiones()).toEqual(['accion-sab-rep-20260926-10']);
  });

  it('tocar la alarma de la acción cancela SUS repeticiones y las demás acciones siguen repitiendo', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    const otra = roca({ id: 'otra', horaInicio: '08:00:00', titulo: 'Otra' });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, otra], OPCIONES);
    expect(repeticiones()).toHaveLength(4);
    const alarma = deAccion('sab').find(a => !a.identifier.includes('-rep-'))!;
    await atenderLaAlarmaDeObjetivos(alarma.content.data, MADRUGADA_UTC - MIN, AHORA);
    expect(repeticiones()).toEqual(['accion-otra-rep-20260926-10', 'accion-otra-rep-20260926-5']);
  });

  it('y la puesta al día de después NO las resucita', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await atenderLaAccion('sab', AHORA);
    expect(repeticiones()).toEqual([]);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(repeticiones()).toEqual([]);
  });

  it('un toque viejo (la última respuesta que devuelve la librería al abrir la app en frío) no atiende nada', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await atenderLaAlarmaDeObjetivos({ route: '/objetivos/2026-09-26?eje=TRABAJO', rocaId: 'sab' }, MADRUGADA_UTC - 3 * 24 * 60 * MIN, AHORA);
    expect(repeticiones()).toHaveLength(2);
  });

  it('cumplir la acción quita sus repeticiones (al leer la lista, como las demás alarmas)', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await sincronizarAlarmasDeAcciones(USUARIO, [{ ...SABADO, completada: true }], OPCIONES);
    expect(repeticiones()).toEqual([]);
    expect(alarmasDeFecha()).toEqual([]);
  });

  it('apagar el aviso, o «Repetir», quita todas las repeticiones', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await guardarPreferenciasDeAcciones(USUARIO, { ...REPITE, alarma: c(true, true) });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(repeticiones()).toEqual([]);
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(repeticiones()).toHaveLength(2);
    await cancelarTodasLasAlarmasDeAcciones(USUARIO);
    expect(repeticiones()).toEqual([]);
    expect(mockLista.size).toBe(0);
  });

  it('sin permiso no se programa ninguna', async () => {
    mockEstado.permiso = false;
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect(mockLista.size).toBe(0);
  });

  it('las repeticiones se pueden listar para pasarlas al sonido nuevo', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    expect((await idsDeRepeticionesDeAcciones()).sort()).toEqual(repeticiones());
    // Y no están entre los ids del aviso agrupado: como las de los hábitos, no se juntan con otras alarmas.
    expect(await idsDeRecordatoriosDeAcciones(USUARIO)).toHaveLength(1);
  });
});

describe('Repetir del recordatorio diario: una ventana de 7 días de alarmas de fecha', () => {
  const DIARIO_QUE_REPITE: PreferenciasDeAcciones = {
    ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, diarioActivo: true, horaDiaria: '07:00', alarma: c(true, true, false, true),
  };

  it('desde mañana (esta noche ya pasó el de hoy), 5 y 10 min después de la hora de cada día encendido', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, DIARIO_QUE_REPITE);
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    const reps = repeticiones();
    // Viernes 25 ya pasó (son las 22:00): del sábado 26 al jueves 01/10, dos por día.
    expect(reps).toHaveLength(12);
    expect(reps).toContain('acciones-diario-rep-20260926-5');
    expect(reps).toContain('acciones-diario-rep-20261001-10');
    expect(reps).not.toContain('acciones-diario-rep-20260925-5');
    expect(instante('acciones-diario-rep-20260926-5')).toBe(Date.UTC(2026, 8, 26, 12, 5));
    expect(mockLista.get('acciones-diario-rep-20260926-5')!.content).toMatchObject({ title: 'Tus acciones del día' });
    expect(mockLista.get('acciones-diario-rep-20260926-5')!.content.data).toEqual({ diario: true, alarma: c(true, true, false, true) });
  });

  it('un día apagado, o que no repite, no tiene repeticiones', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...DIARIO_QUE_REPITE, dias: { 6: { diarioActivo: false }, 7: { alarma: c(true, true) } } });
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    const fechas = new Set(repeticiones().map(id => id.split('-')[3]));
    expect(fechas.has('20260926')).toBe(false); // sábado apagado
    expect(fechas.has('20260927')).toBe(false); // domingo sin «Repetir»
    expect(fechas.has('20260928')).toBe(true);
  });

  it('tocar el recordatorio de hoy cancela las repeticiones de hoy, no las de los días siguientes', async () => {
    const sabado7 = new Date(Date.UTC(2026, 8, 26, 12, 1)); // sábado 07:01 en Lima: ya sonó la principal
    await guardarPreferenciasDeAcciones(USUARIO, DIARIO_QUE_REPITE);
    await ponerElRecordatorioDiario(USUARIO, undefined, sabado7);
    expect(repeticiones()).toContain('acciones-diario-rep-20260926-5');
    await atenderLaAlarmaDeObjetivos({ diario: true }, sabado7.getTime() - MIN, sabado7);
    expect(repeticiones()).not.toContain('acciones-diario-rep-20260926-5');
    expect(repeticiones()).not.toContain('acciones-diario-rep-20260926-10');
    expect(repeticiones()).toContain('acciones-diario-rep-20260927-5');
    // La puesta al día de después (al abrir la app) no resucita las de hoy.
    await sincronizarRepeticionesDelDiario(USUARIO, { ahora: sabado7 });
    expect(repeticiones()).not.toContain('acciones-diario-rep-20260926-5');
    expect(repeticiones()).toContain('acciones-diario-rep-20260927-5');
  });

  it('la renovación diaria corre la ventana y apagar «Repetir» las quita', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, DIARIO_QUE_REPITE);
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    const manana = new Date(MADRUGADA_UTC + 24 * 60 * MIN);
    await sincronizarRepeticionesDelDiario(USUARIO, { ahora: manana });
    expect(repeticiones()).toContain('acciones-diario-rep-20261002-5');
    await guardarPreferenciasDeAcciones(USUARIO, { ...DIARIO_QUE_REPITE, alarma: undefined });
    await sincronizarRepeticionesDelDiario(USUARIO, { ahora: manana });
    expect(repeticiones()).toEqual([]);
  });

  it('apagar el recordatorio diario quita también sus repeticiones', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, DIARIO_QUE_REPITE);
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    await ponerElRecordatorioDiario(USUARIO, { ...DIARIO_QUE_REPITE, diarioActivo: false }, AHORA);
    expect(mockLista.size).toBe(0);
  });

  it('`atenderElDiario` es idempotente y nunca tira', async () => {
    await atenderElDiario(AHORA);
    await atenderElDiario(AHORA);
    expect(mockLista.size).toBe(0);
  });
});

describe('cerrar sesión borra también las repeticiones y lo que se anotó de ellas', () => {
  it('no queda ninguna alarma ni la nota de «atendida»', async () => {
    const REPITE: PreferenciasDeAcciones = { ...A_LA_HORA, diarioActivo: true, alarma: c(true, true, false, true) };
    await guardarPreferenciasDeAcciones(USUARIO, REPITE);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    await atenderLaAccion('sab', AHORA);
    await atenderElDiario(AHORA);
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith('renaser.objetivos.recordatorios.atendidas'))).toBe(true);
    await soltarAlarmasDeLaCuenta();
    expect(mockLista.size).toBe(0);
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith('renaser.objetivos.recordatorios.atendidas'))).toBe(false);
  });
});

describe('SC-003: lo ya programado antes de esta versión pasa al canal que vibra, sin tocar su hora', () => {
  /** Deja las alarmas de objetivos como estaban en un teléfono de antes: por los canales base, que no vibran. */
  function comoEnUnTelefonoDeAntes(canalPorId: Record<string, string>) {
    for (const [id, canal] of Object.entries(canalPorId)) {
      const alarma = mockLista.get(id)!;
      mockLista.set(id, { ...alarma, trigger: { ...alarma.trigger, channelId: canal } });
    }
    mockCanales.length = 0;
  }
  const programadas = () => Notificaciones.scheduleNotificationAsync as unknown as jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notificaciones = require('expo-notifications') as typeof import('expo-notifications');

  it('la alarma de una acción y el recordatorio diario pasan a `-vib` con el mismo id, la misma hora y el mismo texto', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, diarioActivo: true, horaDiaria: '07:00' });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await ponerElRecordatorioDiario(USUARIO, undefined, AHORA);
    const antes = [...mockLista.values()].map(a => ({ id: a.identifier, content: a.content, trigger: { ...a.trigger, channelId: undefined } }));
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-objetivos'])));
    expect(await ponerLasAlarmasDeAccionesEnSuCanal(USUARIO, MADRUGADA_UTC)).toBe(2);
    expect([...mockLista.values()].map(a => canalDe(a.identifier))).toEqual(['recordatorios-objetivos-vib', 'recordatorios-objetivos-vib']);
    const despues = [...mockLista.values()].map(a => ({ id: a.identifier, content: a.content, trigger: { ...a.trigger, channelId: undefined } }));
    // Ni hora, ni id, ni texto: es el mismo pedido con otro canal.
    expect(despues.map(d => d.id).sort()).toEqual(antes.map(d => d.id).sort());
    expect(despues.map(d => (d.content as { title?: string }).title).sort()).toEqual(antes.map(d => (d.content as { title?: string }).title).sort());
    expect(mockCanales.find(x => x.id === 'recordatorios-objetivos-vib')).toMatchObject({ enableVibrate: true });
  });

  it('es idempotente y barata: con todo ya migrado no programa nada', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-objetivos'])));
    expect(await ponerLasAlarmasDeAccionesEnSuCanal(USUARIO, MADRUGADA_UTC)).toBe(1);
    programadas().mockClear();
    expect(await ponerLasAlarmasDeAccionesEnSuCanal(USUARIO, MADRUGADA_UTC)).toBe(0);
    expect(programadas()).not.toHaveBeenCalled();
  });

  it('cada una conserva su tono (Yo → Alarmas): la voz va a la voz con vibración, la campana a la campana', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-objetivos-voz'])));
    await ponerLasAlarmasDeAccionesEnSuCanal(USUARIO, MADRUGADA_UTC);
    expect(canalDe([...mockLista.keys()][0])).toBe('recordatorios-objetivos-voz-vib');
  });

  it('respeta cómo suena cada alarma: la que lleva «sin vibración» va a `-sinvib`', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, alarma: c(true, false) });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-objetivos'])));
    await ponerLasAlarmasDeAccionesEnSuCanal(USUARIO, MADRUGADA_UTC);
    expect(canalDe([...mockLista.keys()][0])).toBe('recordatorios-objetivos-sinvib');
  });

  it('no toca lo que no es de las acciones: hábitos, eventos y alarmas ajenas siguen por su canal', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-objetivos'])));
    mockLista.set('evento-1', { identifier: 'evento-1', content: { title: 'Clase' }, trigger: { type: 'date', date: Date.now() + 3_600_000, channelId: 'recordatorios-eventos' } });
    mockLista.set('habito-x-inicio', { identifier: 'habito-x-inicio', content: { title: 'Hábito' }, trigger: { type: 'daily', hour: 9, minute: 0, channelId: 'recordatorios-habitos' } });
    mockLista.set('huérfana', { identifier: 'huérfana', content: { title: 'Otra' }, trigger: { type: 'daily', hour: 9, minute: 0, channelId: 'recordatorios-objetivos' } });
    expect(await ponerLasAlarmasDeAccionesEnSuCanal(USUARIO, MADRUGADA_UTC)).toBe(1);
    expect(canalDe('evento-1')).toBe('recordatorios-eventos');
    expect(canalDe('habito-x-inicio')).toBe('recordatorios-habitos');
    // Una que la app no reconoce como suya (no está en lo guardado) tampoco se mueve.
    expect(canalDe('huérfana')).toBe('recordatorios-objetivos');
  });

  it('cambiar el tono en Yo → Alarmas conserva cómo suena cada alarma', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, dias: { 6: { alarma: c(true, false) } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, DOMINGO], OPCIONES);
    // Como en Yo → Alarmas: primero se guarda el tono y después se pasan las alarmas ya programadas.
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'campana' });
    await pasarAlarmasAlSonido(USUARIO, 'campana', null, MADRUGADA_UTC);
    expect(alarmasDeFecha().map(a => (a.trigger as { channelId: string }).channelId).sort()).toEqual([
      'recordatorios-objetivos-campana-sinvib',
      'recordatorios-objetivos-campana-vib',
    ]);
  });

  it('cambiar el tono también pasa las repeticiones', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, alarma: c(true, true, false, true) });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'campana' });
    await pasarAlarmasAlSonido(USUARIO, 'campana', null, MADRUGADA_UTC);
    expect(repeticiones()).toHaveLength(2);
    for (const id of repeticiones()) expect(canalDe(id)).toBe('recordatorios-objetivos-campana-vib');
  });
});

describe('el aviso agrupado (E-410) respeta cómo suena cada acción', () => {
  it('dos acciones a la misma hora: una sola suena, por un canal que vibra', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, roca({ id: 'sab2', titulo: 'Otra', posicion: 2 })], OPCIONES);
    await agruparAvisosQueCoinciden(USUARIO, MADRUGADA_UTC);
    const canales = alarmasDeFecha().map(a => (a.trigger as { channelId: string }).channelId).sort();
    expect(canales).toEqual(['avisos-juntos-sin-sonido', 'recordatorios-objetivos-vib']);
  });

  it('si una de las dos pide solo vibrar y la otra sonar, el grupo suena y vibra', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, A_LA_HORA);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, roca({ id: 'sab2', titulo: 'Otra', posicion: 2 })], OPCIONES);
    // Una de las dos lleva «sin vibración» (como si su día fuera otro).
    const ids = alarmasDeFecha().map(a => a.identifier);
    const una = mockLista.get(ids[0])!;
    mockLista.set(ids[0], { ...una, content: { ...una.content, data: { ...una.content.data, alarma: c(true, false) } } });
    await agruparAvisosQueCoinciden(USUARIO, MADRUGADA_UTC);
    const lleva = alarmasDeFecha().find(a => (a.trigger as { channelId: string }).channelId !== 'avisos-juntos-sin-sonido')!;
    expect((lleva.trigger as { channelId: string }).channelId).toBe('recordatorios-objetivos-vib');
  });
});

describe('el rearmado (spec 007) devuelve estas alarmas con su combinación', () => {
  it('un teléfono que borró las alarmas las recupera con el mismo canal y el mismo contenido', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...A_LA_HORA, dias: { 6: { alarma: c(true, false, false, true) } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], OPCIONES);
    // Como las devuelve la librería: las de fecha con `value`.
    const lista = [...mockLista.values()].map(a => ({
      identifier: a.identifier,
      content: { ...a.content, sound: a.content.sound === false ? null : 'custom' },
      trigger: { type: 'date', value: (a.trigger as { date: Date }).date.getTime(), channelId: (a.trigger as { channelId: string }).channelId },
    })) as unknown as AlarmaProgramada[];
    const plan = planDeRearmado(lista, MADRUGADA_UTC);
    expect(plan).toHaveLength(lista.length);
    for (const pedido of plan) {
      const original = mockLista.get(pedido.identifier)!;
      expect((pedido.trigger as { channelId: string }).channelId).toBe((original.trigger as { channelId: string }).channelId);
      expect(pedido.content.data).toEqual(original.content.data);
    }
  });
});
