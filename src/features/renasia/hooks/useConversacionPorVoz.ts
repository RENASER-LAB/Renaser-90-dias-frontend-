import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { enviarMensajeRenasia, RenasiaCuotaExcedidaError } from '../api/renasiaStream';
import { Locutor } from '../utils/locutor';
import { quitarTextoDeRespaldo } from '../utils/propuestas';
import { MAXIMO_CARACTERES_HABLADOS, separarOraciones, textoParaHablar } from '../utils/voz';
import { PARLANTES_DEL_TELEFONO, PUEDE_HABLAR } from './parlantesDelTelefono';
import { useDictado } from './useDictado';
import { useFrasesDeHabitos } from './useFrasesDeHabitos';

export type FaseDeVoz = 'reposo' | 'escuchando' | 'pensando' | 'hablando';

export type ConversacionPorVoz = {
  fase: FaseDeVoz;
  /** El reconocimiento de voz existe en este teléfono. Si no, el orbe no se ofrece para hablar. */
  disponible: boolean;
  /** Lo que la persona va diciendo, o lo último que dijo. */
  loQueDijiste: string;
  /** La respuesta del acompañante, escrita (siempre se muestra, también mientras la dice). */
  respuesta: string;
  /** Cuántas acciones propuso en esta respuesta: se confirman con botón en el chat, nunca por voz. */
  propuestas: number;
  error: string | null;
  /** Un solo toque hace lo que corresponde a la fase: escuchar, dejar de escuchar o callarse. */
  tocar: () => void;
};

/**
 * La conversación por voz del orbe de Hoy (pedido del dueño, 2026-09-23): tocas, hablas, el
 * acompañante piensa y te responde en voz alta, sin abrir el chat.
 *
 * - **Escuchar:** el dictado de siempre (`useDictado`), sesgado con los nombres de sus hábitos.
 * - **Pensar:** la MISMA llamada que el chat (`POST /api/v1/renasia/mensajes`, agente COMPANION):
 *   mismas herramientas, misma cuota, y la conversación queda en su historial del chat.
 * - **Responder:** voz del servidor (Gemini, voz Kore, D-159; antes Piper, D-157) y, si no hay, la
 *   del teléfono; sin markdown. Empieza a hablar con la PRIMERA oración completa mientras el resto sigue llegando
 *   (2026-09-23: esperar la respuesta entera se sentía lento). El `Locutor` pide cada oración apenas
 *   llega y las dice en orden; pasado el máximo, avisa que el resto quedó escrito.
 * - La pregunta viaja con `canal: 'VOZ'` (D-158): el acompañante contesta corto y como se habla.
 *
 * > Corregido 2026-09-23: decía "texto-a-voz del sistema" y encolaba en el motor del teléfono. Esa
 * > voz sonaba robótica; ahora es el respaldo.
 *
 * **Lo que cambia algo no se confirma por voz.** Si el acompañante propone una acción (mover un
 * horario, marcar un hábito), el orbe lo dice y la persona la confirma con el botón en el chat. Un
 * "sí" dicho en voz alta es exactamente el tipo de confirmación ambigua que D-132 enseñó a evitar.
 */
