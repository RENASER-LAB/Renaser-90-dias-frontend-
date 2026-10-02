import React, { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Alert } from '../../../components/Alerta';
import { Icon } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as eventosApi from '../api/eventosApi';
import { useEventos } from '../hooks/useEventos';
import { useEventosDelMes } from '../hooks/useEventosDelMes';
import type { Asistencia, Evento, Ocurrencia } from '../types/eventos.types';
import { armarCuerpo, formularioDesdeEvento, formularioVacio, type FormularioDeEvento } from '../utils/formularioDeEvento';
import {
  agruparPorDia,
  diaElegidoAlAbrir,
  mesDeLaFecha,
  mismoMes,
  moverMes,
  proximasParaTarjetas,
  soloLasQueVas,
  type Mes,
} from '../utils/calendarioDelMes';
import { vistaPideReleer } from '../utils/lecturaVigente';
import { subirPortada, type PortadaElegida } from '../utils/portadaDelEvento';
import { guardarVistaPreferida, leerVistaPreferida, VISTA_POR_DEFECTO, type VistaDeEventos } from '../utils/vistaPreferida';
import { fechaEnZona, zonaDelTelefono } from '../utils/zonaHoraria';
import { puedeGestionarEventos } from '../utils/permisosDeEventos';
import { useTheme } from '../../../theme/ThemeContext';
import { CalendarioDelMes } from './CalendarioDelMes';
import { DetalleDelEvento } from './DetalleDelEvento';
import { FormularioDelEvento } from './FormularioDelEvento';
import { MiAgenda } from './MiAgenda';
import { LETRA, Parrafo } from './piezas';
import { SelectorDeVista } from './SelectorDeVista';
import { TarjetasDeEventos } from './TarjetasDeEventos';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

type Vista =
  | { nombre: 'lista' }
  | { nombre: 'detalle'; eventoId: string; inicioOcurrencia: string | null }
  | { nombre: 'formulario'; original: Evento | null }
  | { nombre: 'agenda' };

/** Un evento que no está en la lista (más allá de 60 días, o recién abierto desde un aviso). */
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
 * sobre todo acá). Cuatro vistas: la portada de la sección, el detalle, el formulario (solo ADMIN y
 * ALCHEMIST) y «Mi agenda».
 *
 * **La portada tiene dos formas de ver los eventos** (pedido del dueño del 2026-09-26: «tipo
 * calendario del mes, 2 formas… no me gusta ese diseño, muy IA»; reemplaza la lista de filas con
 * iconito): «Calendario», la grilla del mes con los días marcados (`CalendarioDelMes`, lee el mes
 * visible con `useEventosDelMes`), y «Tarjetas», los próximos 60 días con la tarjeta de los cursos de
 * Classroom (`TarjetasDeEventos`). La última elegida se recuerda por persona (`vistaPreferida`).
 * «Solo a los que voy» filtra las dos.
 *
 * La sección es dueña de su propio estado: Comunidad solo la monta, le pasa el evento pedido desde un
 * aviso y le presta el gesto de «atrás» (`volverRef`).
 *
 * **La lista se relee sola** (bug del e2e del 26/09: un evento recién creado no aparecía hasta cerrar
 * la app): al ganar el foco la pestaña, al volver a la lista desde el detalle, la agenda o el
 * formulario, y deslizando hacia abajo en la lista y en «Mi agenda». Por eso el `ScrollView` es de la
 * sección y no de Comunidad: el `RefreshControl` necesita el estado de la lectura.
 */
