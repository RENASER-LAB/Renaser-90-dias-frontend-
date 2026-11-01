import { tituloEnTipoOracion } from '../features/habits/utils/tituloEnTipoOracion';
import { fuentes } from '../theme/fuentes';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { TarjetaConfrontacion } from '../features/confrontacion/components/TarjetaConfrontacion';
import { NombreDeLaFormacion } from '../features/formaciones/components/NombreDeLaFormacion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDES_DE_UNA_PESTANA } from '../navigation/bordesDeUnaPestana';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { AvatarPersona, Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon, TAMANO_ICONO } from '../components/Icon';
import { Presionable } from '../components/Presionable';
import { tacto } from '../utils/tacto';
import { Aparicion } from '../components/Aparicion';
import { FilaDelProgramaPropio } from '../features/programa/components/FilaDelProgramaPropio';
import { useFilaDelProgramaPropio } from '../features/programa/hooks/useFilaDelProgramaPropio';
import { usePublicarSemaforoDeHoy } from '../features/semaforo/estado/useSemaforoVigente';
import { useCelebracionDelDia } from '../features/fenix/hooks/useCelebracionDelDia';
import { useResumenHome } from '../features/home/hooks/useResumenHome';
import { AvisoDeProgramaEnOtraFormacion } from '../features/habits/components/AvisoDeProgramaEnOtraFormacion';
import { useCategoriasDeHabito } from '../features/habits/categorias/hooks/useCategoriasDeHabito';
import { useProgramaEnOtraFormacion } from '../features/formaciones/hooks/useProgramaEnOtraFormacion';
import { sinHabitosEnLaFormacion } from '../features/home/utils/sinHabitosEnLaFormacion';
import { useHabitoDelMomento } from '../features/habits/hooks/useHabitoDelMomento';
import { TarjetaHabitoYRadar } from '../features/home/components/TarjetaHabitoYRadar';
import { dibujarLaTarjetaDeHabitos } from '../features/home/utils/dibujarLaTarjetaDeHabitos';
import { useUltimaPublicacionMuro } from '../features/community/hooks/useUltimaPublicacionMuro';
import { tiempoRelativo } from '../features/community/utils/tiempoRelativo';
import { useAuth } from '../context/AuthContext';
import { TarjetaDelDiagnosticoPendiente } from '../features/diagnostico/components/TarjetaDelDiagnosticoPendiente';
import { CompletarDiagnosticoScreen } from '../features/diagnostico/screens/CompletarDiagnosticoScreen';
import { useObjetivosDeNoventaDias } from '../features/objetivos/hooks/useObjetivosDeNoventaDias';
import { useAccionesDeHoy } from '../features/objetivos/hooks/useAccionesDeHoy';
import { useMetaDeLaAccion } from '../features/objetivos/hooks/useMetaDeLaAccion';
import { TarjetaAccionDeHoy } from '../features/home/components/TarjetaAccionDeHoy';
import { PlazoDelObjetivoProvider } from '../features/objetivos/context/PlazoDelObjetivo';
import { vistaDeLaAccionDeHoy } from '../features/home/utils/vistaDeLaAccionDeHoy';
import { minutosDeAhora } from '../features/training/utils/listaDelDia';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { OrbeAcompanante } from '../features/renasia/components/OrbeAcompanante';
import { AccionDelAcompanante } from '../features/renasia/components/AccionDelAcompanante';
import { escucharPropuestaConfirmada } from '../features/renasia/events/avisoPropuestaConfirmada';
import { RenasiaPanel } from '../features/renasia/screens/RenasiaPanel';
import { muestraTerminar, rotuloDelOrbe, tocarEmpiezaAEscuchar } from '../features/renasia/utils/rotuloDelOrbe';
import { BotonTerminarConversacion } from '../features/renasia/components/BotonTerminarConversacion';
import { useVozDelOrbe } from '../features/renasia/hooks/useVozDelOrbe';
import { AvisoDeMantenimiento } from '../features/plataforma/components/AvisoDeMantenimiento';
import { useDisponibilidad, useFuncionalidad } from '../features/plataforma/estado/useFuncionalidad';
import { CLAVES } from '../features/plataforma/utils/clavesDeLaApp';
import { cambioAlRegistrar, cambioTrasIniciar, estadoVisibleDelPedido, solicitudDelPedido } from '../features/renasia/utils/pedidosDeFoto';
import { REGLAS_DE_ACCION } from '../features/objetivos/utils/registroDeAccionConFoto';
import type { PedidoDeFotoUI } from '../features/renasia/types/renasia.types';
import { useRegistroConFoto } from '../features/habits/hooks/useRegistroConFoto';
import { RegistroConFotoModal } from '../features/habits/components/RegistroConFotoModal';
import { cifrasDeHabitos } from '../features/home/utils/cifrasDeHabitos';
import { diametroDelOrbe } from '../features/home/utils/diametroDelOrbe';
import { cuandoEsElEvento } from '../features/home/utils/cuandoEsElEvento';
import { fechaLocalISO } from '../features/objetivos/utils/ventanasDePlanificacion';
import { useOcultarBarraAlDesplazar } from '../navigation/barraAlDesplazar/BarraInferior';

