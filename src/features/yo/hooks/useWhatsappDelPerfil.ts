import { useCallback, useEffect, useRef, useState } from 'react';

import { guardarWhatsappDelPerfil, leerWhatsappDelPerfil } from '../api/whatsappDelPerfilApi';
import { decidirWhatsapp, valorInicialDelCampo, type DecisionDelWhatsapp } from '../utils/whatsappDelPerfil';

export type LecturaDelWhatsapp = 'pendiente' | 'cargando' | 'listo' | 'error';

/**
 * El WhatsApp de Editar perfil: lo que la persona puso en su Ficha Inicial, listo para cambiarlo y guardarlo (ver `whatsappDelPerfil` para de
 * dónde sale y a dónde va).
 *
 * - **Lee al abrir Editar perfil** (`activo`), una vez por visita. La primera vez la lectura es «cargando» y el campo no se dibuja (el selector
 *   de país parte del número que recibe, así que no puede nacer vacío y cambiar después); las siguientes se hacen en silencio, sin vaciar lo que
 *   se ve, y no pisan lo que la persona ya escribió.
 * - **Una lectura vieja nunca pisa a una nueva** (cada una toma un turno y solo la última escribe), y guardar anula las que estén en vuelo.
 * - **Si no se pudo leer, no se adivina**: el estado es `error` y el número no se manda al guardar; lo demás del perfil se guarda igual.
 */
export function useWhatsappDelPerfil(activo: boolean, cuentaId?: string | null) {
  const [lectura, setLectura] = useState<LecturaDelWhatsapp>('pendiente');
  const [valor, setValor] = useState(() => valorInicialDelCampo(null));
  /** Sube cuando el valor cambia por una lectura nueva: el campo se vuelve a armar con su país (la píldora no sigue al `value`). */
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const lecturaRef = useRef<LecturaDelWhatsapp>('pendiente');
  const guardadoRef = useRef<string | null>(null);
  const valorRef = useRef(valor);
  const tocadoRef = useRef(false);
  const turnoRef = useRef(0);

  const ponerLectura = useCallback((estado: LecturaDelWhatsapp) => {
    lecturaRef.current = estado;
    setLectura(estado);
  }, []);

  // Otra cuenta: nada de la anterior queda a la vista, ni una lectura que esté en vuelo.
  useEffect(() => {
    turnoRef.current += 1;
    guardadoRef.current = null;
    tocadoRef.current = false;
    valorRef.current = valorInicialDelCampo(null);
    setValor(valorRef.current);
    setError(null);
    ponerLectura('pendiente');
  }, [cuentaId, ponerLectura]);

  const cargar = useCallback(async () => {
    const turno = ++turnoRef.current;
    if (lecturaRef.current !== 'listo') ponerLectura('cargando');
    try {
      const guardado = await leerWhatsappDelPerfil();
      if (turno !== turnoRef.current) return;
      guardadoRef.current = guardado;
      if (!tocadoRef.current) {
        const inicial = valorInicialDelCampo(guardado);
        if (inicial !== valorRef.current) {
          valorRef.current = inicial;
          setValor(inicial);
          setVersion(v => v + 1);
        }
      }
      ponerLectura('listo');
    } catch {
      if (turno !== turnoRef.current) return;
      // Una relectura en silencio que falla no borra lo que ya se leyó.
      if (lecturaRef.current !== 'listo') ponerLectura('error');
    }
  }, [ponerLectura]);

  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar, cuentaId]);

  const cambiar = useCallback((nuevo: string) => {
    valorRef.current = nuevo;
    tocadoRef.current = true;
    setValor(nuevo);
    setError(null);
  }, []);

  /** Qué hacer con el número al guardar. Sin lectura confirmada no se manda nada: no se pisa un número que no se pudo ver. */
  const decidir = useCallback((): DecisionDelWhatsapp => {
    if (lecturaRef.current !== 'listo') return { tipo: 'sin-cambio' };
    return decidirWhatsapp(guardadoRef.current, valorRef.current);
  }, []);

  /** Guarda el número. Si falla, lanza: Perfil lo dice y la persona vuelve a tocar «Guardar cambios». */
  const guardar = useCallback(async (numero: string) => {
    turnoRef.current += 1;
    await guardarWhatsappDelPerfil(numero);
    guardadoRef.current = numero;
    tocadoRef.current = false;
    setError(null);
  }, []);

  const marcarError = useCallback((mensaje: string) => setError(mensaje), []);

  return { lectura, valor, version, error, cambiar, reintentar: cargar, decidir, guardar, marcarError };
}
