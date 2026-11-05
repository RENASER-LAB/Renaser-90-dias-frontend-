import { crearCarrera, alPunto } from '../motorDeCarrera';
import { cuerpoDeLaCarrera } from '../cuerpoDeLaCarrera';
import { longitudM, puntoDestino } from '../geo';
import { codificarPolyline, decodificarPolyline, recortarPrivacidad, rutaParaEnviar, simplificar } from '../rutaCodificada';
import { formatoDuracion, formatoKm, formatoRitmo, metPorVelocidad, pesoParaCalorias } from '../ritmoYCalorias';

const ORIGEN = { lat: -12.0464, lng: -77.0428 };

describe('la ruta que viaja una sola vez', () => {
  // spec 042 FR-040
  it('codifica con el algoritmo de polyline de Google (ejemplo oficial)', () => {
    const puntos = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    expect(codificarPolyline(puntos)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decodificarPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual(puntos);
  });

  // spec 042 FR-040
  it('Douglas-Peucker a 5 m deja una recta en sus dos extremos', () => {
    const recta = Array.from({ length: 50 }, (_, i) => puntoDestino(ORIGEN, 45, i * 10));
    expect(simplificar(recta)).toHaveLength(2);
  });

  // spec 042 FR-043
  it('recorta los primeros y los últimos 200 m (la distancia no cambia, la ruta sí)', () => {
    const ruta = Array.from({ length: 101 }, (_, i) => puntoDestino(ORIGEN, 90, i * 10)); // 1 km
    const recortada = recortarPrivacidad(ruta);
    expect(longitudM(recortada)).toBeCloseTo(600, -1);
    expect(recortarPrivacidad(ruta.slice(0, 30))).toEqual([]); // 290 m: no queda nada que mostrar
  });

  // spec 042 FR-026, FR-040
  it('respeta los topes (≤ 3000 puntos y ≤ 100 KB)', () => {
    const zigzag = Array.from({ length: 4000 }, (_, i) => puntoDestino(puntoDestino(ORIGEN, 90, i * 3), 0, i % 2 ? 30 : 0));
    const ruta = rutaParaEnviar(zigzag)!;
    expect(ruta.puntos).toBeLessThanOrEqual(3000);
    expect(ruta.polyline.length).toBeLessThanOrEqual(100 * 1024);
  });
});

describe('el cuerpo del único pedido', () => {
  function carreraDe(metros: number, segundos: number) {
    let e = crearCarrera({ carreraId: '6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10', cuentaId: 'c', ahora: 0, pesoKg: 70, conPasos: false, pausaAutomatica: false });
    const v = metros / segundos;
    for (let i = 0; i <= segundos; i++) e = alPunto(e, { ...puntoDestino(ORIGEN, 90, v * i), t: 1000 + i * 1000, precision: 5, velocidad: v }).estado;
    return e;
  }

  // spec 042 FR-016, FR-019
  it('lleva la carreraId, el resumen, los tramos completos y la ruta; armado dos veces da lo mismo (misma huella)', () => {
    const e = carreraDe(2100, 700);
    const a = cuerpoDeLaCarrera(e, 702_000, { guardarRuta: true, appVersion: '1.8.0' });
    const b = cuerpoDeLaCarrera(e, 702_000, { guardarRuta: true, appVersion: '1.8.0' });
    expect(a).toEqual(b);
    expect(a.carreraId).toBe('6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10');
    expect(a.tramos.map(t => t.km)).toEqual([1, 2]);
    expect(a.duracionActivaSeg).toBeGreaterThanOrEqual(60);
    expect(a.distanciaMetros).toBeGreaterThan(2000);
    expect(a.ruta?.puntos).toBeGreaterThanOrEqual(2);
    expect(a.pasos).toBeUndefined(); // sin permiso de actividad física no hay pasos
  });

  // spec 042 FR-040
  it('con «Guardar mi ruta» apagado solo viaja el resumen', () => {
    const e = carreraDe(1500, 500);
    expect(cuerpoDeLaCarrera(e, 502_000, { guardarRuta: false }).ruta).toBeUndefined();
  });
});

describe('números y calorías', () => {
  it('formatos en español: coma decimal, min/km y hh:mm:ss', () => {
    expect(formatoKm(3250)).toBe('3,25');
    expect(formatoRitmo(342)).toBe('5:42');
    expect(formatoRitmo(null)).toBe('–:––');
    expect(formatoDuracion(872_000)).toBe('00:14:32');
  });

  // spec 042 FR-015
  it('MET sube con la velocidad; parado no suma ejercicio', () => {
    expect(metPorVelocidad(0.5)).toBe(1);
    expect(metPorVelocidad(5)).toBeLessThan(metPorVelocidad(10));
  });

  // spec 042 FR-015 (decisión del dueño: el peso del objetivo de Cuerpo en kg, si no 70 kg)
  it('el peso sale del objetivo de 90 días de Cuerpo si está en kg; si no, 70 kg', () => {
    expect(pesoParaCalorias({ unidad: 'kg', avance: 81, lineaBase: 85 })).toBe(81);
    expect(pesoParaCalorias({ unidad: 'Kg', avance: null, lineaBase: 85 })).toBe(85);
    expect(pesoParaCalorias({ unidad: 'Kilógramos', avance: 77, lineaBase: null })).toBe(77);
    expect(pesoParaCalorias({ unidad: 'kg', avance: 28, lineaBase: null })).toBe(70);
    expect(pesoParaCalorias({ unidad: 'cm', avance: 90, lineaBase: 95 })).toBe(70);
    expect(pesoParaCalorias(null)).toBe(70);
    expect(pesoParaCalorias({ unidad: 'kg', avance: 900, lineaBase: null })).toBe(70);
  });
});
