import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import type { SeccionAdmin } from '../types/admin.types';
import { usePendientesAdmin } from '../hooks/usePendientesAdmin';

/**
 * La raíz de Administración: qué hay pendiente y por dónde se entra.
 *
 * El orden no es alfabético ni por importancia abstracta: primero lo que tiene una cola —grupos
 * que están por cerrar, personas sin grupo, solicitudes sin decidir—, y debajo el resto. Es el
 * mismo criterio de la app entera: resumen antes que detalle (AGENTS.md §4, público de 50 a 60).
 *
 * Los contadores solo aparecen cuando hay una lectura REAL detrás. Un panel que no responde deja
 * su fila sin número y con un aviso propio; no pone cero, que es una afirmación distinta, y no
 * arrastra a los demás paneles con él (ARF-02).
 */
export function AdminInicioScreen({
  onSalir,
  onAbrir,
}: {
  onSalir: () => void;
  onAbrir: (seccion: SeccionAdmin) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const pendientes = usePendientesAdmin();

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const colas: Array<{ clave: SeccionAdmin; titulo: string; detalle: string; contador: number | null; fallo: boolean }> = [
    {
      clave: 'grupos',
      titulo: 'Grupos por vencer',
      detalle: 'Cierran en los próximos días',
      contador: pendientes.gruposPorVencer,
      fallo: pendientes.falloGrupos,
    },
    {
      clave: 'personas',
      titulo: 'Personas sin grupo',
      detalle: 'Esperan que alguien las ubique',
      contador: pendientes.personasSinGrupo,
      fallo: pendientes.falloPersonas,
    },
    {
      clave: 'solicitudes',
      titulo: 'Solicitudes',
      detalle: 'Altas pendientes de decidir',
      contador: pendientes.solicitudesPendientes,
      fallo: pendientes.falloSolicitudes,
    },
  ];

  const secciones: Array<{ clave: SeccionAdmin; titulo: string; detalle: string }> = [
    { clave: 'grupos', titulo: 'Grupos', detalle: 'Crear, programar y componer' },
    { clave: 'personas', titulo: 'Personas', detalle: 'Ficha, hábitos y cumplimiento' },
    { clave: 'solicitudes', titulo: 'Solicitudes y bienvenida', detalle: 'Aprobar altas y ver su ingreso' },
    { clave: 'mas', titulo: 'Más opciones', detalle: 'Catálogo, soporte, staff y comunidad' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Administración"
        subtitulo="Operación del programa"
        onVolver={onSalir}
        accion={{ etiqueta: 'Mi programa', onPress: onSalir }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        <View style={{ gap: 10 }}>
          <MicroLabel>PENDIENTES</MicroLabel>
          {colas.map(cola => (
            <Pressable
              key={`cola-${cola.clave}-${cola.titulo}`}
              onPress={() => onAbrir(cola.clave)}
              accessibilityRole="button"
              accessibilityLabel={
                cola.contador === null
                  ? `${cola.titulo}. Sin datos`
                  : `${cola.titulo}. ${cola.contador}`
              }
              style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 15.5, fontWeight: '500' }]}>
                  {cola.titulo}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]}>
                  {cola.fallo ? 'No se pudo consultar ahora' : cola.detalle}
                </Text>
              </View>
              {/* Guion y no cero: que no se sepa no es que valga cero. */}
              <Text style={[t.cardTitle, { color: cola.contador ? c.goldInk : c.textSoft, fontSize: 20 }]}>
                {cola.contador === null ? '—' : String(cola.contador)}
              </Text>
              <Icon name="chevron" size={18} color={c.chevron} />
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <MicroLabel>SECCIONES</MicroLabel>
          {secciones.map(seccion => (
            <Pressable
              key={seccion.clave}
              onPress={() => onAbrir(seccion.clave)}
              accessibilityRole="button"
              accessibilityLabel={seccion.titulo}
              style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 15.5, fontWeight: '500' }]}>
                  {seccion.titulo}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]}>
                  {seccion.detalle}
                </Text>
              </View>
              <Icon name="chevron" size={18} color={c.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    flexWrap: 'wrap',
  },
});
