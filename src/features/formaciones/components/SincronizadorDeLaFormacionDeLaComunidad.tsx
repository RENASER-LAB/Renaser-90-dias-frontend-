import { useEffect } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { useFormacionDeLaSesion } from '../context/FormacionContext';
import {
  darPorLeidaLaEleccion,
  eleccionValida,
  fijarLaEleccionRecordada,
  leerLaEleccionRecordada,
  prepararLaFormacionDeLaComunidad,
} from '../estado/formacionDeLaComunidad';
import { CODIGOS_DE_FORMACION } from '../types/formaciones.types';

/**
 * Mantiene al día la formación de la Comunidad (spec 024) con la sesión. Vive en `App.tsx`, junto a los otros que no pintan nada.
 *
 * - Sin sesión, o con una cuenta que NO ve todas las formaciones (aprendiz, mentor, guía, líder): el estado queda limpio y ninguna
 *   lectura ni escritura de la Comunidad manda nada nuevo.
 * - Con Administración, Alquimista o Soporte TI: lee la elección que esa cuenta dejó en este teléfono (`null` = «Todas») y la
 *   valida contra las formaciones que la sesión ofrece. Mientras la lee, Comunidad espera (`listo: false`); si la lectura falla, sigue
 *   con «Todas». Cambiar de cuenta parte de cero.
 *
 * No decide qué ve nadie: eso lo filtra siempre el servidor. Solo recuerda qué formación quiso mirar quien las ve todas.
 */
export function SincronizadorDeLaFormacionDeLaComunidad(): null {
  const { user, isAuthenticated } = useAuth();
  const { formacion } = useFormacionDeLaSesion();
  const cuenta = isAuthenticated && user ? user.id : null;
  const veTodas = Boolean(formacion?.veTodas);
  const disponibles = formacion?.disponibles;
  const activa = formacion?.activa ?? null;
  /* Los nombres que Administración les puso, por si cambiaron con la sesión (`recargar`): sin esto el selector se quedaría con los viejos. */
  const huella = `${(disponibles ?? []).map(o => `${o.codigo}=${o.nombre}`).join('|')}#${activa ? `${activa.codigo}=${activa.nombre}` : ''}`;

  useEffect(() => {
    prepararLaFormacionDeLaComunidad(cuenta, veTodas, { disponibles: disponibles ?? [], activa });
    if (!cuenta || !veTodas) return undefined;
    let vigente = true;
    const codigos = (disponibles ?? []).map(o => o.codigo);
    const permitidas = codigos.length > 0 ? codigos : [...CODIGOS_DE_FORMACION];
    void leerLaEleccionRecordada(cuenta)
      .then(codigo => {
        if (vigente) fijarLaEleccionRecordada(cuenta, eleccionValida(codigo, permitidas));
      })
      .catch(() => {
        if (vigente) darPorLeidaLaEleccion(cuenta);
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `huella` resume `disponibles` y `activa`.
  }, [cuenta, veTodas, huella]);

  return null;
}
