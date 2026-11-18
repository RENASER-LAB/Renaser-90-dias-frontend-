import { useEffect, useState } from 'react';

import { obtenerAprendicesDelLider } from '../api/aprendicesDelLiderApi';

/** Quién es cada persona de las consultas: su nombre y el de su mentor. */
export interface QuienPregunta {
  nombre: string;
  mentorNombre: string | null;
}

const PAGINAS_COMO_MAXIMO = 10;

/**
 * Los nombres de quienes preguntan (spec 056 FR-028). El listado de consultas trae solo el id de cada persona (`traineeProfileId`), no su nombre ni su mentor;
 * «Todos los aprendices» (`GET /leadership/people`) trae las dos cosas. Se leen sus páginas, de a 30, hasta encontrar a todos los pedidos, hasta que no haya más
 * o hasta 10 páginas. Mientras llega, o si no aparece, la consulta dice «Un aprendiz»: nunca un id ni un nombre inventado. Un fallo no tumba la bandeja.
 */
export function useQuienesPreguntan(personaIds: readonly string[]): ReadonlyMap<string, QuienPregunta> {
  const [conocidos, setConocidos] = useState<ReadonlyMap<string, QuienPregunta>>(new Map());
  const clave = [...new Set(personaIds)].sort().join('|');

  useEffect(() => {
    const pendientes = new Set(clave === '' ? [] : clave.split('|'));
    if (pendientes.size === 0) return;
    let vivo = true;
    void (async () => {
      const encontrados = new Map<string, QuienPregunta>();
      try {
        for (let pagina = 0; pagina < PAGINAS_COMO_MAXIMO && pendientes.size > 0; pagina += 1) {
          const lectura = await obtenerAprendicesDelLider({ pagina });
          for (const fila of lectura.items) {
            if (pendientes.delete(fila.personaId)) encontrados.set(fila.personaId, { nombre: fila.nombre, mentorNombre: fila.mentorNombre });
          }
          if (!lectura.hayMas) break;
        }
      } catch {
        /* Sin nombres la bandeja se lee igual. */
      }
      if (vivo && encontrados.size > 0) setConocidos(previos => new Map([...previos, ...encontrados]));
    })();
    return () => {
      vivo = false;
    };
  }, [clave]);

  return conocidos;
}
