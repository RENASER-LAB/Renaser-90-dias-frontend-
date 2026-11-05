import { useEffect, useState } from 'react';

import { consultarDisponibilidadDeMeet, type DisponibilidadDeMeet } from '../api/meetApi';

/**
 * ¿Se puede ofrecer «Crear enlace de Meet»? (spec 040, FR-014.) Se pregunta una vez, al abrir el formulario, y solo `activo` (quien crea o
 * edita eventos). Mientras no se sabe —y si la consulta falla— NO se ofrece: nunca se dibuja una opción que después responde 409 o 404.
 */
export function useDisponibilidadDeMeet(activo: boolean): { sabido: boolean; disponibilidad: DisponibilidadDeMeet } {
  const [estado, setEstado] = useState<{ sabido: boolean; disponibilidad: DisponibilidadDeMeet }>({
    sabido: false,
    disponibilidad: { disponible: false, motivo: null },
  });

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    void consultarDisponibilidadDeMeet().then(disponibilidad => vivo && setEstado({ sabido: true, disponibilidad }));
    return () => {
      vivo = false;
    };
  }, [activo]);

  return estado;
}
