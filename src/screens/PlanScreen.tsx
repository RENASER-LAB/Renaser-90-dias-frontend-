import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDES_DE_UNA_PESTANA } from '../navigation/bordesDeUnaPestana';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useFormacionDeLaSesion } from '../features/formaciones/context/FormacionContext';
import { llaveDeLasVistas } from '../features/formaciones/utils/vistaDeFormacion';
import { PlazoDelObjetivoProvider } from '../features/objetivos/context/PlazoDelObjetivo';
import { plazoDelObjetivo } from '../features/objetivos/utils/nombreDelObjetivo';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { ScreenHeader } from '../components/ui';
import { ControlSegmentado } from '../components/ControlSegmentado';
import { ConfirmacionEnLinea } from '../components/ConfirmacionEnLinea';
import { tacto } from '../utils/tacto';
import { useReducedMotion } from 'react-native-reanimated';
import { CierreEnPlan } from '../features/cierre/components/CierreEnPlan';
import { ejeDeLasAcciones } from '../features/cierre/utils/ejeDeLasAcciones';
import { useResumenHome } from '../features/home/hooks/useResumenHome';
import { FilaDelProgramaPropio } from '../features/programa/components/FilaDelProgramaPropio';
import { PlanSinPrograma } from '../features/programa/components/PlanSinPrograma';
import { useFilaDelProgramaPropio } from '../features/programa/hooks/useFilaDelProgramaPropio';
import type { DiaDelPlan } from '../features/habits/utils/semanaDelPlan';
import { cifraEscrita } from '../features/objetivos/api/planMensualApi';
import { EditarObjetivoDelMesModal } from '../features/objetivos/components/EditarObjetivoDelMesModal';
import { usePlanMensual } from '../features/objetivos/hooks/usePlanMensual';
import { BotonPlanificarMes } from '../features/objetivos/components/BotonPlanificarMes';
import { PlanDelEje } from '../features/objetivos/components/PlanDelEje';
import { PlanDelMesModal } from '../features/objetivos/components/PlanDelMesModal';
import { TarjetaDelObjetivo } from '../features/objetivos/components/TarjetasDelPlan';
import { useAccionesDeHoy } from '../features/objetivos/hooks/useAccionesDeHoy';
import { HojaDelObjetivo } from '../features/objetivos/components/HojaDelObjetivo';
import { HojaConfirmarObjetivos } from '../features/objetivos/components/HojaConfirmarObjetivos';
import { TarjetaRevisaTusObjetivos } from '../features/objetivos/components/TarjetaRevisaTusObjetivos';
import { useRocasMaestras } from '../features/objetivos/hooks/useRocasMaestras';
import type { DefinicionRocaMaestra, EjeObjetivo, RocaMaestraApi } from '../features/objetivos/types/objetivos.types';
import { EJES, ETIQUETA_CORTA_EJE, ETIQUETA_EJE } from '../features/objetivos/types/objetivos.types';
import { conPrincipalPrimero, usePrioridadPrincipal } from '../features/objetivos/hooks/usePrioridadPrincipal';
import { iconoDelEje } from '../features/objetivos/utils/iconoDelEje';
import { etiquetaDelMes, mesDe, semanaDe } from '../features/objetivos/utils/periodoDelPrograma';
import { estaPorConfirmar, rocasPorConfirmar, type ObjetivoParaConfirmar } from '../features/objetivos/utils/objetivosPorConfirmar';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { useOcultarBarraAlDesplazar } from '../navigation/barraAlDesplazar/BarraInferior';
import { useFuncionalidad } from '../features/plataforma/estado/useFuncionalidad';
import { CLAVES } from '../features/plataforma/utils/clavesDeLaApp';
import { LineaDeLaMeta, SeparadorDelMes } from '../features/objetivos/components/RutaDelPlan';
import { etiquetaDelSeparadorDelMes, objetivoCortoDelMes } from '../features/objetivos/utils/rutaDelPlan';

