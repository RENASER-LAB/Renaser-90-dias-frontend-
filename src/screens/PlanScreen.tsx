import { fuentes } from '../theme/fuentes';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
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
import { GoldButton } from '../components/GoldButton';
import { ControlSegmentado } from '../components/ControlSegmentado';
import { ConfirmacionEnLinea } from '../components/ConfirmacionEnLinea';
import { HojaDesdeAbajo } from '../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { tacto } from '../utils/tacto';
import { useReducedMotion } from 'react-native-reanimated';
import { CierreEnPlan } from '../features/cierre/components/CierreEnPlan';
import { ejeDeLasAcciones } from '../features/cierre/utils/ejeDeLasAcciones';
import { useResumenHome } from '../features/home/hooks/useResumenHome';
import { FilaDelProgramaPropio } from '../features/programa/components/FilaDelProgramaPropio';
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
import { HojaConfirmarObjetivos } from '../features/objetivos/components/HojaConfirmarObjetivos';
import { TarjetaRevisaTusObjetivos } from '../features/objetivos/components/TarjetaRevisaTusObjetivos';
import { useRocasMaestras } from '../features/objetivos/hooks/useRocasMaestras';
import type { EjeObjetivo, RocaMaestraApi } from '../features/objetivos/types/objetivos.types';
import { EJES, ETIQUETA_CORTA_EJE, ETIQUETA_EJE } from '../features/objetivos/types/objetivos.types';
import { conPrincipalPrimero, usePrioridadPrincipal } from '../features/objetivos/hooks/usePrioridadPrincipal';
import { definicionConAvance, lineaObjetivoFijo } from '../features/objetivos/utils/objetivoFijo';
import { iconoDelEje } from '../features/objetivos/utils/iconoDelEje';
import { etiquetaDelMes, mesDe, semanaDe } from '../features/objetivos/utils/periodoDelPrograma';
import { estaPorConfirmar, rocasPorConfirmar, type ObjetivoParaConfirmar } from '../features/objetivos/utils/objetivosPorConfirmar';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { useOcultarBarraAlDesplazar } from '../navigation/barraAlDesplazar/BarraInferior';

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

/** Botones en tipo oración y a tamaño de lectura (`GoldButton` va en versales espaciadas por defecto). */
const TEXTO_DE_BOTON = { fontSize: 15, letterSpacing: 0 } as const;

