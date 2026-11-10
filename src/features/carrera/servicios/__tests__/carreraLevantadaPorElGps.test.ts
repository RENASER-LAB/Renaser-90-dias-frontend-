jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { crearCarrera } from '../../utils/motorDeCarrera';
import { guardarCarreraEnCurso } from '../almacenCarrera';
import { cargarCarrera, reiniciarParaPruebas } from '../carreraEnVivo';

const T0 = Date.UTC(2026, 10, 10, 11, 0, 0);
const guardada = () => crearCarrera({ carreraId: 'c-1', cuentaId: 'ana', ahora: T0, pesoKg: 70, conPasos: true, pausaAutomatica: true });

beforeEach(async () => {
  reiniciarParaPruebas();
  await AsyncStorage.clear();
});

/**
 * #172: el sistema mata el proceso a mitad de la caminata y la tarea del GPS lo levanta en segundo plano. La carrera nunca se detuvo:
 * no puede quedar en pausa (antes descartaba todo lo que venía hasta abrir la app y tocar «Seguir»).
 */
describe('la carrera que levanta la tarea del GPS', () => {
  // spec 042 FR-006
  it('levantada por la tarea del GPS sigue corriendo aunque pasaron más de 15 s sin latidos', async () => {
    await guardarCarreraEnCurso(guardada());
    const e = await cargarCarrera('ana', T0 + 60_000, { desdeLaTareaDelGps: true });
    expect(e?.fase).toBe('corriendo');
  });

  // spec 042 FR-006
  it('abierta por la persona tras un rato sin latidos, queda en pausa como siempre (la app estuvo muerta)', async () => {
    await guardarCarreraEnCurso(guardada());
    const e = await cargarCarrera('ana', T0 + 60_000);
    expect(e?.fase).toBe('pausa');
  });
});
