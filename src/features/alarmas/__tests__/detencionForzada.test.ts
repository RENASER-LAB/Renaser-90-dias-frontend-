/**
 * Spec 007, historia 2 (T021): saber, al abrir la app, que el teléfono la detuvo a la fuerza y borró las
 * alarmas, y avisarlo como mucho una vez por día.
 *
 * Contra el código de antes falla: `detencionForzada.ts` no existía. Honor y Huawei tratan «quitar de
 * recientes» como una detención forzada; ningún tipo de alarma sobrevive a eso y la persona no se enteraba.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
}));

import { soltarAlarmasDeLaCuenta } from '../alarmasDeLaCuenta';
import { usarModuloDeAlarmas, type DetencionForzada } from '../alarmaExactaNativa';
import {
  fotoDeLasAlarmasAlAbrir,
  olvidarLaFotoDeLasAlarmas,
  type DependenciasDeAlarmasVivas,
  type EstadoDeLasAlarmas,
} from '../alarmasVivas';
import { revisarDetencionForzada, type DependenciasDeLaDetencion } from '../detencionForzada';

const REVISADA = (id: string) => `renaser.alarmas.detencionRevisada.${id}`;
const AVISADA = (id: string) => `renaser.alarmas.avisoDetencion.${id}`;

/** 2026-10-19 10:00 en Lima (la zona de las pruebas): 15:00 UTC. */
const AHORA = new Date('2026-10-19T15:00:00Z');
const UN_DIA_MS = 24 * 60 * 60 * 1000;
/** La última revisión de las pruebas: dos horas antes de `AHORA`, anterior a cualquier detención que se simule. */
const REVISION_PREVIA = AHORA.getTime() - 2 * 60 * 60 * 1000;

const SIN_DETENCION: DetencionForzada = { detenida: false, cuando: null, motivo: null };
const detenidaA = (cuando: number): DetencionForzada => ({ detenida: true, cuando, motivo: 'reason=10 subreason=0' });

const detencionForzadaDesde = jest.fn<(desdeMs: number) => DetencionForzada>();

function moduloQueDice(respuesta: DetencionForzada) {
  detencionForzadaDesde.mockReturnValue(respuesta);
}

/** Una cuenta que ya se revisó antes en este teléfono (la primera revisión nunca avisa). */
async function cuentaYaRevisada(userId: string, desde: number = REVISION_PREVIA) {
  await AsyncStorage.setItem(REVISADA(userId), String(desde));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await cuentaYaRevisada('u-1');
  olvidarLaFotoDeLasAlarmas();
  detencionForzadaDesde.mockReset();
  usarModuloDeAlarmas({
    puedeProgramarAlarmasExactas: () => true,
    abrirAjusteDeAlarmasExactas: () => true,
    detencionForzadaDesde,
  });
});

describe('cuando el sistema detuvo la app a la fuerza', () => {
  it('(a) avisa, guarda cuándo fue y la fecha local del aviso', async () => {
    const cuando = AHORA.getTime() - 60_000;
    moduloQueDice(detenidaA(cuando));

    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('avisar');

    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBe('2026-10-19');
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(cuando));
  });

  it('la primera vez en este teléfono NO avisa, aunque el sistema diga que arrancó tras una detención', async () => {
    // Una app recién instalada arranca «detenida»: avisar sería falso. Solo se anota desde cuándo mirar.
    moduloQueDice(detenidaA(AHORA.getTime() - 1000));
    expect(await revisarDetencionForzada('u-nueva', AHORA)).toBe('nada');
    expect(await AsyncStorage.getItem(REVISADA('u-nueva'))).toBe(String(AHORA.getTime()));
    expect(await AsyncStorage.getItem(AVISADA('u-nueva'))).toBeNull();
    expect(detencionForzadaDesde).not.toHaveBeenCalled();
  });

  it('un valor guardado que no sirve se trata como la primera vez', async () => {
    moduloQueDice(detenidaA(AHORA.getTime() - 1000));
    await AsyncStorage.setItem(REVISADA('u-1'), 'ayer');
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('nada');
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(AHORA.getTime()));
  });

  it('las siguientes veces mira desde la última revisión', async () => {
    moduloQueDice(SIN_DETENCION);
    await revisarDetencionForzada('u-1', AHORA);
    expect(detencionForzadaDesde).toHaveBeenLastCalledWith(REVISION_PREVIA);
    const despues = new Date(AHORA.getTime() + 3 * 60 * 60 * 1000);
    await revisarDetencionForzada('u-1', despues);
    expect(detencionForzadaDesde).toHaveBeenLastCalledWith(AHORA.getTime());
  });

  it('(b) el mismo día no vuelve a avisar, pero sí anota la nueva detención', async () => {
    moduloQueDice(detenidaA(AHORA.getTime() - 3_600_000));
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('avisar');

    const otraVez = new Date(AHORA.getTime() + 2 * 3_600_000);
    const segunda = otraVez.getTime() - 30_000;
    moduloQueDice(detenidaA(segunda));
    expect(await revisarDetencionForzada('u-1', otraVez)).toBe('nada');

    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBe('2026-10-19');
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(segunda));
  });

  it('otro día vuelve a avisar, como mucho una vez por día', async () => {
    moduloQueDice(detenidaA(AHORA.getTime() - 3_600_000));
    await revisarDetencionForzada('u-1', AHORA);

    const manana = new Date(AHORA.getTime() + UN_DIA_MS);
    moduloQueDice(detenidaA(manana.getTime() - 3_600_000));
    expect(await revisarDetencionForzada('u-1', manana)).toBe('avisar');
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBe('2026-10-20');
  });

  it('el día es el del teléfono, no el de UTC: a las 22:00 en Lima sigue siendo ese día', async () => {
    const nocheEnLima = new Date('2026-10-20T03:00:00Z'); // 22:00 del 19 en Lima
    moduloQueDice(detenidaA(nocheEnLima.getTime() - 1000));
    await revisarDetencionForzada('u-1', nocheEnLima);
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBe('2026-10-19');
  });
});

