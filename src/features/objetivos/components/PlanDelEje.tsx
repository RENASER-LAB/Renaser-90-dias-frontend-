import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { useAuth } from '../../../context/AuthContext';
import { useRocasDiarias } from '../hooks/useRocasDiarias';
import { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { CierreRocaSemanal, EjeObjetivo, ItemPlanDiario, ItemPlanSemanal, RocaDiariaApi, RocaMaestraApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { accionesDelEje, agendadasDeDiasQueVienen, avanceDeLasAcciones, unirAcciones } from '../utils/planPrincipal';
import type { SugerenciaDeAccion } from '../utils/accionesPropias';
import { semanaAPlanificar } from '../utils/periodoDelPrograma';
import { AgendarAccionesModal } from './AgendarAccionesModal';
import { PlanSemanalModal } from './PlanSemanalModal';
import { RecordatoriosDeLasAcciones, SincronizadorDeAlarmasDeLaRuta } from './RecordatoriosDeLasAcciones';
import { RevisionSemanalModal } from './RevisionSemanalModal';
import { AccionesQueMuevenLaMeta, HojaOchentaVeinte, TarjetaEstaSemana, TarjetaOchentaVeinte } from './TarjetasDelPlan';
import { ContenidoDeLaRuta } from './ContenidoDeLaRuta';
import { HojaPlanificaTusObjetivos } from './HojaPlanificaTusObjetivos';
import type { PlanMensualDelEje } from '../api/planMensualApi';
import { usePlazoDelObjetivo } from '../context/PlazoDelObjetivo';
import { fechasDeLaSemanaDelPrograma, rangoDeFechas } from '../utils/mesDelPrograma';
import { loQueViene, metaEnPocasPalabras, objetivoCortoDelMes, type ItemDeLoQueViene, type NivelDeLaRuta } from '../utils/rutaDelPlan';

/** Lo que `PlanScreen` le da a `PlanDelEje` solo cuando Plan se dibuja como ruta (spec 058). */
export interface DatosDeLaRuta {
  numeroMes: number;
  planDelEje?: PlanMensualDelEje;
  /** «Mes 1 · Semanas 1 a 4», lo de la fila «Planificar mi mes» de la hoja del engranaje. */
  etiquetaDelMes: string | null;
  onPlanificarMes: () => void;
}

/**
 * Lo de DEBAJO del objetivo de 90 días en la pantalla principal de Plan (2026-10-31): «Esta semana», «Acciones que mueven la
 * meta», «Tu 80/20» y el botón «Organizar mi semana ›». Reemplaza a `NivelesDelPlan` (que armaba `TarjetaPlanSemanal` y
 * `TarjetaAccionesDelDia`): conserva TODAS sus funciones —armar la semana, revisarla, agendar, los recordatorios de las
 * acciones— con otro formato.
 *
 * Qué abre cada cosa:
 *  - «Arma tu semana» y, sin objetivo semanal en este eje, «Organizar mi semana ›`: el asistente de la semana (`PlanSemanalModal`).
 *    El domingo arma la semana que empieza (D-203), con la misma regla de antes.
 *  - Con el eje ya armado, «Organizar mi semana ›» abre «Agendar» (`AgendarAccionesModal`): organizar la semana es repartir sus acciones.
 *  - Tocar una acción de HOY lleva a Training (`abrirAccionId`: ahí se sellan, con su evidencia); una que viene abre «Agendar».
 *  - «Cerrar este objetivo con mi revisión»: `RevisionSemanalModal`.
 *
 * Se monta una sola vez por visita a Plan: antes cada tarjeta leía por su cuenta (`GET /rocks/weekly` dos veces, `today` dos
 * veces); ahora son `weekly`, `today`, `tomorrow` y `upcoming`, una vez por foco.
 */
export function PlanDelEje({
  maestras,
  numeroSemana,
  diaPrograma,
  duracionDias,
  ejeAbierto,
  objetivoSugeridoDe,
  pedidoDeOrganizar = 0,
  cierre,
  registrarLasAcciones,
  abrirOchentaVeinte = null,
  alAbrirOchentaVeinte,
  accionSugerida = null,
  onDefinirObjetivos,
  ruta,
  pedidoDeAjustes = 0,
  metaDelMes = null,
}: {
  /** La cifra del objetivo de ESTE mes para el eje abierto (la del servidor): la vista Mes de «Tu 80/20» la compara con tu ritmo. */
  metaDelMes?: number | null;
  /** Con datos, Plan se dibuja como ruta de niveles (spec 058, `plan.ruta`); sin ellos, como siempre. */
  ruta?: DatosDeLaRuta;
  /** Un contador: cada vez que sube, se abre «Planifica tus objetivos» (el engranaje de la cabecera). */
  pedidoDeAjustes?: number;
  maestras: RocaMaestraApi[];
  numeroSemana: number;
  diaPrograma: number;
  /** La duración del programa de esta persona (90 o 365): de ella sale la última semana. Sin dato, la de siempre. */
  duracionDias?: number | null;
  ejeAbierto: EjeObjetivo;
  objetivoSugeridoDe: (eje: EjeObjetivo) => string;
  /**
   * Un contador: cada vez que sube, se abre «Organizar mi semana» como si se hubiera tocado el botón (spec 028: «Planificar mi mes» lo
   * pide al tocar la semana de ahora). Sin él, o en 0, no hace nada.
   */
  pedidoDeOrganizar?: number;
  /**
   * «Cierra tu día» (spec 033): una tarjeta del día completo que Plan dibuja justo bajo «Acciones que mueven la meta», porque
   * cerrar es lo último que se hace con ellas. No depende del eje elegido.
   */
  cierre?: React.ReactNode;
  /** El lugar de «Acciones que mueven la meta», para que «Ver mañana en Plan» lleve el scroll hasta ahí. */
  registrarLasAcciones?: React.Ref<View>;
  /** Spec 031: el aviso «tu análisis está listo» pide abrir «Tu 80/20» en la semana o el mes. Se consume una vez (`alAbrirOchentaVeinte`). */
  abrirOchentaVeinte?: 'SEMANA' | 'MES' | null;
  alAbrirOchentaVeinte?: () => void;
  /** La primera acción del diagnóstico de la persona, para ofrecerla al agendar (eje de su prioridad principal). */
  accionSugerida?: SugerenciaDeAccion | null;
  /** «Escribir mis objetivos»: la semana está bloqueada hasta tener los tres de 90 días. Abre el editor del primero que falta. */
  onDefinirObjetivos?: () => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const semanal = useRocasSemanales(maestras);
  // El domingo se arma la semana que EMPIEZA (D-203): se lee aparte, y solo ese día.
  const semanaQueSeArma = semanaAPlanificar(diaPrograma, undefined, duracionDias);
  const armaLaQueEmpieza = semanaQueSeArma !== numeroSemana;
  const queEmpieza = useRocasSemanales(maestras, semanaQueSeArma, armaLaQueEmpieza);
  const diaria = useRocasDiarias();

  const [armando, setArmando] = useState(false);
  const [revisando, setRevisando] = useState<EjeObjetivo | null>(null);
  const [agendando, setAgendando] = useState(false);
  /** Spec 048 (#183): el día en que se abre «Agendar» (el de la acción que se tocó); `null` = el último que estaba. */
  const [diaAlAgendar, setDiaAlAgendar] = useState<string | null>(null);
  const abrirAgendar = (fecha: string | null = null) => {
    setDiaAlAgendar(fecha);
    setAgendando(true);
    // #185: si lo agendado de la semana no se pudo leer, se vuelve a pedir al abrir la hoja (agendar sin verlo lo borraría).
    if (diaria.agendadasLeidas === false) void diaria.recargar();
  };
  const [ochentaVeinte, setOchentaVeinte] = useState(false);
  /* Spec 058: «Planifica tus objetivos» (engranaje). Se abre cada vez que sube `pedidoDeAjustes`. */
  const [ajustes, setAjustes] = useState(false);
  const ajustesAtendidos = useRef(pedidoDeAjustes);
  useEffect(() => {
    if (pedidoDeAjustes === ajustesAtendidos.current) return;
    ajustesAtendidos.current = pedidoDeAjustes;
    setAjustes(true);
  }, [pedidoDeAjustes]);
  const plazo = usePlazoDelObjetivo();
  const [vistaInicialDeLaHoja, setVistaInicialDeLaHoja] = useState<'SEMANA' | 'MES' | undefined>(undefined);
  useEffect(() => {
    if (!abrirOchentaVeinte) return;
    setVistaInicialDeLaHoja(abrirOchentaVeinte);
    setOchentaVeinte(true);
    alAbrirOchentaVeinte?.();
  }, [abrirOchentaVeinte, alAbrirOchentaVeinte]);

  const seArma = armaLaQueEmpieza ? queEmpieza : semanal;
  const paraAgendar = armaLaQueEmpieza ? queEmpieza : semanal;
  const puedeAgendar = estaArmada(paraAgendar);
  const hayPlanSemanal = estaArmada(semanal) || puedeAgendar;

  const todas = useMemo(() => unirAcciones(diaria.hoy, diaria.manana, diaria.agendadas), [diaria.hoy, diaria.manana, diaria.agendadas]);
  const delEje = useMemo(() => accionesDelEje(todas, ejeAbierto), [todas, ejeAbierto]);
  const hoyIso = diaria.hoyDelServidor;
  /* Spec 048 (#183): lo agendado sin señal que todavía no llegó, para que «Agendar» lo cuente y lo muestre. */
  const enEsperaDeAgendar = useMemo(() => todas.filter(a => a.pendienteDeEnvio === true), [todas]);
  /* #185: lo que el servidor ya tiene en los días que vienen, para que «Agendar» lo muestre y lo mande otra vez (agendar reemplaza el día). */
  const delServidorDeAgendar = useMemo(() => agendadasDeDiasQueVienen(todas, diaria.hoy, hoyIso), [todas, diaria.hoy, hoyIso]);
  const deHoyDelEje = delEje.filter(a => hoyIso !== null && a.fecha === hoyIso);
  const avance = avanceDeLasAcciones(delEje, hoyIso);
  // Con error de lectura no se pasa la lista: una vacía por falla quitaría alarmas que siguen valiendo.
  const rocasParaAlarmas = useMemo(
    () => (diaria.cargando || diaria.error ? undefined : [...diaria.hoy, ...diaria.manana]),
    [diaria.cargando, diaria.error, diaria.hoy, diaria.manana],
  );

  const rocaDeLaSemana = semanal.deEje(ejeAbierto);
  const rocaQueEmpieza = armaLaQueEmpieza ? queEmpieza.deEje(ejeAbierto) : null;
  const ejeSinObjetivoDeLaSemana =
    seArma.estado !== 'bloqueada' && seArma.estado !== 'cargando' && seArma.deEje(ejeAbierto) == null;

  const guardarPlan = async (items: ItemPlanSemanal[]) => {
    const resultado = await seArma.planificar(items);
    setArmando(false);
    if (!resultado.ok) Alert.alert('Tu plan de la semana', resultado.mensaje);
  };
  const guardarRevision = async (cierre: CierreRocaSemanal) => {
    const roca = revisando ? semanal.deEje(revisando) : null;
    if (!roca) return;
    const resultado = await semanal.cerrar(roca.id, cierre);
    setRevisando(null);
    if (!resultado.ok) Alert.alert('Tu revisión', resultado.mensaje);
  };
  const guardarAcciones = async (items: ItemPlanDiario[], fecha: string) => {
    const resultado = await diaria.planificar(fecha, items);
    setAgendando(false);
    if (!resultado.ok) Alert.alert('Tus acciones del día', resultado.mensaje);
  };

  /** «Organizar mi semana ›»: lo que ya existía para armarla; y con el eje armado, repartir sus acciones. */
  const organizarMiSemana = () => {
    if (semanal.estado === 'bloqueada') {
      onDefinirObjetivos?.();
      return;
    }
    if (ejeSinObjetivoDeLaSemana || !puedeAgendar) setArmando(true);
    else abrirAgendar();
  };

  /* El pedido de afuera se atiende una vez por cada subida del contador, con el estado de ese momento. */
  const organizarRef = useRef(organizarMiSemana);
  organizarRef.current = organizarMiSemana;
  const pedidoAtendido = useRef(pedidoDeOrganizar);
  useEffect(() => {
    if (pedidoDeOrganizar === pedidoAtendido.current) return;
    pedidoAtendido.current = pedidoDeOrganizar;
    organizarRef.current();
  }, [pedidoDeOrganizar]);

  const tocarUna = (accion: RocaDiariaApi, esDeHoy: boolean) => {
    if (esDeHoy) {
      (navigation as unknown as { navigate: (n: string, p?: Record<string, unknown>) => void }).navigate('Training', { abrirAccionId: accion.id });
      return;
    }
    // Una acción que viene abre «Agendar» en SU día: ahí se ve (y cuenta) lo que ya espera señal (#183).
    abrirAgendar(accion.fecha);
  };

  /* ------------------------------------------------------------------------------------------------
   * Plan como ruta (spec 058): lo mismo de arriba, dibujado como niveles. Nada de esto abre algo nuevo.
   * ---------------------------------------------------------------------------------------------- */
  const hoy = useMemo(() => new Date(), [diaPrograma, hoyIso]);
  const errorDeLaRuta = diaria.error ?? (hayPlanSemanal || semanal.estado === 'bloqueada' ? null : semanal.error);
  const sinLecturaDeLaRuta = (errorDeLaRuta !== null && delEje.length === 0) || (semanal.error !== null && semanal.estado === 'sin_planificar' && delEje.length === 0);
  const rangoDeLaSemana = useMemo(() => {
    const fechas = fechasDeLaSemanaDelPrograma(numeroSemana, diaPrograma, hoy, duracionDias);
    return fechas ? rangoDeFechas(fechas) : null;
  }, [numeroSemana, diaPrograma, hoy, duracionDias]);
  const itemsDeLoQueViene: ItemDeLoQueViene[] = useMemo(() => {
    if (!ruta) return [];
    const maestra = maestras.find(m => m.eje === ejeAbierto);
    return loQueViene({
      numeroSemana,
      numeroMes: ruta.numeroMes,
      diaPrograma,
      duracionDias,
      armaLaQueEmpieza,
      queEmpiezaArmada: rocaQueEmpieza != null,
      hoy,
      objetivoDelMes: mes => objetivoCortoDelMes(ruta.planDelEje?.meses.find(m => m.numeroMes === mes), ruta.planDelEje),
      meta: metaEnPocasPalabras(maestra?.objetivo),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, maestras, ejeAbierto, numeroSemana, diaPrograma, duracionDias, armaLaQueEmpieza, rocaQueEmpieza, hoy]);

  /** Tocar un nivel abre lo mismo que hoy: la acción de hoy va a Entrenar (FR-005), una que viene abre «Agendar» en su día. */
  const tocarNivel = (nivel: NivelDeLaRuta) => {
    switch (nivel.alTocar) {
      case 'accion':
        if (nivel.accion) tocarUna(nivel.accion, true);
        break;
      case 'agendarDia':
        if (nivel.accion) tocarUna(nivel.accion, false);
        break;
      case 'armar':
        setArmando(true);
        break;
      case 'metas':
        onDefinirObjetivos?.();
        break;
      case 'mas':
        abrirAgendar();
        break;
      case 'cofre':
        setRevisando(ejeAbierto);
        break;
      default:
        break;
    }
  };
  const editarMiSemana = () => {
    if (semanal.estado === 'bloqueada') onDefinirObjetivos?.();
    else setArmando(true);
  };

  return (
    <View style={estilos.columna}>
      {ruta ? (
        <ContenidoDeLaRuta
          eje={ejeAbierto}
          acciones={delEje}
          hoyIso={hoyIso}
          estadoDeLaSemana={semanal.estado}
          tituloDeLaSemana={rocaDeLaSemana?.titulo ?? null}
          revisada={rocaDeLaSemana?.autoevaluacionFin ?? null}
          puedeAgendar={puedeAgendar}
          sinLectura={sinLecturaDeLaRuta}
          error={errorDeLaRuta ?? semanal.error}
          plazo={plazo}
          avance={avance}
          numeroSemana={numeroSemana}
          rangoDeLaSemana={rangoDeLaSemana}
          cierre={cierre}
          loQueViene={itemsDeLoQueViene}
          alTocarNivel={tocarNivel}
          alTocarLaFranja={editarMiSemana}
          alAbrirOchentaVeinte={() => {
            setVistaInicialDeLaHoja(undefined);
            setOchentaVeinte(true);
          }}
          alOrganizar={organizarMiSemana}
          alTocarProximo={item => {
            if (item.alTocar === 'armar') setArmando(true);
          }}
        />
      ) : (
      <>
      <TarjetaEstaSemana
        estado={semanal.estado}
        numeroSemana={numeroSemana}
        titulo={rocaDeLaSemana?.titulo ?? null}
        revisada={rocaDeLaSemana?.autoevaluacionFin ?? null}
        avance={avance}
        error={semanal.error}
        queEmpieza={
          armaLaQueEmpieza
            ? { numeroSemana: semanaQueSeArma, titulo: rocaQueEmpieza?.titulo ?? null, cargando: queEmpieza.estado === 'cargando' }
            : undefined
        }
        alArmar={() => setArmando(true)}
        alRevisar={() => setRevisando(ejeAbierto)}
        alDefinirObjetivos={onDefinirObjetivos}
        alArmarLaQueEmpieza={() => setArmando(true)}
      />

      <View ref={registrarLasAcciones} collapsable={false}>
        <AccionesQueMuevenLaMeta
          acciones={delEje}
          hoyIso={hoyIso}
          nombreDelEje={ETIQUETA_EJE[ejeAbierto]}
          hayPlanSemanal={hayPlanSemanal}
          puedeAgendar={puedeAgendar}
          /* #182: sin la semana leída (sin señal y sin nada guardado) tampoco se sabe qué acciones hay: se dice lo mismo, no «Primero arma tu semana». */
          error={diaria.error ?? (hayPlanSemanal || semanal.estado === 'bloqueada' ? null : semanal.error)}
          alTocarUna={tocarUna}
          alAgendar={() => abrirAgendar()}
        >
          {/* Recordatorios de las acciones (2026-09-26): con TODAS las de hoy y mañana, no solo las del eje abierto —las
              alarmas son de todas—. Desde el 2026-10-31 es una fila que abre una hoja con el mismo control que Yo → Alarmas. */}
          {hayPlanSemanal && user?.id ? <RecordatoriosDeLasAcciones userId={user.id} rocas={rocasParaAlarmas} /> : null}
        </AccionesQueMuevenLaMeta>
      </View>

      {cierre}

      <TarjetaOchentaVeinte
        alAbrir={() => {
          setVistaInicialDeLaHoja(undefined);
          setOchentaVeinte(true);
        }}
      />

      <GoldButton label="Organizar mi semana" onPress={organizarMiSemana} icon="chevron" textStyle={estilos.textoDelBoton} />
      </>
      )}

      {ruta ? (
        <>
          {/* Las alarmas de las acciones se ponen al día con la hoja del engranaje cerrada; abierta lo hace su fila (`RecordatoriosDeLasAcciones`). */}
          {!ajustes && hayPlanSemanal && user?.id ? <SincronizadorDeAlarmasDeLaRuta userId={user.id} rocas={rocasParaAlarmas} /> : null}
          <HojaPlanificaTusObjetivos
            visible={ajustes}
            alCerrar={() => setAjustes(false)}
            tituloDeLaSemanaDe={eje => semanal.deEje(eje)?.titulo ?? null}
            acciones={todas}
            hoy={hoy}
            etiquetaDelMes={ruta.etiquetaDelMes}
            alEditarLaSemana={editarMiSemana}
            alAgendar={() => abrirAgendar()}
            alPlanificarElMes={ruta.onPlanificarMes}
            rocasParaAlarmas={rocasParaAlarmas}
            hayPlanSemanal={hayPlanSemanal}
          />
        </>
      ) : null}

      <HojaOchentaVeinte
        visible={ochentaVeinte}
        alCerrar={() => setOchentaVeinte(false)}
        eje={ejeAbierto}
        deHoy={deHoyDelEje}
        vistaInicial={vistaInicialDeLaHoja}
        alAgendar={() => abrirAgendar()}
        hoyIso={hoyIso}
        agendadas={todas}
        maestra={maestras.find(m => m.eje === ejeAbierto) ?? null}
        metaDelMes={metaDelMes}
        diaPrograma={diaPrograma}
        duracionDias={duracionDias}
      />

      {/* Arma la semana que se arma HOY (`seArma`): el domingo, la que empieza, con su número. */}
      <PlanSemanalModal
        visible={armando}
        numeroSemana={armaLaQueEmpieza ? semanaQueSeArma : numeroSemana}
        maestras={maestras}
        ejePrincipal={ejeAbierto}
        ejesYaConObjetivo={EJES.filter(eje => seArma.deEje(eje) != null)}
        objetivoSugeridoDe={objetivoSugeridoDe}
        guardando={seArma.guardando}
        onGuardar={guardarPlan}
        onCerrar={() => setArmando(false)}
      />
      <RevisionSemanalModal
        visible={revisando != null}
        eje={revisando}
        roca={revisando ? semanal.deEje(revisando) : null}
        guardando={semanal.guardando}
        onGuardar={guardarRevision}
        onCerrar={() => setRevisando(null)}
      />
      <AgendarAccionesModal
        visible={agendando}
        semanal={paraAgendar}
        fecha={diaria.objetivo.fecha}
        sugerida={accionSugerida}
        guardando={diaria.guardando}
        onGuardar={guardarAcciones}
        onCerrar={() => setAgendando(false)}
        enEspera={enEsperaDeAgendar}
        abrirEnFecha={diaAlAgendar}
        delServidor={delServidorDeAgendar}
        sinLeerLaSemana={diaria.agendadasLeidas === false && !diaria.cargando}
        onVolverALeer={() => void diaria.recargar()}
      />
    </View>
  );
}

/** Una semana con objetivo: en curso o ya revisada. */
function estaArmada(semanal: ReturnType<typeof useRocasSemanales>): boolean {
  return semanal.estado === 'planificada' || semanal.estado === 'cerrada';
}

const estilos = StyleSheet.create({
  columna: { gap: 14 },
  /** El botón de siempre trae versalitas espaciadas de 11 px: acá es una frase en tipo oración de 16. */
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
