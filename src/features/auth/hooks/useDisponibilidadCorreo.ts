import { useEffect, useRef, useState } from 'react';

import * as authApi from '../api/authApi';

/**
 * Aviso en vivo de si un correo está libre para registrarse, mientras la persona lo escribe
 * en la pestaña de creación de cuenta. Es una ayuda, no una validación: el backend sigue
 * siendo quien decide de verdad al enviar el formulario (`enviarCodigo` en
 * `useRegistroConOtp.ts` ya repite esta misma consulta antes de mandar el OTP).
 */
export type EstadoDisponibilidadCorreo = 'idle' | 'verificando' | 'disponible' | 'tomado';

const DEBOUNCE_MS = 500;

// Forma mínima de un correo: algo antes y después de la arroba, y un punto en el dominio.
// Sin este filtro se consulta al backend en cada tecla ("r", "ri", "ric"...) mientras la
// persona todavía está escribiendo, y esas consultas cuentan contra el rate limit por IP que
// el backend aplica a `/api/v1/account-requests/check-email`.
const FORMA_DE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useDisponibilidadCorreo(email: string): EstadoDisponibilidadCorreo {
  const [estado, setEstado] = useState<EstadoDisponibilidadCorreo>('idle');

  // A qué correo corresponde la consulta que está en vuelo ahora mismo. La red no garantiza
  // orden de llegada: si la persona sigue tipeando, la respuesta de una consulta vieja puede
  // llegar DESPUÉS de la más reciente y pintar un veredicto sobre un correo que ya no es el
  // que está en el campo. Comparar contra este ref antes de aplicar el resultado es lo que
  // descarta esa respuesta tardía — sin esto el bug es intermitente y difícil de reproducir.
  const correoEnVueloRef = useRef<string | null>(null);

  useEffect(() => {
    const correo = email.trim().toLowerCase();

    if (!FORMA_DE_CORREO.test(correo)) {
      correoEnVueloRef.current = null;
      setEstado('idle');
      return;
    }

    // Al cambiar el correo se limpia el veredicto anterior de inmediato: si no, mientras
    // corre el debounce se sigue mostrando "disponible" de un correo que la persona ya editó.
    setEstado('idle');

    const temporizador = setTimeout(() => {
      correoEnVueloRef.current = correo;
      setEstado('verificando');
      authApi
        .correoDisponible(correo)
        .then(disponible => {
          if (correoEnVueloRef.current !== correo) return; // respuesta vieja: se descarta
          setEstado(disponible ? 'disponible' : 'tomado');
        })
        .catch(() => {
          if (correoEnVueloRef.current !== correo) return;
          // Sin red o backend caído: no se muestra ningún veredicto. Un aviso de
          // disponibilidad que en realidad no se pudo verificar es peor que no mostrar nada,
          // y el envío del formulario no depende de este hook para funcionar.
          setEstado('idle');
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(temporizador);
  }, [email]);

  return estado;
}
