/**
 * Registro con foto de los hábitos que exigen evidencia (pedido del dueño, 2026-09-26).
 */
import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import type { TrackDelDiaApi } from '../../types/habits.types';
import {
  avisoDeHabitoCerrado,
  avisoParaFoto,
  diaDelRegistro,
  estadoParaFoto,
  formatoKm,
  leerKilometros,
  medicionPedidaDe,
  preguntaQueSintio,
  totalConHoy,
  registrarConFoto,
  respuestaValida,
  type DependenciasDelRegistro,
} from '../registroConFoto';

const AHORA = Date.parse('2026-09-26T15:00:00Z');

function track(extra: Partial<TrackDelDiaApi> = {}): TrackDelDiaApi {
  return {
    id: 'r-1',
    habitoId: 'h-1',
    fechaEjecucion: '2026-09-26',
    diaPrograma: 12,
    tipoDia: 'NORMAL',
    esOpcional: false,
    estado: 'PENDIENTE',
    puntosOtorgados: 0,
    respuestaTexto: null,
    calificacionProductividad: null,
    completadoEn: null,
    tituloHabito: 'Ducha fría',
    tipoHabito: 'CHECK',
    guia: null,
    horaDisparo: null,
    horaLimite: null,
    plazoEvidencia: '2026-09-26T23:00:00Z',
    tieneEvidencia: false,
    ...extra,
  };
}

const FOTO = { uri: 'file:///foto.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' as const };

function dependencias(extra: Partial<DependenciasDelRegistro> = {}) {
  return {
    subirEvidencia: jest.fn(async () => ({ id: 'e-1' })),
    completar: jest.fn(async () => ({ puntosOtorgados: 10 })),
    tracksDeHoy: jest.fn(async () => [track()]),
    ...extra,
  };
}

describe('estadoParaFoto', () => {
  it('un registro pendiente de hoy está disponible', () => {
    expect(estadoParaFoto([track()], 'r-1', AHORA)).toEqual({ tipo: 'disponible', evidenciaYaSubida: false });
  });

  it('si el servidor ya tiene la evidencia, avisa que no hay que subirla de nuevo', () => {
    expect(estadoParaFoto([track({ tieneEvidencia: true })], 'r-1', AHORA)).toEqual({
      tipo: 'disponible',
      evidenciaYaSubida: true,
    });
  });

  it('completado, vencido o fallido no abren la cámara', () => {
    expect(estadoParaFoto([track({ estado: 'COMPLETADO' })], 'r-1', AHORA).tipo).toBe('completado');
    expect(estadoParaFoto([track({ estado: 'EXPIRADO' })], 'r-1', AHORA).tipo).toBe('vencido');
    expect(estadoParaFoto([track({ estado: 'FALLIDO' })], 'r-1', AHORA).tipo).toBe('vencido');
  });

  it('pasado el plazo sigue disponible: el backend lo acepta tarde, con 0 puntos (E-280)', () => {
    expect(estadoParaFoto([track()], 'r-1', Date.parse('2026-09-26T23:00:01Z')).tipo).toBe('disponible');
  });

  it('un registro que ya no está entre los de hoy es de otro día (pantalla abierta pasada la medianoche)', () => {
    expect(estadoParaFoto([track({ id: 'r-2' })], 'r-1', AHORA).tipo).toBe('no-es-de-hoy');
    expect(avisoParaFoto({ tipo: 'no-es-de-hoy' })?.titulo).toBe('Tu día cambió');
    expect(avisoParaFoto({ tipo: 'disponible', evidenciaYaSubida: false })).toBeNull();
  });

  it('D-178: para una acción del día habla de "acción" y explica el cerrojo Pareto nombrando la verde', () => {
    expect(avisoParaFoto({ tipo: 'completado' }, 'roca')?.mensaje).toBe('Esta acción ya quedó cumplida hoy.');
    const bloqueada = avisoParaFoto({ tipo: 'bloqueada', primero: 'Llamar a 3 clientes' }, 'roca');
    expect(bloqueada?.titulo).toBe('Primero tu acción verde');
    expect(bloqueada?.mensaje).toContain('«Llamar a 3 clientes»');
    expect(avisoParaFoto({ tipo: 'bloqueada', primero: null }, 'roca')?.mensaje).toContain('primero va la acción verde');
    expect(avisoParaFoto({ tipo: 'no-es-de-hoy' }, 'roca')?.mensaje).toContain('acción era de otro día');
    expect(avisoParaFoto({ tipo: 'disponible', evidenciaYaSubida: false }, 'roca')).toBeNull();
  });
});

describe('respuestaValida', () => {
  it('la respuesta es obligatoria: vacía o con puros espacios no vale', () => {
    expect(respuestaValida('')).toBe(false);
    expect(respuestaValida('   \n ')).toBe(false);
    expect(respuestaValida('Frío, pero bien')).toBe(true);
  });
});

