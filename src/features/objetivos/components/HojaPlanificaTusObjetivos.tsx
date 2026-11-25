import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import type { EjeObjetivo, RocaDiariaApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { iconoDelEje } from '../utils/iconoDelEje';
import { diasDeLaAgenda } from '../utils/rutaDelPlan';
import { RecordatoriosDeLasAcciones } from './RecordatoriosDeLasAcciones';

/**
 * «Planifica tus objetivos» (spec 058, FR-010): lo que en Plan de hoy estaba repartido y ahora vive detrás del engranaje, como la
 * planificación de hábitos. Cada fila abre la hoja que ya existe, sin cambiar sus campos: «Editar mi semana» (`PlanSemanalModal`),
 * «Agendar mis acciones» (`AgendarAccionesModal`), «Planificar mi mes» (`PlanDelMesModal`) y «Recordatorios de tus acciones».
 */
export function HojaPlanificaTusObjetivos({
  visible,
  alCerrar,
  tituloDeLaSemanaDe,
  acciones,
  hoy,
  etiquetaDelMes,
  alEditarLaSemana,
  alAgendar,
  alPlanificarElMes,
  rocasParaAlarmas,
  hayPlanSemanal,
}: {
  visible: boolean;
  alCerrar: () => void;
  /** El objetivo semanal de cada eje; `null` = sin armar. */
  tituloDeLaSemanaDe: (eje: EjeObjetivo) => string | null;
  /** Todas las acciones agendadas (de los tres ejes): de ellas salen los puntos de la agenda. */
  acciones: readonly RocaDiariaApi[];
  hoy: Date;
  etiquetaDelMes: string | null;
  alEditarLaSemana: () => void;
  alAgendar: () => void;
  alPlanificarElMes: () => void;
  rocasParaAlarmas?: RocaDiariaApi[];
  hayPlanSemanal: boolean;
}) {
  const { c, t } = useTheme();
  const { user } = useAuth();
  useSystemBackHandler(() => {
    alCerrar();
    return true;
  }, visible);
  const dias = diasDeLaAgenda(hoy, acciones);
  const abrirOtra = (abrir: () => void) => () => {
    alCerrar();
    abrir();
  };
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Planifica tus objetivos" tamano="grande">
      <View style={estilos.cuerpo}>
        <View style={[estilos.seccion, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Text style={[t.small, estilos.rotulo, { color: c.goldInk }]}>Tu semana</Text>
          {EJES.map(eje => (
            <View key={eje} style={estilos.filaEje}>
              <Icon name={iconoDelEje(eje)} size={TAMANO_ICONO.normal} color={c.goldInk} />
              <Text style={[t.body, { color: tituloDeLaSemanaDe(eje) ? c.textStrong : c.textSoft, flex: 1 }]} numberOfLines={2}>
                {`${ETIQUETA_EJE[eje]}: ${tituloDeLaSemanaDe(eje) ?? 'sin armar'}`}
              </Text>
            </View>
          ))}
          <GoldButton label="Editar mi semana" onPress={abrirOtra(alEditarLaSemana)} variant="outline" icon="chevron" textStyle={estilos.textoBoton} />
        </View>

        <View style={[estilos.seccion, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Text style={[t.small, estilos.rotulo, { color: c.goldInk }]}>Tu agenda, día por día</Text>
          <View style={estilos.dias} accessible accessibilityLabel={`Días con acciones: ${dias.filter(d => d.tieneAcciones).map(d => d.numero).join(', ') || 'ninguno'}`}>
            {dias.map(d => (
              <View key={d.iso} style={estilos.dia}>
                <Text style={[t.small, { color: c.textSoft }]}>{d.letra}</Text>
                <Text style={[t.cardTitle, estilos.numeroDia, { color: d.esHoy ? c.textStrong : c.textSoft, textDecorationLine: d.esHoy ? 'underline' : 'none' }]}>{d.numero}</Text>
                <View style={[estilos.punto, { backgroundColor: d.tieneAcciones ? c.gold : 'transparent' }]} />
              </View>
            ))}
          </View>
          <GoldButton label="Agendar mis acciones" onPress={abrirOtra(alAgendar)} variant="outline" icon="chevron" textStyle={estilos.textoBoton} />
        </View>

        <Presionable
          onPress={abrirOtra(alPlanificarElMes)}
          accessibilityRole="button"
          accessibilityLabel={etiquetaDelMes ? `Planificar mi mes. ${etiquetaDelMes}` : 'Planificar mi mes'}
          style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
        >
          <Icon name="calendarRange" size={TAMANO_ICONO.normal} color={c.goldInk} />
          <View style={{ flex: 1 }}>
            <Text style={[t.body, estilos.tituloFila, { color: c.textStrong }]}>Planificar mi mes</Text>
            {etiquetaDelMes ? <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{etiquetaDelMes}</Text> : null}
          </View>
          <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.textSoft} />
        </Presionable>

        {/* La misma fila de siempre (con su hoja y su resumen). Las alarmas se ponen al día aparte, con la hoja cerrada (`PlanDelEje`). */}
        {hayPlanSemanal && user?.id && visible ? <RecordatoriosDeLasAcciones userId={user.id} rocas={rocasParaAlarmas} /> : null}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 14, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  seccion: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  rotulo: { fontFamily: fuentes.negrita, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  filaEje: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  dias: { flexDirection: 'row', justifyContent: 'space-between' },
  dia: { alignItems: 'center', gap: 2, minWidth: 36 },
  numeroDia: { fontSize: 16, fontVariant: ['tabular-nums'] },
  punto: { width: 7, height: 7, borderRadius: 4 },
  fila: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 17 },
  tituloFila: { fontFamily: fuentes.media, fontSize: 16, lineHeight: 22 },
  textoBoton: { fontSize: 16, letterSpacing: 0 },
});
