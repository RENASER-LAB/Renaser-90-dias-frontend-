import { describe, expect, it } from '@jest/globals';

import {
  errorDeMotivo,
  errorDeTituloPersonal,
  esRenombrable,
  habitoAOfrecerParaRenombrar,
  MAXIMO_MOTIVO,
  MAXIMO_TITULO_PERSONAL,
  soloRenombrables,
  tituloVisible,
  type ContextoDelOfrecimiento,
  type HabitoRenombrable,
} from '../renombreDeHabito';

/** Las dos bebidas reales del catálogo (V4 del esquema), con su `systemKey` de verdad. */
const AGUA_LIMON: HabitoRenombrable = {
  id: '66507383-7219-43ab-aa42-2fbc76152b82',
  title: 'AGUA TIBIA CON LIMÓN',
  systemKey: 'WARM_LEMON_WATER',
};
const JUGO_VERDE: HabitoRenombrable = {
  id: '00006bd5-ab74-4317-b022-ae2e3a878d55',
  title: 'JUGO VERDE',
  systemKey: 'GREEN_JUICE',
};
const CLASE_DIARIA: HabitoRenombrable = {
  id: '830c3d76-888a-4aef-bb30-fb0f0cc7ca73',
  title: 'CLASE DIARIA',
  systemKey: 'DAILY_CLASS',
};

function contexto(parcial: Partial<ContextoDelOfrecimiento> = {}): ContextoDelOfrecimiento {
  return {
    inscrito: true,
    respondidoEn: null,
    catalogo: [AGUA_LIMON, JUGO_VERDE, CLASE_DIARIA],
    titulos: {},
    rol: 'APRENDIZ',
    ...parcial,
  };
}

describe('esRenombrable', () => {
  it('reconoce las dos bebidas que el backend acepta', () => {
    expect(esRenombrable('GREEN_JUICE')).toBe(true);
    expect(esRenombrable('WARM_LEMON_WATER')).toBe(true);
  });

  it('cualquier otro hábito de sistema no se renombra', () => {
    expect(esRenombrable('DAILY_CLASS')).toBe(false);
    expect(esRenombrable('PASTILLA_RENACER')).toBe(false);
  });

  it('un hábito personal (sin clave) no se renombra por esta vía', () => {
    expect(esRenombrable(null)).toBe(false);
    expect(esRenombrable(undefined)).toBe(false);
    expect(esRenombrable('')).toBe(false);
  });
});

describe('soloRenombrables', () => {
  it('empareja por clave de sistema y NUNCA por título', () => {
    // El caso que este test protege: un hábito que SE LLAMA "JUGO VERDE" pero no es el del
    // catálogo (clave nula) no puede colarse. Emparejar por texto lo dejaría pasar, y el backend
    // respondería 400 "Este habito no se puede reemplazar" después del viaje de red.
    const impostor: HabitoRenombrable = { id: 'x', title: 'JUGO VERDE', systemKey: null };
    expect(soloRenombrables([impostor, CLASE_DIARIA])).toEqual([]);
  });

  it('empareja aunque el título del catálogo cambie', () => {
    const renombradoEnElPanel = { ...JUGO_VERDE, title: 'BEBIDA VERDE DE LA MAÑANA' };
    expect(soloRenombrables([renombradoEnElPanel])).toEqual([renombradoEnElPanel]);
  });
});