describe('registrarConFoto', () => {
  it('sube la foto, avisa que quedó y recién ahí cierra con la respuesta', async () => {
    const orden: string[] = [];
    const completar = jest.fn(async (_id: string, _respuesta: string | null) => {
      orden.push('completar');
      return { puntosOtorgados: 10 };
    });
    const deps = dependencias({
      subirEvidencia: async () => {
        orden.push('subir');
        return {};
      },
      completar,
    });

    const resultado = await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: '  Frío, pero bien ', evidenciaYaSubida: false, conPregunta: true },
      () => orden.push('confirmada'),
      deps
    );

    expect(orden).toEqual(['subir', 'confirmada', 'completar']);
    expect(completar).toHaveBeenCalledWith('r-1', 'Frío, pero bien', null); // sin km (D-226)
    expect(resultado).toEqual({ puntosOtorgados: 10, yaEstabaCompletado: false });
  });

  it('un reintento con la evidencia ya subida solo cierra: no la duplica', async () => {
    const deps = dependencias();

    await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: 'Bien', evidenciaYaSubida: true, conPregunta: true },
      () => undefined,
      deps
    );

    expect(deps.subirEvidencia).not.toHaveBeenCalled();
    expect(deps.completar).toHaveBeenCalledTimes(1);
  });

  it('si el cierre falla, la evidencia ya quedó marcada para no volver a subirla', async () => {
    const deps = dependencias({ completar: jest.fn(async () => Promise.reject(new ApiError(0, 'Sin conexión'))) });
    const alConfirmar = jest.fn();

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: FOTO, respuesta: 'Bien', evidenciaYaSubida: false, conPregunta: true }, alConfirmar, deps)
    ).rejects.toThrow('Sin conexión');
    expect(alConfirmar).toHaveBeenCalledTimes(1);
  });

  it('si la subida falla, no cierra ni marca la evidencia', async () => {
    const deps = dependencias({ subirEvidencia: jest.fn(async () => Promise.reject(new Error('S3 403'))) });
    const alConfirmar = jest.fn();

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: FOTO, respuesta: 'Bien', evidenciaYaSubida: false, conPregunta: true }, alConfirmar, deps)
    ).rejects.toThrow('S3 403');
    expect(alConfirmar).not.toHaveBeenCalled();
    expect(deps.completar).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza el cierre porque ya estaba completado, lo da por bueno', async () => {
    const deps = dependencias({
      completar: jest.fn(async () => Promise.reject(new ApiError(409, 'Ya completado'))),
      tracksDeHoy: jest.fn(async () => [track({ estado: 'COMPLETADO', puntosOtorgados: 8 })]),
    });

    const resultado = await registrarConFoto(
      { registroId: 'r-1', archivo: null, respuesta: 'Bien', evidenciaYaSubida: true, conPregunta: true },
      () => undefined,
      deps
    );

    expect(resultado).toEqual({ puntosOtorgados: 8, yaEstabaCompletado: true });
  });

  it('un rechazo con el registro todavía abierto se informa tal cual', async () => {
    const deps = dependencias({ completar: jest.fn(async () => Promise.reject(new ApiError(400, 'Venció'))) });

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: null, respuesta: 'Bien', evidenciaYaSubida: true, conPregunta: true }, () => undefined, deps)
    ).rejects.toThrow('Venció');
  });

  it('sin respuesta no llama a nadie', async () => {
    const deps = dependencias();

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: FOTO, respuesta: '  ', evidenciaYaSubida: false, conPregunta: true }, () => undefined, deps)
    ).rejects.toThrow();
    expect(deps.subirEvidencia).not.toHaveBeenCalled();
  });
});

describe('D-172: solo los rituales preguntan "¿Qué sentiste?"', () => {
  it('reconoce los tres rituales por su clave de sistema, no por el título', () => {
    expect(preguntaQueSintio('RITUAL_MORNING')).toBe(true);
    expect(preguntaQueSintio('RITUAL_MIDDAY')).toBe(true);
    expect(preguntaQueSintio('RITUAL_NIGHT')).toBe(true);
    expect(preguntaQueSintio('GREEN_JUICE')).toBe(false);
    expect(preguntaQueSintio(null)).toBe(false);
  });

  it('sin pregunta el botón vale aunque no haya respuesta; con pregunta, no', () => {
    expect(respuestaValida('', false)).toBe(true);
    expect(respuestaValida('   ', true)).toBe(false);
  });

  it('sin pregunta sube la foto y cierra sin respuesta (null), aunque haya texto viejo', async () => {
    const completar = jest.fn(async (_id: string, _respuesta: string | null) => ({ puntosOtorgados: 10 }));
    const deps = dependencias({ subirEvidencia: async () => ({}), completar });

    await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: 'algo', evidenciaYaSubida: false, conPregunta: false },
      () => undefined,
      deps
    );

    expect(completar).toHaveBeenCalledWith('r-1', null, null); // sin km (D-226)
  });
});

