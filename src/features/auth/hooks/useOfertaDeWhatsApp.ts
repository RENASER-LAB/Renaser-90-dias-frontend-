import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { pedirCodigoDeRecuperacionPorWhatsApp, pedirCodigoDelRegistroPorWhatsApp } from '../api/codigoPorWhatsAppApi';
import {
  enmascararWhatsapp,
  seOfreceElWhatsapp,
  textoDeEnviado,
  type FlujoDelCodigo,
} from '../utils/codigoPorWhatsApp';

export type EstadoDelWhatsapp = 'esperando' | 'ofrecido' | 'enviando' | 'enviado';

type Opciones = {
  flujo: FlujoDelCodigo;
  /** Hay canal (`GET /auth/whatsapp-code`). Sin él no se ofrece nada nunca (FR-013). */
  disponible: boolean;
  /** Se está mirando la pantalla del código de este flujo: el reloj de 60 s corre desde que se abre. */
  enLaPantallaDelCodigo: boolean;
  email: string;
  /** Solo el alta: el número que se escribió en «Solicitar acceso». La recuperación nunca manda un número (FR-008). */
  whatsapp?: string;
};

/**
 * La oferta de mandar el código por WhatsApp (spec 043, FR-012, FR-015): espera 60 segundos desde que se abrió la pantalla del código, la muestra,
 * pide el envío una vez por toque y dice qué pasó. Reenviar por correo no reinicia la espera.
 */
export function useOfertaDeWhatsApp({ flujo, disponible, enLaPantallaDelCodigo, email, whatsapp }: Opciones) {
  const [abiertaDesde, setAbiertaDesde] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [estado, setEstado] = useState<EstadoDelWhatsapp>('esperando');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enLaPantallaDelCodigo || !disponible) {
      setAbiertaDesde(null);
      setEstado('esperando');
      setMensaje(null);
      setError(null);
      return;
    }
    const desde = Date.now();
    setAbiertaDesde(desde);
    setAhora(desde);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, [enLaPantallaDelCodigo, disponible]);

  const segundos = abiertaDesde === null ? 0 : Math.floor((ahora - abiertaDesde) / 1000);
  const listo = abiertaDesde !== null && seOfreceElWhatsapp(segundos);

  useEffect(() => {
    if (listo && estado === 'esperando') setEstado('ofrecido');
  }, [listo, estado]);

  const enmascaradoLocal = flujo === 'registro' && whatsapp ? enmascararWhatsapp(whatsapp) : null;

  const enviar = useCallback(async () => {
    if (estado === 'enviando') return;
    setEstado('enviando');
    setError(null);
    try {
      if (flujo === 'registro') {
        const enviadoA = await pedirCodigoDelRegistroPorWhatsApp(email, whatsapp ?? '');
        setMensaje(textoDeEnviado('registro', enviadoA ?? enmascaradoLocal));
      } else {
        await pedirCodigoDeRecuperacionPorWhatsApp(email);
        setMensaje(textoDeEnviado('recuperacion', null));
      }
      tacto.logro();
      setEstado('enviado');
    } catch (e) {
      tacto.error();
      setError(mensajeDeError(e, 'No pudimos enviar el código por WhatsApp. Intenta de nuevo en unos minutos.'));
      setEstado('ofrecido');
    }
  }, [estado, flujo, email, whatsapp, enmascaradoLocal]);

  return {
    /** Se dibuja el enlace (o lo que pasó después de tocarlo). */
    visible: disponible && enLaPantallaDelCodigo && estado !== 'esperando',
    estado,
    mensaje,
    error,
    enmascarado: enmascaradoLocal,
    enviar,
  };
}
