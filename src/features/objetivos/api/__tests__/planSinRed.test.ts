/**
 * Spec 048, fase 3 (FR-019, FR-011, FR-015, D13, D14, P2, P3, P6): el Plan sin señal — las acciones del día y los objetivos. Con la red, la
 * hora y la carpeta de archivos reemplazadas por dobles que anotan cada pedido.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
type Pedido = { ruta: string; metodo?: string; body?: unknown; cabeceras?: Record<string, string> };
const mockPedidos: Pedido[] = [];
const mockRed: { hay: boolean; rechazo: { status: number; mensaje: string; codigo?: string } | null; respuestaDeEvidencia: Record<string, unknown> } = {
  hay: false,
  rechazo: null,
  respuestaDeEvidencia: {},
};
const ROCA_DEL_SERVIDOR = {
  id: 'r1', fecha: '2026-11-10', posicion: 1, titulo: 'Enviar la propuesta', descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false,
  eje: 'TRABAJO', rocaSemanalId: null, horaInicio: null, horaFin: null, completada: true, completadaEn: '2026-11-10T15:00:00Z', puntosOtorgados: 10,
  bloqueada: false, acciones: [],
};
jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, m: string, body?: unknown) {
      super(m);
      this.status = status;
      this.body = body;
    }
    get esDeRed() {
      return this.status === 0;
    }
    get codigo() {
      return (this.body as { codigo?: string } | null)?.codigo ?? null;
    }
  }
  return {
    ApiError,
    apiFetch: jest.fn(async (ruta: string, op?: { method?: string; body?: unknown; cabeceras?: Record<string, string> }) => {
      if (!mockRed.hay) throw new ApiError(0, 'sin red');
      mockPedidos.push({ ruta, metodo: op?.method, body: op?.body, cabeceras: op?.cabeceras });
      if (mockRed.rechazo) throw new ApiError(mockRed.rechazo.status, mockRed.rechazo.mensaje, { codigo: mockRed.rechazo.codigo });
      if (ruta.endsWith('/upload-url')) return { uploadUrl: 'https://s3.test/subida', bucket: 'b', ruta: 'rocas/x/1' };
      if (ruta.endsWith('/evidence')) return { ...ROCA_DEL_SERVIDOR, ...mockRed.respuestaDeEvidencia };
      return [];
    }),
  };
});
const mockHora = { instante: new Date(2026, 10, 10, 9, 0) };
jest.mock('../../../sinRed/horaReal', () => ({
  horaReal: jest.fn(() => ({ instante: mockHora.instante, origen: 'RELOJ_DEL_SISTEMA' })),
}));
const mockSubidas: string[] = [];
jest.mock('../../../habits/api/evidenciaHabitoApi', () => ({
  ...(jest.requireActual('../../../habits/api/evidenciaHabitoApi') as object),
  subirArchivoAS3: jest.fn(async (_url: string, uri: string) => {
    mockSubidas.push(uri);
  }),
}));
const mockCopias: string[] = [];
jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    exists = true;
    constructor(_base: unknown, nombre: string) {
      this.uri = `file:///docs/${nombre}`;
    }
    create() {}
  }
  class File {
    uri: string;
    exists = true;
    constructor(a: unknown, b?: string) {
      this.uri = typeof a === 'string' ? a : `${(a as Directory).uri}/${b}`;
    }
    copy(destino: File) {
      mockCopias.push(destino.uri);
    }
    delete() {}
  }
  return { Directory, File, Paths: { document: 'docs' } };
});
const mockAtendidas: string[] = [];
const mockAvisosCancelados: string[] = [];
jest.mock('../../notificaciones/repeticionesDeAcciones', () => ({ atenderLaAccion: jest.fn(async (id: string) => void mockAtendidas.push(id)) }));
jest.mock('../../notificaciones/recordatoriosDeAcciones', () => ({ cancelarElAvisoDeLaAccion: jest.fn(async (id: string) => void mockAvisosCancelados.push(id)) }));

import { leerAvisos } from '../../../sinRed/avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola } from '../../../sinRed/colaSinRed';
import { aplicarAjustesDeLectura } from '../../../sinRed/lecturasGuardadas';
import type { ItemPlanDiario, RocaDiariaApi, RocaMaestraApi, RocaSemanalApi } from '../../types/objetivos.types';
import { etiquetaDeLaAccion } from '../../utils/planPrincipal';
import { avisoDeAccionBloqueada } from '../../utils/registroDeAccionConFoto';
import { sellarRocaDiaria } from '../../utils/sellarRocaDiaria';
import { cerrarSemana, crearPlanDiario, crearPlanSemanal, definirRocaMaestra, editarRocaSemanal } from '../objetivosApi';
import { guardarObjetivoDelMes } from '../planMensualApi';
import { AVISO_TODAVIA_NO_LLEGO } from '../planSinRed';

const ITEMS: ItemPlanDiario[] = [
  { eje: 'TRABAJO', posicion: 1, titulo: 'Enviar la propuesta', puntajeImpacto: 5, esDelegable: false, horaInicio: '10:00' },
  { eje: 'TRABAJO', posicion: 2, titulo: 'Llamar al cliente', puntajeImpacto: 3, esDelegable: false },
];
const MAESTRAS = [{ id: 'm1', eje: 'TRABAJO', objetivo: 'Vender', meta: null, avance: null, unidad: null, lineaBase: null, porcentaje: null, creadoEn: 'x', actualizadoEn: 'x' }] as RocaMaestraApi[];

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockCopias.length = 0;
  mockSubidas.length = 0;
  mockAtendidas.length = 0;
  mockAvisosCancelados.length = 0;
  mockRed.hay = false;
  mockRed.rechazo = null;
  mockRed.respuestaDeEvidencia = {};
  mockHora.instante = new Date(2026, 10, 10, 9, 0);
  ponerCuentaActual('ana');
});

describe('agendar las acciones sin señal (spec 048 fase 3)', () => {
  it('se guardan con la hora real y se ven «se guardará al volver la señal», sin id del servidor', async () => { // spec 048 FR-019
    const r = await crearPlanDiario('2026-11-11', ITEMS);

    expect(r.map(a => a.pendienteDeEnvio)).toEqual([true, true]);
    expect(r[0].id.startsWith('pendiente:')).toBe(true);
    expect(r[0].bloqueada).toBe(false);
    expect(r[1].bloqueada).toBe(true); // Pareto: la segunda espera a la verde
    expect(r[0].horaInicio).toBe('10:00:00');
    const [envio] = await leerCola('ana');
    expect(envio.datos).toMatchObject({ area: 'plan', metodo: 'POST', ruta: '/api/v1/rocks/plan', cuerpo: { fecha: '2026-11-11', rocas: ITEMS }, etiqueta: 'Tus acciones de mañana' });
  });

  it('un día que ya pasó no se agenda: dice INVALID_DATE como con señal (P2)', async () => { // spec 048 FR-010
    const error = await crearPlanDiario('2026-11-09', ITEMS).catch(e => e);
    expect(error.status).toBe(400);
    expect(error.message).toContain('INVALID_DATE');
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('mientras esperan, Hoy, Mañana y lo agendado de la semana las muestran; un día futuro agendado de nuevo reemplaza al anterior', async () => { // spec 048 FR-011
    await crearPlanDiario('2026-11-11', ITEMS);
    const hoy = await aplicarAjustesDeLectura('/api/v1/rocks/today', []);
    expect(hoy).toEqual([]);
    const manana = (await aplicarAjustesDeLectura('/api/v1/rocks/tomorrow', [])) as RocaDiariaApi[];
    expect(manana.map(a => a.titulo)).toEqual(['Enviar la propuesta', 'Llamar al cliente']);
    const semana = (await aplicarAjustesDeLectura('/api/v1/rocks/upcoming', { desde: '2026-11-10', hasta: '2026-11-15', rocas: [{ ...ROCA_DEL_SERVIDOR, id: 'viejo', fecha: '2026-11-11', completada: false }] })) as { rocas: RocaDiariaApi[] };
    expect(semana.rocas.map(a => a.id).includes('viejo')).toBe(false);
    expect(semana.rocas).toHaveLength(2);
  });

  it('si al llegar el día ya pasó, no se aplica y el aviso trae lo que agendaste (P2)', async () => { // spec 048 FR-019
    await crearPlanDiario('2026-11-11', ITEMS);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto era de un día que ya terminó y no se pudo aplicar.', codigo: 'FUERA_DE_SU_DIA' };

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-aplicado', etiqueta: 'Tus acciones de mañana', codigo: 'FUERA_DE_SU_DIA' });
    expect(aviso.texto).toContain('10:00 Enviar la propuesta');
    expect(aviso.texto).toContain('Llamar al cliente');
  });

  it('al volver la señal sale con las tres cabeceras', async () => { // spec 048 FR-019
    await crearPlanDiario('2026-11-11', ITEMS);
    const [envio] = await leerCola('ana');
    mockRed.hay = true;
    await procesarCola('ana', Date.now(), { adelantar: true });
    expect(mockPedidos[0].cabeceras).toMatchObject({ 'X-Id-Cliente': envio.idCliente, 'X-Origen-De-La-Hora': 'RELOJ_DEL_SISTEMA' });
  });
});

describe('marcar una acción sin señal (spec 048 fase 3)', () => {
  it('con texto: se guarda, sale hecha al instante, sus alarmas se apagan y los puntos llegan con la respuesta', async () => { // spec 048 FR-011
    const puntos = await sellarRocaDiaria('r1', { archivo: null, texto: 'Ya la envié' });

    expect(puntos).toBe(0);
    expect(mockAtendidas).toEqual(['r1']);
    expect(mockAvisosCancelados).toEqual(['r1']);
    const [envio] = await leerCola('ana');
    expect(envio).toMatchObject({ tipo: 'completarAccion', hechoEn: new Date(2026, 10, 10, 9, 0).toISOString() });
    expect(envio.datos).toMatchObject({ rocaId: 'r1', tipo: 'TEXTO', texto: 'Ya la envié', uri: null });

    const lista = [
      { ...ROCA_DEL_SERVIDOR, id: 'r1', completada: false, completadaEn: null, puntosOtorgados: 0 },
      { ...ROCA_DEL_SERVIDOR, id: 'r2', posicion: 2, color: 'AMARILLA', completada: false, completadaEn: null, puntosOtorgados: 0, bloqueada: true },
    ];
    const leida = (await aplicarAjustesDeLectura('/api/v1/rocks/today', lista)) as RocaDiariaApi[];
    expect(leida[0].completada).toBe(true);
    expect(leida[1].bloqueada).toBe(false); // cumplida la verde, la siguiente se abre
  });

  it('con foto: se copia a la carpeta sin red y al volver la señal sube a S3 y registra con las tres cabeceras', async () => { // spec 048 FR-012
    await sellarRocaDiaria('r1', { archivo: { uri: 'file:///cache/foto.jpg', mimeType: 'image/jpeg', tipo: 'FOTO', tomadaEn: '2026-11-10T14:00:00Z' }, texto: '' });
    expect(mockCopias).toHaveLength(1);
    const [envio] = await leerCola('ana');
    expect(envio.datos).toMatchObject({ tipo: 'FOTO', mimeType: 'image/jpeg', timestampExif: '2026-11-10T14:00:00Z' });

    mockRed.hay = true;
    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    expect(mockPedidos.map(p => p.ruta)).toEqual(['/api/v1/rocks/r1/evidence/upload-url', '/api/v1/rocks/r1/evidence']);
    expect(mockSubidas).toHaveLength(1);
    expect(mockPedidos[0].cabeceras).toBeUndefined();
    expect(mockPedidos[1].cabeceras).toMatchObject({ 'X-Id-Cliente': envio.idCliente, 'X-Hecho-En': envio.hechoEn });
    expect(mockPedidos[1].body).toMatchObject({ tipo: 'FOTO', bucket: 'b', rutaStorage: 'rocas/x/1', timestampExif: '2026-11-10T14:00:00Z' });
  });

  it('una acción agendada sin señal no se puede marcar hasta que llegue (P6)', async () => { // spec 048 FR-019
    await expect(sellarRocaDiaria('pendiente:abc:TRABAJO:1', { archivo: null, texto: 'x' })).rejects.toThrow(AVISO_TODAVIA_NO_LLEGO);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('si llegó sin puntos (más de 48 h, hora futura…), la hoja de Hoy dice por qué (FR-015)', async () => { // spec 048 FR-015
    await sellarRocaDiaria('r1', { archivo: null, texto: 'Hecha' });
    mockRed.hay = true;
    mockRed.respuestaDeEvidencia = { puntosOtorgados: 0, motivoSinPuntos: 'LLEGO_DESPUES_DE_48_H' };

    await procesarCola('ana', Date.now(), { adelantar: true });
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'sin-puntos', codigo: 'LLEGO_DESPUES_DE_48_H' });
    expect(aviso.motivo).toMatch(/48 horas/);
    expect(aviso.etiqueta).toContain('Enviar la propuesta');
  });

  it('con señal sube y registra como siempre, sin cabeceras ni cola', async () => { // spec 048 FR-019
    mockRed.hay = true;
    const puntos = await sellarRocaDiaria('r1', { archivo: null, texto: 'Hecha' });
    expect(puntos).toBe(10);
    expect(mockPedidos[0].cabeceras).toBeUndefined();
    expect(await leerCola('ana')).toHaveLength(0);
  });
});

describe('los objetivos sin señal (spec 048 fase 3)', () => {
  it('el objetivo de 90 días se guarda y se ve con lo pedido', async () => { // spec 048 FR-019
    const r = await definirRocaMaestra('TRABAJO', { objetivo: 'Llegar a 20 clientes', meta: 20, avance: 5, unidad: 'clientes' }, MAESTRAS[0]);
    expect(r).toMatchObject({ id: 'm1', objetivo: 'Llegar a 20 clientes', meta: 20, avance: 5 });
    const leida = (await aplicarAjustesDeLectura('/api/v1/rocks/master', MAESTRAS)) as RocaMaestraApi[];
    expect(leida[0].objetivo).toBe('Llegar a 20 clientes');
    const [envio] = await leerCola('ana');
    expect(envio.datos).toMatchObject({ metodo: 'PUT', ruta: '/api/v1/rocks/master/TRABAJO', etiqueta: 'Tu objetivo de Negocio' });
  });

  it('el plan de la semana se guarda, se ve y no se puede corregir hasta que llegue (P6)', async () => { // spec 048 FR-019
    const [semana] = await crearPlanSemanal(
      [{ eje: 'TRABAJO', titulo: 'Cerrar tres ventas', obstaculo: 'Poco tiempo' }],
      { maestras: MAESTRAS, semana: 46 },
    );
    expect(semana).toMatchObject({ titulo: 'Cerrar tres ventas', rocaMaestraId: 'm1', numeroSemana: 46, obstaculo: 'Poco tiempo' });
    const leida = (await aplicarAjustesDeLectura('/api/v1/rocks/weekly', [])) as RocaSemanalApi[];
    expect(leida).toHaveLength(1);
    await expect(editarRocaSemanal(semana.id, { titulo: 'Otro' }, semana)).rejects.toThrow(AVISO_TODAVIA_NO_LLEGO);
    await expect(cerrarSemana(semana.id, { autoevaluacionFin: 7, bloqueoPrincipal: 'a', correccion: 'b' }, semana)).rejects.toThrow(AVISO_TODAVIA_NO_LLEGO);
  });

  it('corregir y cerrar la semana se ven al instante sobre la roca que ya estaba', async () => { // spec 048 FR-019
    const base = { id: 's1', rocaMaestraId: 'm1', numeroSemana: 46, titulo: 'Antes', obstaculo: null, contingencia: null, autoevaluacionInicio: 5, autoevaluacionFin: null, bloqueoPrincipal: null, correccion: null, creadoEn: 'x', actualizadoEn: 'x' } as RocaSemanalApi;
    const editada = await editarRocaSemanal('s1', { titulo: 'Después' }, base);
    expect(editada.titulo).toBe('Después');
    const cerrada = await cerrarSemana('s1', { autoevaluacionFin: 8, bloqueoPrincipal: 'Tiempo', correccion: 'Agendar' }, editada);
    expect(cerrada.autoevaluacionFin).toBe(8);
    const leida = (await aplicarAjustesDeLectura('/api/v1/rocks/weekly', [base])) as RocaSemanalApi[];
    expect(leida[0]).toMatchObject({ titulo: 'Después', autoevaluacionFin: 8, bloqueoPrincipal: 'Tiempo' });
  });

  it('el objetivo del mes se guarda y el plan del mes lo muestra', async () => { // spec 048 FR-019
    await guardarObjetivoDelMes('TRABAJO', 2, { titulo: 'Llegar a 12 clientes', meta: 12 });
    const plan = [{ eje: 'TRABAJO', meses: [{ numeroMes: 1, titulo: null, editado: false, cifra: 5 }, { numeroMes: 2, titulo: null, editado: false, cifra: 8 }] }];
    const leido = (await aplicarAjustesDeLectura('/api/v1/rocks/monthly/plan', plan)) as typeof plan;
    expect(leido[0].meses[1]).toMatchObject({ titulo: 'Llegar a 12 clientes', editado: true, cifra: 12 });
    expect(leido[0].meses[0].titulo).toBeNull();
  });

  it('si el servidor se queda con lo más nuevo, el aviso trae el objetivo que escribiste', async () => { // spec 048 FR-019
    await definirRocaMaestra('TRABAJO', { objetivo: 'Llegar a 20 clientes' }, MAESTRAS[0]);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto cambió en tu cuenta después de que lo hiciste sin conexión. Se quedó lo más nuevo.', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' };

    await procesarCola('ana', Date.now(), { adelantar: true });
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ etiqueta: 'Tu objetivo de Negocio', texto: 'Llegar a 20 clientes', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' });
  });
});

describe('lo agendado sin señal se ve y no se marca (spec 048 fase 3, P6)', () => {
  it('la tarjeta dice «Se guardará al volver la señal» y Entrenar avisa en vez de abrir el registro', async () => { // spec 048 FR-019
    expect(etiquetaDeLaAccion({ fecha: '2026-11-11', horaInicio: '10:00:00', pendienteDeEnvio: true })).toBe('Mié 11 nov · 10:00 · Se guardará al volver la señal');
    expect(etiquetaDeLaAccion({ fecha: '2026-11-11', horaInicio: '10:00:00' })).toBe('Mié 11 nov · 10:00');
    expect(await avisoDeAccionBloqueada('pendiente:abc:TRABAJO:1')).toEqual({ titulo: 'Se guardará al volver la señal', mensaje: AVISO_TODAVIA_NO_LLEGO });
  });
});
