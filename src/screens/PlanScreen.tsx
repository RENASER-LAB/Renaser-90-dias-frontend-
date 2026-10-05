import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDES_DE_UNA_PESTANA } from '../navigation/bordesDeUnaPestana';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArcoDelDia } from '../features/programa/components/ArcoDelDia';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, Row, RowBetween, ScreenHeader } from '../components/ui';
import { Icon, TAMANO_ICONO } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { Presionable } from '../components/Presionable';
import { ControlSegmentado } from '../components/ControlSegmentado';
import { ConfirmacionEnLinea } from '../components/ConfirmacionEnLinea';
import { HojaDesdeAbajo } from '../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { tacto } from '../utils/tacto';
import { useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { descripcionDeFase } from '../features/home/hooks/useResumenHome';
import type { DiaDelPlan } from '../features/habits/utils/semanaDelPlan';
import { useMapaRenacimientoAbierto } from '../features/mapa-renacimiento/MapaRenacimientoContext';
import { cifraEscrita } from '../features/objetivos/api/planMensualApi';
import { EditarObjetivoDelMesModal } from '../features/objetivos/components/EditarObjetivoDelMesModal';
import { usePlanMensual } from '../features/objetivos/hooks/usePlanMensual';
import { NivelesDelPlan } from '../features/objetivos/components/NivelesDelPlan';
import { useRocasMaestras } from '../features/objetivos/hooks/useRocasMaestras';
import type { EjeObjetivo, RocaMaestraApi } from '../features/objetivos/types/objetivos.types';
import { EJES, ETIQUETA_CORTA_EJE, ETIQUETA_EJE } from '../features/objetivos/types/objetivos.types';
import { conPrincipalPrimero, usePrioridadPrincipal } from '../features/objetivos/hooks/usePrioridadPrincipal';
import { cifraDeEscala, cifraDelObjetivo, primeraClausula } from '../features/objetivos/utils/cifraDelObjetivo';
import { definicionConAvance, LINEA_OBJETIVO_FIJO } from '../features/objetivos/utils/objetivoFijo';
import { iconoDelEje } from '../features/objetivos/utils/iconoDelEje';
import { tramosDeLasFases } from '../features/objetivos/utils/arquitecturaDeTiempo';
import {
  SEMANAS_DEL_PROGRAMA,
  etiquetaDelMes,
  mesDe,
  semanaDe,
} from '../features/objetivos/utils/periodoDelPrograma';
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
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  const gaugeW = rs(228);
  const gaugeH = rs(120);

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  const [activeSubView, setActiveSubView] = useState<'main' | 'objetivos'>('main');
  /* Al cambiar de sub-vista la barra de pestañas vuelve a la vista (ver `navigation/barraAlDesplazar`). */
  const barraAlDesplazar = useOcultarBarraAlDesplazar({ vista: activeSubView });

  // Dia real del programa: antes el 37, el arco y la fase estaban escritos a mano.
  const { diaPrograma, fase, loading: cargandoDiaPrograma } = useProgramaDia();

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
  const faseActual = descripcionDeFase(fase);
  /* `null` mientras la carga no termina o el programa no arranco (dia 0): la arquitectura de
     tiempo no debe mostrar avance inventado, igual que Hoy no muestra un dia que no sabe. */
  const diaConocido = cargandoDiaPrograma || diaPrograma <= 0 ? null : diaPrograma;
  /**
   * «Arquitectura de tiempo»: las cuatro fases con su largo real (2026-10-05, decisión del dueño).
   *
   * > **Corregido 2026-10-05.** Dibujaba tres tramos parejos de 30 días (1–30 / 31–60 / 61–90)
   * > justo debajo de «Fase actual · 02 · Días 8–34». El 2026-09-14 se les había quitado el nombre
   * > («FUNDACIÓN / ACELERACIÓN / EXPANSIÓN», inventados) pero seguían siendo una segunda partición
   * > de los 90 días que no existe en el método. El dueño eligió las fases: salen de `FASES_EN_ORDEN`,
   * > la misma fuente que el rótulo de arriba, y la que está en curso la marca el backend.
   */
  const tramos = useMemo(() => tramosDeLasFases(diaConocido, fase), [diaConocido, fase]);
  const faseEnCurso = tramos.find(tramo => tramo.estado === 'en_curso') ?? null;

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

  // Sin las tres rocas maestras, el backend cierra la planificación semanal con 403 ROCKS_LOCKED, y
  // quien las escribe es el Mapa de Renacimiento. Por eso ese estado no ofrece "reintentar" sino la
  // puerta al Mapa: es lo único que destraba la cadena.
  const { abrir: abrirMapa } = useMapaRenacimientoAbierto();
  /** El eje que se está mirando. */
  const [ejeAbierto, setEjeAbierto] = useState<EjeObjetivo>(EJE_POR_DEFECTO);
  /**
   * Si se está leyendo la explicación de los tres niveles.
   *
   * Arranca cerrada (2026-09-21, pedido del dueño): lo primero que tiene que verse al entrar es el
   * objetivo y su avance, no cómo funciona el sistema. La explicación no se borró — está a un toque.
   */
  const [explicacionNivelesAbierta, setExplicacionNivelesAbierta] = useState(false);
  const rocaDeEje = (eje: EjeObjetivo) => objetivos.deEje(eje);
  const rocaAbierta = objetivos.deEje(ejeAbierto);
  /**
   * D-234: una vez definido, el objetivo de 90 días queda fijo (nace del Mapa y no se cambia). La
   * hoja lo muestra de solo lectura y lo único que se escribe es cuánto lleva la persona.
   */
  const objetivoFijo = rocaAbierta != null;
  /** Fijo y sin número (Relaciones, por ejemplo): no hay nada que anotar, así que no hay botón. */
  const sinAvanceQueAnotar = objetivoFijo && rocaAbierta.meta == null;

  /**
   * El eje que la persona eligió como principal en el paso 2 del Mapa, y los tres con ese adelante
   * (pedido del cliente el 2026-09-14). Sin prioridad guardada, `conPrincipalPrimero` devuelve el
   * orden de siempre.
   */
  const { ejePrincipal, relacionesBase, relacionesMeta } = usePrioridadPrincipal();

  /* El objetivo de ESTE MES para el eje abierto, calculado por el servidor (ver la cabecera de
     `api/planMensualApi.ts`). */
  const planMensual = usePlanMensual();
  const mesDelEjeAbierto = planMensual.mesEnCursoDe(ejeAbierto);
  const planDelEjeAbierto = planMensual.porEje.get(ejeAbierto);
  const [editandoMes, setEditandoMes] = useState(false);

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
  const ejesOrdenados = useMemo(() => conPrincipalPrimero(EJES, ejePrincipal), [ejePrincipal]);

  /** Abre la vista de Objetivos en el eje pedido. Un solo camino para las tres tarjetas. */
  const abrirObjetivoDe = (eje: EjeObjetivo) => {
    setEjeAbierto(eje);
    setConfirmacion(null);
    setActiveSubView('objetivos');
  };

  /**
   * Cambiar de eje sin salir de Objetivos (2026-10-05, decisión del dueño). Antes, para pasar de
   * Cuerpo a Negocio había que volver a Plan y tocar la otra tarjeta. La confirmación de un guardado
   * se va con el eje: hablaba del otro objetivo.
   */
  const cambiarEje = (eje: EjeObjetivo) => {
    setEjeAbierto(eje);
    setConfirmacion(null);
  };

  /**
   * Entrada desde la alarma de una acción con hora (D-218, 2026-09-28): la deja `AbridorDeAvisos` con
   * `abrirObjetivosEje` (y la fecha de la acción). Se consume una vez, como `abrirEventoId` en
   * Comunidad. Sin eje, se abre el que estaba.
   */
  const route = useRoute();
  const navigation = useNavigation();
  useEffect(() => {
    const params = route.params as { abrirObjetivosFecha?: string; abrirObjetivosEje?: EjeObjetivo | null } | undefined;
    if (!params?.abrirObjetivosFecha) return;
    if (params.abrirObjetivosEje) setEjeAbierto(params.abrirObjetivosEje);
    setActiveSubView('objetivos');
    (navigation as unknown as { setParams: (p: Record<string, unknown>) => void })
      .setParams({ abrirObjetivosFecha: undefined, abrirObjetivosEje: undefined });
  }, [route.params, navigation]);

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (editGoalModalVisible) {
      setEditGoalModalVisible(false);
      return true;
    }
    if (activeSubView !== 'main') {
      setActiveSubView('main');
      return true;
    }
    return false;
  }, activeSubView !== 'main' || editGoalModalVisible);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  /**
   * Abre el editor del objetivo de 90 días del eje que se está mirando. Prellena con lo guardado; si
   * el aprendiz todavía no lo definió, los campos arrancan vacíos.
   */
  const openEditGoalModal = () => {
    setEditGoalTitle(rocaAbierta?.objetivo ?? '');
    setEditGoalCurrentVal(rocaAbierta?.avance != null ? String(rocaAbierta.avance) : '');
    setEditGoalTargetVal(rocaAbierta?.meta != null ? String(rocaAbierta.meta) : '');
    setEditGoalUnidad(rocaAbierta?.unidad ?? '');
    // El punto de partida se muestra tal cual está guardado. Con la roca ya definida es de solo
    // lectura (D-234), así que no se propone nada: una roca vieja sin él lo muestra vacío.
    setEditGoalBase(rocaAbierta?.lineaBase != null ? String(rocaAbierta.lineaBase) : '');
    setEditGoalModalVisible(true);
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
      Alert.alert('No se pudo guardar', resultado.mensaje);
      return;
    }
    setEditGoalModalVisible(false);
    confirmar('Tu objetivo de 90 días quedó guardado.');
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
      Alert.alert('No se pudo guardar', resultado.mensaje);
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
    <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="PLAN" />

      {/* ========================================================================= */}
      {/* VISTA 1: PANTALLA PRINCIPAL DE PLAN                                       */}
      {/* ========================================================================= */}
      {activeSubView === 'main' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estiloDelContenido}
          showsVerticalScrollIndicator={false}
        >
          {/* Una línea y en tipo oración (2026-10-05, decisión del dueño: acortar textos). Debajo
              iba además el lema «Enfocado. Estratégico. Real.», que no decía nada de la persona. */}
          <Text style={[t.body, { color: c.textSoft, paddingTop: 6 }]}>Tu mapa de los próximos 90 días</Text>

          {/* GAUGE DE 90 DÍAS — se llena desde el día 0 hasta el actual al entrar (ArcoDelDia). */}
          <ArcoDelDia dia={diaPrograma} ancho={gaugeW} alto={gaugeH} />

          {/* FASE ACTUAL — la que dice el backend. Apilado: los nombres de fase son largos
              («Sistema de Alto Rendimiento») y en una fila se espachurraban. */}
          <View style={styles.section}>
            <MicroLabel>Fase actual</MicroLabel>
            {faseActual ? (
              <View style={{ marginTop: 12, gap: 4 }}>
                <Row gap={10} align="baseline">
                  <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                    {String(faseActual.numero).padStart(2, '0')}
                  </Text>
                  <Text style={[t.small, { color: c.micro }]}>{faseActual.rango}</Text>
                </Row>
                <Text style={[t.cardTitle, { color: c.text, fontSize: 20, lineHeight: 27 }]}>
                  {faseActual.nombre}
                </Text>
              </View>
            ) : (
              <Text style={[t.body, { color: c.textSoft, marginTop: 12 }]}>
                {cargandoDiaPrograma ? 'Cargando tu fase…' : 'Tu fase aparece cuando arranque tu programa.'}
              </Text>
            )}
          </View>

          {/* PRIORIDADES CLAVE */}
          <View style={styles.section}>
            <MicroLabel>Prioridades clave</MicroLabel>
            {EJES.some(eje => !rocaDeEje(eje)?.objetivo?.trim()) && (
              <Text style={[t.small, { color: c.textSoft, marginTop: 6 }]}>
                Toca cada una para escribir tu objetivo.
              </Text>
            )}
            <View style={{ marginTop: 12, gap: 10 }}>
              {/* **Lo que se lee es el objetivo del aprendiz, no un título de catálogo** (D-120).
                  Cada eje con su ícono (2026-10-05): antes «01 / 02 / 03», un número que no decía
                  de qué era la tarjeta y que además cambiaba con la prioridad principal. */}
              {ejesOrdenados.map(eje => {
                const roca = rocaDeEje(eje);
                const definido = Boolean(roca?.objetivo?.trim());
                const esPrincipal = eje === ejePrincipal;
                /* Relaciones no tiene meta cuantitativa en su Roca —su escala 1-10 no es una
                   unidad de negocio— asi que su cifra sale de las respuestas del Mapa. */
                const cifra =
                  eje === 'RELACIONES' ? cifraDeEscala(relacionesBase, relacionesMeta) : cifraDelObjetivo(roca);
                const avance = roca?.porcentaje ?? null;
                return (
                  <Presionable
                    key={eje}
                    onPress={() => abrirObjetivoDe(eje)}
                    accessibilityRole="button"
                    accessibilityLabel={`${ETIQUETA_EJE[eje]}${esPrincipal ? ', tu prioridad principal' : ''}. ${
                      definido ? cifra ?? roca!.objetivo : 'Todavía sin definir'
                    }`}
                    style={[
                      styles.priorityCard,
                      {
                        // Lo que distingue a la principal es el color del contorno y su distintivo.
                        borderColor: esPrincipal ? c.gold : c.border,
                        backgroundColor: esPrincipal ? c.cardBgAlt : c.cardBg,
                      },
                    ]}
                  >
                    <Icon name={iconoDelEje(eje)} size={TAMANO_ICONO.normal} color={c.goldInk} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Row gap={8}>
                        <Text style={[t.small, styles.rotulo, { color: c.goldInk }]}>{ETIQUETA_EJE[eje]}</Text>
                        {esPrincipal && (
                          <View style={[styles.insigniaPrincipal, { backgroundColor: c.goldWash }]}>
                            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 12, lineHeight: 16 }]}>
                              Principal
                            </Text>
                          </View>
                        )}
                      </Row>

                      {!definido ? (
                        <Text style={[t.body, { color: c.textSoft }]}>Todavía sin definir</Text>
                      ) : cifra ? (
                        /* Con meta medible manda el NÚMERO: de dónde partió y a dónde va. `flexShrink`
                           + dos líneas: una cifra grande con unidad larga no se corta justo en el dato. */
                        <Row gap={8} style={{ alignItems: 'baseline' }}>
                          <Text
                            style={[
                              t.metric,
                              { color: c.textStrong, fontSize: 19, fontFamily: 'Jost_700Bold', flexShrink: 1 },
                            ]}
                            numberOfLines={2}
                          >
                            {cifra}
                          </Text>
                          {avance !== null && (
                            <Text
                              style={[
                                t.metric,
                                { color: c.goldInk, fontSize: 12, fontFamily: 'Jost_500Medium', flexShrink: 0 },
                              ]}
                            >
                              {avance}%
                            </Text>
                          )}
                        </Row>
                      ) : (
                        /* Sin números (Relaciones): el objetivo en dos líneas, antes que inventar una
                           barra de avance sin con qué medirla (decisión del dueño, 2026-09-14). */
                        <Text style={[t.body, { color: c.textStrong }]} numberOfLines={2}>
                          {primeraClausula(roca!.objetivo)}
                        </Text>
                      )}

                      {cifra && avance !== null && (
                        <View style={[styles.barraObjetivo, { backgroundColor: c.border }]}>
                          <View
                            style={[
                              styles.barraObjetivoRelleno,
                              { backgroundColor: c.gold, width: `${Math.max(0, Math.min(100, avance))}%` },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                    <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
                  </Presionable>
                );
              })}
            </View>
          </View>

          {/* ARQUITECTURA DE TIEMPO — las cuatro fases, cada una del largo que tiene. */}
          <View style={[styles.section, { flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }]}>
            <MicroLabel>Arquitectura de tiempo</MicroLabel>
            <View
              style={styles.rielDeFases}
              accessible
              accessibilityLabel={
                faseEnCurso && diaConocido !== null
                  ? `Fase ${faseEnCurso.numero} de ${tramos.length}, día ${diaConocido} de 90`
                  : `Las ${tramos.length} fases del programa`
              }
            >
              {tramos.map(tramo => (
                <View key={tramo.clave} style={[estiloTramo.riel, { flex: tramo.dias, backgroundColor: c.border }]}>
                  <View style={[estiloTramo.relleno, { backgroundColor: c.gold, width: `${tramo.avance * 100}%` }]} />
                </View>
              ))}
            </View>
            <View style={{ marginTop: 14, gap: 8 }}>
              {tramos.map(tramo => {
                const enCurso = tramo.estado === 'en_curso';
                const estado = enCurso ? ', en curso' : tramo.estado === 'cumplida' ? ', cumplida' : '';
                return (
                  <View
                    key={tramo.clave}
                    style={styles.filaDeFase}
                    accessible
                    accessibilityLabel={`Fase ${tramo.numero}, ${tramo.nombre}, ${tramo.rango.toLowerCase()}${estado}`}
                  >
                    <Text style={[t.small, styles.cifras, styles.numeroDeFase, { color: enCurso ? c.goldInk : c.micro }]}>
                      {String(tramo.numero).padStart(2, '0')}
                    </Text>
                    <Text
                      style={[
                        t.body,
                        {
                          flex: 1,
                          color: enCurso ? c.textStrong : c.textSoft,
                          fontFamily: enCurso ? 'Jost_500Medium' : 'Jost_400Regular',
                        },
                      ]}
                    >
                      {tramo.nombre}
                    </Text>
                    <Text style={[t.small, styles.cifras, { color: enCurso ? c.goldInk : c.micro }]}>{tramo.rango}</Text>
                    <View style={styles.marcaDeFase}>
                      {tramo.estado === 'cumplida' ? (
                        <Icon name="checkCircle" size={TAMANO_ICONO.chico} color={c.goldInk} />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: OBJETIVOS (TRES NIVELES) DE UN EJE                               */}
      {/* ========================================================================= */}
      {activeSubView === 'objetivos' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estiloDelContenido}
          showsVerticalScrollIndicator={false}
        >
          {/* Volver con la flecha de 24 en 48 y el título «Objetivos» (2026-10-05). Antes: «← VOLVER A
              PLAN» en versales y la píldora «02. OBJETIVOS (3 NIVELES)», migas de una sub-vista
              «01» que ya no se puede abrir.
              > **Corregido el mismo día.** El título era el nombre del eje («← Cuerpo»), que el
              > segmentado de abajo repetía; el dueño eligió «Objetivos» para no decirlo dos veces. */}
          <View style={styles.encabezadoObjetivos}>
            <Presionable
              onPress={() => setActiveSubView('main')}
              accessibilityRole="button"
              accessibilityLabel="Volver a Plan"
              style={styles.botonVolver}
            >
              <Icon name="arrowLeft" size={TAMANO_ICONO.grande} color={c.goldInk} />
            </Presionable>
            <Text
              accessibilityRole="header"
              style={[t.cardTitle, { color: c.textStrong, fontSize: 22, lineHeight: 28, flex: 1 }]}
              numberOfLines={1}
            >
              Objetivos
            </Text>
          </View>

          {/* Cambiar de eje acá mismo (decisión del dueño, 2026-10-05). Mismo orden que las
              tarjetas de Plan: el principal primero. */}
          <View style={{ marginTop: 8 }}>
            <ControlSegmentado
              opciones={ejesOrdenados.map(eje => ({
                valor: eje,
                etiqueta: ETIQUETA_CORTA_EJE[eje],
                accessibilityLabel: ETIQUETA_EJE[eje],
              }))}
              valor={ejeAbierto}
              onCambiar={cambiarEje}
              accessibilityLabel="Eje de tus objetivos"
            />
          </View>

          {/* Introducción corta y el detalle detrás de «Más detalles» (2026-09-21, pedido del dueño):
              quien entra acá viene a ver su objetivo y su avance. */}
          <View style={{ marginTop: space.gap, gap: 6 }}>
            <Row align="flex-start" gap={12}>
              <Text style={[t.body, { color: c.textSoft, flex: 1, paddingTop: 10 }]}>
                De los 90 días a lo que haces hoy
              </Text>
              <Presionable
                onPress={() => setExplicacionNivelesAbierta(abierta => !abierta)}
                style={styles.verDetallesBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  explicacionNivelesAbierta
                    ? 'Ocultar cómo funcionan los tres niveles'
                    : 'Ver cómo funcionan los tres niveles'
                }
              >
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 14 }]}>
                  {explicacionNivelesAbierta ? 'Ver menos' : 'Más detalles'}
                </Text>
              </Presionable>
            </Row>
            {explicacionNivelesAbierta && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Tres niveles encadenados: el objetivo de 90 días manda sobre la semana, y la semana
                sobre lo que haces hoy.
              </Text>
            )}
          </View>

          <View style={{ gap: space.gap, marginTop: space.gap, paddingBottom: 28 }}>
            {/* 1. EL OBJETIVO DE 90 DÍAS — `flag` (la meta), no `trophy`, que es Ranking. */}
            <View style={[styles.goalCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <RowBetween style={{ gap: 8 }}>
                <Row gap={8} style={{ flex: 1 }}>
                  <Icon name="flag" size={TAMANO_ICONO.normal} color={c.goldInk} />
                  <Text style={[t.small, styles.rotulo, { color: c.goldInk, flexShrink: 1 }]}>Tu objetivo de 90 días</Text>
                </Row>
                {!sinAvanceQueAnotar && (
                  <Presionable
                    onPress={openEditGoalModal}
                    accessibilityRole="button"
                    accessibilityLabel={objetivoFijo ? 'Anotar tu avance' : 'Escribir tu objetivo de 90 días'}
                    style={[styles.editGoalBtn, { backgroundColor: c.goldWash }]}
                  >
                    <Icon name="pencil" size={TAMANO_ICONO.chico} color={c.goldInk} />
                    <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 14 }]}>
                      {objetivoFijo ? 'Avance' : 'Editar'}
                    </Text>
                  </Presionable>
                )}
              </RowBetween>

              {objetivos.cargando && !rocaAbierta ? (
                <Text style={[t.small, { color: c.textSoft, fontSize: 15, marginTop: 8 }]}>Cargando tu objetivo…</Text>
              ) : objetivos.error && !rocaAbierta ? (
                <Text style={[t.small, { color: c.danger, fontSize: 15, marginTop: 8 }]}>{objetivos.error}</Text>
              ) : !rocaAbierta ? (
                // Estado vacío real, en dos renglones (antes cuatro). Nunca un objetivo inventado.
                <Text style={[t.body, { color: c.textSoft, marginTop: 8 }]}>
                  Todavía no lo definiste. Toca Editar y escribe a dónde quieres llegar.
                </Text>
              ) : (
                <>
                  {/* Solo la primera cláusula (2026-09-22, pedido del dueño: "quiero poco texto"). */}
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, marginTop: 6, lineHeight: 24 }]}>
                    {primeraClausula(rocaAbierta.objetivo)}
                  </Text>

                  {/* La barra solo aparece si el objetivo tiene meta medible. */}
                  {rocaAbierta.porcentaje != null && (
                    <View style={{ gap: 4, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>Avance</Text>
                        <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                          {rocaAbierta.porcentaje}% cumplido
                        </Text>
                      </View>
                      <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                        <View style={[styles.progressBarFill, { width: `${rocaAbierta.porcentaje}%`, backgroundColor: c.gold }]} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={[t.small, styles.cifras, { color: c.textSoft, fontSize: 14 }]}>
                          Vas en: <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{rocaAbierta.avance} {rocaAbierta.unidad}</Text>
                        </Text>
                        <Text style={[t.small, styles.cifras, { color: c.textSoft, fontSize: 14 }]}>
                          Meta: {rocaAbierta.meta} {rocaAbierta.unidad}
                        </Text>
                      </View>
                      {/* Sin el punto de partida el porcentaje no se entiende ("¿0 % de qué?"). */}
                      {rocaAbierta.lineaBase != null && (
                        <Text style={[t.small, { color: c.micro, fontSize: 13, marginTop: 2 }]}>
                          Partiste de {rocaAbierta.lineaBase} {rocaAbierta.unidad}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {confirmacion && (
              <ConfirmacionEnLinea
                key={confirmacion.clave}
                texto={confirmacion.texto}
                onTerminar={() => setConfirmacion(null)}
              />
            )}

            {/* Dónde está parado dentro del programa. La semana es la del servidor (D-203); el
                "mes" es un bloque de 4 semanas contado desde que arrancó. Ver `periodoDelPrograma`. */}
            <View style={[styles.goalCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <Row gap={8}>
                <Icon name="calendar" size={TAMANO_ICONO.chico} color={c.goldInk} />
                <Text style={[t.small, styles.rotulo, { color: c.goldInk }]}>
                  {etiquetaDelMes(mesDe(diaPrograma))}
                </Text>
              </Row>
              <Text style={[t.body, styles.cifras, { color: c.textSoft, marginTop: 6 }]}>
                Vas por la semana {semanaDe(diaPrograma)} de {SEMANAS_DEL_PROGRAMA} · día {diaPrograma} de 90
              </Text>

              {/* LA CIFRA DEL MES (2026-09-22, autorizada por el dueño). La calcula el servidor;
                  tocarla la corrige a mano. El lápiz, en un área de 44 (antes ✏️ de 12 sin área). */}
              {cifraDelMesAbierto && (
                <Presionable
                  onPress={() => setEditandoMes(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar el objetivo de este mes"
                  style={styles.filaEsteMes}
                >
                  <Text style={[t.body, styles.cifras, { color: c.textSoft, flexShrink: 1 }]}>
                    Este mes:{' '}
                    <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{cifraDelMesAbierto}</Text>
                  </Text>
                  <View style={styles.areaDelLapiz}>
                    <Icon name="pencil" size={TAMANO_ICONO.chico} color={c.textSoft} />
                  </View>
                </Presionable>
              )}

              {/* LA CIFRA DE LA SEMANA, más chica: no compite con el mes, lo aterriza. Sin lápiz a
                  propósito: se corrige en "Armar mi semana", donde se escribe. */}
              {cifraDeLaSemanaAbierta && (
                <Text style={[t.small, styles.cifras, { color: c.micro, fontSize: 13.5, marginTop: 2 }]}>
                  Esta semana: <Text style={{ color: c.textSoft }}>{cifraDeLaSemanaAbierta}</Text>
                </Text>
              )}
            </View>

            {/* 2 y 3: la semana y el día, en `features/objetivos/components` (ciclo con estados
                propios y formularios de varios pasos). Solo se piden cuando esta vista está abierta. */}
            <NivelesDelPlan
              maestras={objetivos.rocas}
              numeroSemana={semanaDe(diaPrograma)}
              diaPrograma={diaPrograma}
              ejeAbierto={ejeAbierto}
              ejePrincipal={ejePrincipal}
              objetivoSugeridoDe={planMensual.objetivoSugeridoDe}
              onIrAlMapa={abrirMapa}
            />
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* HOJA: EL OBJETIVO DE 90 DÍAS (DEFINIRLO O ANOTAR EL AVANCE)               */}
      {/* ========================================================================= */}
      {/* Hoja desde abajo (2026-10-05) en vez de la ventana centrada con «✕ Cerrar»: se cierra
          arrastrándola, tocando el fondo, con la ✕ o con atrás. Mismo contenido. `grande` porque es
          un formulario: con el teclado abierto el cuerpo se acorta y el botón queda a la vista. */}
      <HojaDesdeAbajo
        visible={editGoalModalVisible}
        alCerrar={() => setEditGoalModalVisible(false)}
        titulo={objetivoFijo ? 'Tu objetivo de 90 días' : 'Define tu objetivo de 90 días'}
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
            <Text style={[t.small, { color: c.textSoft }]}>{LINEA_OBJETIVO_FIJO}</Text>
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
  );
}

const estiloTramo = StyleSheet.create({
  riel: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
});

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: {
    fontVariant: ['tabular-nums'],
  },
  /** Lo que separa un bloque del siguiente es el aire (`space.gapLg`), no un filete. */
  section: {
    marginTop: space.gapLg,
  },
  /**
   * Rótulo de tarjeta en tipo oración (2026-10-05). Reemplaza a los rótulos en versales espaciadas
   * («1. OBJETIVO PRINCIPAL (90 DÍAS)», «CUERPO»), que se leen como el encabezado de una web.
   */
  rotulo: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  priorityCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /** El distintivo del eje principal: relleno tenue y sin contorno. */
  insigniaPrincipal: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  barraObjetivo: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 5,
  },
  barraObjetivoRelleno: {
    height: '100%',
    borderRadius: 3,
  },
  /** Las cuatro fases en un solo riel, separadas por 4 px: cada tramo mide lo que dura su fase. */
  rielDeFases: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  filaDeFase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 28,
  },
  numeroDeFase: {
    width: 22,
    fontFamily: 'Jost_700Bold',
  },
  /** Lugar fijo para el ✓ de las fases cumplidas, para que los rangos queden alineados. */
  marcaDeFase: {
    width: 16,
    alignItems: 'center',
  },
  encabezadoObjetivos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  /** La flecha de volver: 24 en un área de 48 (AGENTS.md §1), corrida para alinearse con el texto. */
  botonVolver: {
    width: 48,
    height: 48,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  /* «Más detalles»: acción de texto al lado de la introducción, sin caja, con 44 de alto. */
  verDetallesBtn: {
    minHeight: 44,
    justifyContent: 'center',
    flexShrink: 0,
  },
  editGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  /** «Este mes: …» con su lápiz: toda la fila es el botón, de 44 de alto. */
  filaEsteMes: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginTop: 2,
  },
  areaDelLapiz: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  etiquetaDeCampo: {
    fontFamily: 'Jost_500Medium',
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
