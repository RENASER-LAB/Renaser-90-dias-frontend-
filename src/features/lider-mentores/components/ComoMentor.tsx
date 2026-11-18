import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { SeccionPlegable } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { FichaApi, ObservacionApi } from '../api/liderMentoresSchemas';
import { aprendicesEnPalabras, consultasSinResponder, evaluacionCorta, evaluacionesQueDebe } from '../utils/datosDelMentor';
import { encabezadoDeLaObservacion } from '../utils/textoDeObservacion';
import { BarraDeColores } from './BarraDeColores';
import { ContadoresPorColor } from './ContadoresPorColor';

/**
 * «Como mentor», debajo de la ficha de un mentor (spec 056 FR-024), con el mismo estilo plegable de los pilares: sus grupos, cada uno con su barra de
 * colores; su evaluación del mes; las evaluaciones que debe; sus consultas sin responder con los días; y «Lo que le dijiste». Cada fila es una cifra
 * corta: sin párrafos. Se abre solo al llegar: el líder viene a ver esto.
 */
export function ComoMentor({
  ficha,
  onAbrirGrupo,
  onAbrirConsultas,
  onDecirle,
}: {
  ficha: FichaApi;
  onAbrirGrupo: (grupoId: string, nombre: string) => void;
  onAbrirConsultas: () => void;
  /** Abre la hoja de «Reconocer, sugerir o alertar». */
  onDecirle: () => void;
}) {
  const { c, t } = useTheme();
  const mentor = ficha.mentor;
  const grupos = mentor.groups.source === 'OK' ? mentor.groups.items ?? [] : [];
  const debe = evaluacionesQueDebe(mentor);
  const consultas = consultasSinResponder(mentor);

  return (
    <SeccionPlegable titulo="Como mentor" abiertaAlEmpezar>
      <View style={estilos.cuerpo}>
        {grupos.map(g => {
          const s = g.semaforo;
          const nombre = g.name?.trim() || 'Grupo sin nombre';
          return (
            <Presionable
              key={g.id}
              onPress={() => onAbrirGrupo(g.id, nombre)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir el grupo ${nombre}`}
              style={[estilos.grupo, { borderColor: c.border }]}
            >
              <View style={estilos.grupoTitulo}>
                <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 16, flex: 1 }]} numberOfLines={1}>
                  {nombre}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 15, fontVariant: ['tabular-nums'] }]}>{aprendicesEnPalabras(g.trainees)}</Text>
                <Icon name="chevron" size={14} color={c.chevron} />
              </View>
              {s ? (
                <>
                  <ContadoresPorColor rojo={s.rojo} ambar={s.amarillo} verde={s.verde} sinDatos={s.sinDatos} />
                  <BarraDeColores rojo={s.rojo} ambar={s.amarillo} verde={s.verde} sinDatos={s.sinDatos} />
                </>
              ) : null}
            </Presionable>
          );
        })}

        <Dato titulo="Su evaluación" valor={evaluacionCorta(mentor)} />
        {debe ? <Dato titulo="Evaluaciones que debe" valor={debe} /> : null}
        {consultas ? <Dato titulo="Consultas" valor={consultas} onPress={onAbrirConsultas} /> : null}

        <View style={estilos.dijiste}>
          <Text accessibilityRole="header" style={[t.body, { color: c.textSoft, fontFamily: fuentes.media, fontSize: 15, flex: 1 }]}>
            Lo que le dijiste
          </Text>
          <Presionable onPress={onDecirle} accessibilityRole="button" accessibilityLabel={`Decirle algo a ${mentor.fullName}`} style={[estilos.mas, { borderColor: c.border }]}>
            <Icon name="plus" size={18} color={c.goldInk} />
          </Presionable>
        </View>
        {ficha.recentObservations.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Nada este mes</Text>
        ) : (
          ficha.recentObservations.map(o => <Observacion key={o.id} observacion={o} />)
        )}
      </View>
    </SeccionPlegable>
  );
}

function Dato({ titulo, valor, onPress }: { titulo: string; valor: string; onPress?: () => void }) {
  const { c, t } = useTheme();
  const contenido = (
    <>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, flex: 1 }]}>{titulo}</Text>
      <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.seminegrita, fontSize: 16, fontVariant: ['tabular-nums'] }]}>{valor}</Text>
      {onPress ? <Icon name="chevron" size={14} color={c.chevron} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${titulo}: ${valor}`} style={estilos.dato}>
        {contenido}
      </View>
    );
  }
  return (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${titulo}: ${valor}`} style={estilos.dato}>
      {contenido}
    </Presionable>
  );
}

function Observacion({ observacion }: { observacion: ObservacionApi }) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 15 }]}>{encabezadoDeLaObservacion(observacion)}</Text>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{observacion.text}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12 },
  grupo: { gap: 8, borderBottomWidth: 1, paddingBottom: 12, minHeight: 48 },
  grupoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  dijiste: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  mas: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