export default function PlanScreen() {
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();

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
  /* La misma fila compacta de Hoy (2026-11-01): quien no tiene programa («Haz tu programa de 90 días»), no eligió su Día 1 o ya lo eligió y
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

  // Formulario Editar Objetivos
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalCurrentVal, setEditGoalCurrentVal] = useState('');
  const [editGoalTargetVal, setEditGoalTargetVal] = useState('');
  /** Unidad de la meta (USD, kg, clientes...). El backend la exige junto con los dos números. */
  const [editGoalUnidad, setEditGoalUnidad] = useState('');
  /**
   * Desde dónde arrancó. **Sin este campo, editar el objetivo borraba el punto de partida** y el
   * porcentaje volvía a la fórmula vieja: alguien que baja de peso pasaba de 0 % a 100 % por haber
   * corregido una palabra de su meta (E-166). Solo se escribe al definir el objetivo por primera
   * vez; después queda fijo como el resto (D-234).
   */
  const [editGoalBase, setEditGoalBase] = useState('');

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
    if (editGoalModalVisible) {
      setEditGoalModalVisible(false);
      return true;
    }
    return false;
  }, editGoalModalVisible || revisando);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  /**
   * Abre el editor del objetivo de 90 días del eje que se está mirando. Prellena con lo guardado; si
   * el aprendiz todavía no lo definió, los campos arrancan vacíos.
   */
  const openEditGoalModal = (eje: EjeObjetivo = ejeAbierto) => {
    const roca = rocaDeEje(eje);
    setEditGoalTitle(roca?.objetivo ?? '');
    setEditGoalCurrentVal(roca?.avance != null ? String(roca.avance) : '');
    setEditGoalTargetVal(roca?.meta != null ? String(roca.meta) : '');
    setEditGoalUnidad(roca?.unidad ?? '');
    // El punto de partida se muestra tal cual está guardado. Con la roca ya definida es de solo
    // lectura (D-234), así que no se propone nada: una roca vieja sin él lo muestra vacío.
    setEditGoalBase(roca?.lineaBase != null ? String(roca.lineaBase) : '');
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
   * Guarda el objetivo de 90 días contra el backend (`PUT /api/v1/rocks/master/{eje}`).
   *
   * La parte medible es opcional pero va entera: si la persona escribió una meta, se le exigen
   * también el avance y la unidad, porque el backend rechaza media meta con un 400 y es mejor
   * decírselo acá, en su idioma. Si no escribió ninguna de las tres, se guarda un objetivo
   * cualitativo, que es perfectamente válido.
   */
  const guardarObjetivoPrincipal = async () => {
    if (rocaAbierta) {
      await guardarAvance(rocaAbierta);
      return;
    }
    const meta = editGoalTargetVal.trim() === '' ? undefined : Number(editGoalTargetVal);
    const avance = editGoalCurrentVal.trim() === '' ? undefined : Number(editGoalCurrentVal);
    const unidad = editGoalUnidad.trim() === '' ? undefined : editGoalUnidad.trim();
    const lineaBase = editGoalBase.trim() === '' ? undefined : Number(editGoalBase);
    const algunNumero = meta !== undefined || avance !== undefined || unidad !== undefined;

    if (algunNumero) {
      if (meta === undefined || avance === undefined || unidad === undefined) {
        Alert.alert(
          'Falta un dato de la meta',
          'Para medir tu objetivo hacen falta las tres cosas: cuánto llevas, cuánto quieres llegar y en qué se mide (USD, kg, clientes...). Si no quieres medirlo con un número, deja los tres campos vacíos.'
        );
        return;
      }
      if (!Number.isFinite(meta) || !Number.isFinite(avance)) {
        Alert.alert('Número inválido', 'Revisa los valores: tienen que ser números.');
        return;
      }
      /**
       * **Una meta de CERO es válida** (saldar una deuda, cero cigarrillos) mientras se sepa de dónde
       * se arrancó. Se rechaza lo mismo que rechaza `MetaCuantitativa`: una meta negativa, y una de
       * cero sin punto de partida (ahí el porcentaje sería una división por cero).
       */
      if (meta < 0) {
        Alert.alert('Meta inválida', 'La meta no puede ser un número negativo.');
        return;
      }
      if (meta === 0 && lineaBase === undefined) {
        Alert.alert(
          'Falta tu punto de partida',
          'Llegar a cero es una meta válida, pero para medirla hace falta saber desde dónde arrancas. Escribe tu punto de partida.'
        );
        return;
      }
      if (avance < 0) {
        Alert.alert('Avance inválido', 'El avance no puede ser negativo.');
        return;
      }
    }

    if (lineaBase !== undefined && (!Number.isFinite(lineaBase) || lineaBase < 0)) {
      Alert.alert('Punto de partida inválido', 'Tiene que ser un número, y no puede ser negativo.');
      return;
    }
    if (lineaBase !== undefined && meta !== undefined && lineaBase === meta) {
      Alert.alert(
        'Punto de partida igual a la meta',
        'Si arrancas justo en tu meta no hay avance que medir. Revisa los dos números.'
      );
      return;
    }
    const resultado = await objetivos.definir(ejeAbierto, {
      objetivo: editGoalTitle.trim(),
      meta,
      avance,
      unidad,
      lineaBase,
    });
    if (!resultado.ok) {
      avisarGuardadoFallido(resultado);
      return;
    }
    setEditGoalModalVisible(false);
    confirmar(`Tu objetivo de ${plazo} quedó guardado.`);
  };

  /**
   * El objetivo ya está definido: se manda lo fijo tal cual está guardado y solo el avance nuevo.
   * Si el servidor igual lo rechaza (`409 ROCA_MAESTRA_FIJA`), su mensaje se muestra tal cual.
   */
  const guardarAvance = async (roca: RocaMaestraApi) => {
    const pedido = definicionConAvance(roca, editGoalCurrentVal);
    if (!pedido.ok) {
      Alert.alert(pedido.titulo, pedido.mensaje);
      return;
    }
    const resultado = await objetivos.definir(ejeAbierto, pedido.definicion);
    if (!resultado.ok) {
      avisarGuardadoFallido(resultado);
      return;
    }
    setEditGoalModalVisible(false);
    confirmar('Tu avance quedó anotado.');
  };

  const handleSaveGoal = () => {
    if (!objetivoFijo && !editGoalTitle.trim()) {
      Alert.alert('Campo requerido', 'Por favor escribe la declaración de tu objetivo.');
      return;
    }

    void guardarObjetivoPrincipal();
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
  /** Campo de la hoja del objetivo: borde, fondo y color de texto según si se puede escribir. */
  const estiloDeCampo = (editable: boolean) => [
    styles.modalInputText,
    { borderColor: c.border, backgroundColor: c.cardBgAlt, color: editable ? c.text : c.textSoft },
  ];

  return (
    <PlazoDelObjetivoProvider duracionDias={resumen?.duracionDias} formacion={resumen?.formacion}>
    <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Cabecera (2026-10-31, pedido del dueño: «en Plan replica este formato»): «Plan» grande y debajo, en dorado, la dirección
          de los 90 días. La maqueta traía una diana arriba a la derecha: no se dibuja, no tiene una acción clara. */}
      <ScreenHeader title="Plan" />
      <Text style={[t.body, { color: c.goldInk, paddingHorizontal: horizontalPadding, marginTop: -2 }]}>{`Tu dirección en ${plazo}`}</Text>

      <ScrollView
        {...barraAlDesplazar}
        ref={scrollRef}
        innerViewRef={interiorRef as React.RefObject<View>}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={estiloDelContenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pantalla}>
          {/* El programa propio, arriba de todo y sin hueco cuando no hay nada que decir (el hook ya sabe si hay fila). */}
          {programaPropio.visible ? <FilaDelProgramaPropio programa={programaPropio} /> : null}

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

          <BotonPlanificarMes mesEnCurso={resumen ? etiquetaDelMes(mesDe(diaPrograma)) : null} onPress={() => setPlanificandoMes(true)} />

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
          />
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

      {/* ========================================================================= */}
      {/* HOJA: EL OBJETIVO DE 90 DÍAS (DEFINIRLO O ANOTAR EL AVANCE)               */}
      {/* ========================================================================= */}
      {/* Hoja desde abajo (2026-10-05) en vez de la ventana centrada con «✕ Cerrar»: se cierra
          arrastrándola, tocando el fondo, con la ✕ o con atrás. Mismo contenido. `grande` porque es
          un formulario: con el teclado abierto el cuerpo se acorta y el botón queda a la vista. */}
      <HojaDesdeAbajo
        visible={editGoalModalVisible}
        alCerrar={() => setEditGoalModalVisible(false)}
        titulo={objetivoFijo ? `Tu objetivo de ${plazo}` : `Define tu objetivo de ${plazo}`}
        subtitulo={ETIQUETA_EJE[ejeAbierto]}
        tamano="grande"
        pie={
          <GoldButton
            label={objetivoFijo ? 'Guardar avance' : 'Guardar'}
            onPress={handleSaveGoal}
            textStyle={TEXTO_DE_BOTON}
          />
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {objetivoFijo && (
            <Text style={[t.small, { color: c.textSoft }]}>{lineaObjetivoFijo(plazo)}</Text>
          )}
          <View style={{ gap: 6 }}>
            <Text style={[t.small, styles.etiquetaDeCampo, { color: c.textSoft }]}>Tu objetivo</Text>
            <TextInput
              value={editGoalTitle}
              onChangeText={setEditGoalTitle}
              editable={!objetivoFijo}
              placeholder="Escribe tu objetivo aquí"
              placeholderTextColor={c.tabInactive}
              multiline
              style={[estiloDeCampo(!objetivoFijo), { minHeight: 72, textAlignVertical: 'top' }]}
            />
          </View>

          {/* Rejilla 2x2: con los campos a tamaño de lectura, cuatro en una fila de teléfono dejan
              ~48 px de texto útil cada uno. Los ejemplos van en gris tenue y con «Ej.:», para que
              no se lean como un valor ya escrito (antes «82», «30000» y «USD» en dorado). */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {/* PARTISTE DE es lo que hace que el porcentaje sirva en las dos direcciones (E-166). */}
            <View style={styles.celdaDeCampo}>
              <Text style={[t.small, styles.etiquetaDeCampo, { color: c.textSoft }]}>Partiste de</Text>
              <TextInput
                value={editGoalBase}
                onChangeText={setEditGoalBase}
                editable={!objetivoFijo}
                keyboardType="numeric"
                placeholder="Ej.: 82"
                placeholderTextColor={c.tabInactive}
                style={estiloDeCampo(!objetivoFijo)}
              />
            </View>
            <View style={styles.celdaDeCampo}>
              <Text style={[t.small, styles.etiquetaDeCampo, { color: c.textSoft }]}>Vas en</Text>
              <TextInput
                value={editGoalCurrentVal}
                onChangeText={setEditGoalCurrentVal}
                keyboardType="numeric"
                placeholder="Ej.: 0"
                placeholderTextColor={c.tabInactive}
                style={[estiloDeCampo(true), { color: c.goldInk }]}
              />
            </View>
            <View style={styles.celdaDeCampo}>
              <Text style={[t.small, styles.etiquetaDeCampo, { color: c.textSoft }]}>Meta</Text>
              <TextInput
                value={editGoalTargetVal}
                onChangeText={setEditGoalTargetVal}
                editable={!objetivoFijo}
                keyboardType="numeric"
                placeholder="Ej.: 30000"
                placeholderTextColor={c.tabInactive}
                style={estiloDeCampo(!objetivoFijo)}
              />
            </View>
            {/* La unidad no es fija en dólares: kg, horas, clientes. El backend la exige con los números. */}
            <View style={styles.celdaDeCampo}>
              <Text style={[t.small, styles.etiquetaDeCampo, { color: c.textSoft }]}>Unidad</Text>
              <TextInput
                value={editGoalUnidad}
                onChangeText={setEditGoalUnidad}
                editable={!objetivoFijo}
                placeholder="Ej.: USD"
                placeholderTextColor={c.tabInactive}
                maxLength={20}
                autoCapitalize="none"
                style={estiloDeCampo(!objetivoFijo)}
              />
            </View>
          </View>
          {!objetivoFijo && (
            <Text style={[t.small, { color: c.micro }]}>
              Si tu objetivo no se mide con un número, deja los tres campos vacíos.
            </Text>
          )}
        </ScrollView>
      </HojaDesdeAbajo>

      {/* HOJA: PLANIFICAR MI MES (spec 028): el objetivo de cada mes del programa y sus semanas */}
      <PlanDelMesModal
        visible={planificandoMes}
        alCerrar={() => setPlanificandoMes(false)}
        eje={ejeAbierto}
        diaPrograma={diaPrograma}
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
  etiquetaDeCampo: {
    fontFamily: fuentes.media,
    fontSize: 14,
  },
  celdaDeCampo: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 6,
  },
  /* 15 px y 48 px de alto: lo escribe gente de 40 a 60 años en su teléfono (AGENTS.md §4). */
  modalInputText: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
  },
});
