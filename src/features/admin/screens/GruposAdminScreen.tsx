import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { EstadoDeGrupo } from '../components/EstadoDeGrupo';
import { useGruposAdmin, type FiltroGrupos } from '../hooks/useGruposAdmin';
import { rangoDeFechas } from '../utils/fechas';

const FILTROS: Array<{ clave: FiltroGrupos; etiqueta: string }> = [
  { clave: 'vigentes', etiqueta: 'Vigentes' },
  { clave: 'programados', etiqueta: 'Programados' },
  { clave: 'cerrados', etiqueta: 'Cerrados' },
  { clave: 'todos', etiqueta: 'Todos' },
];

/**
 * Los grupos, con su período y su composición a la vista.
 *
 * Los filtros van en una sola fila de pastillas y no en pestañas estrechas: con cuatro tramos y
 * títulos de una palabra, unas pestañas de 80 px en un teléfono de 360 dejarían el texto cortado.
 *
 * El grupo cerrado NO desaparece: administración conserva su historia (ARF-18). Lo que cambia es
 * que deja de ofrecer acciones de composición, porque componer un grupo terminado no significa
 * nada.
 */
export function GruposAdminScreen({
  onVolver,
  onAbrirGrupo,
  onCrear,
}: {
  onVolver: () => void;
  onAbrirGrupo: (grupoId: string) => void;
  onCrear: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { grupos, cargando, error, filtro, setFiltro, recargar } = useGruposAdmin();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Grupos"
        onVolver={onVolver}
        accion={{ etiqueta: 'Crear', onPress: onCrear }}
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        <View style={estilos.filtros}>
          {FILTROS.map(f => {
            const activo = filtro === f.clave;
            return (
              <Pressable
                key={f.clave}
                onPress={() => setFiltro(f.clave)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={f.etiqueta}
                style={[
                  estilos.pastilla,
                  { borderColor: activo ? c.goldInk : c.border, backgroundColor: activo ? c.goldWash : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    t.body,
                    { color: activo ? c.goldInk : c.textSoft, fontSize: 13.5, fontWeight: activo ? '700' : '400' },
                  ]}
                >
                  {f.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 24 }} /> : null}

        {error ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <Text style={[t.body, { color: c.danger, fontSize: 14 }]}>{error}</Text>
            <Pressable onPress={recargar} accessibilityRole="button" style={estilos.reintentar}>
              <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontWeight: '500' }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {!cargando && !error && grupos.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, marginTop: 12 }]}>
            No hay grupos en este tramo. Cambiá el filtro o creá uno nuevo.
          </Text>
        ) : null}

        {grupos.map(grupo => (
          <Pressable
            key={grupo.id}
            onPress={() => onAbrirGrupo(grupo.id)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${grupo.nombre}`}
            style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}
          >
            <View style={estilos.encabezado}>
              <Text style={[t.cardTitle, { color: c.textStrong, flexShrink: 1 }]} numberOfLines={1}>
                {grupo.nombre}
              </Text>
              <EstadoDeGrupo estado={grupo.estado} />
            </View>
            <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 4 }]}>
              {rangoDeFechas(grupo.periodoInicio, grupo.periodoFin)}
              {grupo.aprendices !== null
                ? ` · ${grupo.aprendices}${grupo.cupo ? ` de ${grupo.cupo}` : ''} aprendices`
                : ''}
            </Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 2 }]}>
              {grupo.mentorNombre ? `Mentor: ${grupo.mentorNombre}` : 'Sin mentor asignado'}
              {grupo.tipo === 'RECEPCION' ? ' · Bienvenida' : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  pastilla: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reintentar: { minHeight: 48, justifyContent: 'center' },
});
