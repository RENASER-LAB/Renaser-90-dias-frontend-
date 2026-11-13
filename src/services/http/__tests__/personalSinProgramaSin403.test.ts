/**
 * Issue #203 (misma familia que #197/#200): el personal que NO activó su programa recibía ~35 veces un 403 del servidor en 8 minutos
 * (rocas, `/radar/latest`, `/spirit-audio/status`) al abrir la app. Si falla: `apiFetch` está mandando al servidor una lectura que él
 * rechaza con 403 a quien no activó su programa; la guarda de `guardaDelProgramaPropio` debe cortarla antes de salir, SIN tocar al aprendiz
 * ni al personal con programa. Mi Radar (`/radar/mi-radar`) queda fuera a propósito: la spec 019 usa su 403 `PROGRAMA_NO_ACTIVADO`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { ApiError, apiFetch, setTokenSesion } from '../apiClient';
import { avisarDiaUnoElegido } from '../../../features/programa/events/avisoDiaUnoElegido';
import { fijarCuentaDeLaGuarda, olvidarLoQueSabe } from '../../../features/programa/utils/guardaDelProgramaPropio';

const LECTURAS = [
  '/api/v1/rocks/today',
  '/api/v1/rocks/master',
  '/api/v1/rocks/monthly/plan',
  '/api/v1/rocks/weekly',
  '/api/v1/rocks/weekly?semana=3',
  '/api/v1/rocks/tomorrow',
  '/api/v1/rocks/upcoming',
  '/api/v1/rocks/day-closure',
  '/api/v1/radar/latest',
  '/api/v1/spirit-audio/status',
];

let activado: boolean | 'falla' = false;
const pedidos: string[] = [];

function respuesta(status: number, cuerpo: unknown) {
  return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(cuerpo) };
}

beforeEach(() => {
  pedidos.length = 0;
  activado = false;
  setTokenSesion('token');
  olvidarLoQueSabe();
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (url: unknown) => {
    const ruta = String(url).replace(/^https?:\/\/[^/]+/, '');
    pedidos.push(ruta);
    if (ruta.startsWith('/api/v1/onboarding/activate-program')) {
      if (activado === 'falla') return respuesta(500, { message: 'x' });
      return respuesta(200, { activated: activado, startDate: null });
    }
    return respuesta(200, []);
  });
});

const lecturasQueSalieron = () => pedidos.filter(p => !p.startsWith('/api/v1/onboarding'));

describe('el personal sin su programa activado no pide lo que el servidor le rechaza (#203)', () => {
  it.each(LECTURAS)('%s no sale para un mentor sin programa y falla con el mismo 403', async ruta => {
    fijarCuentaDeLaGuarda('m2', 'MENTOR');
    await expect(apiFetch(ruta)).rejects.toMatchObject({ status: 403, name: 'ApiError' });
    expect(lecturasQueSalieron()).toEqual([]);
  });

  it('pregunta una sola vez si activó su programa, por mucho que se lea', async () => {
    fijarCuentaDeLaGuarda('m2', 'MENTOR_LEAD');
    await Promise.allSettled(LECTURAS.map(r => apiFetch(r)));
    await Promise.allSettled(LECTURAS.map(r => apiFetch(r)));
    expect(pedidos.filter(p => p.startsWith('/api/v1/onboarding/activate-program'))).toHaveLength(1);
    expect(lecturasQueSalieron()).toEqual([]);
  });

  it.each(['TRAINEE', 'APRENDIZ', 'ROL_NUEVO'])('el rol %s pide como siempre y sin preguntar nada', async rol => {
    fijarCuentaDeLaGuarda('a1', rol);
    activado = false; // un aprendiz sin activar NO recibe 403 del servidor: no se le corta nada
    for (const ruta of LECTURAS) await apiFetch(ruta);
    expect(pedidos).toEqual(LECTURAS);
  });

  it.each(['MENTOR', 'TRAINEE_GUIDE', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST'])('el personal %s CON programa activado pide como siempre', async rol => {
    fijarCuentaDeLaGuarda('s1', rol);
    activado = true;
    for (const ruta of LECTURAS) await expect(apiFetch(ruta)).resolves.toEqual([]);
    expect(lecturasQueSalieron()).toEqual(LECTURAS);
  });

  it('si no se pudo saber (la pregunta falla) la lectura sale como siempre y se vuelve a preguntar', async () => {
    fijarCuentaDeLaGuarda('m2', 'MENTOR');
    activado = 'falla';
    await apiFetch('/api/v1/rocks/today');
    expect(lecturasQueSalieron()).toEqual(['/api/v1/rocks/today']);
    activado = false;
    await expect(apiFetch('/api/v1/rocks/today')).rejects.toBeInstanceOf(ApiError);
  });

  it('Mi Radar y lo demás del personal no se tocan: su 403 con motivo es el de la spec 019', async () => {
    fijarCuentaDeLaGuarda('m2', 'MENTOR');
    await apiFetch('/api/v1/radar/mi-radar');
    await apiFetch('/api/v1/home');
    await apiFetch('/api/v1/rocks/today', { method: 'POST', body: {} });
    expect(pedidos).toEqual(['/api/v1/radar/mi-radar', '/api/v1/home', '/api/v1/rocks/today']);
  });

  it('al activar el programa (POST o el aviso del Día 1) las lecturas vuelven a salir', async () => {
    fijarCuentaDeLaGuarda('m2', 'MENTOR');
    await expect(apiFetch('/api/v1/rocks/today')).rejects.toBeInstanceOf(ApiError);
    activado = true;
    await apiFetch('/api/v1/onboarding/activate-program', { method: 'POST', body: {} });
    await expect(apiFetch('/api/v1/rocks/today')).resolves.toEqual([]);

    fijarCuentaDeLaGuarda('m3', 'MENTOR');
    activado = false;
    await expect(apiFetch('/api/v1/rocks/today')).rejects.toBeInstanceOf(ApiError);
    activado = true;
    avisarDiaUnoElegido();
    await expect(apiFetch('/api/v1/rocks/today')).resolves.toEqual([]);
  });

  it('otra cuenta en el mismo teléfono no hereda lo que se supo de la anterior', async () => {
    fijarCuentaDeLaGuarda('m2', 'MENTOR');
    await expect(apiFetch('/api/v1/rocks/today')).rejects.toBeInstanceOf(ApiError);
    fijarCuentaDeLaGuarda('m1', 'MENTOR');
    activado = true;
    await expect(apiFetch('/api/v1/rocks/today')).resolves.toEqual([]);
  });
});
