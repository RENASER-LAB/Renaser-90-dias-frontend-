import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { AvatarConSemaforo } from './AvatarConSemaforo';
import { Pildora } from './Pildora';
import { useRankingDeGrupos } from '../hooks/useRankingDeGrupos';
import type { EvaluacionPropiaApi } from '../api/mentorSchemas';
import type { MesDelRanking } from '../utils/mesDelRanking';
import { accionesQueSeMuestran, colorDeQuienBaja, diferenciaConElMesAnterior, iconoDeLaAccion, quienBajaQueSeMuestra } from '../utils/queSigueDeLaEvaluacion';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * «Mi evaluación» del mentor en una hoja desde abajo (spec 055 FR-008): el enlace del pie de «Mi grupo» la abre. Es lo que antes
 * ocupaba la pantalla entera, sin cambiar de contenido (el porcentaje llega calculado del servidor; la app no lo recalcula) y
 * con su gesto de volver (la hoja es un `Modal`: el atrás del sistema la cierra).
 */
/**
 * Spec 057 FR-013: las manos de la hoja con el resto de la pantalla. `escribirle` es el de `useEscribirleAlAprendiz` (un solo pedido a
 * la vez, el mismo de las filas de «Mi grupo»); `abrirFicha` abre la ficha con la navegación existente y devuelve `false` si esa
 * persona no está en el grupo que se mira (no se puede abrir su ficha desde acá).
 */
export interface AccionesDeLaHoja {
  escribirle: (aprendizId: string, nombre: string | null) => void;
  escribiendoId: string | null;
  /** `null` = esa persona no se puede abrir desde este grupo. */
  abrirFicha: (aprendizId: string) => (() => void) | null;
  avatarDe: (aprendizId: string) => string | null;
}

export function HojaDeMiEvaluacion({
  visible,
  alCerrar,
  evaluacion,
  cohorteId,
  grupoId,
  acciones,
}: {
  visible: boolean;
  alCerrar: () => void;
  evaluacion: EvaluacionPropiaApi | null;
  cohorteId: string | null;
  grupoId: string | null;
  acciones?: AccionesDeLaHoja;
}) {
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Mi evaluación" tamano="grande" etiquetaCerrar="Cerrar Mi evaluación">
      <Cuerpo evaluacion={evaluacion} cohorteId={cohorteId} grupoId={grupoId} acciones={acciones} alCerrar={alCerrar} />
    </HojaDesdeAbajo>
  );
}

function Cuerpo({
  evaluacion,
  cohorteId,
  grupoId,
  acciones,
  alCerrar,
}: {
  evaluacion: EvaluacionPropiaApi | null;
  cohorteId: string | null;
  grupoId: string | null;
  acciones?: AccionesDeLaHoja;
  alCerrar: () => void;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [mesDelRanking, setMesDelRanking] = useState<MesDelRanking>('actual');
  const { ranking, miFila, total: gruposEnCohorte, disponible: hayRanking } = useRankingDeGrupos(cohorteId, grupoId, mesDelRanking);
  /* Con SIN_MUESTRA o SIN_HISTORIAL el servidor las manda vacías (FR-011); sin ellas la hoja queda como en la fase 1, sin huecos. */
  const accionesDeLaLista = evaluacion ? accionesQueSeMuestran(evaluacion) : [];
  const bajan = evaluacion ? quienBajaQueSeMuestra(evaluacion) : [];

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
              {diferenciaConElMesAnterior(evaluacion) ? (
                <Text testID="diferencia-con-el-mes-anterior" style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                  {diferenciaConElMesAnterior(evaluacion)}
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
          <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, marginTop: 10, lineHeight: 20 }]}>
            Se promedia el porcentaje de cada aprendiz, no el total de evidencias. Cuenta la entrega dentro de tu período; la verificación se informa
            aparte{evaluacion.verificadas > 0 ? ` (${evaluacion.verificadas} verificadas)` : ''}.
          </Text>
        </View>
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Todavía no hay una evaluación para mostrar.</Text>
      )}
      {evaluacion && accionesDeLaLista.length > 0 ? (
        <View style={estilos.seccion}>
          <Text accessibilityRole="header" style={[t.body, { color: c.text, fontSize: 16, fontFamily: fuentes.negrita }]}>
            Qué sigue
          </Text>
          <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {accionesDeLaLista.map((a, i) => {
              const alumno = a.tipo === 'ESCRIBIR' && a.aprendizId ? a.aprendizId : null;
              const escribiendo = acciones?.escribiendoId != null;
              const contenido = (
                <>
                  <Icon name={iconoDeLaAccion(a.tipo)} size={20} color={c.goldInk} />
                  <View style={estilos.textos}>
                    <Text style={[t.body, { color: c.text, fontSize: 16 }]}>{a.accion}</Text>
                    {a.motivo ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, lineHeight: 19 }]}>{a.motivo}</Text> : null}
                  </View>
                </>
              );
              const separador = i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null;
              return alumno && acciones ? (
                <Presionable
                  key={`${a.tipo}-${i}`}
                  onPress={() => {
                    if (acciones.escribiendoId !== null) return;
                    alCerrar();
                    acciones.escribirle(alumno, a.nombre ?? null);
                  }}
                  disabled={escribiendo}
                  accessibilityRole="button"
                  accessibilityLabel={a.accion ?? 'Escribirle'}
                  accessibilityState={{ disabled: escribiendo, busy: escribiendo }}
                  style={[estilos.accion, separador, { opacity: escribiendo ? 0.5 : 1 }]}
                >
                  {contenido}
                </Presionable>
              ) : (
                <View key={`${a.tipo}-${i}`} style={[estilos.accion, separador]}>
                  {contenido}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      {evaluacion && bajan.length > 0 ? (
        <View style={estilos.seccion}>
          <Text accessibilityRole="header" style={[t.body, { color: c.text, fontSize: 16, fontFamily: fuentes.negrita }]}>
            Quién baja el promedio
          </Text>
          <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {bajan.map((b, i) => {
              const quien = b.nombre?.trim() || 'Aprendiz sin nombre';
              const abrir = acciones?.abrirFicha(b.aprendizId) ?? null;
              const detalle =
                b.porcentaje === null || b.porcentaje === undefined
                  ? 'Sin porcentaje este mes'
                  : `${Math.round(b.porcentaje)} %${b.entregadas != null && b.esperadas != null ? ` · entregó ${b.entregadas} de ${b.esperadas}` : ''}`;
              return (
                <Presionable
                  key={b.aprendizId}
                  onPress={
                    abrir
                      ? () => {
                          alCerrar();
                          abrir();
                        }
                      : undefined
                  }
                  disabled={!abrir}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir la ficha de ${quien}`}
                  style={[estilos.accion, i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
                >
                  <AvatarConSemaforo nombre={b.nombre} avatarUrl={acciones?.avatarDe(b.aprendizId) ?? null} color={colorDeQuienBaja(b.porcentaje)} size={36} />
                  <View style={estilos.textos}>
                    <Text style={[t.body, { color: c.text, fontSize: 16 }]} numberOfLines={1}>
                      {quien}
                    </Text>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, lineHeight: 19, fontVariant: ['tabular-nums'] }]}>{detalle}</Text>
                  </View>
                </Presionable>
              );
            })}
          </View>
        </View>
      ) : null}
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
  seccion: { marginTop: 18, gap: 8 },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  textos: { flex: 1, minWidth: 0, gap: 1 },
});
