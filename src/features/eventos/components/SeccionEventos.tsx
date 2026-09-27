import React, { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as eventosApi from '../api/eventosApi';
import { useEventos } from '../hooks/useEventos';
import type { Asistencia, Evento, Ocurrencia } from '../types/eventos.types';
import { armarCuerpo, formularioDesdeEvento, formularioVacio, type FormularioDeEvento } from '../utils/formularioDeEvento';
import { puedeGestionarEventos } from '../utils/permisosDeEventos';
import { DetalleDelEvento } from './DetalleDelEvento';
import { FormularioDelEvento } from './FormularioDelEvento';
import { MiAgenda } from './MiAgenda';
import { Parrafo, TarjetaEvento } from './piezas';

type Vista =
  | { nombre: 'lista' }
  | { nombre: 'detalle'; eventoId: string; inicioOcurrencia: string | null }
  | { nombre: 'formulario'; original: Evento | null }
  | { nombre: 'agenda' };

/** Un evento que no está en la lista (más allá de 30 días, o recién abierto desde un aviso). */
function ocurrenciaSuelta(evento: Evento): Ocurrencia {
  return {
    evento,
    inicioOcurrencia: evento.iniciaEn,
    iniciaEn: evento.iniciaEn,
    duracionMinutos: evento.duracionMinutos,
    titulo: evento.titulo,
    asistencia: null,
  };
}

/**
 * La sección «Eventos» de Comunidad (E-5 a E-8; decisión del dueño del 26/09: los eventos se ven
 * sobre todo acá). Cuatro vistas: la lista de los próximos 30 días, el detalle, el formulario (solo
 * ADMIN y ALCHEMIST) y «Mi agenda».
 *
 * La sección es dueña de su propio estado: Comunidad solo la monta, le pasa el evento pedido desde un
 * aviso y le presta el gesto de «atrás» (`volverRef`).
 */
export function SeccionEventos({
  userId,
  rol,
  eventoPedido,
  onEventoPedidoAtendido,
  volverRef,
}: {
  userId: string | null;
  rol: string | null | undefined;
  /** El evento que pidió un aviso (`/eventos/{id}`). */
  eventoPedido: string | null;
  onEventoPedidoAtendido: () => void;
  /** Comunidad lo llama con el «atrás» del sistema: `true` si la sección lo usó para volver. */
  volverRef: MutableRefObject<(() => boolean) | null>;
}) {
  const gestiona = puedeGestionarEventos(rol);
  const { ocurrencias, cargando, fallo, yaLeido, recargar, responder, quitarDeLaLista } = useEventos(userId, true);
  const [vista, setVista] = useState<Vista>({ nombre: 'lista' });
  const [suelta, setSuelta] = useState<{ ocurrencia: Ocurrencia | null; fallo: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  const volverALista = useCallback(() => {
    setVista({ nombre: 'lista' });
    setSuelta(null);
    setErrorFormulario(null);
  }, []);

  useEffect(() => {
    volverRef.current = () => {
      if (vista.nombre === 'lista') return false;
      volverALista();
      return true;
    };
    return () => {
      volverRef.current = null;
    };
  }, [vista, volverALista, volverRef]);

  useEffect(() => {
    if (!eventoPedido) return;
    setSuelta(null);
    setVista({ nombre: 'detalle', eventoId: eventoPedido, inicioOcurrencia: null });
    onEventoPedidoAtendido();
  }, [eventoPedido, onEventoPedidoAtendido]);

  const enLaLista = useMemo(() => {
    if (vista.nombre !== 'detalle') return null;
    return (
      ocurrencias.find(
        o => o.evento.id === vista.eventoId && (vista.inicioOcurrencia === null || o.inicioOcurrencia === vista.inicioOcurrencia),
      ) ?? null
    );
  }, [vista, ocurrencias]);

  /* Si el evento no está en la lista (más allá de 30 días, o la lista todavía no llegó y vino de un
     aviso), se pide suelto. Con 404/403 se dice que ya no está: se canceló, o no es para esta persona. */
  useEffect(() => {
    if (vista.nombre !== 'detalle' || enLaLista || (!yaLeido && !fallo) || suelta) return;
    let vivo = true;
    eventosApi
      .obtenerEvento(vista.eventoId)
      .then(ev => vivo && setSuelta({ ocurrencia: ocurrenciaSuelta(ev), fallo: false }))
      .catch(() => vivo && setSuelta({ ocurrencia: null, fallo: true }));
    return () => {
      vivo = false;
    };
  }, [vista, enLaLista, yaLeido, fallo, suelta]);

  const alResponder = async (oc: Ocurrencia, respuesta: Exclude<Asistencia, null>) => {
    setEnviando(true);
    try {
      const alarma = await responder(oc, respuesta);
      if (suelta?.ocurrencia) setSuelta({ ocurrencia: { ...oc, asistencia: respuesta }, fallo: false });
      if (alarma === 'sin_permiso') {
        Alert.alert(
          'Quedaste anotado',
          'Pero este teléfono no tiene permiso para avisarte. Actívalo en los ajustes del teléfono para que suene la alarma.',
        );
      }
    } catch (e) {
      Alert.alert('No se pudo guardar tu respuesta', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setEnviando(false);
    }
  };

  const alGuardar = async (form: FormularioDeEvento, original: Evento | null) => {
    const armado = armarCuerpo(form, Date.now(), original);
    if (!armado.ok) {
      setErrorFormulario(armado.error);
      return;
    }
    setErrorFormulario(null);
    setEnviando(true);
    try {
      const guardado = original
        ? await eventosApi.editarEvento(original.id, armado.cuerpo)
        : await eventosApi.crearEvento(armado.cuerpo);
      await recargar();
      setSuelta(null);
      setVista({ nombre: 'detalle', eventoId: guardado.id, inicioOcurrencia: null });
    } catch (e) {
      setErrorFormulario(
        e instanceof ApiError && e.status === 403
          ? 'Tu cuenta no puede crear ni editar eventos.'
          : mensajeDeError(e, 'No se pudo guardar el evento. Intenta de nuevo.'),
      );
    } finally {
      setEnviando(false);
    }
  };

  const alCancelar = async (oc: Ocurrencia, todas: boolean) => {
    setEnviando(true);
    try {
      if (todas) await eventosApi.cancelarEvento(oc.evento.id);
      else await eventosApi.cancelarUnaFecha(oc.evento.id, oc.inicioOcurrencia);
      await quitarDeLaLista(oc.evento.id, todas ? null : oc.inicioOcurrencia);
      volverALista();
    } catch (e) {
      Alert.alert('No se pudo cancelar', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setEnviando(false);
    }
  };

  if (vista.nombre === 'formulario') {
    return (
      <FormularioDelEvento
        inicial={vista.original ? formularioDesdeEvento(vista.original) : formularioVacio(Date.now())}
        original={vista.original}
        error={errorFormulario}
        guardando={enviando}
        onVolver={volverALista}
        onGuardar={form => void alGuardar(form, vista.original)}
      />
    );
  }

  if (vista.nombre === 'agenda') {
    return (
      <MiAgenda
        ocurrencias={ocurrencias}
        onVolver={volverALista}
        onAbrirEvento={id => setVista({ nombre: 'detalle', eventoId: id, inicioOcurrencia: null })}
      />
    );
  }

  if (vista.nombre === 'detalle') {
    const oc = enLaLista ?? suelta?.ocurrencia ?? null;
    if (!oc) {
      return (
        <View style={{ gap: 14 }}>
          <BotonSecundario etiqueta="Volver a Eventos" icono="arrowLeft" onPress={volverALista} />
          <Parrafo tono={suelta?.fallo ? 'peligro' : 'suave'}>
            {suelta?.fallo ? 'Este evento ya no está disponible. Puede que lo hayan cancelado.' : 'Abriendo el evento…'}
          </Parrafo>
        </View>
      );
    }
    return (
      <DetalleDelEvento
        oc={oc}
        puedeGestionar={gestiona}
        enviando={enviando}
        onVolver={volverALista}
        onResponder={r => void alResponder(oc, r)}
        onEditar={() => {
          setErrorFormulario(null);
          setVista({ nombre: 'formulario', original: oc.evento });
        }}
        onCancelar={todas => void alCancelar(oc, todas)}
      />
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <TituloDeSeccion detalle="Clases y encuentros de los próximos 30 días.">Eventos</TituloDeSeccion>
      <View style={{ gap: 10 }}>
        {gestiona ? (
          <BotonPrincipal
            etiqueta="Crear evento"
            icono="plus"
            onPress={() => {
              setErrorFormulario(null);
              setVista({ nombre: 'formulario', original: null });
            }}
          />
        ) : null}
        <BotonSecundario etiqueta="Mi agenda" icono="calendar" onPress={() => setVista({ nombre: 'agenda' })} />
      </View>

      {cargando && ocurrencias.length === 0 ? <Parrafo>Buscando eventos…</Parrafo> : null}
      {!cargando && fallo ? (
        <View style={{ gap: 8 }}>
          <Parrafo tono="peligro">
            {fallo === 'sin_red'
              ? 'Sin conexión con el servidor.'
              : fallo === 'no_disponible'
                ? 'Los eventos todavía no están disponibles.'
                : 'No se pudieron leer los eventos.'}
          </Parrafo>
          <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
        </View>
      ) : null}
      {!cargando && !fallo && yaLeido && ocurrencias.length === 0 ? (
        <Parrafo>No hay eventos en los próximos 30 días.</Parrafo>
      ) : null}

      {ocurrencias.map(oc => (
        <TarjetaEvento
          key={`${oc.evento.id}|${oc.inicioOcurrencia}`}
          oc={oc}
          onPress={() => setVista({ nombre: 'detalle', eventoId: oc.evento.id, inicioOcurrencia: oc.inicioOcurrencia })}
        />
      ))}
    </View>
  );
}