describe('KILÓMETROS DIARIOS (D-226)', () => {
  const KM = { unidad: 'KILOMETROS' as const, totalPrevio: 5.75 };

  it('lee coma o punto decimal, redondea a dos decimales y exige más que cero hasta el tope', () => {
    expect(leerKilometros('3,5')).toBe(3.5);
    expect(leerKilometros(' 3.5 ')).toBe(3.5);
    expect(leerKilometros('4,126')).toBe(4.13);
    expect(leerKilometros(',5')).toBe(0.5);
    expect(leerKilometros('7')).toBe(7);
    expect(leerKilometros('100')).toBe(100);
    for (const invalido of ['', ' ', '0', '0,00', '0,001', '-3', '100,01', '250', 'abc', '3,5,1', '3 km']) {
      expect(leerKilometros(invalido)).toBeNull();
    }
  });

  it('muestra los km con coma y sin ceros de más', () => {
    expect(formatoKm(12.5)).toBe('12,5');
    expect(formatoKm(7)).toBe('7');
    expect(formatoKm(9.879999)).toBe('9,88');
    expect(formatoKm(0)).toBe('0');
    expect(formatoKm(20.1)).toBe('20,1');
  });

  it('el total suma lo de hoy solo si es un número válido', () => {
    expect(totalConHoy(KM, '4,13')).toBe(9.88);
    expect(totalConHoy(KM, '')).toBe(5.75);
    expect(totalConHoy(KM, '0')).toBe(5.75);
  });

  it('el pedido de km lo decide el servidor (medicion del track), no una lista de claves', () => {
    expect(medicionPedidaDe(track({ medicion: { unidad: 'KILOMETROS', valorDelDia: null, total: 5.75 } }))).toEqual(KM);
    expect(medicionPedidaDe(track())).toBeNull();
    expect(medicionPedidaDe(track({ medicion: null }))).toBeNull();
    expect(medicionPedidaDe(track({ medicion: { unidad: 'PASOS', valorDelDia: null, total: 9 } }))).toBeNull();
    expect(
      estadoParaFoto([track({ medicion: { unidad: 'KILOMETROS', valorDelDia: null, total: 5.75 } })], 'r-1', AHORA),
    ).toEqual({ tipo: 'disponible', evidenciaYaSubida: false, medicion: KM });
  });

  it('manda los km como número al cerrar, sin respuesta de texto', async () => {
    const deps = dependencias();
    await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: '3,5', conPregunta: false, evidenciaYaSubida: false, medicion: KM },
      () => undefined,
      deps,
    );
    expect(deps.completar).toHaveBeenCalledWith('r-1', null, 3.5);
  });

  it('sin km válidos no sube la foto ni cierra: primero el número', async () => {
    const deps = dependencias();
    await expect(
      registrarConFoto(
        { registroId: 'r-1', archivo: FOTO, respuesta: '0', conPregunta: false, evidenciaYaSubida: false, medicion: KM },
        () => undefined,
        deps,
      ),
    ).rejects.toThrow('km');
    expect(deps.subirEvidencia).not.toHaveBeenCalled();
    expect(deps.completar).not.toHaveBeenCalled();
  });

  it('un hábito que no pide km cierra sin número', async () => {
    const deps = dependencias();
    await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: '', conPregunta: false, evidenciaYaSubida: false },
      () => undefined,
      deps,
    );
    expect(deps.completar).toHaveBeenCalledWith('r-1', null, null);
  });
});

/**
 * D-259 del backend (regla del dueño, 2026-10-06): «un hábito se registra durante su día aunque se le haya pasado
 * la hora; solo los del día». Falla contra el código anterior, que decía «Este hábito ya venció · Pasó el plazo para
 * registrarlo hoy» de un registro EXPIRADO, que es de un día que ya terminó.
 */
describe('aviso de un hábito cuyo día ya cerró', () => {
  it('nombra el día del registro, leído del texto y no de un Date en UTC', () => {
    expect(diaDelRegistro('2026-10-05')).toBe('5 de octubre');
    expect(diaDelRegistro('2026-01-31')).toBe('31 de enero');
    expect(diaDelRegistro(null)).toBeNull();
  });

  it('EXPIRADO: dice de qué día era y que ese día ya cerró', () => {
    const estado = estadoParaFoto([track({ estado: 'EXPIRADO', fechaEjecucion: '2026-10-05' })], 'r-1', AHORA);
    expect(avisoParaFoto(estado)).toEqual({
      titulo: 'Este hábito ya cerró',
      mensaje: 'Este hábito era del 5 de octubre; ese día ya cerró. Solo se registran los hábitos del día.',
    });
  });

  it('ya no dice que pasó el plazo de hoy', () => {
    const aviso = avisoDeHabitoCerrado('EXPIRADO', '2026-10-05');
    expect(aviso.mensaje).not.toMatch(/plazo|hoy/);
  });

  it('un PENDIENTE pasado su plazoEvidencia sigue disponible: lo tarde del mismo día se registra', () => {
    const tarde = track({ estado: 'PENDIENTE', plazoEvidencia: '2026-09-26T13:10:00Z' });
    expect(estadoParaFoto([tarde], 'r-1', AHORA).tipo).toBe('disponible');
  });
});