// =========================================================================
// TIPOS DEL PLAN DE HÁBITOS
// =========================================================================
/**
 * `PlanHabit`, `DayOfWeek` y `DayMoment` siguen viviendo acá porque los importan `habitsMappers`,
 * `usePlanHabitos`, `useTraining`, `cargarEntrenamiento` y `TrainingScreen`: son la forma del
 * inventario de hábitos que hoy se planifica desde Training.
 *
 * > **Corregido 2026-10-05 (rediseño de Plan, decisión del dueño).** Esta pantalla tenía además una
 * > sub-vista «Hábitos 7 días» (~700 líneas: semana LUN–DOM, interruptor por día, crear hábito,
 * > reubicar en mañana/tarde/noche, cambiar hora y renombrar bebidas) a la que **nada llevaba desde
 * > el commit 8b78a00 (2026-09-08)**: ningún `setActiveSubView('habitos')`, ningún parámetro de
 * > ruta, ningún aviso (los de hábitos abren Training). Se borró entera. Todo lo que hacía existe en
 * > Training (`PlanificarDimensionModal`, renombre de bebidas, cambio de hora con su alarma). Los
 * > tipos se quedan para no mover medio módulo de hábitos en el mismo cambio.
 */
export type DayOfWeek = DiaDelPlan;
export type DayMoment = 'mañana' | 'tarde' | 'noche';

export interface PlanHabit {
  id: string;
  title: string;
  icon: string;
  /** El recordatorio guardado, para poder preservarlo al cambiar la hora. */
  recordatorio: { activo: boolean; minutosAntes: number | null };
  tag: string;
  tagColor: string;
  time: string;
  duration: string;
  moment: DayMoment;
  desc: string;
  days: Record<DayOfWeek, boolean>;
  /** `HH:mm:ss` crudo del backend. `null` = el hábito no vence dentro del día. */
  limitTime: string | null;
  /**
   * Posición del hábito en el catálogo curado del panel admin (`habitos.orden`, V28/V30). Es el
   * orden en que el dueño del producto los acomodó y el que manda en la lista del plan.
   */
  ordenCatalogo: number;
  /**
   * `true` = el hábito todavía no se desbloqueó para este aprendiz (su `dia_inicio` es posterior
   * al día de programa en que está). Se muestra con candado, sin poder marcarlo ni pausarlo.
   */
  locked: boolean;
  /** Día de programa en que se desbloquea. */
  unlockDay: number;
  /** Días que faltan para eso. 0 cuando ya está disponible. */
  daysUntilUnlock: number;
  /** `false` = obligatorio: el interruptor de activar/pausar se muestra bloqueado en ON. */
  isOptional: boolean;
  /** false = el aprendiz no puede sacarlo de su plan; el interruptor queda en ON y bloqueado. */
  isDeactivatable: boolean;
  /**
   * Horario ya guardado que empieza a regir MAÑANA, no hoy. `null` = nada pendiente.
   *
   * Existe porque el backend nunca rechaza un cambio sobre un hábito cuya ventana ya arrancó:
   * lo difiere (D-90/D-91).
   */
  cambioProgramado: { time: string; desde: string } | null;
  /**
   * `Habito.claveSistema` del backend (`DAILY_CLASS`, `GREEN_JUICE`…), `null` en los personales.
   * Sirve para reconocer un hábito sin mirar su título, que es editable (`utils/renombreDeHabito.ts`).
   */
  systemKey?: string | null;
}

/**
 * Con qué eje se abre la vista de Objetivos cuando nadie eligió todavía.
 *
 * > **Corregido 2026-09-08.** Acá había un `EJE_DE_ESTA_PANTALLA = 'TRABAJO'` fijo: la vista servía
 * > solo para "Diseñar libertad financiera" y los otros dos ejes no tenían por dónde entrar. El eje
 * > entra por estado, lo fija la tarjeta que se toca (o el selector de arriba), y esto queda solo
 * > como valor inicial.
 */
const EJE_POR_DEFECTO: EjeObjetivo = 'CUERPO';

