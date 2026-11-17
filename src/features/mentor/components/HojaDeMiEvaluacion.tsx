import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Pildora } from './Pildora';
import { useRankingDeGrupos } from '../hooks/useRankingDeGrupos';
import type { EvaluacionPropiaApi } from '../api/mentorSchemas';
import type { MesDelRanking } from '../utils/mesDelRanking';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * «Mi evaluación» del mentor en una hoja desde abajo (spec 055 FR-008): el enlace del pie de «Mi grupo» la abre. Es lo que antes
 * ocupaba la pantalla entera, sin cambiar de contenido (el porcentaje llega calculado del servidor; la app no lo recalcula) y
 * con su gesto de volver (la hoja es un `Modal`: el atrás del sistema la cierra).
 */
export function HojaDeMiEvaluacion({
  visible,
  alCerrar,
  evaluacion,
  cohorteId,
  grupoId,
}: {
  visible: boolean;
  alCerrar: () => void;
  evaluacion: EvaluacionPropiaApi | null;
  cohorteId: string | null;
  grupoId: string | null;
}) {
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Mi evaluación" tamano="grande" etiquetaCerrar="Cerrar Mi evaluación">
      <Cuerpo evaluacion={evaluacion} cohorteId={cohorteId} grupoId={grupoId} />
    </HojaDesdeAbajo>
  );
}

function Cuerpo({ evaluacion, cohorteId, grupoId }: { evaluacion: EvaluacionPropiaApi | null; cohorteId: string | null; grupoId: string | null }) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [mesDelRanking, setMesDelRanking] = useState<MesDelRanking>('actual');
  const { ranking, miFila, total: gruposEnCohorte, disponible: hayRanking } = useRankingDeGrupos(cohorteId, grupoId, mesDelRanking);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 16 }} showsVerticalScrollIndicator={false}>
      {evaluacion ? (
        <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <View style={estilos.fila}>
            <Text style={[estilos.cifra, { color: c.textStrong }]}>
              {evaluacion.porcentaje === null ? '—' : `${Math.round(evaluacion.porcentaje)}%`}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[t.body, { color: c.text, fontSize: 16, fontFamily: fuentes.media }]}>{textoDeEstado(evaluacion.estado)}</Text>
              {evaluacion.estado === 'CALCULADA' ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                  {evaluacion.entregadas} de {evaluacion.esperadas} evidencias · {evaluacion.alumnosEvaluados}{' '}
                  {evaluacion.alumnosEvaluados === 1 ? 'aprendiz' : 'aprendices'}
                </Text>
              ) : null}
            </View>
          </View>
          {hayRanking ? (
            <View style={[estilos.posicion, { borderTopColor: c.border }]}>
              <View style={[estilos.pildoras, { marginBottom: 6 }]}>
                <Pildora texto="Este mes" activa={mesDelRanking === 'actual'} onPress={() => setMesDelRanking('actual')} />
                <Pildora texto="Mes anterior" activa={mesDelRanking === 'anterior'} onPress={() => setMesDelRanking('anterior')} />
              </View>
              {miFila ? (
                <>
                  <Text style={[t.body, { color: c.text, fontSize: 16 }]}>
                    {mesDelRanking === 'actual'
                      ? `Tu grupo va en el puesto ${miFila.posicion} de ${gruposEnCohorte} en la generación`
                      : `Tu grupo terminó en el puesto ${miFila.posicion} de ${gruposEnCohorte} en la generación`}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                    {miFila.porcentaje === null
                      ? mesDelRanking === 'actual'
                        ? 'Todavía sin actividad para medir este mes'
                        : 'Sin actividad para medir ese mes'
                      : `${Math.round(miFila.porcentaje)}% del grupo · ${miFila.muestra} ${miFila.muestra === 1 ? 'aprendiz medido' : 'aprendices medidos'}`}
                  </Text>
                </>
              ) : ranking ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                  {mesDelRanking === 'actual' ? 'Tu grupo todavía no figura en la tabla de este mes' : 'Tu grupo no figuró en la tabla de ese mes'}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, marginTop: 10, lineHeight: 20 }]}>
            Se promedia el porcentaje de cada aprendiz, no el total de evidencias. Cuenta la entrega dentro de tu período; la verificación se informa
            aparte{evaluacion.verificadas > 0 ? ` (${evaluacion.verificadas} verificadas)` : ''}.
          </Text>
        </View>
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Todavía no hay una evaluación para mostrar.</Text>
      )}
    </ScrollView>
  );
}

/** Por qué puede faltar el número. Ninguno de los tres casos es «0 %». */
function textoDeEstado(estado: string): string {
  switch (estado) {
    case 'CALCULADA':
      return 'Cuánto cumplieron tus aprendices este mes';
    case 'SIN_MUESTRA':
      return 'Este mes todavía no vencieron evidencias que medir';
    default:
      return 'Todavía sin actividad para medir en este período';
  }
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cifra: { fontFamily: fuentes.media, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
  posicion: { borderTopWidth: 1, marginTop: 12, paddingTop: 10, gap: 2 },
  pildoras: { flexDirection: 'row', gap: 8 },
});
