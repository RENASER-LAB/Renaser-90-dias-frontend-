import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { useAuth } from '../../../context/AuthContext';
import { useAccionesDelMapa } from '../../mapa-renacimiento/hooks/useAccionesDelMapa';
import { useRocasDiarias } from '../hooks/useRocasDiarias';
import { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { CierreRocaSemanal, EjeObjetivo, ItemPlanDiario, ItemPlanSemanal, RocaDiariaApi, RocaMaestraApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { accionesDelEje, avanceDeLasAcciones, unirAcciones } from '../utils/planPrincipal';
import { semanaAPlanificar } from '../utils/periodoDelPrograma';
import { AgendarAccionesModal } from './AgendarAccionesModal';
import { PlanSemanalModal } from './PlanSemanalModal';
import { RecordatoriosDeLasAcciones } from './RecordatoriosDeLasAcciones';
import { RevisionSemanalModal } from './RevisionSemanalModal';
import { AccionesQueMuevenLaMeta, HojaOchentaVeinte, TarjetaEstaSemana, TarjetaOchentaVeinte } from './TarjetasDelPlan';

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
  ejeAbierto,
  objetivoSugeridoDe,
  onDefinirObjetivos,
}: {
  maestras: RocaMaestraApi[];
  numeroSemana: number;
  diaPrograma: number;
  ejeAbierto: EjeObjetivo;
  objetivoSugeridoDe: (eje: EjeObjetivo) => string;
  /** «Escribir mis objetivos»: la semana está bloqueada hasta tener los tres de 90 días. Abre el editor del primero que falta. */
  onDefinirObjetivos?: () => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const semanal = useRocasSemanales(maestras);
  // El domingo se arma la semana que EMPIEZA (D-203): se lee aparte, y solo ese día.
  const semanaQueSeArma = semanaAPlanificar(diaPrograma);
  const armaLaQueEmpieza = semanaQueSeArma !== numeroSemana;
  const queEmpieza = useRocasSemanales(maestras, semanaQueSeArma, armaLaQueEmpieza);
  const diaria = useRocasDiarias();

  const [armando, setArmando] = useState(false);
  const [revisando, setRevisando] = useState<EjeObjetivo | null>(null);
  const [agendando, setAgendando] = useState(false);
  const [ochentaVeinte, setOchentaVeinte] = useState(false);
  /* Solo cuando el planificador se abre: quien nunca lo toca no paga la lectura del Mapa. */
  const accionesDelMapa = useAccionesDelMapa(agendando);

  const seArma = armaLaQueEmpieza ? queEmpieza : semanal;
  const paraAgendar = armaLaQueEmpieza ? queEmpieza : semanal;
  const puedeAgendar = estaArmada(paraAgendar);
  const hayPlanSemanal = estaArmada(semanal) || puedeAgendar;

  const todas = useMemo(() => unirAcciones(diaria.hoy, diaria.manana, diaria.agendadas), [diaria.hoy, diaria.manana, diaria.agendadas]);
  const delEje = useMemo(() => accionesDelEje(todas, ejeAbierto), [todas, ejeAbierto]);
  const hoyIso = diaria.hoyDelServidor;
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
    else setAgendando(true);
  };

  const tocarUna = (accion: RocaDiariaApi, esDeHoy: boolean) => {
    if (esDeHoy) {
      (navigation as unknown as { navigate: (n: string, p?: Record<string, unknown>) => void }).navigate('Training', { abrirAccionId: accion.id });
      return;
    }
    setAgendando(true);
  };

  return (
    <View style={estilos.columna}>
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

      <AccionesQueMuevenLaMeta
        acciones={delEje}
        hoyIso={hoyIso}
        nombreDelEje={ETIQUETA_EJE[ejeAbierto]}
        hayPlanSemanal={hayPlanSemanal}
        puedeAgendar={puedeAgendar}
        error={diaria.error}
        alTocarUna={tocarUna}
        alAgendar={() => setAgendando(true)}
      >
        {/* Recordatorios de las acciones (2026-09-26): con TODAS las de hoy y mañana, no solo las del eje abierto —las
            alarmas son de todas—. Desde el 2026-10-31 es una fila que abre una hoja con el mismo control que Yo → Alarmas. */}
        {hayPlanSemanal && user?.id ? <RecordatoriosDeLasAcciones userId={user.id} rocas={rocasParaAlarmas} /> : null}
      </AccionesQueMuevenLaMeta>

      <TarjetaOchentaVeinte alAbrir={() => setOchentaVeinte(true)} />

      <GoldButton label="Organizar mi semana" onPress={organizarMiSemana} icon="chevron" textStyle={estilos.textoDelBoton} />

      <HojaOchentaVeinte visible={ochentaVeinte} alCerrar={() => setOchentaVeinte(false)} eje={ejeAbierto} deHoy={deHoyDelEje} />

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
        accionesDelMapa={accionesDelMapa}
        guardando={diaria.guardando}
        onGuardar={guardarAcciones}
        onCerrar={() => setAgendando(false)}
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
