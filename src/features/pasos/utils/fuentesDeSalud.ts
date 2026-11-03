import type { DispositivoDeLaLectura, FuenteDeLosPasos, RegistroDeSalud } from '../types/pasos.types';

/**
 * De dónde vienen los pasos, y de cuáles no hay que fiarse (spec 037, D-310).
 *
 * Health Connect no filtra por método de registro —ni el agregado ni la lectura— y cualquier app con permiso de escritura
 * puede escribir pasos. Por eso se leen los registros del día y se miran sus metadatos: un origen es **limpio** si ninguno
 * de sus registros es de método desconocido o escrito a mano. El número oficial es el AGREGADO de Health Connect (que ya
 * elimina duplicados con la prioridad que fijó la persona) pedido solo a los orígenes limpios. Aquí no se suma nada.
 */

/** `recordingMethod` que NO cuentan: 0 = desconocido (no se puede verificar), 3 = lo escribió la persona. */
export const METODOS_QUE_NO_CUENTAN: ReadonlySet<number> = new Set([0, 3]);

/** `Device.TYPE_*` de Health Connect: reloj, anillo y pulsera cuentan como «reloj»; 2 es el teléfono. */
const TIPOS_DE_RELOJ: ReadonlySet<number> = new Set([1, 4, 6, 7]);
const TIPO_TELEFONO = 2;

/** Desde junio de 2026 el teléfono usa un nombre sintético por dispositivo y por app; antes era `android`. Se reconoce por el prefijo. */
const PREFIJO_DEL_TELEFONO = 'com.android.healthconnect.phone';
const ORIGEN_ANTIGUO_DEL_TELEFONO = 'android';

/**
 * Nombres de los paquetes más comunes, para decir «Samsung Health» y no el paquete. Los paquetes están escritos de memoria y
 * deben confirmarse en un teléfono real (quickstart): uno que no figure no rompe nada, sale con el modelo del dispositivo o
 * como «Otra app».
 */
export const PAQUETES_CONOCIDOS: Readonly<Record<string, string>> = {
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.xiaomi.wearable': 'Mi Fitness',
  'com.mi.health': 'Mi Fitness',
  'com.huami.watch.hmwatchmanager': 'Zepp',
  'com.strava': 'Strava',
  'fi.polar.polarflow': 'Polar Flow',
};

export const ETIQUETA_DEL_TELEFONO = 'Tu teléfono';
export const ETIQUETA_DE_OTRA_APP = 'Otra app';

export function esElTelefono(paquete: string): boolean {
  return paquete === ORIGEN_ANTIGUO_DEL_TELEFONO || paquete.startsWith(PREFIJO_DEL_TELEFONO);
}

/** ¿Este registro es de fiar? Un método que no se pudo verificar o escrito a mano no lo es. */
export function registroEsDeFiar(registro: RegistroDeSalud): boolean {
  return registro.metodo !== undefined && !METODOS_QUE_NO_CUENTAN.has(registro.metodo);
}

export interface OrigenesDelDia {
  /** Orígenes cuyos registros del día son todos de fiar. */
  limpios: string[];
  /** Orígenes con algún registro escrito a mano o de método desconocido: no cuentan. */
  sucios: string[];
}

/** Separa los orígenes del día en limpios y sucios. Un origen sucio lo es entero: con un registro dudoso no se fía del resto. */
export function origenesDelDia(registros: readonly RegistroDeSalud[]): OrigenesDelDia {
  const sucios = new Set<string>();
  const todos = new Set<string>();
  for (const registro of registros) {
    todos.add(registro.origen);
    if (!registroEsDeFiar(registro)) sucios.add(registro.origen);
  }
  return {
    limpios: [...todos].filter(origen => !sucios.has(origen)),
    sucios: [...sucios],
  };
}

function dispositivoDe(registro: RegistroDeSalud | undefined, paquete: string): DispositivoDeLaLectura {
  if (esElTelefono(paquete)) return 'TELEFONO';
  const tipo = registro?.tipoDeDispositivo;
  if (tipo !== undefined && TIPOS_DE_RELOJ.has(tipo)) return 'RELOJ';
  if (tipo === TIPO_TELEFONO) return 'TELEFONO';
  return 'OTRO';
}

function etiquetaDe(registro: RegistroDeSalud | undefined, paquete: string, dispositivo: DispositivoDeLaLectura): string {
  if (esElTelefono(paquete)) return ETIQUETA_DEL_TELEFONO;
  const modelo = registro?.modelo?.trim();
  // Un reloj se nombra por su modelo («Galaxy Watch»); una app de teléfono, por la app.
  if (dispositivo === 'RELOJ' && modelo) return modelo;
  return PAQUETES_CONOCIDOS[paquete] ?? (modelo || ETIQUETA_DE_OTRA_APP);
}

/** Cómo se llama y qué tipo de dispositivo es la fuente de un origen, según el primer registro que se leyó de él. */
export function fuenteDe(paquete: string, registros: readonly RegistroDeSalud[]): FuenteDeLosPasos {
  const registro = registros.find(r => r.origen === paquete);
  const dispositivo = dispositivoDe(registro, paquete);
  return { paquete, etiqueta: etiquetaDe(registro, paquete, dispositivo), dispositivo };
}

const ORDEN_DE_DISPOSITIVO: Readonly<Record<DispositivoDeLaLectura, number>> = { RELOJ: 0, TELEFONO: 1, OTRO: 2 };

/** Ordena las fuentes: primero el reloj (suele medir mejor la distancia), luego el teléfono y al final lo demás. */
export function ordenarFuentes(fuentes: readonly FuenteDeLosPasos[]): FuenteDeLosPasos[] {
  return [...fuentes].sort((a, b) => ORDEN_DE_DISPOSITIVO[a.dispositivo] - ORDEN_DE_DISPOSITIVO[b.dispositivo]);
}