export function SeccionEventos({
  userId,
  rol,
  eventoPedido,
  onEventoPedidoAtendido,
  volverRef,
  estiloDelContenido,
  alDesplazar,
  rellenoDelEncabezado = 0,
}: {
  userId: string | null;
  rol: string | null | undefined;
  /** El evento que pidió un aviso (`/eventos/{id}`). */
  eventoPedido: string | null;
  onEventoPedidoAtendido: () => void;
  /** Comunidad lo llama con el «atrás» del sistema: `true` si la sección lo usó para volver. */
  volverRef: MutableRefObject<(() => boolean) | null>;
  /** El `contentContainerStyle` que Comunidad usa en todas sus secciones. */
  estiloDelContenido?: StyleProp<ViewStyle>;
  /** El encabezado de Comunidad, que se esconde al desplazar, sigue la `y` de esta lista (2026-10-02). */
  alDesplazar?: (evento: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Cuánto ocupa ese encabezado encima de la lista: ahí no se puede ver el círculo de «actualizando». */
  rellenoDelEncabezado?: number;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar({ onScroll: alDesplazar });
  const { c } = useTheme();
  const gestiona = puedeGestionarEventos(rol);
  const { ocurrencias, cargando, refrescando, fallo, yaLeido, recargar, responder, quitarDeLaLista } = useEventos(
    userId,
    true,
  );
  const [vista, setVista] = useState<Vista>({ nombre: 'lista' });

  const zona = useMemo(() => zonaDelTelefono(), []);
  const hoy = fechaEnZona(Date.now(), zona);
  const [forma, setForma] = useState<VistaDeEventos>(VISTA_POR_DEFECTO);
  const [soloVoy, setSoloVoy] = useState(false);
  const [mes, setMes] = useState<Mes>(() => mesDeLaFecha(hoy));
  const [diaElegido, setDiaElegido] = useState<string | null>(hoy);
  const delMes = useEventosDelMes(mes, zona, forma === 'calendario');
  const releerElMes = delMes.recargar;

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    void leerVistaPreferida(userId).then(v => vivo && setForma(v));
    return () => {
      vivo = false;
    };
  }, [userId]);

  const cambiarForma = useCallback(
    (nueva: VistaDeEventos) => {
      setForma(nueva);
      if (userId) void guardarVistaPreferida(userId, nueva);
    },
    [userId],
  );
  /** Sube con cada pull-to-refresh de «Mi agenda», que relee también hábitos y acciones. */
  const [vueltaDeAgenda, setVueltaDeAgenda] = useState(0);

  // Volver a la pestaña relee (en silencio: ya hay lista). Al montar coincide con la lectura
  // inicial de `useEventos` y comparten el mismo pedido.
  useFocusEffect(
    useCallback(() => {
      void recargar();
      void releerElMes();
    }, [recargar, releerElMes]),
  );

  // Volver a la lista desde el detalle, la agenda o el formulario relee.
  const vistaAnterior = useRef(vista.nombre);
  useEffect(() => {
    const anterior = vistaAnterior.current;
    vistaAnterior.current = vista.nombre;
    if (vistaPideReleer(anterior, vista.nombre)) {
      void recargar();
      void releerElMes();
    }
  }, [vista.nombre, recargar, releerElMes]);

  const alDeslizar = useCallback(() => {
    if (vista.nombre === 'agenda') setVueltaDeAgenda(n => n + 1);
    void recargar({ deslizando: true });
    if (vista.nombre === 'lista') void releerElMes();
  }, [vista.nombre, recargar, releerElMes]);
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

  /* El detalle busca primero en los próximos 60 días y después en el mes del calendario, que puede
     tener días pasados o meses lejanos. */
  const enLaLista = useMemo(() => {
    if (vista.nombre !== 'detalle') return null;
    const esEste = (o: Ocurrencia) =>
      o.evento.id === vista.eventoId && (vista.inicioOcurrencia === null || o.inicioOcurrencia === vista.inicioOcurrencia);
    return ocurrencias.find(esEste) ?? delMes.ocurrencias.find(esEste) ?? null;
  }, [vista, ocurrencias, delMes.ocurrencias]);

  const deLaVista = useMemo(
    () => (soloVoy ? soloLasQueVas(delMes.ocurrencias) : delMes.ocurrencias),
    [soloVoy, delMes.ocurrencias],
  );
  const porDia = useMemo(() => agruparPorDia(deLaVista, zona), [deLaVista, zona]);

  // Un mes que no es el de hoy abre en su primer día con eventos, cuando llegan.
  useEffect(() => {
    if (diaElegido !== null || delMes.cargando) return;
    const primero = diaElegidoAlAbrir(mes, hoy, porDia);
    if (primero) setDiaElegido(primero);
  }, [diaElegido, delMes.cargando, mes, hoy, porDia]);

  const cambiarMes = useCallback(
    (delta: number) => {
      const nuevo = moverMes(mes, delta);
      setMes(nuevo);
      setDiaElegido(mismoMes(nuevo, mesDeLaFecha(hoy)) ? hoy : null);
    },
    [mes, hoy],
  );
  const irAHoy = useCallback(() => {
    setMes(mesDeLaFecha(hoy));
    setDiaElegido(hoy);
  }, [hoy]);
  const elegirDia = useCallback(
    (fecha: string) => {
      const suMes = mesDeLaFecha(fecha);
      if (!mismoMes(suMes, mes)) setMes(suMes);
      setDiaElegido(fecha);
    },
    [mes],
  );
  const abrir = (oc: Ocurrencia) =>
    setVista({ nombre: 'detalle', eventoId: oc.evento.id, inicioOcurrencia: oc.inicioOcurrencia });

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
      delMes.marcarAsistencia(oc.evento.id, oc.inicioOcurrencia, respuesta);
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

  const alGuardar = async (form: FormularioDeEvento, original: Evento | null, portada: PortadaElegida | null) => {
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
      if (portada) {
        // El evento ya quedó guardado: si la portada falla, se dice y se sigue (se puede reintentar
        // editándolo).
        try {
          await subirPortada(guardado.id, portada);
        } catch (e) {
          Alert.alert(
            'El evento se guardó, pero sin portada',
            mensajeDeError(e, 'No se pudo subir la imagen. Puedes intentarlo de nuevo editando el evento.'),
          );
        }
      }
      await recargar({ forzar: true });
      void releerElMes({ forzar: true });
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

  /** El scroll de la sección. El pull-to-refresh va solo en la lista y en «Mi agenda». */
  const conRefresco = vista.nombre === 'lista' || vista.nombre === 'agenda';
  const envolver = (hijo: React.ReactNode) => (
    <ScrollView
      {...barraAlDesplazar}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={estiloDelContenido}
      showsVerticalScrollIndicator={false}
      refreshControl={
        conRefresco ? (
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alDeslizar}
            tintColor={c.goldInk}
            colors={[c.goldInk]}
            progressViewOffset={rellenoDelEncabezado}
          />
        ) : undefined
      }
    >
      {hijo}
    </ScrollView>
  );

  if (vista.nombre === 'formulario') {
    return envolver(
      <FormularioDelEvento
        inicial={vista.original ? formularioDesdeEvento(vista.original) : formularioVacio(Date.now())}
        original={vista.original}
        error={errorFormulario}
        guardando={enviando}
        onVolver={volverALista}
        onGuardar={(form, portada) => void alGuardar(form, vista.original, portada)}
      />
    );
  }

  if (vista.nombre === 'agenda') {
    return envolver(
      <MiAgenda
        ocurrencias={ocurrencias}
        vuelta={vueltaDeAgenda}
        onVolver={volverALista}
        onAbrirEvento={id => setVista({ nombre: 'detalle', eventoId: id, inicioOcurrencia: null })}
      />
    );
  }

  if (vista.nombre === 'detalle') {
    const oc = enLaLista ?? suelta?.ocurrencia ?? null;
    if (!oc) {
      return envolver(
        <View style={{ gap: 14 }}>
          <BotonSecundario etiqueta="Volver a Eventos" icono="arrowLeft" onPress={volverALista} />
          <Parrafo tono={suelta?.fallo ? 'peligro' : 'suave'}>
            {suelta?.fallo ? 'Este evento ya no está disponible. Puede que lo hayan cancelado.' : 'Abriendo el evento…'}
          </Parrafo>
        </View>
      );
    }
    return envolver(
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

  const proximas = proximasParaTarjetas(soloVoy ? soloLasQueVas(ocurrencias) : ocurrencias, Date.now());

  return envolver(
    <View style={{ gap: 16 }}>
      <View style={estilos.acciones}>
        <BotonSecundario
          etiqueta="Mi agenda"
          icono="calendar"
          estilo={estilos.accion}
          onPress={() => setVista({ nombre: 'agenda' })}
        />
        {gestiona ? (
          <BotonPrincipal
            etiqueta="Crear evento"
            icono="plus"
            estilo={estilos.accion}
            onPress={() => {
              setErrorFormulario(null);
              setVista({ nombre: 'formulario', original: null });
            }}
          />
        ) : null}
      </View>

      <SelectorDeVista vista={forma} onCambiar={cambiarForma} />
      <SoloLosQueVoy activo={soloVoy} onCambiar={setSoloVoy} />

      {forma === 'calendario' ? (
        <CalendarioDelMes
          mes={mes}
          hoyIso={hoy}
          porDia={porDia}
          diaElegido={diaElegido}
          zona={zona}
          cargando={delMes.cargando && delMes.ocurrencias.length === 0}
          fallo={delMes.fallo}
          onCambiarMes={cambiarMes}
          onHoy={irAHoy}
          onElegirDia={elegirDia}
          onReintentar={() => void releerElMes({ forzar: true })}
          onAbrir={abrir}
        />
      ) : (
        <View style={{ gap: 14 }}>
          {cargando && ocurrencias.length === 0 ? <Parrafo>Buscando eventos…</Parrafo> : null}
          {fallo && ocurrencias.length > 0 ? (
            <Parrafo tono="peligro">No se pudo actualizar la lista; esto es lo último que llegó. Desliza hacia abajo para reintentar.</Parrafo>
          ) : null}
          {!cargando && fallo && ocurrencias.length === 0 ? (
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
          {!cargando && !fallo && yaLeido && proximas.length === 0 ? (
            <Parrafo>
              {soloVoy ? 'Todavía no dijiste «Voy» a ningún evento de los próximos 60 días.' : 'No hay eventos en los próximos 60 días.'}
            </Parrafo>
          ) : null}
          <TarjetasDeEventos ocurrencias={proximas} zona={zona} ahoraMs={Date.now()} onAbrir={abrir} />
        </View>
      )}
    </View>
  );
}

/** «Solo a los que voy»: una casilla de 48 px, en palabras. Filtra el calendario y las tarjetas. */
function SoloLosQueVoy({ activo, onCambiar }: { activo: boolean; onCambiar: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onCambiar(!activo)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: activo }}
      accessibilityLabel="Ver solo los eventos a los que voy"
      hitSlop={6}
      style={({ pressed }) => [estilos.casilla, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          estilos.cuadro,
          { borderColor: activo ? c.success : c.borderStrong, backgroundColor: activo ? c.success : c.cardBg },
        ]}
      >
        {activo ? <Icon name="check" size={16} color={c.cardBg} strokeWidth={2} /> : null}
      </View>
      <Text style={[estilos.casillaTexto, { color: c.textStrong }]}>Solo a los que voy</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  acciones: { flexDirection: 'row', gap: 10 },
  accion: { flex: 1, paddingHorizontal: 10 },
  casilla: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, alignSelf: 'flex-start' },
  cuadro: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  casillaTexto: { fontFamily: 'Jost_500Medium', fontSize: LETRA.cuerpo + 1 },
});