describe('cuando no hubo detención forzada', () => {
  it('(c) no avisa y guarda el instante revisado', async () => {
    moduloQueDice(SIN_DETENCION);
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('nada');
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(AHORA.getTime()));
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBeNull();
  });

  it('(c) quitar la app de recientes sin detención forzada (el módulo la descarta) no avisa', async () => {
    moduloQueDice({ detenida: false, cuando: null, motivo: 'reason=10 subreason=22 remove task' });
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('nada');
  });
});

describe('(d) un APK sin el módulo nativo, o con uno viejo', () => {
  it.each([
    ['sin módulo', null],
    ['módulo sin la función nueva', { puedeProgramarAlarmasExactas: () => true, abrirAjusteDeAlarmasExactas: () => true }],
    [
      'la función lanza',
      {
        puedeProgramarAlarmasExactas: () => true,
        abrirAjusteDeAlarmasExactas: () => true,
        detencionForzadaDesde: () => {
          throw new Error('boom');
        },
      },
    ],
    [
      'la función devuelve cualquier cosa',
      {
        puedeProgramarAlarmasExactas: () => true,
        abrirAjusteDeAlarmasExactas: () => true,
        detencionForzadaDesde: () => 'raro' as unknown as DetencionForzada,
      },
    ],
  ])('%s: no avisa y no lanza', async (_caso, modulo) => {
    usarModuloDeAlarmas(modulo);
    await expect(revisarDetencionForzada('u-1', AHORA)).resolves.toBe('nada');
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBeNull();
  });

  it('un almacenamiento que falla tampoco hace lanzar ni insistir con el aviso', async () => {
    moduloQueDice(detenidaA(AHORA.getTime() - 1000));
    // `setItem` ya es un doble: se le pide que falle UNA vez, sin tocar lo que hace el resto de las pruebas.
    (AsyncStorage.setItem as unknown as jest.Mock<() => Promise<void>>).mockRejectedValueOnce(new Error('disco lleno'));
    await expect(revisarDetencionForzada('u-1', AHORA)).resolves.toBe('nada');
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBeNull();
  });
});

describe('(e) cada cuenta lleva lo suyo', () => {
  it('las claves van por cuenta', async () => {
    moduloQueDice(detenidaA(AHORA.getTime() - 1000));
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('avisar');
    // La otra cuenta no avisó hoy y tiene su propio instante revisado.
    expect(await AsyncStorage.getItem(AVISADA('u-2'))).toBeNull();
    expect(await AsyncStorage.getItem(REVISADA('u-2'))).toBeNull();
    await cuentaYaRevisada('u-2', REVISION_PREVIA - 1000);
    expect(await revisarDetencionForzada('u-2', AHORA)).toBe('avisar');
    expect(detencionForzadaDesde).toHaveBeenLastCalledWith(REVISION_PREVIA - 1000);
  });
});

describe('(f) al cerrar sesión', () => {
  it('soltarAlarmasDeLaCuenta borra las dos claves, junto con lo demás de las alarmas', async () => {
    moduloQueDice(detenidaA(AHORA.getTime() - 1000));
    await revisarDetencionForzada('u-1', AHORA);
    await AsyncStorage.setItem('renaser.alarmas.sonido.u-1', 'campana'); // no es de las alarmas programadas: se queda
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).not.toBeNull();
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).not.toBeNull();

    await soltarAlarmasDeLaCuenta();

    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBeNull();
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBeNull();
    expect(await AsyncStorage.getItem('renaser.alarmas.sonido.u-1')).toBe('campana');
  });
});

