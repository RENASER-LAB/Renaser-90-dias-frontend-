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
import { AvatarConSemaforo } from '../components/AvatarConSemaforo';
import type { FalloCelula, VistaCelula } from '../hooks/useCelulaQueAcompano';
import type { GrupoAnterior } from '../types/mentor.types';
import { comoCerroElGrupo, palabraDelColor, periodoDelGrupoAnterior } from '../utils/gruposAnteriores';
import { cantidadDeAprendices, hayVariosGrupos } from '../utils/entradaAMisGrupos';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * «Mis grupos» (spec 055, historia 1; FR-001 y FR-002): los grupos que el mentor acompaña hoy, cada uno con su nombre y, a la
 * derecha, cuántos aprendices tiene. Al tocar uno entra a «Mi grupo». Con un solo grupo y sin anteriores no se queda acá: entra directo.
 * Debajo, «Anteriores» (spec 057 FR-022): los grupos que acompañó y ya no, de solo lectura —tocarlos no abre fichas ni datos de hoy—;
 * sin anteriores no hay sección ni título.
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
  anteriores = [],
  anterioresListos = true,
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
  /** Spec 057 FR-022: los grupos que ya no acompaña (`useGruposAnteriores`). */
  anteriores?: GrupoAnterior[];
  /** `false` mientras llega la primera lectura de los anteriores: con un solo grupo no se entra directo sin saberlo. */
  anterioresListos?: boolean;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const grupos = vista?.grupos ?? [];

  const hayAnteriores = anteriores.length > 0;

  /* Con uno solo y sin anteriores se entra directo (FR-002; spec 057 FR-022: con anteriores se queda acá). Una vez: volver desde ahí no tiene que reabrirlo en bucle. */
  const yaEntro = useRef(false);
  useEffect(() => {
    if (yaEntro.current || cargando || fallo || grupos.length !== 1 || !anterioresListos || hayAnteriores) return;
    yaEntro.current = true;
    onAbrirGrupo(grupos[0].id);
  }, [cargando, fallo, grupos, onAbrirGrupo, anterioresListos, hayAnteriores]);

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

        {/* Un mentor que rotó y ya no acompaña ninguno (`sin_celula`) pero tiene anteriores no ve «no acompañas ningún grupo»: ve una línea y sus anteriores. */}
        {cargando || (fallo === 'sin_celula' && !anterioresListos) ? <CargandoCelula /> : null}
        {!cargando && fallo && !(fallo === 'sin_celula' && (!anterioresListos || hayAnteriores)) ? (
          <EstadoCelula fallo={fallo} detalle={detalle} onReintentar={recargar} />
        ) : null}
        {!cargando && fallo === 'sin_celula' && anterioresListos && hayAnteriores ? (
          <Text testID="sin-grupos-activos" style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 14 }]}>
            Hoy no acompañas ningún grupo
          </Text>
        ) : null}

        {!cargando && !fallo && vista && hayVariosGrupos(grupos.length, hayAnteriores) ? (
          <Aparicion retardo={40} style={{ marginTop: 14 }}>
            <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              {grupos.map((g, i) => (
                <FilaDeGrupo key={g.id} grupoId={g.id} nombre={g.nombre} conSeparador={i > 0} onAbrir={() => onAbrirGrupo(g.id)} />
              ))}
            </View>
          </Aparicion>
        ) : null}

        {!cargando && (!fallo || fallo === 'sin_celula') && hayAnteriores ? (
          <Aparicion retardo={80} style={estilos.anteriores}>
            <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong }]}>
              Anteriores
            </Text>
            {anteriores.map(g => (
              <GrupoAnteriorDeSoloLectura key={g.clave} grupo={g} />
            ))}
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

/** Un grupo anterior: nombre, período, cuántos aprendices tuvo, cómo cerró y sus nombres con su color final. Nada se toca. */
function GrupoAnteriorDeSoloLectura({ grupo }: { grupo: GrupoAnterior }) {
  const { c, t } = useTheme();
  const periodo = periodoDelGrupoAnterior(grupo);
  const palabra = palabraDelColor(grupo.colorFinal);
  const cierre = comoCerroElGrupo(grupo);
  const detalle = [periodo, grupo.aprendices === null ? null : cantidadDeAprendices(grupo.aprendices)].filter(Boolean).join(' · ');
  return (
    <View testID="grupo-anterior" style={[estilos.tarjeta, estilos.tarjetaAnterior, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={2}>
        {grupo.nombre}
      </Text>
      {detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, fontVariant: ['tabular-nums'] }]}>{detalle}</Text> : null}
      {cierre || palabra ? (
        <Text style={[t.body, { color: c.text, fontSize: 15 /* metadato */, fontVariant: ['tabular-nums'] }]}>
          {[cierre, palabra ? `color final ${palabra}` : null].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {grupo.personas.length > 0 ? (
        <View style={estilos.personas}>
          {grupo.personas.map((p, i) => (
            <View key={`${p.nombre}-${i}`} style={estilos.persona}>
              <AvatarConSemaforo nombre={p.nombre} color={p.colorFinal} size={28} />
              <Text style={[t.body, { color: c.text, fontSize: 15 /* metadato */, flexShrink: 1 }]} numberOfLines={1}>
                {p.nombre}
                {palabraDelColor(p.colorFinal) ? <Text style={{ color: c.textSoft }}>{` · ${palabraDelColor(p.colorFinal)}`}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  anteriores: { marginTop: 24, gap: 10 },
  tarjetaAnterior: { paddingVertical: 12, gap: 4 },
  personas: { marginTop: 8, gap: 8 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  barra: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: ALTO_DE_TOQUE },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  tarjeta: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 10 },
});
