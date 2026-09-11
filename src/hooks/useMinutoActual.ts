import { useEffect, useState } from 'react';

import { ahoraConfiable } from '../services/http/relojServidor';

/**
 * La hora actual, revisada una vez por minuto.
 *
 * Existe porque dos piezas de la pantalla de Hoy dependen del reloj y no de una respuesta del
 * servidor: cuál es el hábito de este momento y cuál es el slot abierto del Código Renaser. Sin
 * esto, quien deja la app abierta a las 10:59 sigue viendo el estado de las 10:00 hasta que
 * navega a otra pestaña y vuelve — justo el caso que el dueño quería evitar ("debe ser cada hora
 * exacta").
 *
 * **Se alinea al minuto siguiente, no cada 60 s desde que se montó.** Un `setInterval(60_000)`
 * arrancado a las 10:00:45 dispara a las 10:01:45, y esa fracción se arrastra: una tarjeta que
 * tiene que cambiar EN PUNTO llegaría hasta 59 segundos tarde. Acá el primer disparo cae en el
 * segundo 0 del minuto siguiente y a partir de ahí sí se puede usar un intervalo regular.
 *
 * La hora sale de `ahoraConfiable()` y no de `new Date()`: el instante lo corrige el reloj del
 * servidor, la zona la sigue poniendo el dispositivo. Ver `services/http/relojServidor.ts`.
 */
export function useMinutoActual(): Date {
  const [ahora, setAhora] = useState(() => ahoraConfiable());

  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const msHastaElProximoMinuto = 60_000 - (Date.now() % 60_000);
    const alineacion = setTimeout(() => {
      setAhora(ahoraConfiable());
      intervalo = setInterval(() => setAhora(ahoraConfiable()), 60_000);
    }, msHastaElProximoMinuto);

    return () => {
      clearTimeout(alineacion);
      if (intervalo) clearInterval(intervalo);
    };
  }, []);

  return ahora;
}