/** Las dos señales a mano: lo que dice el historial del sistema y lo que dicen las alarmas vivas. */
function senales(historial: DetencionForzada, alarmas: EstadoDeLasAlarmas | Error): DependenciasDeLaDetencion {
  return {
    consultar: () => historial,
    alarmas: async () => {
      if (alarmas instanceof Error) throw alarmas;
      return alarmas;
    },
  };
}

describe('refuerzo FR-020: las alarmas ya no están, diga lo que diga el motivo de salida (T052)', () => {
  it('sin detención en el historial pero con las alarmas borradas: avisa igual', async () => {
    expect(await revisarDetencionForzada('u-1', AHORA, senales(SIN_DETENCION, 'borradas'))).toBe('avisar');
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBe('2026-10-19');
    // No hubo instante de detención: se anota hasta ahora, como siempre.
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(AHORA.getTime()));
  });

  it('las dos señales juntas son un solo aviso', async () => {
    const cuando = AHORA.getTime() - 60_000;
    expect(await revisarDetencionForzada('u-1', AHORA, senales(detenidaA(cuando), 'borradas'))).toBe('avisar');
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(cuando));
    // La segunda apertura del mismo día no insiste.
    const mas = new Date(AHORA.getTime() + 3_600_000);
    expect(await revisarDetencionForzada('u-1', mas, senales(SIN_DETENCION, 'borradas'))).toBe('nada');
  });

  it('respeta una vez por día', async () => {
    expect(await revisarDetencionForzada('u-1', AHORA, senales(SIN_DETENCION, 'borradas'))).toBe('avisar');
    const luego = new Date(AHORA.getTime() + 2 * 3_600_000);
    expect(await revisarDetencionForzada('u-1', luego, senales(SIN_DETENCION, 'borradas'))).toBe('nada');
    const manana = new Date(AHORA.getTime() + UN_DIA_MS);
    expect(await revisarDetencionForzada('u-1', manana, senales(SIN_DETENCION, 'borradas'))).toBe('avisar');
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBe('2026-10-20');
  });

  it('nunca la primera vez de la cuenta: sin revisión anterior solo se anota, aunque parezcan borradas', async () => {
    const consultar = jest.fn<(desdeMs: number) => DetencionForzada>(() => SIN_DETENCION);
    const alarmas = jest.fn<() => Promise<EstadoDeLasAlarmas>>(async () => 'borradas');
    expect(await revisarDetencionForzada('u-nueva', AHORA, { consultar, alarmas })).toBe('nada');
    expect(await AsyncStorage.getItem(REVISADA('u-nueva'))).toBe(String(AHORA.getTime()));
    expect(await AsyncStorage.getItem(AVISADA('u-nueva'))).toBeNull();
  });

  it.each<[string, EstadoDeLasAlarmas]>([
    ['vivas', 'vivas'],
    ['no se sabe', 'no_se_sabe'],
  ])('alarmas %s y sin detención: no avisa', async (_nombre, estado) => {
    expect(await revisarDetencionForzada('u-1', AHORA, senales(SIN_DETENCION, estado))).toBe('nada');
    expect(await AsyncStorage.getItem(AVISADA('u-1'))).toBeNull();
    expect(await AsyncStorage.getItem(REVISADA('u-1'))).toBe(String(AHORA.getTime()));
  });

  it('con la detención en el historial las alarmas «vivas» no la desmienten: el historial manda', async () => {
    expect(await revisarDetencionForzada('u-1', AHORA, senales(detenidaA(AHORA.getTime() - 1000), 'vivas'))).toBe('avisar');
  });

  it('si no se pueden comprobar las alarmas (lanza), vale solo el historial y nada lanza', async () => {
    await expect(revisarDetencionForzada('u-1', AHORA, senales(SIN_DETENCION, new Error('boom')))).resolves.toBe('nada');
    await expect(
      revisarDetencionForzada('u-1', AHORA, senales(detenidaA(AHORA.getTime() - 1000), new Error('boom'))),
    ).resolves.toBe('avisar');
  });

  it('por defecto usa la foto de las alarmas tomada al abrir la app, antes de rearmar', async () => {
    const deps: DependenciasDeAlarmasVivas = {
      permiso: () => 'concedido',
      proximaAlarmaPropia: () => 'ninguna',
      programadas: async () => [{ identifier: 'a', content: {}, trigger: { type: 'daily', hour: 7, minute: 0 } }],
      ahora: () => AHORA.getTime(),
    };
    void fotoDeLasAlarmasAlAbrir(deps);
    moduloQueDice(SIN_DETENCION);
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('avisar');
  });

  it('un APK sin la función nueva (sin foto útil) no cambia lo de antes: sin detención, nada', async () => {
    moduloQueDice(SIN_DETENCION);
    expect(await revisarDetencionForzada('u-1', AHORA)).toBe('nada');
  });
});
