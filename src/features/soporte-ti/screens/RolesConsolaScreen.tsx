import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import type { RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { cuantosActivos, estaActivo, MAXIMO_DE_ROLES_ACTIVOS, resumenDelRol, rolesActivos } from '../utils/roles';
import { Insignia } from './FuncionalidadesConsolaScreen';

/**
 * Los roles personalizados (spec 002, fase 2, US7; contrato `fase-2.md` §4.5): roles que heredan de uno base y marcan
 * un subconjunto de sus funcionalidades. Los crea y edita Soporte TI; los asignan Administración y el Alquimista desde
 * Equipo y roles y al aprobar una solicitud. Activos arriba, inactivos abajo. Las filas solo se hunden al apretar.
 */
export function RolesConsolaScreen({
  roles,
  cargando,
  fallo,
  onRecargar,
  onAbrir,
  onNuevo,
  onVolver,
}: {
  roles: RolPersonalizadoConsola[] | null;
  cargando: boolean;
  fallo: string | null;
  onRecargar: () => void;
  onAbrir: (id: string) => void;
  onNuevo: () => void;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const activos = roles ? rolesActivos(roles) : [];
  const inactivos = roles ? roles.filter(r => !estaActivo(r)) : [];
  const lleno = activos.length >= MAXIMO_DE_ROLES_ACTIVOS;
  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Roles" subtitulo={roles ? cuantosActivos(roles) : 'Roles personalizados'} onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={cargando && roles !== null} onRefresh={onRecargar} tintColor={c.goldInk} colors={[c.goldInk]} />}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        <Text style={ayuda}>
          Cada rol hereda de uno base y tiene solo las funcionalidades que marques. Lo asignan Administración y el Alquimista.
        </Text>
        <BotonPrincipal etiqueta="Nuevo rol" icono="plus" onPress={onNuevo} deshabilitado={lleno} />
        {lleno ? <Text style={ayuda}>Ya hay {MAXIMO_DE_ROLES_ACTIVOS} roles activos: desactiva uno para crear otro.</Text> : null}

        {cargando && !roles ? <Text style={ayuda}>Cargando los roles…</Text> : null}
        {!cargando && fallo && !roles ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo}
            </Text>
            <BotonSecundario etiqueta="Reintentar" onPress={onRecargar} />
          </View>
        ) : null}
        {roles && roles.length === 0 ? <Text style={ayuda}>Todavía no hay roles personalizados.</Text> : null}

        {activos.length > 0 ? (
          <View style={{ gap: 8 }}>
            <TituloDeSeccion>Activos</TituloDeSeccion>
            {activos.map(rol => (
              <FilaDeRol key={rol.id} rol={rol} onPress={() => onAbrir(rol.id)} />
            ))}
          </View>
        ) : null}
        {inactivos.length > 0 ? (
          <View style={{ gap: 8 }}>
            <TituloDeSeccion detalle="Sus personas tienen el rol base solo, sin restricciones.">Inactivos</TituloDeSeccion>
            {inactivos.map(rol => (
              <FilaDeRol key={rol.id} rol={rol} onPress={() => onAbrir(rol.id)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaDeRol({ rol, onPress }: { rol: RolPersonalizadoConsola; onPress: () => void }) {
  const { c, t } = useTheme();
  const resumen = resumenDelRol(rol);
  const activo = estaActivo(rol);
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rol.nombre}. ${resumen}${activo ? '' : '. Inactivo'}`}
      style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
    >
      <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
        <View style={estilos.titulo}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media, flexShrink: 1 }]}>{rol.nombre}</Text>
          {activo ? null : <Insignia texto="Inactivo" />}
        </View>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{resumen}</Text>
        {rol.descripcion?.trim() ? (
          <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]} numberOfLines={2}>
            {rol.descripcion.trim()}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 56 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