export default function HoyScreen() {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { rs, isShort, isTablet, horizontalPadding, width, contentMaxWidth } = useResponsive();
  const navigation = useNavigation();

  const { resumen, cargando: cargandoResumen, error: errorResumen, recargar: recargarResumen } = useResumenHome();
  /* El hábito de ESTA hora para la primera tarjeta. Vive acá y no dentro de la tarjeta porque
     `useFocusEffect` tiene que correr con la pantalla montada, y porque el pull-to-refresh de
     Hoy también lo recarga. */
  const { habito: habitoAhora, recargar: recargarHabitoAhora, registrosLeidos, registrosDeHoy } = useHabitoDelMomento();
  /* Spec 023: «Hábitos de hoy» es de la formación de la persona. Sin hábitos en su formación no se dibuja, y quien tiene su programa
     propio en OTRA formación que la activa ve una línea que lo dice en lugar de la tarjeta. */
  const categorias = useCategoriasDeHabito();
  const programaEnOtraFormacion = useProgramaEnOtraFormacion();
  const { user } = useAuth();
  /* El programa propio (D-260) como una fila compacta (2026-11-01, pedido del dueño), justo debajo de la frase del día: «Haz tu programa de
     90 días» a quien no tiene fila, «Todavía no elegiste tu Día 1» a quien la tiene sin Día 1. Quién puede tener un programa propio lo
     dice el servidor, no el rol del teléfono (ARF-16); los paneles de rol («Mi grupo», «Mis mentores») no están en Hoy sino en Yo. El hook
     vive aquí y no dentro de la fila para saber, antes de dibujar, si hay algo: un bloque vacío deja igual sus dos separaciones de 28. */
  const programaPropio = useFilaDelProgramaPropio({
    inscrito: resumen?.inscrito,
    diaPrograma: resumen?.diaPrograma,
    duracionDias: resumen?.duracionDias,
    formacion: resumen?.formacion,
  });
  const { recargarCapacidades } = programaPropio;
  // El orbe del centro (2026-09-23): conversación por voz con el acompañante, y su chat para
  // confirmar propuestas o leer la respuesta completa.
  const voz = useVozDelOrbe();
  /* Spec 002: SER apagada por Soporte TI → el orbe queda quieto y debajo va el aviso de mantenimiento. */
  const chatDeSer = useFuncionalidad(CLAVES.iaChat);
  /* Spec 002, fase 2: las tarjetas que llevan a algo que esta cuenta todavía no tiene no se dibujan. */
  const esDisponible = useDisponibilidad();
  const [chatDelOrbeAbierto, setChatDelOrbeAbierto] = useState(false);
  /* "Tomar foto" en la hoja del orbe (autorizado por el dueño el 2026-09-26, ver AGENTS.md): el
     acompañante pidió la foto de un hábito (evento `evidencia`) y se abre la cámara y la misma
     pantalla partida de Training. Al registrarse, Hoy relee el resumen y el hábito del momento. */
  const registroConFoto = useRegistroConFoto({
    onCompletado: (registroId, _resultado, _titulo, destino) => {
      // El logro, una vez, cuando el servidor confirmó (2026-10-07): este cierre no vibraba.
      tacto.logro();
      voz.cambiarPedidoDeFoto(registroId, cambioAlRegistrar(destino));
      void recargarResumen();
      void recargarHabitoAhora();
    },
    // D-178: el acompañante también pide la foto de una acción del día; sube a los endpoints de rocas.
    destinos: { roca: REGLAS_DE_ACCION },
  });
  /* #49: si Android mató la app con la cámara abierta, al volver la pestaña de inicio es Hoy y Training no se monta hasta
     que se la visita: la foto se retoma acá igual que en Training. La nota de la foto pendiente se consume una sola vez,
     así que la retoma la primera pantalla que se monte. */
  const { reanudarPendiente } = registroConFoto;
  useEffect(() => {
    void reanudarPendiente();
  }, [reanudarPendiente]);
  const tomarFotoDelOrbe = async (pedido: PedidoDeFotoUI) => {
    if (estadoVisibleDelPedido(pedido, Date.now()) !== 'pendiente') return;
    // La cámara no convive con el micrófono abierto ni con el orbe hablando: se lo calla antes.
    // Con la voz en vivo, tocar ya no cierra (E-458): se cierra la conversación entera.
    if (voz.terminar) voz.terminar();
    else if (voz.fase === 'escuchando' || voz.fase === 'hablando') voz.tocar();
    voz.cambiarPedidoDeFoto(pedido.registroId, { estado: 'abriendo' });
    const resultado = await registroConFoto.iniciar(solicitudDelPedido(pedido));
    voz.cambiarPedidoDeFoto(pedido.registroId, cambioTrasIniciar(resultado, pedido.destino));
  };
  /* El semáforo propio (D-168) ya no vive en Hoy (2026-10-31, pedido del dueño): su tarjeta y su detalle pasaron a Yo. Lo que Hoy
     conserva es el ánimo del fénix: el color de `/home` pasa al color vigente compartido con el botón de SER (sin pedir nada más;
     Yo publica además el del detalle cuando lo lee), y los hitos del día que ya trae `/home` (fase nueva, racha de 7 y 30, todos
     los hábitos) se celebran una vez por día con la pantalla completa que dibuja `AnfitrionDeCelebraciones` (App.tsx, 2026-10-07). */
  usePublicarSemaforoDeHoy(resumen?.semaforo, Boolean(resumen), null);
  useCelebracionDelDia(
    user?.id,
    resumen ? { rachaActual: resumen.rachaActual, habitosHoy: resumen.habitosHoy, fase: resumen.fase } : null,
  );
  /* El diagnóstico pendiente de quien ya estaba dentro (spec 026): su tarjeta abre el recorrido a pantalla completa, como un estado
     de Hoy (sin pestaña nueva). Al terminar, Hoy vuelve a leer lo que el diagnóstico pudo cambiar: los objetivos de Plan. */
  const [diagnosticoAbierto, setDiagnosticoAbierto] = useState(false);
  /* Los objetivos de 90 días (cuántos y cuántos por confirmar): deciden qué dice la tarjeta de acciones cuando hoy no hay ninguna. */
  const { objetivos: objetivosDeNoventaDias, recargar: recargarObjetivos } = useObjetivosDeNoventaDias();
  const {
    publicacion: ultimaPublicacion,
    cargando: cargandoUltimaPublicacion,
    recargar: recargarUltimaPublicacion,
  } = useUltimaPublicacionMuro();

  const [refreshing, setRefreshing] = useState(false);

  /* Las acciones de HOY (`GET /rocks/today`), una vez cada vez que Hoy vuelve al foco: la misma lectura de siempre, ahora con el
     hook de Plan (`useAccionesDeHoy`). Alimenta la tarjeta de acciones de arriba (2026-10-31). */
  const { rocas: accionesDeHoy, recargar: recargarAcciones } = useAccionesDeHoy();

  // D-229: una propuesta de SER confirmada (un hábito nuevo, uno marcado o pausado) cambia lo de hoy.
  useEffect(
    () =>
      escucharPropuestaConfirmada(() => {
        void recargarResumen();
        void recargarHabitoAhora();
      }),
    [recargarResumen, recargarHabitoAhora]
  );

  const recargarTodo = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      recargarResumen(),
      recargarAcciones(),
      recargarObjetivos(),
      recargarUltimaPublicacion(),
      recargarHabitoAhora(),
      recargarCapacidades(),
    ]);
    setRefreshing(false);
  }, [
    recargarResumen,
    recargarAcciones,
    recargarObjetivos,
    recargarUltimaPublicacion,
    recargarHabitoAhora,
    recargarCapacidades,
  ]);

  const evidenciasUltimaPublicacion = ultimaPublicacion?.media ?? [];

  /* El fénix del centro. Su diámetro (140 en un teléfono estándar; menor en uno angosto o bajo) sale del
     ancho de contenido, como siempre (`diametroDelOrbe`).
     > **Corregido 2026-10-30 (pedido del dueño: «en la parte de arriba mucho espacio, podemos optimizar sin
     > reducir el tamaño»).** Esa misma cuenta (`heroSize`) era además el ALTO FIJO de la sección: 252 (206 en
     > pantalla baja) por `rs()`, con ~206 de contenido, y el resto quedaba en blanco repartido arriba y abajo
     > (23 a 35 px de cada lado, sumados al aire de 28 entre secciones). Ahora la sección mide lo que ocupa. */
  const anchoContenido = (isTablet ? Math.min(560, width) : width) - horizontalPadding * 2;
  const diametroDelFenix = diametroDelOrbe(anchoContenido, rs, isShort);


  /* Tipo oración (rediseño de Hoy, 2026-10-05): el nombre de la fase tal como lo escribe el documento
     del cliente («El Ciclo Alquímico»), sin pasarlo a versales.
     > **Corregido 2026-10-05 (decisión del dueño).** Sin `/home` (o con una fase que la app no conoce)
     > decía «Programa activo»: un dato inventado, el mismo error que los «100 pts» y el «DÍA 1 DE 90».
     > Ahora dice «—», como los puntos y la racha. */
  /**
   * `null` = todavía no sabemos en qué día está, porque la carga falló o no terminó.
   *
   * > **Corregido 2026-09-07.** Acá había `?? 1`, y con el backend caído la pantalla anunciaba
   * > "DÍA 1 DE 90" a alguien que se acababa de registrar y estaba en el día 0. No es un redondeo
   * > inocente: el número de día es el dato que ordena todo el programa, y rellenarlo con uno
   * > inventado es peor que no mostrarlo. Reportado por el dueño el día que se registró.
   */
  const diaConocido = resumen?.diaPrograma ?? null;
  /* Sin día de programa (el personal sin programa, quien no eligió su Día 1 o está en el día 0) no hay hábitos de hoy que contar: la tarjeta
     decía «0/0» y «Lidera tu energía diaria.», un dato inventado (E2E de las formaciones, 01/11/2026, issue #86). «Mientras no se sabe, no se
     dibuja»: tampoco mientras `/home` carga, para que no aparezca y desaparezca; si `/home` falló y nunca llegó, queda como antes. El hueco no
     queda porque el contenedor separa con `gap`, no con márgenes de cada hijo. */
  const dibujarHabitos = dibujarLaTarjetaDeHabitos({ resumen, error: errorResumen });
  /* La fecha de hoy para la frase del día de quien NO tiene día de programa (personal sin programa, Día 0, sin Día 1 elegido): `/home` no la
     manda, así que es el día civil del teléfono (supuesto anotado en `fraseDelDia`). Se da solo cuando ya se sabe si hay día de programa
     (`/home` respondió o falló): antes, quien sí lo tiene vería primero la frase del calendario y se le cambiaría por la de su día. */
  const fechaDeHoy = resumen || errorResumen ? fechaLocalISO(new Date()) : null;
  /* La tarjeta de acciones de arriba (2026-10-31): qué muestra lo decide `vistaDeLaAccionDeHoy`, con las acciones de hoy que
     esta pantalla ya lee y los objetivos de 90 días (spec 026: sin acciones, dice si faltan o si hay que confirmarlos); la meta de la
     acción que sigue, `useMetaDeLaAccion`. */
  const vistaDeLaAccion = useMemo(
    () =>
      vistaDeLaAccionDeHoy({
        rocas: accionesDeHoy,
        objetivos: objetivosDeNoventaDias,
        ahoraMin: minutosDeAhora(Date.now()),
      }),
    [accionesDeHoy, objetivosDeNoventaDias],
  );
  const metaDeLaAccion = useMetaDeLaAccion(vistaDeLaAccion?.tipo === 'accion' ? vistaDeLaAccion.accion : null);
  /* La tarjeta de acciones solo se dibuja cuando ya se sabe qué decir y, si es una acción, su meta (sin parpadeo). */
  const hayTarjetaDeAccion = Boolean(vistaDeLaAccion && metaDeLaAccion.lista);
  /* Los dos textos de la primera tarjeta. El estado lo decide `habitoDelMomento`; acá solo se
     redacta. `sin-datos` cae al texto genérico de siempre —Día 0, cuenta recién aprobada, o el
     endpoint falló— porque inventar un hábito sería peor que no decir nada. */
  const tituloHabitoAhora = useMemo(() => {
    // El nombre del hábito llega en mayúsculas del catálogo: se muestra en tipo oración (2026-10-31).
    if (habitoAhora.titulo) return tituloEnTipoOracion(habitoAhora.titulo);
    if (habitoAhora.estado === 'todo-hecho') return '¡Todos los hábitos completados!';
    return 'Lidera tu energía diaria.';
  }, [habitoAhora]);


  /* El orbe responde también al tacto (rediseño de Hoy, 2026-10-05): un «tic» cuando el toque
     EMPIEZA a escuchar y el «toc» del sistema cuando mantenerlo presionado cierra la conversación.
     Una vibración por acción y en el mismo instante en que cambia lo que se ve; nunca es la única
     señal (el rótulo de abajo dice la fase). */
  const tocarOrbe = () => {
    if (!voz.disponible) {
      setChatDelOrbeAbierto(true);
      return;
    }
    if (tocarEmpiezaAEscuchar(voz.fase, voz.disponible)) tacto.seleccion();
    voz.tocar();
  };
  const terminarConversacion = voz.terminar;
  const mantenerOrbe = terminarConversacion
    ? () => {
        tacto.mantener();
        terminarConversacion();
      }
    : undefined;

  /* El diagnóstico a pantalla completa (spec 026), como un estado de Hoy. Va después de TODOS los hooks. El atrás del sistema y la
     flecha los maneja la propia pantalla (sube un paso del recorrido y, en el primero, llama a `onBack`); al terminar, Hoy relee. */
  if (diagnosticoAbierto) {
    return (
      <CompletarDiagnosticoScreen
        onBack={() => setDiagnosticoAbierto(false)}
        onTerminado={() => {
          setDiagnosticoAbierto(false);
          void recargarResumen();
          void recargarAcciones();
          void recargarObjetivos();
        }}
      />
    );
  }

  return (
    <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="HOY" />

      <ScrollView
        {...barraAlDesplazar}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || cargandoResumen}
            onRefresh={recargarTodo}
            tintColor={c.goldInk}
            colors={[c.goldInk]}
          />
        }
      >
        {/* ========================================================================= */}
        {/* 1. LA FRASE DEL DÍA                                                       */}
        {/* ========================================================================= */}
        <Aparicion>
        {/* Corregido 2026-10-31 (el dueño): lo que se quita de Hoy es la cabecera (fase, «Día n de 90» y puntos, que ya están
            en Yo), NO la frase del día. La frase sube y ocupa su lugar, con su raya dorada corta. */}
        {/* El nombre de la formación (spec 022, FR-014): una línea chica, solo para quien tiene más de una o no es de la Escuela. */}
        <NombreDeLaFormacion />
        <TarjetaConfrontacion diaPrograma={diaConocido} fechaDeHoy={fechaDeHoy} />

        {/* ========================================================================= */}
        {/* 2. LA ACCIÓN QUE SIGUE HOY (2026-10-31)                                   */}
        {/* ========================================================================= */}
        </Aparicion>

        {/* Corregido 2026-11-01 (pedido del dueño): este bloque solo existe si tiene algo que dibujar. Vacío dejaba sus dos separaciones de 28
            y a la cuenta sin programa le quedaba un hueco grande entre la frase y el fénix. */}
        {programaPropio.visible || hayTarjetaDeAccion || errorResumen ? (
        <Aparicion retardo={70} style={{ gap: space.gap }}>
        {/* El programa propio, justo debajo de la frase (2026-11-01): una fila compacta, del alto que tenía Coherencia / Racha. Va antes que la
            acción de hoy: sin programa (o sin Día 1) no hay acciones que mostrar todavía. */}
        <FilaDelProgramaPropio programa={programaPropio} />

        {/* Pedido del dueño, 2026-10-31: se quitaron la frase del día y Coherencia / Racha (ya están en Yo) y, en su lugar y antes
            de «Tu acompañante», va la tarjeta de «Acciones y objetivos» con el diseño nuevo: la que sigue hoy, su meta y un
            botón que lleva a Training. Mientras no se sabe qué mostrar no se dibuja nada (sin parpadeo). */}
        {hayTarjetaDeAccion && vistaDeLaAccion ? (
          <PlazoDelObjetivoProvider duracionDias={resumen?.duracionDias} formacion={resumen?.formacion}>
            <TarjetaAccionDeHoy
              vista={vistaDeLaAccion}
              meta={metaDeLaAccion.meta}
              alEmpezar={accionId => (navigation as any).navigate('Training', { abrirAccionId: accionId })}
              alIrAPlan={() => (navigation as any).navigate('Plan')}
              alAgendar={() => (navigation as any).navigate('Plan')}
            />
          </PlazoDelObjetivoProvider>
        ) : null}

        {errorResumen && (
          <View style={[styles.errorBox, { backgroundColor: c.dangerWash, borderLeftColor: c.danger }]}>
            <Text style={[t.small, { color: c.danger }]}>
              {errorResumen}
            </Text>
          </View>
        )}
        </Aparicion>
        ) : null}

        {/* ========================================================================= */}
        {/* 3. HERO: CÍRCULOS CONCÉNTRICOS & TU ÚNICO FOCO (ROCA PRIORITARIA DE HOY)  */}
        {/* ========================================================================= */}

        <Aparicion retardo={140}>
        <View style={styles.hero}>
          {/* Sin anillos ni partícula detrás: el fénix es el centro y va sin fondo (pedido del dueño, 2026-10-06). */}
          {/* El centro del hero es el acompañante por voz (pedido del dueño, 2026-09-23). Antes
              decía "TU ÚNICO FOCO / AHORA" (o la roca prioritaria del día) y llevaba a Plan; ese
              dato se le pregunta ahora al propio acompañante ("¿cuál es mi foco de hoy?"), que lo
              lee con consultar_rocas. Tocar el orbe: escucha, piensa y responde en voz alta. */}
          <View style={styles.heroCenter}>
            <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media, textAlign: 'center' }]}>
              Tu acompañante
            </Text>
            <View style={{ marginTop: isShort ? 10 : 14 }}>
              <OrbeAcompanante
                fase={voz.fase}
                diametro={diametroDelFenix}
                onTocar={tocarOrbe}
                onMantener={mantenerOrbe}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[t.small, { color: c.textSoft, marginTop: isShort ? 10 : 14, textAlign: 'center', paddingHorizontal: 8 }]}
            >
              {!chatDeSer.disponible ? '' : chatDeSer.prendida ? rotuloDelOrbe(voz.fase, voz.disponible, voz.terminar !== undefined) : 'En mantenimiento'}
            </Text>
            {voz.terminar && muestraTerminar(voz.fase, voz.terminar) ? (
              <BotonTerminarConversacion onPress={voz.terminar} />
            ) : null}
          </View>
        </View>

        {/* Fase 2: SER que todavía no le toca a esta cuenta no muestra el aviso de mantenimiento (no está en arreglo). */}
        {chatDeSer.disponible && !chatDeSer.prendida ? <AvisoDeMantenimiento aviso={chatDeSer.aviso} /> : null}
        {voz.loQueDijiste || voz.respuesta || voz.error || voz.aviso ? (
          <View style={[styles.conversacionVoz, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {voz.loQueDijiste ? (
              <Text style={[t.small, { color: c.textSoft }]} numberOfLines={2}>
                Tú: {voz.loQueDijiste}
              </Text>
            ) : null}
            {voz.respuesta ? (
              <Text style={[t.body, { color: c.text, fontSize: rs(14.5), lineHeight: rs(21) }]} numberOfLines={6}>
                {voz.respuesta.replace(/[*_#`]+/g, '')}
              </Text>
            ) : null}
            {voz.aviso ? <Text style={[t.small, { color: c.textSoft }]}>{voz.aviso}</Text> : null}
            {voz.error ? <Text style={[t.small, { color: c.danger }]}>{voz.error}</Text> : null}
            <Pressable
              onPress={() => setChatDelOrbeAbierto(true)}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.definirRocaEnlace, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita, fontSize: 14 }]}>Ver en el chat</Text>
              <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.goldInk} />
            </Pressable>
          </View>
        ) : null}
        <RenasiaPanel agent="COMPANION" visible={chatDelOrbeAbierto} onClose={() => setChatDelOrbeAbierto(false)} />

        {/* ========================================================================= */}
        {/* 4. TARJETAS DE PROGRESO Y CONTADORES REALES DEL DÍA                       */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={210} style={{ paddingBottom: 24 }}>
        <View style={{ gap: space.gap }}>
          {/* El diagnóstico de quien ya estaba dentro y lo recibió después (spec 026), en el lugar donde estaba la tarjeta del Mapa de Renacimiento (retirado).
              La tarjeta no se dibuja si no hay nada pendiente; al tocarla se abre el recorrido a pantalla completa. */}
          <TarjetaDelDiagnosticoPendiente alAbrir={() => setDiagnosticoAbierto(true)} />

          {/* Hábitos de hoy y el Radar, en una tarjeta de dos mitades iguales y centradas (spec 016, 2026-10-29).
              Izquierda: EL HÁBITO DE ESTA HORA, no una frase fija (`useHabitoDelMomento`); toca lleva a Training, que es donde
              se opera. Derecha: el Radar. Los días 1 a 7 reemplaza a la tarjeta aparte del Código Renaser, que iba primera;
              desde el día 8 dice si Mi Radar está apagado, qué sigue o que hoy no hay. Qué dice y qué hace cada caso vive en
              `features/radar/utils/mitadDelRadar.ts`. Sin Día 1 (o sin Mi Radar en el backend) es solo la mitad de hábitos. */}
          {programaEnOtraFormacion ? (
            <AvisoDeProgramaEnOtraFormacion nombre={programaEnOtraFormacion.nombre} />
          ) : !dibujarHabitos ? null : (
          <TarjetaHabitoYRadar
            sinHabitos={sinHabitosEnLaFormacion({
              formacion: categorias.formacion,
              delServidor: categorias.delServidor,
              diaPrograma: resumen?.diaPrograma,
              registrosLeidos,
              registrosDeHoy,
              habitosHoyTotal: resumen?.habitosHoy?.total,
            })}
            habitos={{
              cifra: cifrasDeHabitos(resumen?.habitosHoy),
              titulo: tituloHabitoAhora,
              etiquetaAccesible: habitoAhora.titulo ? `Abrir Training: ${tituloEnTipoOracion(habitoAhora.titulo)}` : 'Abrir Training',
            }}
            onAbrirTraining={() => (navigation as any).navigate('Training')}
            diaPrograma={resumen?.diaPrograma}
            inscrito={resumen?.inscrito}
            onAbrirMiRadar={() => (navigation as any).navigate('Yo', { abrirMiRadar: true })}
          />
          )}

          {/* Última evidencia real del Muro: se omiten publicaciones de texto sin evidencia.
              Rediseño de Hoy (2026-10-05): la tarjeta entera responde al dedo (`Presionable`), el
              autor se ve con su foto o sus iniciales (`AvatarPersona`, como en Comunidad) en vez del
              mismo muñequito para todos, y la cuenta de fotos lleva `image` (era una cámara, que en
              la app es «tomar foto»). */}
          {ultimaPublicacion ? (
            <Presionable
              onPress={() =>
                (navigation as any).navigate('Comunidad', {
                  abrirPublicacionId: ultimaPublicacion.id,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Abrir la última evidencia de ${ultimaPublicacion.authorName || 'la comunidad'}`}
            >
              {/* Sin contorno dorado, por lo mismo que otras tarjetas de Hoy: dos tarjetas con borde
                  de color y cinco sin él no es jerarquía, es ruido. */}
              <Card>
                <View style={styles.between}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.wallActivityHeader}>
                      <View style={styles.rotuloDeLaFila}>
                        <MicroLabel>Última evidencia del muro</MicroLabel>
                      </View>
                      <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita }]}>
                        {tiempoRelativo(ultimaPublicacion.createdAt)}
                      </Text>
                    </View>
                    {/* Lo que se lee primero es QUIEN y QUE dijo, no una miniatura. Antes esta
                        tarjeta decia "Subio una evidencia" y debajo abria una rejilla de recuadros
                        con el rotulo FOTO: cuando la imagen no cargaba —que en el Muro pasa— eran
                        tres cajas vacias ocupando media tarjeta, y el texto de la publicacion, que
                        es lo unico que de verdad cuenta algo, no se mostraba en ningun sitio. */}
                    <View style={styles.insight}>
                      <AvatarPersona
                        nombre={ultimaPublicacion.authorName?.trim() || 'Miembro Renaser'}
                        avatarUrl={ultimaPublicacion.authorAvatarUrl}
                        size={36}
                      />
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={1}>
                          {ultimaPublicacion.authorName?.trim() || 'Miembro Renaser'}
                        </Text>
                        {ultimaPublicacion.text?.trim() ? (
                          <Text
                            style={[t.body, { color: c.text }]}
                            numberOfLines={3}
                          >
                            {ultimaPublicacion.text.trim()}
                          </Text>
                        ) : (
                          <Text style={[t.small, { color: c.textSoft }]}>
                            Compartió una evidencia sin texto.
                          </Text>
                        )}
                        {evidenciasUltimaPublicacion.length > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <Icon name="image" size={TAMANO_ICONO.chico} color={c.goldInk} />
                            <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media }]}>
                              {evidenciasUltimaPublicacion.length}
                              {evidenciasUltimaPublicacion.length === 1 ? ' foto' : ' fotos'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
                </View>
              </Card>
            </Presionable>
          ) : cargandoUltimaPublicacion ? (
            <Card>
              <View style={styles.wallLoadingRow}>
                <MicroLabel>Cargando actividad del muro...</MicroLabel>
              </View>
            </Card>
          ) : null}

          {/* Próximo Evento / Mentoría (si el backend lo devuelve). Tocarla abre su detalle en
              Comunidad → Eventos (E-5, decisión del dueño del 2026-09-26): la misma entrada que usa
              el aviso del evento (`abrirEventoId`). */}
          {resumen?.proximoEvento && esDisponible(CLAVES.eventos) && (
            <Presionable
              onPress={() =>
                (navigation as any).navigate('Comunidad', {
                  abrirEventoId: resumen.proximoEvento?.eventoId,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Ver el evento ${resumen.proximoEvento.titulo}, ${cuandoEsElEvento(resumen.proximoEvento.iniciaEn)}`}
            >
              <Card>
                <MicroLabel>Próximo evento</MicroLabel>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  {/* Mismo caso que el avatar del muro: el borde dorado de este cuadradito estaba
                      dentro del borde de la tarjeta. Queda el disco lavado, sin línea. */}
                  <View style={[styles.eventIconBox, { backgroundColor: c.goldWash }]}>
                    <Icon name="calendar" size={TAMANO_ICONO.normal} color={c.goldInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.cardTitle, { color: c.textStrong }]}>
                      {resumen.proximoEvento.titulo}
                    </Text>
                    {/* «Hoy · 20:00» o «mar 6 oct · 20:00» (rediseño de Hoy, 2026-10-05): decía
                        «5/10/26, 20:00», que se lee mayo u octubre según quién. */}
                    <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: fuentes.negrita, marginTop: 3 }]}>
                      {cuandoEsElEvento(resumen.proximoEvento.iniciaEn)}
                    </Text>
                  </View>
                  <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
                </View>
              </Card>
            </Presionable>
          )}
        </View>
        </Aparicion>
      </ScrollView>
      {/* D-163: la hoja de acción del orbe. Flotante y una sola a la vez: la voz no llena la pantalla. */}
      <AccionDelAcompanante
        propuestas={voz.propuestas}
        onConfirmar={id => void voz.confirmarPropuesta(id)}
        onCancelar={id => void voz.cancelarPropuesta(id)}
        pedidosDeFoto={voz.pedidosDeFoto}
        onTomarFoto={pedido => void tomarFotoDelOrbe(pedido)}
      />
      <RegistroConFotoModal {...registroConFoto.modal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* `gapLg` y no `gap` entre los cuatro bloques de la pantalla (encabezado, métricas, hero,
     tarjetas). Con 12 px todo se leía como una lista continua; con 28 cada bloque se reconoce
     solo, que es lo que antes intentaban hacer los bordes. */
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
    gap: space.gapLg,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: {
    fontVariant: ['tabular-nums'],
  },
  /* Regla lateral en vez de recuadro completo: el mismo gesto que usa la frase del día, y no
     mete otra caja con borde en una pantalla que acaba de perder tres. */
  errorBox: {
    borderLeftWidth: 2,
    borderRadius: space.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    /* Sin `marginTop`: el bloque que lo contiene ya separa a sus hijos con `space.gap` (2026-11-01). */
  },
  /**
   * La sección del fénix mide lo que ocupa su contenido (rótulo, fénix, rótulo de la fase y, con la voz abierta,
   * «Terminar»). Sin alto fijo, sin `justifyContent: 'center'` y sin relleno propio: el aire arriba y abajo es el de
   * siempre entre secciones (`space.gapLg`, 28), igual por los dos lados.
   *
   * > **Corregido 2026-10-30 (pedido del dueño, «podemos optimizar sin reducir el tamaño»).** Era
   * > `height: heroSize` (252, o 206 en pantalla baja, por `rs()`) con `justifyContent: 'center'` y 12 de relleno: sobre
   * > ~206 de contenido quedaban 23 a 35 px en blanco arriba y otros tantos abajo. El fénix no cambió de tamaño.
   * >
   * > **Lo que se decidió no reservar:** el alto de «Terminar» (52). Reservarlo dejaría 52 px en blanco siempre, en
   * > reposo, que es justo lo que se pidió quitar, y la conversación ya empuja lo de abajo con la caja de «Tú: …» y la
   * > respuesta. Anclada arriba, el ave y su rótulo NO se mueven cuando aparece «Terminar» o cambia el texto de la fase
   * > (antes, centrada con alto fijo, el ave subía 26 dp, la mitad de los 52 de «Terminar»); crece solo lo que va debajo.
   */
  hero: {
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  conversacionVoz: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginTop: space.gap,
    width: '100%',
  },
  heroCenter: {
    alignItems: 'center',
  },
  /** 48 px, como todo lo pulsable (AGENTS.md §4). Estaba en 44. */
  definirRocaEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: space.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 12,
  },
  /** Rótulo de la tarjeta y su contador. El aire hacia el contenido lo pone `insight`. */
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  /**
   * El rótulo de una fila con algo a la derecha se queda con todo el ancho que sobra.
   *
   * > **Agregado 2026-10-05.** En el emulador Android, Hoy mostraba «Acciones y» en vez de «Acciones
   * > y objetivos»: el rótulo, suelto en la fila, medía justo lo que su texto (334 px) y Android lo
   * > partía en dos líneas por una fracción de píxel; la segunda, «objetivos», quedaba fuera del alto
   * > de una línea y no se veía. Pasó al quitar el espaciado de letras (088f91d): con otros anchos
   * > ningún rótulo caía justo en el borde. En la web no pasa. Con el rótulo estirado hasta la cifra
   * > ya no hay borde que rozar, diga lo que diga el texto.
   */
  rotuloDeLaFila: {
    flex: 1,
  },
  insight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 14,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wallLoadingRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
