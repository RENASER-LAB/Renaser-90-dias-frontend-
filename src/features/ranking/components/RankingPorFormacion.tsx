import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fuentes } from '../../../theme/fuentes';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { EntradaEscalonada, PodioRanking, type PuestoPodio } from '../../community/components/PodioRanking';
import type { EntradaRankingDto } from '../api/rankingApi';
import type { GrupoDeRanking } from '../utils/agruparPorFormacion';
import { esMiEntrada, nombreEnElRanking, textoDelPuntaje, type ClaveDeTabla } from '../utils/tablasDeRanking';

function puesto(entrada: EntradaRankingDto | undefined, tabla: ClaveDeTabla, quien: { id?: string | null }, nombre: string): PuestoPodio | null {
  if (!entrada) return null;
  return { name: nombreEnElRanking(entrada, quien, nombre), score: textoDelPuntaje(tabla, entrada.puntaje) };
}

/**
 * El ranking en «Todas» (spec 024): una sección por formación, cada una con su encabezado, su podio y su tabla, con las posiciones
 * que mandó el servidor (cada formación compara solo a los suyos). Solo lo dibuja `ComunidadScreen` para quien ve todas las
 * formaciones y lee «Todas»; para las demás cuentas el ranking es el de siempre.
 *
 * Mismo podio y mismas filas que la tabla de una sola formación (`PodioRanking`, `EntradaEscalonada`): no hay un diseño nuevo, solo se
 * repite por formación. Sin animaciones nuevas.
 */
export function RankingPorFormacion({
  grupos,
  tabla,
  quien,
  nombreDeQuienMira,
  activo,
  nombreDeLaFormacion,
}: {
  grupos: readonly GrupoDeRanking[];
  tabla: ClaveDeTabla;
  quien: { id?: string | null };
  nombreDeQuienMira: string;
  /** `true` mientras la sección Ranking es la que se mira (enciende la entrada del podio). */
  activo: boolean;
  /** El nombre configurado de la formación (el encabezado de cada sección). */
  nombreDeLaFormacion: (codigo: string) => string;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: space.gapLg }}>
      {grupos.map(grupo => (
        <View key={grupo.formacion} style={{ gap: space.gap }}>
          <Text accessibilityRole="header" style={[estilos.encabezado, { color: c.textStrong }]}>
            {nombreDeLaFormacion(grupo.formacion)}
          </Text>
          <PodioRanking
            key={`${tabla}-${grupo.formacion}`}
            top1={puesto(grupo.entradas[0], tabla, quien, nombreDeQuienMira)}
            top2={puesto(grupo.entradas[1], tabla, quien, nombreDeQuienMira)}
            top3={puesto(grupo.entradas[2], tabla, quien, nombreDeQuienMira)}
            activo={activo}
          />
          <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {grupo.entradas.map((entrada, indice) => {
              const esMia = esMiEntrada(entrada, quien);
              return (
                <EntradaEscalonada
                  key={entrada.participanteId}
                  indice={indice}
                  activo={activo}
                  style={[estilos.fila, { borderBottomColor: c.divider }, esMia && { backgroundColor: c.cardBgAlt }]}
                >
                  <Text
                    style={[
                      t.small,
                      estilos.cifras,
                      { color: entrada.posicion <= 3 ? c.goldInk : c.textSoft, fontFamily: fuentes.negrita, width: 34 },
                    ]}
                  >
                    #{entrada.posicion}
                  </Text>
                  <Text
                    style={[t.body, { color: c.textStrong, fontFamily: esMia ? fuentes.negrita : fuentes.regular, flex: 1 }]}
                  >
                    {nombreEnElRanking(entrada, quien, nombreDeQuienMira)}
                  </Text>
                  <Text style={[t.small, estilos.cifras, { color: c.goldInk, fontFamily: fuentes.negrita }]}>
                    {textoDelPuntaje(tabla, entrada.puntaje)}
                  </Text>
                </EntradaEscalonada>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: { fontFamily: fuentes.display, fontSize: 22, letterSpacing: -0.3, lineHeight: 28, marginTop: 4 },
  lista: { borderWidth: 1, borderRadius: space.radius, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, minHeight: 48, borderBottomWidth: 1 },
  cifras: { fontVariant: ['tabular-nums'] },
});
