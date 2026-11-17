import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useSemaforoDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { CargandoCelula, EstadoCelula } from '../components/EstadoCelula';
import { ALTO_DE_TOQUE } from '../components/FilaDeAprendiz';
import type { FalloCelula, VistaCelula } from '../hooks/useCelulaQueAcompano';
import { cantidadDeAprendices, hayVariosGrupos } from '../utils/entradaAMisGrupos';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * «Mis grupos» (spec 055, historia 1; FR-001 y FR-002): los grupos que el mentor acompaña hoy, cada uno con su nombre y, a la
 * derecha, cuántos aprendices tiene. Al tocar uno entra a «Mi grupo». Con un solo grupo no se queda acá: entra directo.
 *
 * Los grupos salen de `vista.grupos` (`gruposQueAcompana`, el contexto del mentor). La cantidad de cada uno la dice el
 * semáforo de ESE grupo, que ya existe (`/mentor/groups/{g}/semaforo`): no hay endpoint nuevo. Mientras llega, o si no
 * responde, la fila muestra solo el nombre y su flecha: nunca un hueco ni un cero inventado.
 */
export function MisGruposScreen({
  onSalir,
  onAbrirGrupo,
  vista,
  cargando,
  fallo,
  detalle,
  recargar,
  rotuloDeVolver = 'Volver',
}: {
  onSalir: () => void;
  /** Entra a «Mi grupo» de ese grupo (quien llama también lo elige en la lectura del grupo). */
  onAbrirGrupo: (grupoId: string) => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
  detalle: string | null;
  recargar: () => void;
  rotuloDeVolver?: string;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const grupos = vista?.grupos ?? [];

  /* Con uno solo se entra directo (FR-002). Una vez: volver desde ahí no tiene que reabrirlo en bucle. */
  const yaEntro = useRef(false);
  useEffect(() => {
    if (yaEntro.current || cargando || fallo || grupos.length !== 1) return;
    yaEntro.current = true;
    onAbrirGrupo(grupos[0].id);
  }, [cargando, fallo, grupos, onAbrirGrupo]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Presionable
          onPress={onSalir}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={rotuloDeVolver === 'Volver' ? 'Volver' : `Volver a ${rotuloDeVolver}`}
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>{rotuloDeVolver}</Text>
        </Presionable>
      </View>

      <ScrollView
        {...barraAlDesplazar}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          estilos.contenido,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
      >
        <Aparicion>
          <Text style={[t.screenTitle, { color: c.text, fontSize: 21 }]}>Mis grupos</Text>
        </Aparicion>

        {cargando ? <CargandoCelula /> : null}
        {!cargando && fallo ? <EstadoCelula fallo={fallo} detalle={detalle} onReintentar={recargar} /> : null}

        {!cargando && !fallo && vista && hayVariosGrupos(grupos.length) ? (
          <Aparicion retardo={40} style={{ marginTop: 14 }}>
            <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              {grupos.map((g, i) => (
                <FilaDeGrupo key={g.id} grupoId={g.id} nombre={g.nombre} conSeparador={i > 0} onAbrir={() => onAbrirGrupo(g.id)} />
              ))}
            </View>
          </Aparicion>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaDeGrupo({ grupoId, nombre, conSeparador, onAbrir }: { grupoId: string; nombre: string; conSeparador: boolean; onAbrir: () => void }) {
  const { c, t } = useTheme();
  const lectura = useSemaforoDelGrupo({ quien: 'mentor', grupoId });
  const total = lectura.datos?.resumen?.total ?? lectura.datos?.aprendices.length ?? null;
  return (
    <Presionable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={total === null ? `Abrir ${nombre}` : `Abrir ${nombre}, ${cantidadDeAprendices(total)}`}
      style={[estilos.fila, conSeparador ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
    >
      <Text style={[t.cardTitle, { color: c.textStrong, flex: 1, flexShrink: 1 }]} numberOfLines={2}>
        {nombre}
      </Text>
      {total !== null ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, fontVariant: ['tabular-nums'] }]}>{cantidadDeAprendices(total)}</Text>
      ) : null}
      <Icon name="chevron" size={14} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: ALTO_DE_TOQUE },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  tarjeta: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 10 },
});
