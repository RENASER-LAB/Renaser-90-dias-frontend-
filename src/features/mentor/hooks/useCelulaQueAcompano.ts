import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { esDeRed, esNoDisponible, esProhibido, esSinCelula, obtenerMiCelula } from '../api/mentorApi';
import { repartirAlumnos, resumenDe } from '../reglas';
import type { CelulaResumen, MiCelula } from '../types/mentor.types';

/**
 * NO se llama `useMiCelula` a propósito: ya existe uno con ese nombre en `features/community`,
 * y responde a OTRA pregunta — "¿de qué célula soy miembro?". El suyo busca en
 * `participantes_programa`, así que a un mentor le devuelve `{assigned:false}` y una lista de
 * miembros vacía: un mentor no es participante de su célula, la acompaña vía
 * `celulas.mentor_id`. Lo dice la propia anotación del backend en `MiCelulaController`:
 * «no hay guard de rol: quien no es participante recibe lista vacía, no 403».
 *
 * Ese es justo el motivo por el que hace falta un endpoint nuevo y no se puede reutilizar
 * `/api/v1/me/cell`. Dos preguntas distintas, dos consultas distintas.
 */

/**
 * Por qué no hay datos. Los cuatro se arreglan de forma distinta, así que la pantalla los
 * dice distinto en vez de colapsarlos en "algo salió mal":
 *
 * - `no_disponible` — el endpoint todavía no está desplegado (404). No es culpa de nadie que
 *   esté usando la app, y no tiene sentido ofrecer "reintentar".
 * - `sin_permiso` — 403. El backend no reconoce a esta persona como mentor de esa célula.
 * - `sin_red` — no hubo respuesta. Reintentar sí sirve.
 * - `error` — cualquier otra cosa, incluida una respuesta con forma inesperada.
 */
export type FalloCelula = 'sin_celula' | 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

/** Lo que la pantalla y la tarjeta consumen. Se deriva; nunca se guarda en estado. */
export type VistaCelula = NonNullable<ReturnType<typeof vistaDe>>;

/** El reparto y el resumen salen de los datos: un estado paralelo es lo que hace que la cabecera
 *  diga 8 activos y la lista muestre 7. */
function vistaDe(datos: MiCelula | null) {
  if (!datos) return null;
  const reparto = repartirAlumnos(datos.alumnos);
  return { ...reparto, resumen: resumenDe(reparto.todos), celula: datos.celula, grupos: datos.grupos };
}

export function useCelulaQueAcompano(activo: boolean) {
  const [datos, setDatos] = useState<MiCelula | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloCelula | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);

  /* Que el endpoint no este desplegado no cambia entre un cambio de pestana y el siguiente.
     Sin esto, `useFocusEffect` lo repreguntaba cada vez que el mentor volvia a Hoy — medido:
     cinco llamadas en cinco minutos, todas 404. Un `recargar()` explicito (el boton, o volver
     a montar la app tras un despliegue) si vuelve a intentarlo. */
  const noDesplegado = useRef(false);
  /* Cuál de sus grupos mira (desde D-141 pueden ser varios). Ref y no estado: la recarga al volver
     a la pantalla tiene que respetarlo sin que cambiar de grupo dispare otra recarga más. */
  const elegido = useRef<string | null>(null);
  /* Solo la última petición escribe: si se tocan dos grupos seguidos, la respuesta del primero
     no puede pisar a la del segundo cuando llega tarde. */
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async (): Promise<MiCelula | null> => {
    if (!activo) return null;
    const peticion = ++ultimaPeticion.current;
    setCargando(true);
    setFallo(null);
    setDetalle(null);
    try {
      const nuevos = await obtenerMiCelula(elegido.current);
      if (peticion !== ultimaPeticion.current) return null;
      setDatos(nuevos);
      return nuevos;
    } catch (e) {
      if (peticion !== ultimaPeticion.current) return null;
      setDatos(null);
      noDesplegado.current = esNoDisponible(e);
      setFallo(
        esSinCelula(e) ? 'sin_celula'
        : esNoDisponible(e) ? 'no_disponible'
        : esProhibido(e) ? 'sin_permiso'
        : esDeRed(e) ? 'sin_red'
        : 'error',
      );
      setDetalle(e instanceof Error ? e.message : null);
      return null;
    } finally {
      if (peticion === ultimaPeticion.current) setCargando(false);
    }
  }, [activo]);
  const recargar = useCallback(() => {
    void cargar();
  }, [cargar]);

  /* Se recarga al volver a la pantalla, no solo al montarla: un mentor entra, escribe a
     alguien y vuelve, y espera ver el cambio. Igual que `useUltimaPublicacionMuro`. */
  useFocusEffect(
    useCallback(() => {
      if (noDesplegado.current) return;
      void recargar();
    }, [recargar]),
  );

  /** Reintento explicito: ignora el corte de arriba, por si el endpoint ya se desplego. */
  const reintentar = useCallback(() => {
    noDesplegado.current = false;
    void recargar();
  }, [recargar]);

  /**
   * Pasa a mirar otro de sus grupos. La cabecera cambia al instante (el nombre y el tipo ya se
   * conocen) y la lista llega con el padrón. Devuelve la vista del grupo nuevo, para quien tiene
   * que abrir algo adentro (la ficha de un alumno de ese grupo, desde un aviso); `null` si falló
   * o si otra elección la reemplazó.
   */
  const elegirGrupo = useCallback(
    async (grupoId: string): Promise<VistaCelula | null> => {
      elegido.current = grupoId;
      setDatos(previos => conGrupoElegido(previos, grupoId));
      return vistaDe(await cargar());
    },
    [cargar],
  );

  const vista = useMemo(() => vistaDe(datos), [datos]);

  return { vista, cargando, fallo, detalle, recargar: reintentar, elegirGrupo };
}

/** Los datos con la cabecera del grupo elegido y sin padrón, mientras llega el de ese grupo. */
function conGrupoElegido(datos: MiCelula | null, grupoId: string): MiCelula | null {
  const grupo: CelulaResumen | undefined = datos?.grupos.find(g => g.id === grupoId);
  return datos && grupo ? { ...datos, celula: grupo, alumnos: [] } : datos;
}
