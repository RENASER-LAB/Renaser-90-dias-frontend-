import { useCallback, useEffect, useState } from 'react';

import { useProgramaDia } from '../../programa/hooks/useProgramaDia';
import * as habitsApi from '../api/habitsApi';
import { quitarRenombreHabito, renombrarHabito } from '../api/renombreHabitoApi';
import { renombreDeHabitoLocal, type EstadoRenombreDeHabito } from '../storage/renombreDeHabito';
import {
  habitoAOfrecerParaRenombrar,
  type HabitoRenombrable,
} from '../utils/renombreDeHabito';

/**
 * El renombre de bebidas, en dos piezas que se usan por separado a propósito.
 *
 *  - `useRenombreLocal` — barato, sin red. Lo usa cualquier pantalla que muestre el nombre de un
 *    hábito o deje cambiarlo (hoy: Plan y el aviso del acompañante).
 *  - `useOfrecimientoDeRenombre` — el que SÍ pide datos al servidor, y solo se monta cuando hace
 *    falta decidir si ofrecer el cambio. Ver `RenombrarHabitoOverlay` para por qué están separados:
 *    quien ya respondió no puede pagar dos llamadas de red en cada arranque de la app para dibujar
 *    algo que no va a ver nunca más.
 */

const SIN_DATOS: EstadoRenombreDeHabito = { respondidoEn: null, titulos: {} };

/**
 * Lo que este teléfono sabe del renombre de ESTA cuenta, más las dos operaciones que lo cambian.
 *
 * `userId` puede ser `null` mientras `AuthContext` resuelve la sesión: ahí no se lee ni se escribe
 * nada — no hay a qué cuenta atribuirlo, y escribir bajo una clave equivocada es peor que no
 * escribir.
 */
export function useRenombreLocal(userId: string | null) {
  const [estado, setEstado] = useState<EstadoRenombreDeHabito>(SIN_DATOS);
  /** `false` hasta la primera lectura. Sin esto la pantalla parpadea del título viejo al propio. */
  const [listo, setListo] = useState(false);

  const releer = useCallback(async () => {
    if (!userId) {
      setEstado(SIN_DATOS);
      setListo(false);
      return;
    }
    setEstado(await renombreDeHabitoLocal.leer(userId));
    setListo(true);
  }, [userId]);

  useEffect(() => {
    void releer();
    // Cualquier otro punto de la app que renombre avisa por acá; sin esto, renombrar desde el
    // aviso dejaba a Plan mostrando el título viejo hasta recargar la pantalla.
    return renombreDeHabitoLocal.suscribir(() => {
      void releer();
    });
  }, [releer]);

  /**
   * Renombra en el SERVIDOR y recién después espeja el nombre en el teléfono. Ese orden importa:
   * al revés, un fallo de red dejaría a la pantalla mostrando un nombre que no existe en ninguna
   * parte. Si el backend rechaza (ventana cerrada, hábito no renombrable), el error sube tal cual
   * para que lo muestre quien llamó — el mensaje del servidor ya está escrito para leerse.
   */
  const renombrar = useCallback(
    async (habitId: string, tituloPersonal: string, motivo: string) => {
      const guardado = await renombrarHabito(habitId, tituloPersonal, motivo);
      if (userId) await renombreDeHabitoLocal.guardarTitulo(userId, habitId, guardado.customTitle);
    },
    [userId],
  );

  /** Vuelve al título del catálogo. Mismo orden: primero el servidor, después el espejo. */
  const quitarRenombre = useCallback(
    async (habitId: string) => {
      await quitarRenombreHabito(habitId);
      if (userId) await renombreDeHabitoLocal.borrarTitulo(userId, habitId);
    },
    [userId],
  );

  /** "Ya le preguntamos y respondió." Las tres salidas del aviso pasan por acá. */
  const marcarRespondido = useCallback(async () => {
    if (userId) await renombreDeHabitoLocal.marcarRespondido(userId);
  }, [userId]);

  return {
    titulos: estado.titulos,
    respondidoEn: estado.respondidoEn,
    listo,
    renombrar,
    quitarRenombre,
    marcarRespondido,
  };
}

/** Lo que devuelve `useOfrecimientoDeRenombre`. `null` en `habito` = no hay nada que ofrecer. */
export interface Ofrecimiento {
  habito: HabitoRenombrable | null;
}

/**
 * Decide si el acompañante tiene que ofrecer el cambio de nombre, y sobre qué hábito.
 *
 * Necesita dos datos del servidor:
 *
 *  - `GET /api/v1/home` (vía `useProgramaDia`, que ya existe) → `inscrito`, para
 *    saber si la ventana del backend sigue abierta.
 *  - `GET /api/v1/habits` → el catálogo, para encontrar el hábito por `systemKey` y NO por título.
 *
 * El catálogo se pide **solo si el día lo permite**: alguien en el día 40 no paga ninguna llamada
 * extra por una función que ya no puede usar.
 *
 * Si algo falla no se ofrece nada **y no se marca nada**: la próxima vez que se abra la app se
 * vuelve a intentar. Un ofrecimiento es decoración y no puede costarle nada a la pantalla que lo
 * muestra — mismo criterio que `useArranqueDelPrograma` y `useArranqueGuiado`.
 */
export function useOfrecimientoDeRenombre(
  habilitado: boolean,
  respondidoEn: string | null,
  titulos: Readonly<Record<string, string>>,
): Ofrecimiento {
  const [habito, setHabito] = useState<HabitoRenombrable | null>(null);
  const { inscrito, loading: cargandoDia } = useProgramaDia();

  const puedePreguntar =
    // Sin condicion de dia desde D-127: se puede reemplazar cualquier dia del programa. Se
    // sigue esperando a `cargandoDia` porque de ahi sale `inscrito`, que si importa: a quien no
    // tiene programa no hay nada que ofrecerle.
    habilitado && respondidoEn === null && !cargandoDia && inscrito;

  useEffect(() => {
    if (!puedePreguntar) {
      setHabito(null);
      return;
    }
    let vivo = true;
    void (async () => {
      try {
        const catalogo = await habitsApi.obtenerCatalogo();
        if (!vivo) return;
        setHabito(
          habitoAOfrecerParaRenombrar({ inscrito, respondidoEn, catalogo, titulos }),
        );
      } catch (error) {
        if (!vivo) return;
        console.warn('No se pudo resolver el ofrecimiento de renombre:', error);
        setHabito(null);
      }
    })();
    return () => {
      vivo = false;
    };
    // `titulos` a propósito fuera de las dependencias: cambia de identidad en cada lectura del
    // almacenamiento y volvería a disparar la llamada de red sin que haya cambiado nada que
    // importe. Lo que de verdad cierra el ofrecimiento es `respondidoEn`, que sí está.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedePreguntar, inscrito, respondidoEn]);

  return { habito };
}