export default function PlanScreen() {
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  /* Spec 058: Plan como ruta de niveles solo si `plan.ruta` está prendida Y disponible para esta persona (nace apagada). Si no, Plan es el de siempre (FR-002). */
  const planRuta = useFuncionalidad(CLAVES.planRuta);
  const rutaActiva = planRuta.prendida && planRuta.disponible;
  /* El engranaje de la cabecera: sube el contador y `PlanDelEje` abre «Planifica tus objetivos». */
  const [pedidoDeAjustes, setPedidoDeAjustes] = useState(0);

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  /* Plan es una sola pantalla desde el 2026-10-31: la sub-vista «Objetivos» (con su flecha de volver) se integró aquí. */
  const barraAlDesplazar = useOcultarBarraAlDesplazar();

  /**
   * Día real del programa y fase: antes el 37, el arco y la fase estaban escritos a mano.
   *
   * > **Corregido 2026-10-06 (pedido del dueño: «en Yo las fases deben ser iguales que en Plan»).** Esto
   * > venía de `useProgramaDia`, que lee `/home` una sola vez al montar la pestaña; Yo lo relee cada vez
   * > que vuelve al foco (`useResumenHome`). Con la app abierta al cambiar el día, Plan se quedaba en el
   * > de ayer: en el paso del 34 al 35, Yo decía «Fase 3 · El Maestro Interno» y Plan seguía en «02 ·
   * > El Ciclo Alquímico». Ahora las dos pestañas leen el mismo hook y la misma cuenta (`faseEnCurso`).
   */
  const { resumen } = useResumenHome();
  /* El plazo con el que se nombra el objetivo de ESTA persona («90 días», «3 meses», «1 año»); el resto de Plan lo lee del contexto. */
  const plazo = plazoDelObjetivo(resumen?.duracionDias, resumen?.formacion);
  const diaPrograma = resumen?.diaPrograma ?? 0;
  /* La misma fila compacta de Hoy (2026-11-01): quien no tiene programa («Haz tu programa de 90 días»), no empezó su programa o ya lo eligió y
     espera («Tu programa empieza el martes 3 de noviembre») lo ve arriba de Plan. Un solo hook y una sola función pura para las dos
     pantallas (`useFilaDelProgramaPropio`). Para quien ya está en su programa no existe y Plan es el de siempre. */
  const programaPropio = useFilaDelProgramaPropio({
    inscrito: resumen?.inscrito,
    diaPrograma: resumen?.diaPrograma,
    duracionDias: resumen?.duracionDias,
    formacion: resumen?.formacion,
  });

  /**
   * La fase del aprendiz, **la que dice el backend**, no una calculada acá.
   *
   * > **Corregido 2026-09-08.** Esto derivaba del día contra un arreglo local de TRES fases
   * > (FUNDACIÓN 1-30 / ACELERACIÓN 31-60 / EXPANSIÓN 61-90) inventado en esta pantalla. El
   * > programa tiene **cuatro**, con contrato firmado cada una, y Hoy y Yo ya las mostraban.
   *
   * Es `null` mientras la respuesta viaja, y también ante una fase que esta versión de la app no
   * conozca. En los dos casos no se dibuja el rótulo: mejor nada que un dato inventado.
   */
  /* `null` mientras la carga no termina o el programa no arranco (dia 0): la arquitectura de
     tiempo no debe mostrar avance inventado, igual que Hoy no muestra un dia que no sabe. */
  // Modal / hoja del objetivo de 90 días
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false);

  /**
   * «Guardado» en una línea que se va sola, junto al objetivo (2026-10-05). Antes era un diálogo
   * («¡Objetivo actualizado! 🎯», «¡Avance anotado! 🎯») que había que cerrar para seguir, cuando lo
   * que decía ya se veía en la tarjeta. Los errores siguen en diálogo.
   */
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const confirmar = (texto: string) => {
    setConfirmacion({ clave: Date.now(), texto });
    tacto.logro();
  };

  /**
   * El objetivo de 90 días real del aprendiz, traído del backend, de los tres ejes: el selector de
   * arriba de Objetivos (o la tarjeta que se toca en Prioridades clave) fija cuál se está mirando.
   */
  const objetivos = useRocasMaestras();

  /**
   * El eje de la prioridad principal de la persona, y los tres con ese adelante (pedido del cliente el 2026-09-14; desde la
   * spec 026 sale de su diagnóstico). Sin prioridad —ficha estándar, sin diagnóstico o sin red—, `conPrincipalPrimero` devuelve el
   * orden de siempre.
   */
  const { ejePrincipal, primeraAccion } = usePrioridadPrincipal();
  const ejesOrdenados = useMemo(() => conPrincipalPrimero(EJES, ejePrincipal), [ejePrincipal]);
  /* La primera acción del diagnóstico se sugiere al agendar, en el eje de la prioridad principal (no se agenda sola). */
  const accionSugerida = useMemo(
    () => (ejePrincipal && primeraAccion ? { eje: ejePrincipal, texto: primeraAccion } : null),
    [ejePrincipal, primeraAccion],
  );
  /**
   * **«Cierra tu día»** (spec 033, 2026-10-31, pedido del dueño: «Cerrar el día se mueve a Plan»). Está siempre
   * (decisión 033-3 A): bajo «Acciones que mueven la meta». Desde la spec 026 ya no hay Mapa de Renacimiento que la esconda.
   * El eje de cada acción pendiente de la hoja sale de las acciones de hoy (el servidor no lo manda en el cierre).
   */
  const { user } = useAuth();
  /* Sin programa propio andando no hay objetivos que operar. El servidor responde a todo `/rocks/*`: 404 «Participante no encontrado: <id>» a quien
     no tiene fila (issues #81 y #82) y 403 «Solo un aprendiz opera sus propias rocas» al PERSONAL que tiene la fila pero todavía no empezó su programa
     (#83, `AccesoARocas`); se veía ese texto en rojo en dos tarjetas. Plan muestra entonces su estado vacío con el botón «Empezar mañana». El
     aprendiz con la fila y sin Día 1 sí opera sus rocas (el servidor lo deja): ve Plan como siempre. */
  const sinProgramaPropio = resumen?.inscrito === false || (programaPropio.vista?.tipo === 'elegir' && programaPropio.delPersonal);
  /* La memoria de las lecturas del cierre (hoy y días anteriores) se separa por cuenta Y formación: el cierre de una no es el de la otra (spec 022). */
  const { formacion: formacionDeLaSesion } = useFormacionDeLaSesion();
  const { rocas: rocasDeHoy } = useAccionesDeHoy();
  const ejeDeLaAccion = useMemo(() => ejeDeLasAcciones(rocasDeHoy), [rocasDeHoy]);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const accionesRef = useRef<View>(null);
  const interiorRef = useRef<View>(null);
  const movimientoReducido = useReducedMotion();
  /** «Ver mañana en Plan» (decisión 033-2 A, solo mover): lleva el scroll hasta «Acciones que mueven la meta», que ya muestra lo que viene. */
  const verMananaEnPlan = useCallback(() => {
    const scroll = scrollRef.current;
    const destino = accionesRef.current;
    const interior = interiorRef.current;
    if (!scroll || !destino || !interior) return;
    destino.measureLayout(
      interior,
      (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 12), animated: !movimientoReducido }),
      () => undefined,
    );
  }, [movimientoReducido]);

  /**
   * El eje que se está mirando: el que la persona tocó, o —mientras no haya tocado ninguno— el primero del selector, que es el de
   * su prioridad principal (antes arrancaba siempre en Cuerpo aunque la prioridad fuera otra).
   */
  const [ejeElegido, setEjeElegido] = useState<EjeObjetivo | null>(null);
  const ejeAbierto: EjeObjetivo = ejeElegido ?? ejesOrdenados[0] ?? EJE_POR_DEFECTO;
  /**
   * Si se está leyendo la explicación de los tres niveles.
   *
   * Arranca cerrada (2026-09-21, pedido del dueño): lo primero que tiene que verse al entrar es el
   * objetivo y su avance, no cómo funciona el sistema. La explicación no se borró — está a un toque.
   */
  const rocaDeEje = (eje: EjeObjetivo) => objetivos.deEje(eje);
  const rocaAbierta = objetivos.deEje(ejeAbierto);
  /**
   * D-234: una vez definido, el objetivo de 90 días queda fijo (nace del Mapa y no se cambia). La
   * hoja lo muestra de solo lectura y lo único que se escribe es cuánto lleva la persona.
   */
  const objetivoFijo = rocaAbierta != null;
  /** Fijo y sin número (Relaciones, por ejemplo): no hay nada que anotar, así que no hay botón. */
  const sinAvanceQueAnotar = objetivoFijo && rocaAbierta.meta == null;
  /** Spec 026: un objetivo del diagnóstico sin confirmar no pide «anotar avance» sino revisarlo y confirmarlo (una vez). */
  const abiertaPorConfirmar = estaPorConfirmar(rocaAbierta);

  /* El objetivo de ESTE MES para el eje abierto, calculado por el servidor (ver la cabecera de
     `api/planMensualApi.ts`). */
  const planMensual = usePlanMensual();
  const mesDelEjeAbierto = planMensual.mesEnCursoDe(ejeAbierto);
  const planDelEjeAbierto = planMensual.porEje.get(ejeAbierto);
  /* El mes del separador de la ruta: el mismo bloque de cuatro semanas que ya nombra «Planificar mi mes». */
  const numeroMesDeLaRuta = mesDe(diaPrograma, undefined, resumen?.duracionDias);
  const [editandoMes, setEditandoMes] = useState(false);
  /* «Planificar mi mes» (spec 028): una hoja opcional con los tres meses del programa. `pedidoDeOrganizar` le avisa a `PlanDelEje` que la
     persona tocó su semana ahí adentro: abre «Organizar mi semana» de siempre cuando la hoja ya se fue. */
  const [planificandoMes, setPlanificandoMes] = useState(false);
  const [pedidoDeOrganizar, setPedidoDeOrganizar] = useState(0);

  /* Los objetivos que nacieron del diagnóstico y esperan confirmación (spec 026): tarjeta arriba y hoja para revisarlos. */
  const pendientes = useMemo(() => rocasPorConfirmar(objetivos.rocas, ejesOrdenados), [objetivos.rocas, ejesOrdenados]);
  const [revisando, setRevisando] = useState(false);
  const confirmarObjetivos = async (items: ObjetivoParaConfirmar[]) => {
    const resultado = await objetivos.confirmar(items);
    if (resultado.ok) {
      setRevisando(false);
      confirmar(`Tus objetivos de ${plazo} quedaron confirmados.`);
    }
    return resultado;
  };

  const cifraDelMesAbierto =
    mesDelEjeAbierto?.cifra != null && planDelEjeAbierto
      ? cifraEscrita(mesDelEjeAbierto.cifra, planDelEjeAbierto.unidad, planDelEjeAbierto.unidadAdelante)
      : null;

  /* La misma cifra, un escalón más abajo: lo que falta del mes repartido entre las semanas que
     quedan, recalculado contra el avance real. */
  const cifraDeLaSemanaAbierta =
    planDelEjeAbierto?.semana
      ? cifraEscrita(planDelEjeAbierto.semana.cifra, planDelEjeAbierto.unidad, planDelEjeAbierto.unidadAdelante)
      : null;

  /**
   * Cambiar de eje sin salir de Objetivos (2026-10-05, decisión del dueño). Antes, para pasar de
   * Cuerpo a Negocio había que volver a Plan y tocar la otra tarjeta. La confirmación de un guardado
   * se va con el eje: hablaba del otro objetivo.
   */
  const cambiarEje = (eje: EjeObjetivo) => {
    setEjeElegido(eje);
    setConfirmacion(null);
  };

  /**
   * Entrada desde la alarma de una acción con hora (D-218, 2026-09-28): la deja `AbridorDeAvisos` con
   * `abrirObjetivosEje` (y la fecha de la acción). Se consume una vez, como `abrirEventoId` en
   * Comunidad. Sin eje, se abre el que estaba.
   */
  const route = useRoute();
  const navigation = useNavigation();
  /* Spec 031: el aviso «tu análisis está listo» deja `abrirOchentaVeinte` (SEMANA o MES). Se consume una vez; la hoja se abre en cuanto
     el Plan del eje está montado (con el Mapa activo). */
  const [ochentaVeinteAlAbrir, setOchentaVeinteAlAbrir] = useState<'SEMANA' | 'MES' | null>(null);
  useEffect(() => {
    const params = route.params as { abrirOchentaVeinte?: 'SEMANA' | 'MES' } | undefined;
    if (!params?.abrirOchentaVeinte) return;
    setOchentaVeinteAlAbrir(params.abrirOchentaVeinte === 'MES' ? 'MES' : 'SEMANA');
    (navigation as unknown as { setParams: (p: Record<string, unknown>) => void }).setParams({ abrirOchentaVeinte: undefined });
  }, [route.params, navigation]);
  useEffect(() => {
    const params = route.params as { abrirObjetivosFecha?: string; abrirObjetivosEje?: EjeObjetivo | null } | undefined;
    if (!params?.abrirObjetivosFecha) return;
    if (params.abrirObjetivosEje) setEjeElegido(params.abrirObjetivosEje);
    (navigation as unknown as { setParams: (p: Record<string, unknown>) => void })
      .setParams({ abrirObjetivosFecha: undefined, abrirObjetivosEje: undefined });
  }, [route.params, navigation]);

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (revisando) {
      setRevisando(false);
      return true;
    }
    return false;
  }, revisando);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  /**
   * Abre el editor del objetivo de 90 días del eje que se está mirando. Prellena con lo guardado; si
   * el aprendiz todavía no lo definió, los campos arrancan vacíos.
   */
  const openEditGoalModal = (_eje: EjeObjetivo = ejeAbierto) => {
    setEditGoalModalVisible(true);
  };

  /**
   * «Escribir mis objetivos» (la semana está bloqueada hasta tener los tres de 90 días): abre el editor del primer eje, en el
   * orden de la pantalla, que todavía no tiene objetivo. Sin Mapa ni diagnóstico, así se llega a ellos (spec 026).
   */
  const definirObjetivos = () => {
    const faltante = ejesOrdenados.find(eje => rocaDeEje(eje) == null);
    if (!faltante) return;
    if (faltante !== ejeAbierto) cambiarEje(faltante);
    openEditGoalModal(faltante);
  };

  /** Un guardado que el servidor rechazó: su mensaje tal cual (el de `ROCA_MAESTRA_FIJA` incluido). */
  const avisarGuardadoFallido = (resultado: { mensaje: string }) => {
    Alert.alert('No se pudo guardar', resultado.mensaje);
  };

  /**
   * Guarda lo que armó `HojaDelObjetivo` con el mismo pedido de siempre (`PUT /api/v1/rocks/master/{eje}`): el objetivo nuevo en tres pasos
   * o, con el objetivo ya fijo (D-234), solo el avance nuevo. Si el servidor lo rechaza (`409 ROCA_MAESTRA_FIJA`, un 400), su mensaje se
   * muestra tal cual. Dice si quedó guardado.
   */
  const guardarDesdeLaHoja = async (definicion: DefinicionRocaMaestra): Promise<boolean> => {
    const eraFijo = objetivoFijo;
    const resultado = await objetivos.definir(ejeAbierto, definicion);
    if (!resultado.ok) {
      avisarGuardadoFallido(resultado);
      return false;
    }
    setEditGoalModalVisible(false);
    confirmar(eraFijo ? 'Tu avance quedó anotado.' : `Tu objetivo de ${plazo} quedó guardado.`);
    return true;
  };

  // `principalPercent` se eliminó: el porcentaje lo calcula el backend y viaja en la respuesta, para
  // que no haya dos versiones de la misma regla (incluido el tope al 100 %).

  const cierreDelDia = user?.id ? (
    <CierreEnPlan
      cuentaId={llaveDeLasVistas(user.id, formacionDeLaSesion)}
      diaPrograma={diaPrograma > 0 ? diaPrograma : null}
      habitosHoy={resumen?.habitosHoy ?? null}
      ejeDe={ejeDeLaAccion}
      puedeVerManana
      onVerManana={verMananaEnPlan}
    />
  ) : null;

  const estiloDelContenido = [
    styles.content,
    {
      paddingHorizontal: horizontalPadding,
      maxWidth: contentMaxWidth,
      alignSelf: isTablet ? ('center' as const) : ('stretch' as const),
      width: isTablet ? ('100%' as const) : undefined,
    },
  ];
  return (
    <PlazoDelObjetivoProvider duracionDias={resumen?.duracionDias} formacion={resumen?.formacion}>
    <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Cabecera (2026-10-31, pedido del dueño: «en Plan replica este formato»): «Plan» grande y debajo, en dorado, la dirección
          de los 90 días. La maqueta traía una diana arriba a la derecha: no se dibuja, no tiene una acción clara. */}
      {rutaActiva ? (
        /* Como ruta: «Plan» con el engranaje, sin subtítulo (FR-003). */
        <ScreenHeader title="Plan" right="settings" onPressRight={() => setPedidoDeAjustes(n => n + 1)} etiquetaRight="Planifica tus objetivos" />
      ) : (
        <>
          <ScreenHeader title="Plan" />
          <Text style={[t.body, { color: c.goldInk, paddingHorizontal: horizontalPadding, marginTop: -2 }]}>{`Tu dirección en ${plazo}`}</Text>
        </>
      )}

      <ScrollView
        {...barraAlDesplazar}
        ref={scrollRef}
        innerViewRef={interiorRef as React.RefObject<View>}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estiloDelContenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pantalla}>
          {/* El programa propio, arriba de todo y sin hueco cuando no hay nada que decir (el hook ya sabe si hay fila). Sin programa propio el
              estado vacío ya trae su botón «Empezar mañana»: la fila solo queda si hubo un fallo al comprobar y hay que reintentar. */}
          {programaPropio.visible && (!sinProgramaPropio || programaPropio.error !== null) ? <FilaDelProgramaPropio programa={programaPropio} /> : null}

          {sinProgramaPropio ? (
            <PlanSinPrograma alElegirDiaUno={programaPropio.alElegirDiaUno} />
          ) : (
            <>
          {/* Spec 026: mientras haya objetivos del diagnóstico por confirmar, lo primero es revisarlos. Al confirmarlos desaparece. */}
          {pendientes.length > 0 ? <TarjetaRevisaTusObjetivos cantidad={pendientes.length} alRevisar={() => setRevisando(true)} /> : null}

          {/* El eje elegido manda sobre todo lo de abajo; el de la prioridad principal de la persona va primero. */}
          <ControlSegmentado
            opciones={ejesOrdenados.map(eje => ({
              valor: eje,
              etiqueta: ETIQUETA_CORTA_EJE[eje],
              accessibilityLabel: ETIQUETA_EJE[eje],
              icono: iconoDelEje(eje),
            }))}
            valor={ejeAbierto}
            onCambiar={cambiarEje}
            achicarTexto
            accessibilityLabel="Eje de tu plan"
          />

          {!rutaActiva ? (
          <>
          {/* c. El objetivo de 90 días. Los «…» abren la hoja de siempre: escribir el objetivo (si falta) o anotar el avance
              (si ya quedó fijo, D-234). Sin avance que anotar no se dibujan. */}
          <TarjetaDelObjetivo
            roca={rocaAbierta}
            cargando={objetivos.cargando}
            error={objetivos.error}
            cifraDelMes={cifraDelMesAbierto}
            alAbrirOpciones={abiertaPorConfirmar ? () => setRevisando(true) : sinAvanceQueAnotar ? undefined : () => openEditGoalModal()}
            alCambiarElMes={() => setEditandoMes(true)}
          />

          <BotonPlanificarMes mesEnCurso={resumen ? etiquetaDelMes(mesDe(diaPrograma, undefined, resumen?.duracionDias), resumen?.duracionDias) : null} onPress={() => setPlanificandoMes(true)} />
          </>
          ) : (
          <>
          <LineaDeLaMeta
            roca={rocaAbierta}
            cargando={objetivos.cargando}
            error={objetivos.error}
            plazo={plazo}
            alTocar={abiertaPorConfirmar ? () => setRevisando(true) : sinAvanceQueAnotar ? undefined : () => openEditGoalModal()}
          />
          <SeparadorDelMes
            etiqueta={
              resumen
                ? etiquetaDelSeparadorDelMes(numeroMesDeLaRuta, objetivoCortoDelMes(planDelEjeAbierto?.meses.find(m => m.numeroMes === numeroMesDeLaRuta), planDelEjeAbierto))
                : null
            }
            alTocar={() => setPlanificandoMes(true)}
          />
          </>
          )}

          {confirmacion && (
            <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
          )}

          {/* d a g: «Esta semana», «Acciones que mueven la meta», «Tu 80/20» y «Organizar mi semana ›». */}
          <PlanDelEje
            maestras={objetivos.rocas}
            numeroSemana={semanaDe(diaPrograma, undefined, resumen?.duracionDias)}
            diaPrograma={diaPrograma}
            duracionDias={resumen?.duracionDias}
            ejeAbierto={ejeAbierto}
            objetivoSugeridoDe={planMensual.objetivoSugeridoDe}
            accionSugerida={accionSugerida}
            onDefinirObjetivos={definirObjetivos}
            pedidoDeOrganizar={pedidoDeOrganizar}
            cierre={cierreDelDia}
            registrarLasAcciones={accionesRef}
            abrirOchentaVeinte={ochentaVeinteAlAbrir}
            alAbrirOchentaVeinte={() => setOchentaVeinteAlAbrir(null)}
            pedidoDeAjustes={pedidoDeAjustes}
            ruta={
              rutaActiva
                ? {
                    numeroMes: numeroMesDeLaRuta,
                    planDelEje: planDelEjeAbierto,
                    etiquetaDelMes: resumen ? etiquetaDelMes(numeroMesDeLaRuta, resumen?.duracionDias) : null,
                    onPlanificarMes: () => setPlanificandoMes(true),
                  }
                : undefined
            }
          />
            </>
          )}
        </View>
      </ScrollView>

      {/* HOJA: REVISAR Y CONFIRMAR LOS OBJETIVOS QUE NACIERON DEL DIAGNÓSTICO (spec 026) */}
      <HojaConfirmarObjetivos
        visible={revisando && pendientes.length > 0}
        pendientes={pendientes}
        guardando={objetivos.guardando}
        alCerrar={() => setRevisando(false)}
        alConfirmar={confirmarObjetivos}
      />

      {/* HOJA: EL OBJETIVO DE 90 DÍAS en tres pasos, o «Anota tu avance» si ya quedó fijo (spec 058 FR-015). */}
      <HojaDelObjetivo
        visible={editGoalModalVisible}
        alCerrar={() => setEditGoalModalVisible(false)}
        eje={ejeAbierto}
        roca={rocaAbierta}
        plazo={plazo}
        duracionDias={resumen?.duracionDias}
        guardando={objetivos.guardando}
        alGuardar={guardarDesdeLaHoja}
      />

      {/* HOJA: PLANIFICAR MI MES (spec 028): el objetivo de cada mes del programa y sus semanas */}
      <PlanDelMesModal
        visible={planificandoMes}
        alCerrar={() => setPlanificandoMes(false)}
        eje={ejeAbierto}
        diaPrograma={diaPrograma}
        duracionDias={resumen?.duracionDias}
        maestras={objetivos.rocas}
        planMensual={planMensual}
        onOrganizarSemana={() => setPedidoDeOrganizar(n => n + 1)}
      />

      {/* HOJA: CORREGIR A MANO EL OBJETIVO DEL MES */}
      <EditarObjetivoDelMesModal
        visible={editandoMes}
        mes={mesDelEjeAbierto}
        unidad={planDelEjeAbierto?.unidad ?? ''}
        guardando={planMensual.guardando}
        onCerrar={() => setEditandoMes(false)}
        onGuardar={async cifra => {
          if (!mesDelEjeAbierto) return;
          /* El título es obligatorio en el servidor y acá no se pide: este tramo es un número, no
             una frase. Se arma con el rótulo que ya usa la tarjeta. */
          const resultado = await planMensual.guardarMes(ejeAbierto, mesDelEjeAbierto.numeroMes, {
            titulo: `Objetivo del mes ${mesDelEjeAbierto.numeroMes}`,
            cifra,
            unidad: planDelEjeAbierto?.unidad ?? '',
          });
          setEditandoMes(false);
          if (!resultado.ok) Alert.alert('El objetivo de este mes', resultado.mensaje);
        }}
      />
    </SafeAreaView>
    </PlazoDelObjetivoProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
  },
  /** El eje elegido, su objetivo y lo de la semana: tarjetas una debajo de otra, con aire entre ellas. */
  pantalla: { gap: 14, paddingTop: 12, paddingBottom: 28 },
});
