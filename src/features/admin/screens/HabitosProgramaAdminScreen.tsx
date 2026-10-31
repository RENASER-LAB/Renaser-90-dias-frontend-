import { fuentes } from '../../../theme/fuentes';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import type { HabitoDelProgramaApi, RolElegibleApi } from '../api/habitosProgramaSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { ChipDeOpcion } from '../components/ChipDeOpcion';
import type { useHabitosProgramaAdmin } from '../hooks/useHabitosProgramaAdmin';
import {
  aplicaAlRol,
  etiquetaDeDimension,
  iconoDelHabito,
  rigeDesdeManana,
  rolesDe,
  SIN_PERMISO_DE_HABITOS,
  textoDeAudiencia,
} from '../utils/habitosPrograma';

/**
 * «Hábitos del programa» (pedido del dueño, 2026-10-12; spec 001 del backend, D-264): el catálogo global con
 * a quién llega cada hábito, filtrable por rol, y desde acá crear o abrir uno para editarlo. Solo llegan
 * ADMIN y ALCHEMIST (Administración se muestra por `canAdminister`); un 403 igual se dice con palabras.
 *
 * Movimiento (`emil-design-eng`): el filtro se toca seguido, así que cambia al instante, sin animación;
 * las filas solo responden al apretar (`Presionable`).
 */
export function HabitosProgramaAdminScreen({
  estado,
  onAbrir,
  onNuevo,
  onVolver,
}: {
  estado: ReturnType<typeof useHabitosProgramaAdmin>;
  onAbrir: (id: string) => void;
  onNuevo: () => void;
  onVolver: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { habitos, roles, cargando, fallo, recargar } = estado;
  const [rol, setRol] = useState<string | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const visibles = useMemo(() => (habitos ?? []).filter(h => aplicaAlRol(h, rol)), [habitos, rol]);
  const activos = visibles.filter(h => h.isActive);
  const inactivos = visibles.filter(h => !h.isActive);
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  const elegirRol = (codigo: string | null) => {
    if (codigo === rol) return;
    tacto.seleccion();
    setRol(codigo);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Hábitos del programa"
        subtitulo="Qué hábito le llega a cada rol"
        onVolver={onVolver}
        accion={habitos ? { etiqueta: 'Nuevo', onPress: onNuevo } : undefined}
      />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
      >
        {cargando && !habitos ? <Text style={cuerpo}>Cargando los hábitos…</Text> : null}
        {!cargando && fallo && !habitos ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo === 'sin_permiso'
                ? SIN_PERMISO_DE_HABITOS
                : fallo === 'sin_red'
                  ? 'Sin conexión con el servidor.'
                  : 'No se pudieron cargar los hábitos.'}
            </Text>
            {fallo !== 'sin_permiso' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
          </View>
        ) : null}

        {habitos ? (
          <>
            {roles.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
                  Ver los de
                </Text>
                <View style={estilos.chips} accessibilityRole="radiogroup">
                  <ChipDeOpcion etiqueta="Todos los roles" activo={rol === null} onPress={() => elegirRol(null)} />
                  {roles.map(r => (
                    <ChipDeOpcion key={r.code} etiqueta={r.name} activo={rol === r.code} onPress={() => elegirRol(r.code)} />
                  ))}
                </View>
              </View>
            ) : null}

            {visibles.length === 0 ? (
              <Text style={cuerpo}>{rol ? 'Ningún hábito llega a este rol.' : 'Todavía no hay hábitos en el programa.'}</Text>
            ) : null}
            {activos.length > 0 ? (
              <Grupo titulo={`Activos · ${activos.length}`}>
                {activos.map(h => (
                  <FilaDeHabito key={h.id} habito={h} roles={roles} onPress={() => onAbrir(h.id)} />
                ))}
              </Grupo>
            ) : null}
            {inactivos.length > 0 ? (
              <Grupo titulo={`Inactivos · ${inactivos.length}`} detalle="No le llegan a nadie hasta que los actives.">
                {inactivos.map(h => (
                  <FilaDeHabito key={h.id} habito={h} roles={roles} onPress={() => onAbrir(h.id)} />
                ))}
              </Grupo>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Grupo({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <TituloDeSeccion detalle={detalle}>{titulo}</TituloDeSeccion>
      {children}
    </View>
  );
}

function FilaDeHabito({
  habito,
  roles,
  onPress,
}: {
  habito: HabitoDelProgramaApi;
  roles: readonly RolElegibleApi[];
  onPress: () => void;
}) {
  const { c, t } = useTheme();
  const audiencia = textoDeAudiencia(rolesDe(habito), roles);
  const pendiente = rigeDesdeManana(habito);
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${habito.title}. ${etiquetaDeDimension(habito.category)}. ${audiencia}${pendiente ? '. Rige desde mañana' : ''}`}
      style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border, opacity: habito.isActive ? 1 : 0.72 }]}
    >
      <View style={[estilos.baldosa, { backgroundColor: c.goldWash }]}>
        <Icon name={iconoDelHabito(habito.category)} size={20} color={c.gold} />
      </View>
      <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
        <Text numberOfLines={2} style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
          {habito.title}
        </Text>
        <Text numberOfLines={2} style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
          {audiencia}
        </Text>
        {pendiente ? (
          <Text style={[t.body, { color: c.gold, fontSize: 16, fontFamily: fuentes.media }]}>Rige desde mañana</Text>
        ) : null}
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 56 },
  baldosa: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