export function useConversacionPorVoz(): ConversacionPorVoz {
  const [fase, setFase] = useState<FaseDeVoz>('reposo');
  const [loQueDijiste, setLoQueDijiste] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [propuestas, setPropuestas] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const montadoRef = useRef(true);

  const frasesDeHabitos = useFrasesDeHabitos(true);

  /** El locutor del turno en curso; cada pregunta arranca uno nuevo. */
  const locutorRef = useRef<Locutor | null>(null);
  const turnoRef = useRef({ caracteres: 0, cortado: false, terminoDeLlegar: false });

  const alQuedarCallado = useCallback(() => {
    if (turnoRef.current.terminoDeLlegar && montadoRef.current) setFase('reposo');
  }, []);

  /** Dice una oración (detrás de la anterior). Nunca lee el respaldo "Propuesta: …". */
  const decir = useCallback((oracion: string) => {
    const turno = turnoRef.current;
    const limpia = textoParaHablar(oracion);
    if (!PUEDE_HABLAR || !locutorRef.current || !limpia || turno.cortado || /^Propuesta:/i.test(limpia)) return;
    if (turno.caracteres + limpia.length > MAXIMO_CARACTERES_HABLADOS) {
      turno.cortado = true;
      decirTal('El resto te lo dejé escrito en el chat.');
      return;
    }
    decirTal(limpia);

    function decirTal(frase: string) {
      turno.caracteres += frase.length;
      if (montadoRef.current) setFase('hablando');
      locutorRef.current?.decir(frase);
    }
  }, []);

  const preguntar = useCallback(
    async (pregunta: string) => {
      const texto = pregunta.trim();
      if (!texto) {
        setFase('reposo');
        return;
      }
      setLoQueDijiste(texto);
      setRespuesta('');
      setPropuestas(0);
      setError(null);
      setFase('pensando');
      const controller = new AbortController();
      abortRef.current = controller;
      let acumulado = '';
      let sinDecir = '';
      let cantidadDePropuestas = 0;
      locutorRef.current?.callar();
      locutorRef.current = new Locutor(PARLANTES_DEL_TELEFONO, alQuedarCallado);
      turnoRef.current = { caracteres: 0, cortado: false, terminoDeLlegar: false };
      try {
        await enviarMensajeRenasia(
          texto,
          { agent: 'COMPANION', canal: 'VOZ' },
          {
            onTexto: fragmento => {
              acumulado += fragmento;
              if (montadoRef.current) setRespuesta(acumulado);
              const { completas, resto } = separarOraciones(sinDecir + fragmento);
              sinDecir = resto;
              completas.forEach(decir);
            },
            onPropuesta: evento => {
              acumulado = quitarTextoDeRespaldo(acumulado, evento.resumen);
              cantidadDePropuestas += 1;
              if (montadoRef.current) {
                setRespuesta(acumulado);
                setPropuestas(cantidadDePropuestas);
              }
            },
            onError: mensaje => {
              if (montadoRef.current) setError(mensaje);
            },
            onFin: () => undefined,
          },
          controller.signal
        );
        if (!montadoRef.current) return;
        decir(sinDecir);
        if (cantidadDePropuestas > 0) decir('Te dejé la propuesta en el chat: confírmala con el botón.');
        turnoRef.current.terminoDeLlegar = true;
        if (!locutorRef.current?.hablando) setFase('reposo');
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (!montadoRef.current) return;
        setError(
          e instanceof RenasiaCuotaExcedidaError
            ? e.message
            : mensajeDeError(e, 'No pude responderte ahora. Intenta de nuevo en unos segundos.')
        );
        setFase('reposo');
      } finally {
        abortRef.current = null;
      }
    },
    [decir, alQuedarCallado]
  );

  const dictado = useDictado(frasesDeHabitos, preguntar);

  // Mientras escucha, lo que va entendiendo; el orbe lo muestra en vivo.
  useEffect(() => {
    if (dictado.escuchando) {
      setFase('escuchando');
      if (dictado.parcial) setLoQueDijiste(dictado.parcial);
    } else if (fase === 'escuchando') {
      // Se cerró el micrófono sin frase final (no habló): vuelve a reposo. Si hubo frase, `preguntar`
      // ya pasó a 'pensando' antes de que llegue este efecto.
      setFase(actual => (actual === 'escuchando' ? 'reposo' : actual));
    }
  }, [dictado.escuchando, dictado.parcial, fase]);

  useEffect(() => {
    if (dictado.error) setError(dictado.error);
  }, [dictado.error]);

  // Al salir de Hoy: cortar el stream y callarse. Nada sigue hablando en otra pantalla.
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      abortRef.current?.abort();
      locutorRef.current?.callar();
    };
  }, []);

  const tocar = useCallback(() => {
    if (fase === 'escuchando') {
      dictado.detener();
    } else if (fase === 'hablando') {
      // Callado de verdad: las oraciones que sigan llegando del stream ya no se dicen.
      turnoRef.current.cortado = true;
      locutorRef.current?.callar();
      setFase('reposo');
    } else if (fase === 'reposo') {
      setError(null);
      void dictado.empezar();
    }
    // 'pensando': el toque no hace nada; ya está en camino la respuesta.
  }, [fase, dictado]);

  return { fase, disponible: dictado.disponible, loQueDijiste, respuesta, propuestas, error, tocar };
}
