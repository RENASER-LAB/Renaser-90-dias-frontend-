import AsyncStorage from '@react-native-async-storage/async-storage';

import { RANGOS_POR_DEFECTO, rangosValidos, type RangosDelDia } from '../utils/momentosDelDia';

/**
 * Dónde empiezan la mañana, la tarde y la noche PARA ESTA PERSONA, guardado en el teléfono.
 *
 * ## POR QUÉ EN EL TELÉFONO Y NO EN EL BACKEND
 *
 * Porque el backend hoy no tiene dónde ponerlo. Los cortes del día no existen como dato del
 * servidor: `aMomento` los tenía clavados en el cliente y nadie los guardaba en ninguna parte. La
 * alternativa a esto era no dejarlos editar, o fingir que se guardaban. Se eligió guardarlos de
 * verdad donde sí se puede — y queda planteado moverlos al servidor, que es lo que corresponde
 * para que la configuración viaje entre dispositivos.
 *
 * Consecuencia honesta, que la pantalla dice: **los cortes son de este teléfono.** Reinstalar la
 * app o entrar desde otro equipo los devuelve a los de fábrica (05:00 / 12:00 / 18:00).
 *
 * AsyncStorage y no `almacenamientoSeguro` (SecureStore): son tres números de preferencia visual,
 * no una credencial.
 *
 * Clave por usuario: en el mismo teléfono pueden pasar distintas cuentas y los cortes de una no
 * tienen por qué ser los de la otra — mismo criterio que `almacenamientoLocal` y
 * `borradorEspiritu`.
 */

const PREFIJO_CLAVE = 'renaser.habitos.rangosDelDia.';

/** Ninguna operación de almacenamiento debe poder tumbar la app — degrada a los valores de fábrica. */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

export const rangosDelDia = {
  /**
   * Devuelve SIEMPRE unos rangos usables. Un JSON corrupto, un valor fuera de rango o una
   * configuración que dejaría un bloque de cero minutos se descartan en silencio y se vuelve a
   * los de fábrica: es preferible a que la pantalla arranque con bloques imposibles porque una
   * versión vieja de la app escribió otra forma en esta misma clave.
   */
  leer: (userId: string): Promise<RangosDelDia> =>
    sinRomper(async () => {
      const crudo = await AsyncStorage.getItem(PREFIJO_CLAVE + userId);
      if (!crudo) return RANGOS_POR_DEFECTO;
      try {
        const leido = JSON.parse(crudo) as RangosDelDia;
        return rangosValidos(leido) ? leido : RANGOS_POR_DEFECTO;
      } catch {
        return RANGOS_POR_DEFECTO;
      }
    }, RANGOS_POR_DEFECTO),

  /** No escribe una configuración inválida: si llega una, se ignora y quedan los cortes anteriores. */
  guardar: (userId: string, valores: RangosDelDia): Promise<void> =>
    sinRomper(async () => {
      if (!rangosValidos(valores)) return;
      await AsyncStorage.setItem(PREFIJO_CLAVE + userId, JSON.stringify(valores));
    }, undefined),
};
