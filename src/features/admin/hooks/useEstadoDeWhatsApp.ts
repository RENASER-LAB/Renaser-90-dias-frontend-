import { useEffect, useState } from 'react';

import { leerElEstadoDeWhatsApp, type EstadoDeWhatsApp } from '../api/estadoDeWhatsAppApi';

/**
 * El aviso de «WhatsApp sin saldo» (spec 054). `activo: false` no pide nada (los roles que no son ADMIN ni ALCHEMIST nunca lo
 * piden). Si la lectura falla —sin red, un servidor anterior (404) o un 403— devuelve `null`: el aviso es un extra y no
 * bloquea ni ensucia el panel. Una lectura vieja nunca pisa a la nueva (la última que se pidió es la que vale).
 */
export function useEstadoDeWhatsApp({ activo }: { activo: boolean }): EstadoDeWhatsApp | null {
  const [estado, setEstado] = useState<EstadoDeWhatsApp | null>(null);

  useEffect(() => {
    if (!activo) {
      setEstado(null);
      return undefined;
    }
    let vigente = true;
    leerElEstadoDeWhatsApp().then(
      lectura => {
        if (vigente) setEstado(lectura);
      },
      () => {
        if (vigente) setEstado(null);
      },
    );
    return () => {
      vigente = false;
    };
  }, [activo]);

  return estado;
}
