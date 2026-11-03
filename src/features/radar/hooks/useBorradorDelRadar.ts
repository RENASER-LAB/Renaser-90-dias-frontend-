import { useCallback, useEffect, useRef, useState } from 'react';

import { ahoraConfiable } from '../../../services/http/relojServidor';
import { PREGUNTAS_RADAR, type CampoRadar } from '../config/configRadar';
import {
  borrarBorrador,
  guardarBorrador,
  leerBorrador,
  limpiarBorradoresViejos,
  type BorradorRadar,
} from '../storage/borradorRadar';

/**
 * Cuánto espera el borrador, sin teclear, antes de escribirse en el teléfono (2026-11-03: «que se guarde gradualmente»).
 * Era 1 segundo; con 400 ms una frase recién dictada o escrita ya está a salvo casi en el acto, y escribir seguido sigue
 * siendo UNA escritura al terminar de teclear (cada tecla reinicia la espera), no cientos.
 */
export const RETARDO_DEL_BORRADOR_MS = 400;

/** Lo que el formulario guarda: las cuatro respuestas, la energía y qué respuestas llevan algo dictado. */
export type ContenidoDelBorrador = Omit<BorradorRadar, 'guardadoEn'>;

const CAMPOS: readonly CampoRadar[] = PREGUNTAS_RADAR.map(p => p.campo);

/** Un formulario sin nada escrito ni elegido no es un borrador. */
export function contenidoVacio(c: ContenidoDelBorrador): boolean {
  return c.energia === null && CAMPOS.every(campo => (c.respuestas[campo] ?? '').trim().length === 0);
}

/** Una huella estable del contenido: sirve para no volver a escribir lo que ya está en el teléfono. */
export function huellaDelBorrador(c: ContenidoDelBorrador): string {
  return JSON.stringify([CAMPOS.map(campo => c.respuestas[campo] ?? ''), c.energia, [...(c.dictados ?? [])].sort()]);
}

const HUELLA_VACIA = huellaDelBorrador({
  respuestas: { whatAmIDoing: '', whatAmIThinking: '', whatAmIFeeling: '', whatAmIAvoiding: '' },
  energia: null,
});

/**
 * El borrador del Código Renaser: lo que la persona escribe, dicta o elige se va guardando en el teléfono MIENTRAS lo hace,
 * por cuenta y por hora del registro (`borradorRadar.ts`: `renaser.radar.borrador.<cuenta>|<fecha>|<HH>`).
 *
 * ## Qué garantiza
 *
 * - **Gradual.** Cada cambio espera {@link RETARDO_DEL_BORRADOR_MS} sin más cambios y se escribe; lo que ya está en el teléfono
 *   no se vuelve a escribir (huella).
 * - **Nada se pierde al salir.** Si la persona cierra el formulario (o este se desmonta) con un cambio todavía esperando,
 *   se escribe en ese momento: los últimos 400 ms de teclado no caen en el vacío.
 * - **Vuelve al reabrir en la misma hora.** Al abrirse lee el borrador de ESTA hora y lo devuelve por `alRecuperar`. Uno de otra
 *   hora no se lee: la clave lleva la hora, y los de horas que ya pasaron se barren.
 * - **Nunca pisa un borrador con un formulario en blanco.** No se escribe nada hasta terminar de leer (`hidratado`): si la
 *   lectura tardara más que la espera, el formulario vacío borraría lo que había. Y si la persona ya escribió algo antes de que
 *   llegara la lectura, lo suyo manda y no se recupera encima.
 * - **Registrar lo borra.** `descartar()` quita el borrador y evita que el cierre del formulario lo vuelva a escribir.
 *
 * `guardados` sube cada vez que un borrador con algo quedó escrito: el formulario lo usa para decir «Guardado» un instante.
 */
export function useBorradorDelRadar({
  visible,
  usuarioId,
  contenido,
  alRecuperar,
}: {
  visible: boolean;
  /** De quién es el borrador. Sin sesión no se guarda ni se lee nada. */
  usuarioId: string | null;
  contenido: ContenidoDelBorrador;
  /** El borrador de esta hora, si existía, al abrirse el formulario. */
  alRecuperar: (borrador: BorradorRadar) => void;
}): { guardados: number; descartar: () => void } {
  const [hidratado, setHidratado] = useState(false);
  const [guardados, setGuardados] = useState(0);
  /** La huella de lo que hay en el teléfono. */
  const enDisco = useRef(HUELLA_VACIA);
  /** El cambio que espera su turno para escribirse. */
  const pendiente = useRef<{ usuarioId: string; contenido: ContenidoDelBorrador } | null>(null);
  const descartado = useRef(false);

  const contenidoActual = useRef(contenido);
  contenidoActual.current = contenido;
  const alRecuperarRef = useRef(alRecuperar);
  alRecuperarRef.current = alRecuperar;

  /* Al abrirse: se lee lo que quedó a medias en ESTA hora (un envío que falló por falta de red, la app cerrada a la fuerza,
     el formulario cerrado a medio escribir). */
  useEffect(() => {
    setHidratado(false);
    if (!visible) return;
    descartado.current = false;
    pendiente.current = null;
    enDisco.current = HUELLA_VACIA;
    if (!usuarioId) {
      setHidratado(true);
      return;
    }
    let vigente = true;
    const momento = ahoraConfiable();
    void limpiarBorradoresViejos(usuarioId, momento);
    void leerBorrador(usuarioId, momento).then(borrador => {
      if (!vigente) return;
      if (borrador && contenidoVacio(contenidoActual.current)) {
        enDisco.current = huellaDelBorrador(borrador);
        alRecuperarRef.current(borrador);
      }
      setHidratado(true);
    });
    return () => {
      vigente = false;
    };
  }, [visible, usuarioId]);

  /** Escribe el cambio que espera, ya. */
  const escribirLoPendiente = useCallback(async () => {
    const espera = pendiente.current;
    if (!espera || descartado.current) return;
    pendiente.current = null;
    enDisco.current = huellaDelBorrador(espera.contenido);
    await guardarBorrador(espera.usuarioId, ahoraConfiable(), espera.contenido);
    if (!descartado.current && !contenidoVacio(espera.contenido)) setGuardados(n => n + 1);
  }, []);

  /* Cada cambio arma su espera; el siguiente la reinicia. */
  const huella = huellaDelBorrador(contenido);
  useEffect(() => {
    if (!visible || !usuarioId || !hidratado || descartado.current) return;
    if (huella === enDisco.current) {
      pendiente.current = null;
      return;
    }
    pendiente.current = { usuarioId, contenido: contenidoActual.current };
    const id = setTimeout(() => void escribirLoPendiente(), RETARDO_DEL_BORRADOR_MS);
    return () => clearTimeout(id);
  }, [visible, usuarioId, hidratado, huella, escribirLoPendiente]);

  /* Al cerrarse el formulario, y al desmontarse, nada de lo escrito queda esperando. */
  useEffect(() => {
    if (!visible) void escribirLoPendiente();
  }, [visible, escribirLoPendiente]);
  useEffect(() => () => void escribirLoPendiente(), [escribirLoPendiente]);

  const descartar = useCallback(() => {
    descartado.current = true;
    pendiente.current = null;
    if (usuarioId) void borrarBorrador(usuarioId, ahoraConfiable());
  }, [usuarioId]);

  return { guardados, descartar };
}
