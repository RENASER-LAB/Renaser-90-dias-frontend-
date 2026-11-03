import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import type { InicioSemanal, LecturaDeGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import type { GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { ListaDeMisMentores } from '../components/ListaDeMisMentores';

/**
 * «Mis mentores», el panel del líder de mentores (2026-10-31, pedido del dueño: «debe ir dentro de Administración, lo mismo de cada
 * uno, no en Hoy de cada rol»). Es una pantalla completa que se abre desde la fila «Mis mentores» de Yo, con la cabecera
 * «‹ Mis mentores» de siempre (`CabeceraAdmin`, la misma de Administración, la Caja y los ajustes) y UN solo scroll.
 *
 * Adentro, la lista de siempre (`ListaDeMisMentores`): el resultado por grupo, las consultas de mentores, el padrón con el reporte del
 * mes y «Todos los aprendices». Cada fila abre su pantalla de siempre; el atrás del sistema sube un nivel por vez hasta Yo.
 */
export function MisMentoresEnYo({
  lectura,
  verGrupos,
  verConsultas,
  verMentores,
  verTodos,
  verHabitos,
  onVolver,
  onAbrirGrupo,
  onAbrirConsultas,
  onAbrirMentores,
  onAbrirTodos,
  onAbrirHabitos,
}: {
  lectura: LecturaDeGrupos;
  verGrupos: boolean;
  verConsultas: boolean;
  verMentores: boolean;
  verTodos: boolean;
  verHabitos: boolean;
  onVolver: () => void;
  onAbrirGrupo: (grupo: GrupoDelResumen, inicio: InicioSemanal) => void;
  onAbrirConsultas: () => void;
  onAbrirMentores: () => void;
  onAbrirTodos: () => void;
  onAbrirHabitos: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Mis mentores" onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <ListaDeMisMentores
          lectura={lectura}
          verGrupos={verGrupos}
          verConsultas={verConsultas}
          verMentores={verMentores}
          verTodos={verTodos}
          verHabitos={verHabitos}
          onAbrirGrupo={onAbrirGrupo}
          onAbrirConsultas={onAbrirConsultas}
          onAbrirMentores={onAbrirMentores}
          onAbrirTodos={onAbrirTodos}
          onAbrirHabitos={onAbrirHabitos}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
