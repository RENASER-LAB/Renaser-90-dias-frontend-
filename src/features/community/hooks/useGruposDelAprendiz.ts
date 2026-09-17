import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as celulaApi from '../api/celulaApi';
import type { CellMember, CelulaDelAprendiz } from '../types/community.types';

/**
 * Los grupos del aprendiz, en plural, y los integrantes del que tenga abierto (D-142).
 *
 * **Por qué no alcanzaba `useMiCelula`.** Aquel pide `/me/cell` y `/me/cell/members`, que responden
 * siempre por el grupo principal. La pantalla de info se armaba con eso, así que abrir la info de
 * cualquier grupo mostraba el nombre, el mentor y los integrantes del principal — el "general"— sin
 * importar en cuál estuvieras parado. `useMiCelula` sigue existiendo y sigue siendo correcto para lo
 * que hace: la sección MENTOR / TRIBU de la pantalla principal, que habla de UN grupo.
 *
 * **Dos estados separados a propósito.** La lista de grupos se pide una vez y sirve para todos; los
 * integrantes se piden por grupo, recién cuando se abre su info, y cambian al cambiar de grupo. Si
 * vivieran juntos, abrir un chat obligaría a recargar la lista entera.
 */
export function useGruposDelAprendiz() {
  const [grupos, setGrupos] = useState<CelulaDelAprendiz[]>([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(true);
  const [errorGrupos, setErrorGrupos] = useState<string | null>(null);

  const recargarGrupos = useCallback(async () => {
    setCargandoGrupos(true);
    setErrorGrupos(null);
    try {
      setGrupos(await celulaApi.obtenerMisCelulas());
    } catch (e) {
      setErrorGrupos(mensajeDeError(e, 'No pudimos cargar tus grupos. Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      setCargandoGrupos(false);
    }
  }, []);

  useEffect(() => {
    void recargarGrupos();
  }, [recargarGrupos]);

  return { grupos, cargandoGrupos, errorGrupos, recargarGrupos };
}

/**
 * Los integrantes de UN grupo concreto.
 *
 * Con `celulaId` en null no pide nada y devuelve la lista vacía: es el caso de una conversación que
 * no es de grupo (un 1 a 1, la global), donde no hay integrantes que mostrar.
 *
 * **La carrera que evita el `cancelado`.** Abrir un grupo, volver y abrir otro rápido dispara dos
 * peticiones; sin el guardia, la primera en contestar —que puede ser la del grupo que ya cerraste—
 * pinta su lista sobre la del grupo que estás viendo. Es exactamente el mismo síntoma que este
 * cambio vino a arreglar, así que sería una lástima reintroducirlo por la puerta de atrás.
 */
export function useIntegrantesDelGrupo(celulaId: string | null) {
  const [integrantes, setIntegrantes] = useState<CellMember[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!celulaId) {
      setIntegrantes([]);
      setError(null);
      setCargando(false);
      return;
    }
    let cancelado = false;
    setCargando(true);
    setError(null);
    celulaApi
      .obtenerIntegrantesDeGrupo(celulaId)
      .then(lista => {
        if (!cancelado) setIntegrantes(lista);
      })
      .catch(e => {
        if (!cancelado) {
          setIntegrantes([]);
          setError(mensajeDeError(e, 'No pudimos cargar los integrantes de este grupo.'));
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [celulaId]);

  return { integrantes, cargando, error };
}
