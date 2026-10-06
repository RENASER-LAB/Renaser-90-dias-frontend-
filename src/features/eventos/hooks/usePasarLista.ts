import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as asistenciaApi from '../api/asistenciaApi';
import type { EstadoDeLlegada, ListaDeAsistencia, PersonaDeLaLista } from '../types/asistencia.types';
import {
  COLA_VACIA,
  esFalloDeRed,
  esperaParaReintentar,
  hayPendientes,
  llegadaVisible,
  marcaConfirmada,
  marcaDescartada,
  marcaFallida,
  pedirMarca,
  type ColaDeMarcas,
} from '../utils/colaDeMarcas';

/** Cuánto se ofrece «Deshacer» después de un toque (la propuesta pide ~4 s). */
export const DESHACER_VISIBLE_MS = 4000;

export interface Deshacer {
  personaId: string;
  nombre: string;
  anterior: EstadoDeLlegada;
  nueva: EstadoDeLlegada;
  /** Para que dos toques seguidos sobre la misma persona reinicien la cuenta. */
  clave: number;
}

/**
 * «Pasar lista» de una fecha (D-256). Marcar no espera a la red: la fila cambia al tocar, el `PUT` va
 * detrás y, si la red falla, se reintenta solo (`colaDeMarcas`). Un rechazo del servidor (lista
 * cerrada, fuera de hora) no se reintenta: se relee la lista y se avisa.
 */
export function usePasarLista(eventoId: string, inicioOcurrencia: string) {
  const [lista, setLista] = useState<ListaDeAsistencia | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [cola, setCola] = useState<ColaDeMarcas>(COLA_VACIA);
  const [aviso, setAviso] = useState<string | null>(null);
  const [deshacer, setDeshacer] = useState<Deshacer | null>(null);
  const [ocupada, setOcupada] = useState(false);
  const colaRef = useRef<ColaDeMarcas>(COLA_VACIA);
  const enVuelo = useRef(new Set<string>());
  const temporizadores = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const montado = useRef(true);
  const claveDeshacer = useRef(0);

  const actualizarCola = useCallback((cambio: (c: ColaDeMarcas) => ColaDeMarcas) => {
    colaRef.current = cambio(colaRef.current);
    if (montado.current) setCola(colaRef.current);
  }, []);

  const leer = useCallback(async () => {
    try {
      const l = await asistenciaApi.verLista(eventoId, inicioOcurrencia);
      if (montado.current) {
        setLista(l);
        setFallo(null);
      }
    } catch (e) {
      if (montado.current) setFallo(mensajeDeError(e, 'No se pudo abrir la lista. Revisa tu conexión.'));
    }
  }, [eventoId, inicioOcurrencia]);

  useEffect(() => {
    montado.current = true;
    void leer();
    const relojes = temporizadores.current;
    return () => {
      montado.current = false;
      relojes.forEach(clearTimeout);
      relojes.clear();
    };
  }, [leer]);

  const reemplazarFila = useCallback((fila: PersonaDeLaLista) => {
    setLista(l => (l ? { ...l, personas: l.personas.map(p => (p.id === fila.id ? fila : p)) } : l));
  }, []);

  const enviar = useCallback(
    async (personaId: string) => {
      const pendiente = colaRef.current[personaId];
      if (!pendiente || enVuelo.current.has(personaId)) return;
      const enviada = pendiente.deseada;
      enVuelo.current.add(personaId);
      try {
        const fila = await asistenciaApi.marcar(eventoId, inicioOcurrencia, personaId, enviada);
        enVuelo.current.delete(personaId);
        if (!montado.current) return;
        reemplazarFila(fila);
        actualizarCola(c => marcaConfirmada(c, personaId, enviada));
        if (personaId in colaRef.current) void enviar(personaId); // se tocó otra vez mientras viajaba
      } catch (e) {
        enVuelo.current.delete(personaId);
        if (!montado.current) return;
        const status = e instanceof ApiError ? e.status : null;
        if (esFalloDeRed(status)) {
          actualizarCola(c => marcaFallida(c, personaId, enviada));
          const fallos = colaRef.current[personaId]?.fallos ?? 1;
          temporizadores.current.set(
            personaId,
            setTimeout(() => {
              temporizadores.current.delete(personaId);
              void enviar(personaId);
            }, esperaParaReintentar(fallos)),
          );
          return;
        }
        actualizarCola(c => marcaDescartada(c, personaId));
        setAviso(mensajeDeError(e, 'No se pudo guardar la marca.'));
        void leer();
      }
    },
    [eventoId, inicioOcurrencia, actualizarCola, reemplazarFila, leer],
  );

  const marcar = useCallback(
    (persona: PersonaDeLaLista, nueva: EstadoDeLlegada, conDeshacer = true) => {
      const anterior = llegadaVisible(colaRef.current, persona.id, persona.llegada);
      if (anterior === nueva) return;
      const reloj = temporizadores.current.get(persona.id);
      if (reloj) {
        clearTimeout(reloj);
        temporizadores.current.delete(persona.id);
      }
      actualizarCola(c => pedirMarca(c, persona.id, nueva));
      claveDeshacer.current += 1;
      setDeshacer(conDeshacer ? { personaId: persona.id, nombre: persona.nombre, anterior, nueva, clave: claveDeshacer.current } : null);
      void enviar(persona.id);
    },
    [actualizarCola, enviar],
  );

  const deshacerUltima = useCallback(() => {
    if (!deshacer || !lista) return;
    const persona = lista.personas.find(p => p.id === deshacer.personaId);
    if (persona) marcar(persona, deshacer.anterior, false);
    setDeshacer(null);
  }, [deshacer, lista, marcar]);

  const operar = useCallback(
    async (accion: () => Promise<ListaDeAsistencia>, porDefecto: string) => {
      setOcupada(true);
      try {
        const l = await accion();
        if (montado.current) {
          setLista(l);
          setDeshacer(null);
        }
        return true;
      } catch (e) {
        if (montado.current) setAviso(mensajeDeError(e, porDefecto));
        return false;
      } finally {
        if (montado.current) setOcupada(false);
      }
    },
    [],
  );

  const cerrar = useCallback(
    () => operar(() => asistenciaApi.cerrarLista(eventoId, inicioOcurrencia), 'No se pudo cerrar la lista.'),
    [operar, eventoId, inicioOcurrencia],
  );
  const reabrir = useCallback(
    () => operar(() => asistenciaApi.reabrirLista(eventoId, inicioOcurrencia), 'No se pudo reabrir la lista.'),
    [operar, eventoId, inicioOcurrencia],
  );

  const descartarAviso = useCallback(() => setAviso(null), []);
  const olvidarDeshacer = useCallback(() => setDeshacer(null), []);

  /** La lista con las marcas que todavía no confirmó el servidor ya aplicadas. */
  const visible = useMemo(() => {
    if (!lista) return null;
    return {
      ...lista,
      personas: lista.personas.map(p => {
        const llegada = llegadaVisible(cola, p.id, p.llegada);
        return llegada === p.llegada ? p : { ...p, llegada, marcadaEn: llegada ? (p.marcadaEn ?? new Date().toISOString()) : null };
      }),
    };
  }, [lista, cola]);

  return {
    lista: visible,
    fallo,
    pendientes: cola,
    hayPendientes: hayPendientes(cola),
    aviso,
    descartarAviso,
    deshacer,
    deshacerUltima,
    olvidarDeshacer,
    marcar,
    cerrar,
    reabrir,
    ocupada,
    recargar: leer,
  };
}
