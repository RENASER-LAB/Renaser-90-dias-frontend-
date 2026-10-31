import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDES_DE_UNA_PESTANA } from '../navigation/bordesDeUnaPestana';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { AvatarPersona, Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon, TAMANO_ICONO } from '../components/Icon';
import { Presionable } from '../components/Presionable';
import { tacto } from '../utils/tacto';
import { Aparicion } from '../components/Aparicion';
import { useEsMentor } from '../features/mentor/hooks/useEsMentor';
import { useCelulaQueAcompano } from '../features/mentor/hooks/useCelulaQueAcompano';
import { EntradaAlProgramaPropio } from '../features/programa/components/EntradaAlProgramaPropio';
import { TarjetaMentorHoy } from '../features/mentor/components/TarjetaMentorHoy';
import { entradaAlGrupoVisible, esLiderDeMentores, esOtroDeMisGrupos } from '../features/mentor/utils/entradaAlGrupo';
import { BandejaTicketsScreen } from '../features/tickets/screens/BandejaTicketsScreen';
import { CumplimientoDelLiderScreen, type GrupoAbierto } from '../features/lider-mentores/screens/CumplimientoDelLiderScreen';
import { LiderMentoresScreen } from '../features/lider-mentores/screens/LiderMentoresScreen';
import { AprendicesDelLiderScreen } from '../features/lider-mentores/screens/AprendicesDelLiderScreen';
import { useAprendicesDisponibles } from '../features/lider-mentores/hooks/useAprendicesDisponibles';
import { alAbrirAviso, consumirRutaPendiente } from '../features/mentor/notificaciones/rutaDeAviso';
import { ControlDePapelDeHoy } from '../features/hoy-por-papel/components/ControlDePapelDeHoy';
import { MiGrupoEnHoy } from '../features/hoy-por-papel/components/MiGrupoEnHoy';
import { MisMentoresEnHoy } from '../features/hoy-por-papel/components/MisMentoresEnHoy';
import { usePapelDeHoy } from '../features/hoy-por-papel/hooks/usePapelDeHoy';
import { papelesDeHoy } from '../features/hoy-por-papel/utils/papelesDeHoy';
import { usePublicarSemaforoDeHoy } from '../features/semaforo/estado/useSemaforoVigente';
import { useCelebracionDelDia } from '../features/fenix/hooks/useCelebracionDelDia';
import { useResumenPorGrupos } from '../features/semaforo/hooks/useLecturaPorSemana';
import {
  comoAbrirElSemaforoDelGrupo,
  quienAbreElResumenPorGrupos,
} from '../features/semaforo/utils/entradasDelSemaforo';
import { AdminScreen, type EntradaDeAdmin } from '../features/admin/screens/AdminScreen';
import { TarjetaAdminHoy } from '../features/admin/components/TarjetaAdminHoy';
import { useCapacidades } from '../features/admin/hooks/useCapacidades';
import { MiCelulaScreen } from '../features/mentor/screens/MiCelulaScreen';
import { AlumnoScreen } from '../features/mentor/screens/AlumnoScreen';
import type { AlumnoConEstado } from '../features/mentor/types/mentor.types';
import {
  useResumenHome,
  rotuloDeFase,
  DIAS_DEL_PROGRAMA,
} from '../features/home/hooks/useResumenHome';
import { useHabitoDelMomento } from '../features/habits/hooks/useHabitoDelMomento';
import { TarjetaHabitoYRadar } from '../features/home/components/TarjetaHabitoYRadar';
import { useUltimaPublicacionMuro } from '../features/community/hooks/useUltimaPublicacionMuro';
import { tiempoRelativo } from '../features/community/utils/tiempoRelativo';
import { useAuth } from '../context/AuthContext';
import { useMapaRenacimientoAbierto } from '../features/mapa-renacimiento/MapaRenacimientoContext';
import { useLecturaDelEstadoDelMapa } from '../features/mapa-renacimiento/hooks/useEstadoMapa';
import { mapaHabilitado } from '../features/mapa-renacimiento/utils/mapaHabilitado';
import { useAccionesDeHoy } from '../features/objetivos/hooks/useAccionesDeHoy';
import { useMetaDeLaAccion } from '../features/objetivos/hooks/useMetaDeLaAccion';
import { TarjetaAccionDeHoy } from '../features/home/components/TarjetaAccionDeHoy';
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
import { diasQueQuedanSiSeSabe, lapsoQueQueda } from '../features/home/utils/diasQueQuedan';
import { diametroDelOrbe } from '../features/home/utils/diametroDelOrbe';
import { cuandoEsElEvento } from '../features/home/utils/cuandoEsElEvento';
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
  const { habito: habitoAhora, recargar: recargarHabitoAhora } = useHabitoDelMomento();
  const { user } = useAuth();
  /* Rol Mentor. Se monta DENTRO de Hoy y no como sexta pestaña: AGENTS.md 1 prohibe tocar los
     cinco tabs, y ademas el mentor sigue siendo aprendiz — su propio programa no cambia. */
  const esMentor = useEsMentor();
  /* UNA sola lectura de la celula, repartida a la tarjeta y a la pantalla. Si cada una
     llamara al hook por su cuenta habria dos peticiones y dos verdades. */
  const celula = useCelulaQueAcompano(esMentor);
  const { elegirGrupo } = celula;
  /* Quien puede administrar lo dice el SERVIDOR, no el rol leido en el telefono. Un rol nuevo
     manana no dejaria la entrada colgada, y una capacidad falseada abre pantallas vacias: cada
     endpoint vuelve a autorizar (SDD 003, ARF-15). */
  const { capacidades, cargando: cargandoCapacidades, error: errorCapacidades, recargar: recargarCapacidades } = useCapacidades();
  /* Ya no `esMentor`: la invitacion al programa propio es para todo el staff, ADMIN y ALQUIMISTA
     incluidos. Atarla a "es mentor" los dejaba fuera de un programa que el backend si les
     permitia iniciar — el bloqueo estaba aca, no en el permiso (ARF-16). */
  const programaPropioActivo = esMentor || capacidades.administrar || capacidades.puedeIniciarPrograma;
  const [enAdministracion, setEnAdministracion] = useState(false);
  /* La bandeja de tickets: la unica pantalla propia del LIDER DE MENTORES. Se monta como estado
     de Hoy, igual que Administracion y que las vistas del mentor — no como un tab nuevo. */
  const esLider = esLiderDeMentores(user?.role);
  const [enBandejaTickets, setEnBandejaTickets] = useState(false);
  /* «Mis mentores» (SDD 002, backend D-241): la gestion del cuerpo de mentores, tercera pantalla
     propia del lider. Mismo patron: estado de Hoy, no un tab nuevo. */
  const [enMisMentores, setEnMisMentores] = useState(false);
  /* «Todos los aprendices» (2026-10-31): la lista de todas las personas, con o sin grupo, para el líder. La fila de «Mis
     mentores» existe solo si el servidor la ofrece (la primera página respondió 200); Hoy se queda con la respuesta para
     que la fila no parpadee al volver de la lista. */
  const [enTodosLosAprendices, setEnTodosLosAprendices] = useState(false);
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
  const [vistaMentor, setVistaMentor] = useState<'ninguna' | 'celula' | 'alumno'>('ninguna');
  const [alumnoAbierto, setAlumnoAbierto] = useState<AlumnoConEstado | null>(null);
  /* Spec 018: la ficha abierta desde la lista de «Mi grupo» de Hoy vuelve a Hoy; la que se abre desde la pantalla del
     grupo (o desde un aviso) vuelve a esa pantalla, como siempre. */
  const [alumnoVieneDeHoy, setAlumnoVieneDeHoy] = useState(false);
  /* El semáforo propio (D-168) ya no vive en Hoy (2026-10-31, pedido del dueño): su tarjeta y su detalle pasaron a Yo. Lo que Hoy
     conserva es el ánimo del fénix: el color de `/home` pasa al color vigente compartido con el botón de SER (sin pedir nada más;
     Yo publica además el del detalle cuando lo lee), y los hitos del día que ya trae `/home` (fase nueva, racha de 7 y 30, todos
     los hábitos) se celebran una vez por día con la pantalla completa que dibuja `AnfitrionDeCelebraciones` (App.tsx, 2026-10-07). */
  usePublicarSemaforoDeHoy(resumen?.semaforo, Boolean(resumen), null);
  useCelebracionDelDia(
    user?.id,
    resumen ? { rachaActual: resumen.rachaActual, habitosHoy: resumen.habitosHoy, fase: resumen.fase } : null,
  );
  /* Semaforo por grupos (D-168): la pantalla propia del LIDER DE MENTORES, como la bandeja de
     tickets. UNA lectura, compartida por su tarjeta (que aparece solo si el servidor ya respondio
     que existe) y su pantalla. Para cualquier otro rol no se pide nada. */
  const semaforoGrupos = useResumenPorGrupos(esLider);
  const aprendicesDisponibles = useAprendicesDisponibles(esLider && esDisponible(CLAVES.lider));
  const [enSemaforoGrupos, setEnSemaforoGrupos] = useState(false);
  /* Spec 018: el grupo cuya fila se tocó en «Mis mentores». Con él, la pantalla del líder abre directo en ese grupo;
     sin él (el aviso del sábado) abre en el resumen de siempre. */
  const [grupoDeLaFila, setGrupoDeLaFila] = useState<GrupoAbierto | null>(null);
  /* Spec 018: quien lidera mentores ve en Hoy tres papeles —su programa, su grupo y sus mentores— y elige cuál con un
     control de arriba. Lo que tiene cada cuenta lo dice lo que ya se lee acá (el servidor), no el rol suelto: sin grupo
     no hay «Mi grupo», y una entrada apagada por Soporte TI no se ofrece. Quien no lidera no ve el control: su Hoy es el
     de siempre. */
  const tieneGrupoParaElControl =
    entradaAlGrupoVisible({ esMentor, rol: user?.role, fallo: celula.fallo }) &&
    esDisponible(CLAVES.mentorMiGrupo) &&
    (celula.vista !== null || celula.fallo !== null);
  const papeles = papelesDeHoy({
    esLider,
    tienePrograma: programaPropioActivo,
    tieneGrupo: tieneGrupoParaElControl,
    tieneMentores: esDisponible(CLAVES.lider) || esDisponible(CLAVES.tickets) || esDisponible(CLAVES.semaforo),
  });
  const { papel: papelLeido, recordado, elegir: elegirPapel } = usePapelDeHoy(user?.id, papeles);
  const conControl = papeles.length > 0;
  /* Quien se quedó en «Mi grupo» la última vez: mientras el servidor no diga si acompaña un grupo esa opción todavía no
     existe, y dibujar «Mi programa» para saltar al grupo medio segundo después es peor que esperar. */
  const esperandoAlGrupo =
    conControl && recordado === 'grupo' && !papeles.includes('grupo') && celula.cargando && celula.vista === null;
  const papel = esperandoAlGrupo ? null : papelLeido;
  /* Con el papel de mentores o de grupo, lo del programa propio queda oculto pero montado: volver a «Mi programa» es
     instantáneo y no pierde nada (la conversación del orbe, el borrador de una foto). */
  const mostrarPrograma = !conControl || papel === 'programa';
  const ocultoSiNoEsElPrograma = mostrarPrograma ? null : styles.oculto;
  /* El aviso del sabado al mentor abre su grupo con el semaforo a la vista. */
  const [enfocarSemaforoDelGrupo, setEnfocarSemaforoDelGrupo] = useState(false);
  /* El aviso del sabado a administracion entra directo al semaforo de Administracion. La clave
     vuelve a montar la pila de vistas para que entre por ahi aunque ya estuviera abierta. */
  const [adminAbreEn, setAdminAbreEn] = useState<EntradaDeAdmin>('inicio');
  const [montajeAdmin, setMontajeAdmin] = useState(0);

  /* El aviso de la Caja Renaser al Admin (`/admin/caja/{aprendizId}`, D-219) llega por
     `AbridorDeAvisos` con `abrirCajaAprendizId`, ya sin capas obligatorias encima. Abre Administracion
     en esa caja. Espera a saber si la cuenta administra (lo dice el servidor); si no, se descarta. */
  const rutaDeHoy = useRoute();
  useEffect(() => {
    const aprendizId = (rutaDeHoy.params as { abrirCajaAprendizId?: string } | undefined)?.abrirCajaAprendizId;
    if (!aprendizId || cargandoCapacidades) return;
    (navigation as any).setParams({ abrirCajaAprendizId: undefined });
    if (!capacidades.administrar) return;
    setAdminAbreEn({ caja: aprendizId });
    setMontajeAdmin(n => n + 1);
    setEnAdministracion(true);
  }, [rutaDeHoy.params, cargandoCapacidades, capacidades.administrar, navigation]);

  /* D-222: «Ver ficha» desde la info de un chat, para el Admin/Alquimista: `ComunidadScreen` pide esta
     pestaña con `abrirFichaAprendiz` y Administración abre esa ficha, con Inicio debajo. Mismo camino que
     la Caja de arriba: se consume una vez y, si la cuenta no administra, se descarta. */
  useEffect(() => {
    const persona = (rutaDeHoy.params as { abrirFichaAprendiz?: { id: string; fullName: string | null } } | undefined)
      ?.abrirFichaAprendiz;
    if (!persona?.id || cargandoCapacidades) return;
    (navigation as any).setParams({ abrirFichaAprendiz: undefined });
    if (!capacidades.administrar) return;
    setAdminAbreEn({ ficha: { id: persona.id, fullName: persona.fullName } });
    setMontajeAdmin(n => n + 1);
    setEnAdministracion(true);
  }, [rutaDeHoy.params, cargandoCapacidades, capacidades.administrar, navigation]);

  /* Un aviso tocado desde la bandeja del sistema abre la ficha de ese alumno (RF-25).
     La ruta la deja `rutaDeAviso` y se atiende ACA porque las vistas del mentor son estado de
     esta pantalla, no rutas del navegador (AGENTS.md 1: los cinco tabs no se tocan).

     Se espera al padron antes de abrir. No es una demora evitable: `AlumnoScreen` necesita al
     alumno entero —dia de programa, habitos, evidencias—, y eso llega con el grupo. Mientras
     tanto la ruta queda pendiente; `alAbrirAviso` reentrega lo que ya estuviera esperando, asi
     que un toque con la app cerrada no se pierde por llegar antes que los datos.

     Si el alumno NO esta en el padron, se abre el grupo y nada mas. Un aviso viejo de alguien
     que ya roto no debe llevar a su ficha: sus datos ya no son de este mentor. */
  useEffect(() => {
    if (!esMentor) return;
    const abrir = () => {
      const vista = celula.vista;
      if (!vista) return;
      /* Solo las rutas de alumno: la del semaforo la atiende su propio efecto, mas abajo. */
      const ruta = consumirRutaPendiente('alumno');
      if (!ruta) return;
      const abrirAlumnoDe = (padron: AlumnoConEstado[]) => {
        const alumno = padron.find(a => a.participanteId === ruta.alumnoId);
        if (alumno) {
          setAlumnoAbierto(alumno);
          setVistaMentor('alumno');
        } else {
          setVistaMentor('celula');
        }
      };
      /* Alumno de OTRO de sus grupos (D-141): se pasa a ese grupo y se abre la ficha con su
         padron. Mientras llega, se ve el grupo cargando. */
      if (esOtroDeMisGrupos(ruta.grupoId, vista)) {
        setVistaMentor('celula');
        void elegirGrupo(ruta.grupoId).then(nueva => abrirAlumnoDe(nueva?.todos ?? []));
        return;
      }
      abrirAlumnoDe(vista.todos);
    };
    abrir();
    return alAbrirAviso(abrir);
  }, [esMentor, celula.vista, elegirGrupo]);

  /* El aviso del sabado (`/semaforo`, «Tu semana ya cerro») abre el detalle del semaforo. Para
     cualquier rol: le llega a toda persona medida, no solo al mentor. Desde el 2026-10-31 el semáforo vive en Yo: Hoy, que siempre
     está montada, es quien recibe el aviso y trae a Yo con `abrirSemaforo` (Yo abre el detalle y lo olvida). */
  useEffect(() => {
    const abrir = () => {
      if (!consumirRutaPendiente('semaforo')) return;
      (navigation as any).navigate('Yo', { abrirSemaforo: true });
    };
    abrir();
    return alAbrirAviso(abrir);
  }, [navigation]);

  /* El resumen del sabado al mentor (`/mentor/groups/{g}/semaforo`) abre su grupo con la seccion
     del semaforo a la vista. Como la ruta de un alumno, espera al padron; y si el aviso es de un
     grupo que ya no acompana, abre el grupo y nada mas. */
  useEffect(() => {
    if (!esMentor) return;
    const abrir = () => {
      const vista = celula.vista;
      if (!vista) return;
      const ruta = consumirRutaPendiente('semaforoGrupo');
      if (!ruta) return;
      const como = comoAbrirElSemaforoDelGrupo(ruta.grupoId, vista.celula.id, vista.grupos.map(g => g.id));
      /* Aviso de otro de sus grupos (D-141): se abre ESE grupo, no el que estaba mirando. */
      if (como === 'cambiar') void elegirGrupo(ruta.grupoId);
      setEnfocarSemaforoDelGrupo(como !== 'grupo');
      setVistaMentor('celula');
      (navigation as any).navigate('Hoy');
    };
    abrir();
    return alAbrirAviso(abrir);
  }, [esMentor, celula.vista, navigation, elegirGrupo]);

  /* El resumen general del sabado (`/semaforo/grupos`): el lider de mentores abre su pantalla;
     administracion y alquimista, el semaforo de Administracion. Espera a saber si la cuenta
     administra, porque eso lo dice el servidor. */
  useEffect(() => {
    const abrir = () => {
      const quien = quienAbreElResumenPorGrupos({
        esLider,
        administrar: capacidades.administrar,
        cargandoCapacidades,
      });
      if (quien === 'esperar' || quien === 'nadie') return;
      if (!consumirRutaPendiente('semaforoGrupos')) return;
      if (quien === 'lider') {
        setEnBandejaTickets(false);
        setEnSemaforoGrupos(true);
      } else {
        setAdminAbreEn('semaforo');
        setMontajeAdmin(n => n + 1);
        setEnAdministracion(true);
      }
      (navigation as any).navigate('Hoy');
    };
    abrir();
    return alAbrirAviso(abrir);
  }, [esLider, capacidades.administrar, cargandoCapacidades, navigation]);
  const { abrir: abrirMapa, abierto: mapaAbierto } = useMapaRenacimientoAbierto();
  const { estado: estadoMapa, confirmado: estadoMapaConfirmado } = useLecturaDelEstadoDelMapa(user?.id ?? null, mapaAbierto);
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

  const recargarGrupo = celula.recargar;
  const releerGruposDelLider = semaforoGrupos.volverAVigente;
  const recargarTodo = useCallback(async () => {
    setRefreshing(true);
    // Spec 018: deslizar con «Mi grupo» o «Mis mentores» a la vista relee ESA lista.
    if (papel === 'grupo') recargarGrupo();
    if (papel === 'mentores') releerGruposDelLider();
    await Promise.all([
      recargarResumen(),
      recargarAcciones(),
      recargarUltimaPublicacion(),
      recargarHabitoAhora(),
      recargarCapacidades(),
    ]);
    setRefreshing(false);
  }, [
    recargarResumen,
    recargarAcciones,
    recargarUltimaPublicacion,
    recargarHabitoAhora,
    recargarCapacidades,
    papel,
    recargarGrupo,
    releerGruposDelLider,
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
  const faseNombre = rotuloDeFase(resumen?.fase);
  /**
   * `null` = todavía no sabemos en qué día está, porque la carga falló o no terminó.
   *
   * > **Corregido 2026-09-07.** Acá había `?? 1`, y con el backend caído la pantalla anunciaba
   * > "DÍA 1 DE 90" a alguien que se acababa de registrar y estaba en el día 0. No es un redondeo
   * > inocente: el número de día es el dato que ordena todo el programa, y rellenarlo con uno
   * > inventado es peor que no mostrarlo. Reportado por el dueño el día que se registró.
   */
  const diaConocido = resumen?.diaPrograma ?? null;
  // Mapa de Renacimiento. **Disponible desde el Día 0 y opcional** (decisión del dueño,
  // 2026-09-08). Antes aparecía recién el Día 7; se adelanta por dos razones:
  //
  //   1. En Día 0 se PLANIFICA, no se ejecuta — el mismo criterio ya aplicado a los hábitos
  //      (D-103, E-137). Definir el objetivo de los 90 días es planificar, y quien quiere
  //      hacerlo el primer día no tiene por qué esperar una semana.
  //   2. Al activarlo se escriben las tres Rocas Maestras, que son la llave de TODA la cadena de
  //      Rocas: sin ellas el backend responde `403 ROCKS_LOCKED` y la pestaña Plan queda
  //      bloqueada. Adelantar el Mapa adelanta el desbloqueo del plan.
  //
  // Sigue siendo opcional: nadie queda trabado por no llenarlo.
  //
  // > **Corregido 2026-10-27 (issue #37, decisión del dueño).** «Sigue siendo opcional» vale para la app, no para los
  // > objetivos de Plan: el objetivo de 90 días nace del Mapa y queda fijo, y escribirlo en Plan sin Mapa lo dejaba
  // > chocando con el Mapa al activarlo (`409 ROCA_MAESTRA_FIJA`, backend #20). Plan → Objetivos espera al Mapa
  // > (`usePuertaDeObjetivos`): sin Mapa activo muestra «Primero tu Mapa de Renacimiento» con «Hacer mi Mapa». Hoy, el
  // > resto de la app y el Día 0 no cambian: nada obliga a hacer el Mapa. Esta tarjeta solo lo dice desde el inicio.
  //
  // Interruptor de salida a producción: en desarrollo siempre; en un build de producción SOLO si
  // EXPO_PUBLIC_MAPA_DIA7=on (variable de Vercel/EAS, inlined al compilar). Se conserva — encender
  // el flujo sigue siendo un acto deliberado y no un efecto del merge.
  // (La regla vive ahora en `mapaHabilitado()`: Plan la necesita igual, 2026-10-27.)
  const MAPA_DIA7_HABILITADO = mapaHabilitado();
  // Decía "83 días", que era 90 − 7 y valía mientras el Mapa vivía en el Día 7. Desde que arranca
  // en el Día 0 ese número miente: quien lo abre el primer día tiene 90 por delante, no 83.
  // La cuenta vive en `diasQueQuedan` desde el 2026-10-05: la apertura del Mapa usa la misma.
  //
  // > **Corregido 2026-10-05 (ajustes de Hoy y Yo).** Se calculaba con `diaNumero` (era
  // > `diaConocido ?? 0`): con `/home` caído la tarjeta decía «los próximos 90 días», un número
  // > inventado. Ahora usa el mismo criterio que la apertura del Mapa: sin día conocido (o sin
  // > inscripción), «lo que queda del programa», y «el día que queda» en vez de «los próximos 1 días».
  // > `cargando: false` a propósito: Hoy se vuelve a pedir en cada foco con el resumen anterior a la
  // > vista, y el texto no tiene que parpadear a «lo que queda del programa» en cada recarga.
  const lapsoDelMapa = lapsoQueQueda(
    diasQueQuedanSiSeSabe({ diaPrograma: resumen?.diaPrograma, inscrito: resumen?.inscrito, cargando: false }),
  );
  const mostrarMapa = MAPA_DIA7_HABILITADO && !!user;
  /* La tarjeta de acciones de arriba (2026-10-31): qué muestra lo decide `vistaDeLaAccionDeHoy`, con las acciones de hoy que
     esta pantalla ya lee y el Mapa que ya lee la tarjeta del Mapa; la meta de la acción que sigue, `useMetaDeLaAccion`. */
  const vistaDeLaAccion = useMemo(
    () =>
      vistaDeLaAccionDeHoy({
        rocas: accionesDeHoy,
        mapa: { habilitado: MAPA_DIA7_HABILITADO && !!user, estado: estadoMapa, confirmado: estadoMapaConfirmado },
        ahoraMin: minutosDeAhora(Date.now()),
      }),
    [accionesDeHoy, MAPA_DIA7_HABILITADO, user, estadoMapa, estadoMapaConfirmado],
  );
  const metaDeLaAccion = useMetaDeLaAccion(vistaDeLaAccion?.tipo === 'accion' ? vistaDeLaAccion.accion : null);
  const tituloMapa = estadoMapa === 'activo'
    ? 'Tu mapa está activo'
    : estadoMapa === 'en_progreso' || estadoMapa === 'listo_para_revision' ? 'Continúa tu mapa' : 'Diseña tu mapa';
  const detalleMapa = estadoMapa === 'activo'
    ? `Tus objetivos, acciones y protocolo de retorno para ${lapsoDelMapa}.`
    : `Tu plan para ${lapsoDelMapa} empieza aquí: de este Mapa nacen tus objetivos. 15–20 min.`;
  /* Los dos textos de la primera tarjeta. El estado lo decide `habitoDelMomento`; acá solo se
     redacta. `sin-datos` cae al texto genérico de siempre —Día 0, cuenta recién aprobada, o el
     endpoint falló— porque inventar un hábito sería peor que no decir nada. */
  const tituloHabitoAhora = useMemo(() => {
    if (habitoAhora.titulo) return habitoAhora.titulo;
    if (habitoAhora.estado === 'todo-hecho') return '¡Todos los hábitos completados!';
    return 'Lidera tu energía diaria.';
  }, [habitoAhora]);

  const detalleHabitoAhora = useMemo(() => {
    const quedan = habitoAhora.pendientes === 1 ? 'queda 1 pendiente' : `quedan ${habitoAhora.pendientes} pendientes`;
    if (habitoAhora.estado === 'ahora') {
      return habitoAhora.hora ? `Te toca ahora · ${habitoAhora.hora} · ${quedan}` : `Te toca ahora · ${quedan}`;
    }
    if (habitoAhora.estado === 'proximo') {
      return `Empieza a las ${habitoAhora.hora} · ${quedan}`;
    }
    if (habitoAhora.estado === 'todo-hecho') {
      return resumen?.habitosHoy
        ? `${resumen.habitosHoy.completados} de ${resumen.habitosHoy.total} hábitos cumplidos en esta jornada.`
        : 'No queda nada pendiente en esta jornada.';
    }
    return resumen?.habitosHoy
      ? `${resumen.habitosHoy.completados} de ${resumen.habitosHoy.total} hábitos cumplidos en esta jornada.`
      : 'Todo lo demás se alinea cuando cumples tu disciplina.';
  }, [habitoAhora, resumen]);

  /* `null` = no se sabe (`/home` falló, todavía carga o no trajo el dato): la pantalla dice «—».
     > **Corregido 2026-10-05.** Acá había `?? 100`: con `/home` caído Hoy decía «100 pts», un dato inventado (el mismo error
     > que el «DÍA 1 DE 90» del 2026-09-07). Yo ya decía «—».
     > **Corregido 2026-10-31.** Coherencia y racha se fueron de Hoy (pedido del dueño: ya están en Yo); quedan los puntos. */
  const puntosLiga = typeof resumen?.puntosLiga === 'number' ? resumen.puntosLiga : null;

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

  /* Las vistas del mentor toman la pantalla completa, como el Mapa: son otro contexto de
     trabajo, no una tarjeta mas dentro del dia propio. El retroceso del sistema las cierra
     paso a paso (cada una registra su `useSystemBackHandler`). */
  /* Administracion toma la pantalla completa, como las vistas del mentor y como el Mapa: es otro
     contexto de trabajo, no una tarjeta mas dentro del dia propio. */
  if (enAdministracion && capacidades.administrar) {
    return (
      <AdminScreen
        key={montajeAdmin}
        abrirEn={adminAbreEn}
        onSalir={() => {
          setEnAdministracion(false);
          setAdminAbreEn('inicio');
        }}
      />
    );
  }
  /* Misma forma que Administracion: pantalla completa, y el retroceso del sistema la cierra
     (la registra ella con su `useSystemBackHandler`). */
  if (enBandejaTickets && esLider) {
    return <BandejaTicketsScreen onVolver={() => setEnBandejaTickets(false)} />;
  }
  if (enMisMentores && esLider) {
    return <LiderMentoresScreen onSalir={() => setEnMisMentores(false)} />;
  }
  /* Misma forma: la lista de todas las personas del programa, abierta desde «Mis mentores». */
  if (enTodosLosAprendices && esLider) {
    return <AprendicesDelLiderScreen onSalir={() => setEnTodosLosAprendices(false)} />;
  }
  /* Misma forma que la bandeja: la otra pantalla propia del lider de mentores. Desde la spec 005 (2026-10-19)
     el resumen por grupos baja al grupo y a la persona: `CumplimientoDelLiderScreen` lo envuelve y maneja esos
     niveles por dentro (persona ← grupo ← resumen ← Hoy), sin otra vista de Hoy. */
  if (enSemaforoGrupos && esLider) {
    return (
      <CumplimientoDelLiderScreen
        lectura={semaforoGrupos}
        grupoInicial={grupoDeLaFila ?? undefined}
        onSalir={() => {
          setEnSemaforoGrupos(false);
          setGrupoDeLaFila(null);
        }}
      />
    );
  }
  if (esMentor && vistaMentor === 'alumno' && alumnoAbierto) {
    return (
      <AlumnoScreen
        alumno={alumnoAbierto}
        grupoId={celula.vista?.celula.id ?? null}
        onVolver={() => {
          setVistaMentor(alumnoVieneDeHoy ? 'ninguna' : 'celula');
          setAlumnoVieneDeHoy(false);
        }}
      />
    );
  }
  if (esMentor && vistaMentor === 'celula') {
    return (
      <MiCelulaScreen
        onSalir={() => {
          setVistaMentor('ninguna');
          setEnfocarSemaforoDelGrupo(false);
        }}
        enfocarSemaforo={enfocarSemaforoDelGrupo}
        onAbrirAlumno={alumno => {
          setAlumnoAbierto(alumno);
          setAlumnoVieneDeHoy(false);
          setVistaMentor('alumno');
        }}
        vista={celula.vista}
        cargando={celula.cargando}
        fallo={celula.fallo}
        detalle={celula.detalle}
        recargar={celula.recargar}
        onElegirGrupo={elegirGrupo}
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
        {/* 1. BARRA DE ESTADO DEL PROGRAMA & PUNTOS                                  */}
        {/* ========================================================================= */}
        <Aparicion>
        {/* Era una tarjeta con borde que contenía otra caja con borde (la píldora de puntos):
            dos rectángulos anidados para decir dos datos. Ahora es una línea de encabezado
            —fase arriba, día debajo, puntos al margen— sin borde ni fondo propios. Lo que la
            separa de lo que sigue es el espacio, no un contorno. */}
        <View style={styles.programStatusBar}>
          <View style={{ flex: 1 }}>
            <Text
              style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}
              accessibilityLabel={`Fase del programa: ${faseNombre ?? 'sin datos'}`}
            >
              {faseNombre ?? '—'}
            </Text>
            <Text style={[t.cardTitle, styles.cifras, { color: c.textStrong, fontSize: 15, marginTop: 3 }]}>
              Día {diaConocido ?? '—'} de {DIAS_DEL_PROGRAMA}
            </Text>
          </View>

          {/* La cifra sola, como en Ranking (rediseño de Hoy, 2026-10-05). Llevaba un rayo, que en
              Plan es «Tu semana», dentro de una píldora en versales. */}
          <Text
            style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 14 }]}
            accessibilityLabel={puntosLiga === null ? 'Puntos de la liga: sin datos' : `${puntosLiga} puntos de la liga`}
          >
            {puntosLiga ?? '—'} pts
          </Text>
        </View>

        {/* Spec 018: quien lidera mentores elige qué ve en Hoy —su programa, su grupo o sus mentores—. Solo existe para
            esa cuenta y con más de un papel disponible; para el resto Hoy es el de siempre, sin control. Mientras se lee
            lo último que eligió (unos milisegundos, una vez) no se dibuja, para que Hoy no salte de un papel a otro. */}
        {conControl && papel !== null ? (
          <View style={styles.controlDePapel}>
            <ControlDePapelDeHoy papeles={papeles} valor={papel} onCambiar={elegirPapel} />
          </View>
        ) : null}

        {/* La raya dorada corta que iba sobre la frase del día se queda bajo la cabecera (pedido del dueño, 2026-10-31: «la
            cabecera queda: fase, día, puntos y la raya»). Es solo adorno: el lector de pantalla no la lee. */}
        {mostrarPrograma ? (
          <View
            style={[styles.raya, { backgroundColor: c.gold }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}

        {/* ========================================================================= */}
        {/* 2. LA ACCIÓN QUE SIGUE HOY (2026-10-31)                                   */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={70} style={ocultoSiNoEsElPrograma}>
        {/* Pedido del dueño, 2026-10-31: se quitaron la frase del día y Coherencia / Racha (ya están en Yo) y, en su lugar y antes
            de «Tu acompañante», va la tarjeta de «Acciones y objetivos» con el diseño nuevo: la que sigue hoy, su meta y un
            botón que lleva a Training. Mientras no se sabe qué mostrar no se dibuja nada (sin parpadeo). */}
        {vistaDeLaAccion && metaDeLaAccion.lista ? (
          <TarjetaAccionDeHoy
            vista={vistaDeLaAccion}
            meta={metaDeLaAccion.meta}
            alEmpezar={accionId => (navigation as any).navigate('Training', { abrirAccionId: accionId })}
            alHacerElMapa={abrirMapa}
            alAgendar={() => (navigation as any).navigate('Plan')}
          />
        ) : null}

        {errorResumen && (
          <View style={[styles.errorBox, { backgroundColor: c.dangerWash, borderLeftColor: c.danger }]}>
            <Text style={[t.small, { color: c.danger }]}>
              {errorResumen}
            </Text>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 3. HERO: CÍRCULOS CONCÉNTRICOS & TU ÚNICO FOCO (ROCA PRIORITARIA DE HOY)  */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={140} style={ocultoSiNoEsElPrograma}>
        <View style={styles.hero}>
          {/* Sin anillos ni partícula detrás: el fénix es el centro y va sin fondo (pedido del dueño, 2026-10-06). */}
          {/* El centro del hero es el acompañante por voz (pedido del dueño, 2026-09-23). Antes
              decía "TU ÚNICO FOCO / AHORA" (o la roca prioritaria del día) y llevaba a Plan; ese
              dato se le pregunta ahora al propio acompañante ("¿cuál es mi foco de hoy?"), que lo
              lee con consultar_rocas. Tocar el orbe: escucha, piensa y responde en voz alta. */}
          <View style={styles.heroCenter}>
            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', textAlign: 'center' }]}>
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
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 14 }]}>Ver en el chat</Text>
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
        {/* Spec 018, «Mi grupo»: los aprendices del grupo que acompaña quien lidera mentores, con su color y su %. */}
        {papel === 'grupo' ? (
          <MiGrupoEnHoy
            vista={celula.vista}
            cargando={celula.cargando}
            fallo={celula.fallo}
            onReintentar={celula.recargar}
            onAbrirGrupo={() => setVistaMentor('celula')}
            onAbrirAlumno={alumno => {
              setAlumnoAbierto(alumno);
              setAlumnoVieneDeHoy(true);
              setVistaMentor('alumno');
            }}
          />
        ) : null}

        {/* Spec 018, «Mis mentores», solo para el líder de mentores: el resultado por grupo y, debajo, las consultas de
            mentores y el padrón. Reemplaza a las tres tarjetas sueltas que tenía (tickets, semáforo por grupos y «Mis
            mentores»): abren las mismas pantallas. */}
        {papel === 'mentores' && esLider ? (
          <MisMentoresEnHoy
            lectura={semaforoGrupos}
            verGrupos={esDisponible(CLAVES.semaforo)}
            verConsultas={esDisponible(CLAVES.tickets)}
            verMentores={esDisponible(CLAVES.lider)}
            verTodos={aprendicesDisponibles === true}
            onAbrirTodos={() => setEnTodosLosAprendices(true)}
            onAbrirGrupo={(grupo, inicio) => {
              setGrupoDeLaFila({ grupoId: grupo.grupoId, nombre: grupo.grupoNombre?.trim() || 'Grupo sin nombre', inicio });
              setEnSemaforoGrupos(true);
            }}
            onAbrirConsultas={() => setEnBandejaTickets(true)}
            onAbrirMentores={() => setEnMisMentores(true)}
          />
        ) : null}

        <View style={[{ gap: space.gap }, ocultoSiNoEsElPrograma]}>
          {/* Solo para ADMIN/ALQUIMISTA. El resto de Hoy no cambia para nadie. */}
          {/* Spec 002, fase 2: una entrada que todavía no le toca a esta cuenta (despliegue, rol personalizado) no se dibuja. */}
          {capacidades.administrar && esDisponible(CLAVES.admin) ? <TarjetaAdminHoy onAbrir={() => setEnAdministracion(true)} /> : null}

          {/* Solo para quien acompana una celula. El resto de Hoy no cambia.

              La condicion vive en `entradaAlGrupoVisible` y no aca: un LIDER DE MENTORES contaba
              como mentor, pero el backend no le deja tener grupo asignado, asi que esta tarjeta
              le decia para siempre que no tiene aprendices. Para todos los demas roles la
              funcion devuelve exactamente lo que devolvia `esMentor`. */}
          {/* Con el control de papel, el grupo del líder es «Mi grupo» y no una tarjeta más (spec 018). */}
          {!conControl && entradaAlGrupoVisible({ esMentor, rol: user?.role, fallo: celula.fallo }) && esDisponible(CLAVES.mentorMiGrupo) ? (
            <TarjetaMentorHoy
              onAbrir={() => setVistaMentor('celula')}
              vista={celula.vista}
              cargando={celula.cargando}
              fallo={celula.fallo}
            />
          ) : null}

          {/* El programa propio (D-260): «Hacer mi programa de 90 días» a quien no tiene fila y, a quien
              la tiene sin Día 1, «Elegir mi Día 1». La tarjeta vive en `EntradaAlProgramaPropio`,
              la misma de Yo y Training. «Ahora no» sigue siendo solo de Hoy. */}
          <EntradaAlProgramaPropio
            lugar="hoy"
            activo={programaPropioActivo}
            usuarioId={user?.id ?? null}
            inscrito={resumen?.inscrito}
            diaPrograma={resumen?.diaPrograma}
            errorCapacidades={errorCapacidades}
            reintentarCapacidades={() => void recargarCapacidades()}
          />

          {/* Tarjeta Mapa de Renacimiento */}
          {mostrarMapa ? (
            <Presionable onPress={abrirMapa} accessibilityRole="button" accessibilityLabel={`${tituloMapa}. ${detalleMapa}`}>
              {/* Sin el `borderColor: c.gold`: subrayar una tarjeta con un contorno dorado es
                  destacar por adorno. Esta tarjeta ya destaca por lo que dice y por el círculo
                  dorado que lleva dentro; el contorno sólo la desalineaba del resto. */}
              <Card>
                {/* Ya no dice "DÍA 7": está disponible desde el Día 0. El badge de VISTA PREVIA
                    se fue con él — existía para marcar que en desarrollo se veía antes de tiempo,
                    y ahora no hay "antes de tiempo". */}
                <MicroLabel>Mapa de renacimiento</MicroLabel>
                {/* Rediseño de Hoy (2026-10-05): el mapa (`map`) en vez del asterisco `spark`, que era
                    también el de la propuesta de SER; y el chevron gris de 16 de todas las tarjetas
                    en vez del disco dorado de 40 (era la única tarjeta con uno: la tarjeta entera es
                    el botón).

                    El chevron va a la altura del TÍTULO y no centrado como en las demás: con la
                    pantalla sin desplazar, esta tarjeta queda al pie, y en un Android de 412 × 915 el
                    botón flotante de SER (`RenasiaLauncher`, fijo abajo a la derecha) caía justo sobre
                    el centro de su borde derecho (prueba nativa del 2026-10-05). Arriba, junto al
                    título, queda libre. */}
                <View style={styles.insight}>
                  <Icon name="map" size={TAMANO_ICONO.normal} color={c.goldInk} />
                  <View style={{ gap: 5, flex: 1 }}>
                    <Text style={[t.cardTitle, { color: c.text }]}>{tituloMapa}</Text>
                    <Text style={[t.small, { color: c.textSoft }]}>{detalleMapa}</Text>
                  </View>
                  <View style={styles.chevronDelTitulo}>
                    <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
                  </View>
                </View>
              </Card>
            </Presionable>
          ) : null}

          {/* Hábitos de hoy y el Radar, en una tarjeta de dos mitades iguales y centradas (spec 016, 2026-10-29).
              Izquierda: EL HÁBITO DE ESTA HORA, no una frase fija (`useHabitoDelMomento`); toca lleva a Training, que es donde
              se opera. Derecha: el Radar. Los días 1 a 7 reemplaza a la tarjeta aparte del Código Renaser, que iba primera;
              desde el día 8 dice si Mi Radar está apagado, qué sigue o que hoy no hay. Qué dice y qué hace cada caso vive en
              `features/radar/utils/mitadDelRadar.ts`. Sin Día 1 (o sin Mi Radar en el backend) es solo la mitad de hábitos. */}
          <TarjetaHabitoYRadar
            habitos={{
              cifra: cifrasDeHabitos(resumen?.habitosHoy),
              titulo: tituloHabitoAhora,
              detalle: detalleHabitoAhora,
              etiquetaAccesible: habitoAhora.titulo ? `Abrir Training: ${habitoAhora.titulo}` : 'Abrir Training',
            }}
            onAbrirTraining={() => (navigation as any).navigate('Training')}
            diaPrograma={resumen?.diaPrograma}
            inscrito={resumen?.inscrito}
            onAbrirMiRadar={() => (navigation as any).navigate('Yo', { abrirMiRadar: true })}
          />

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
              {/* Sin contorno dorado, por lo mismo que la tarjeta del Mapa: dos tarjetas con borde
                  de color y cinco sin él no es jerarquía, es ruido. */}
              <Card>
                <View style={styles.between}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.wallActivityHeader}>
                      <View style={styles.rotuloDeLaFila}>
                        <MicroLabel>Última evidencia del muro</MicroLabel>
                      </View>
                      <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
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
                            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
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
                    <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginTop: 3 }]}>
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
  /* Spec 018: el control de papel va pegado a la línea de fase y día, con aire antes de lo que cambia. */
  controlDePapel: { marginTop: 14, marginBottom: 4 },
  /* Lo del programa propio cuando se mira otro papel: oculto y montado (volver es instantáneo, sin releer). */
  oculto: { display: 'none' },
  raya: { width: 34, height: 2, borderRadius: 1, marginTop: 20 },
  programStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  /* Regla lateral en vez de recuadro completo: el mismo gesto que usa la frase del día, y no
     mete otra caja con borde en una pantalla que acaba de perder tres. */
  errorBox: {
    borderLeftWidth: 2,
    borderRadius: space.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: space.gap,
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
  /** El chevron a la altura del título de la tarjeta (solo el Mapa: ver el comentario de la tarjeta). */
  chevronDelTitulo: {
    height: 22,
    justifyContent: 'center',
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