describe('habitoAOfrecerParaRenombrar', () => {
  it('en el día 0, sin haber respondido nunca, ofrece la primera bebida del catálogo', () => {
    expect(habitoAOfrecerParaRenombrar(contexto())).toBe(AGUA_LIMON);
  });

  /* 2026-09-15. El aviso vive en `App.tsx`, o sea por encima del navegador: se dibuja sobre
     CUALQUIER pantalla. Para una cuenta de staff eso incluye el panel de administración, y ahí la
     tarjeta quedaba tapando "Guardar cambios" del formulario de grupos — el botón se veía pero no
     recibía el clic. Lo cazó la prueba E2E `E06`, con captura. */
  it('a una cuenta de staff no se le ofrece: su aviso taparía el panel de administración', () => {
    for (const rol of ['ADMIN', 'ALQUIMISTA', 'MENTOR']) {
      expect(habitoAOfrecerParaRenombrar(contexto({ rol }))).toBeNull();
    }
  });

  it('sin rol todavía resuelto tampoco ofrece: se espera a saber quién es', () => {
    expect(habitoAOfrecerParaRenombrar(contexto({ rol: null }))).toBeNull();
  });

  it('al aprendiz se le sigue ofreciendo igual que antes', () => {
    expect(habitoAOfrecerParaRenombrar(contexto({ rol: 'APRENDIZ' }))).toBe(AGUA_LIMON);
  });

  it('después de responder —sí o no— no vuelve a preguntar nunca', () => {
    expect(habitoAOfrecerParaRenombrar(contexto({ respondidoEn: '2026-09-15T10:00:00.000Z' }))).toBeNull();
  });

  // D-127 (2026-09-15). Este test decía lo contrario --"con el programa ya arrancado no ofrece
  // nada: el backend rechazaría el cambio"-- porque el servidor solo aceptaba el renombre hasta
  // el día 0. Se abrió a cualquier día: nadie descubre el día 0 que el jugo verde le cae mal.
  it('el día del programa ya no decide nada: con el programa arrancado se sigue ofreciendo', () => {
    expect(habitoAOfrecerParaRenombrar(contexto())).toBe(AGUA_LIMON);
  });

  it('sin inscripción no hay participante al que renombrarle nada', () => {
    expect(habitoAOfrecerParaRenombrar(contexto({ inscrito: false }))).toBeNull();
  });

  it('un hábito que YA tiene nombre propio no se ofrece: eso también cuenta como respondido', () => {
    const ctx = contexto({ titulos: { [AGUA_LIMON.id]: 'Mi vaso de agua', [JUGO_VERDE.id]: 'Fruta' } });
    expect(habitoAOfrecerParaRenombrar(ctx)).toBeNull();
  });

  it('con una bebida ya renombrada ofrece la OTRA, no la que ya tiene nombre', () => {
    const ctx = contexto({ titulos: { [AGUA_LIMON.id]: 'Mi vaso de agua' } });
    expect(habitoAOfrecerParaRenombrar(ctx)).toBe(JUGO_VERDE);
  });

  it('un nombre propio en blanco no cuenta como renombre', () => {
    const ctx = contexto({ titulos: { [AGUA_LIMON.id]: '   ' } });
    expect(habitoAOfrecerParaRenombrar(ctx)).toBe(AGUA_LIMON);
  });

  it('un catálogo sin bebidas no dispara ningún aviso', () => {
    expect(habitoAOfrecerParaRenombrar(contexto({ catalogo: [CLASE_DIARIA] }))).toBeNull();
    expect(habitoAOfrecerParaRenombrar(contexto({ catalogo: [] }))).toBeNull();
  });
});

describe('tituloVisible', () => {
  it('el nombre que puso la persona le gana al del catálogo', () => {
    expect(tituloVisible(JUGO_VERDE, { [JUGO_VERDE.id]: 'Batido de papaya' })).toBe('Batido de papaya');
  });

  it('sin nombre propio se muestra el del catálogo', () => {
    expect(tituloVisible(JUGO_VERDE, {})).toBe('JUGO VERDE');
  });

  it('un nombre propio en blanco no borra el del catálogo', () => {
    expect(tituloVisible(JUGO_VERDE, { [JUGO_VERDE.id]: '  ' })).toBe('JUGO VERDE');
  });
});

describe('errorDeTituloPersonal', () => {
  it('acepta un nombre normal', () => {
    expect(errorDeTituloPersonal('Batido de papaya')).toBeNull();
  });

  it('el nombre es obligatorio, y los espacios no cuentan como nombre', () => {
    expect(errorDeTituloPersonal('')).not.toBeNull();
    expect(errorDeTituloPersonal('    ')).not.toBeNull();
  });

  it('respeta el mismo tope que el backend (60), contando el texto ya recortado', () => {
    expect(errorDeTituloPersonal('a'.repeat(MAXIMO_TITULO_PERSONAL))).toBeNull();
    expect(errorDeTituloPersonal('a'.repeat(MAXIMO_TITULO_PERSONAL + 1))).not.toBeNull();
    // Con espacios al borde, 60 caracteres útiles siguen entrando: el backend hace `trim()` antes
    // de medir, así que medir el crudo rechazaría un título que el servidor sí acepta.
    expect(errorDeTituloPersonal(`  ${'a'.repeat(MAXIMO_TITULO_PERSONAL)}  `)).toBeNull();
  });
});

describe('errorDeMotivo', () => {
  it('acepta un motivo normal', () => {
    expect(errorDeMotivo('Tengo gastritis y el limón en ayunas me cae mal')).toBeNull();
  });

  it('el motivo es obligatorio: el backend lo exige con @NotBlank', () => {
    expect(errorDeMotivo('')).not.toBeNull();
    expect(errorDeMotivo('   ')).not.toBeNull();
  });

  it('respeta el mismo tope que el backend (200)', () => {
    expect(errorDeMotivo('m'.repeat(MAXIMO_MOTIVO))).toBeNull();
    expect(errorDeMotivo('m'.repeat(MAXIMO_MOTIVO + 1))).not.toBeNull();
  });
});
