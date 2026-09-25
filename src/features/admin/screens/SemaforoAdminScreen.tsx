import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { ResumenDeGrupos } from '../../semaforo/components/ResumenDeGrupos';
import { useResumenPorGrupos, type InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import type { GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { CabeceraAdmin } from '../components/CabeceraAdmin';

/**
 * El semáforo en Administración: el resumen por grupos (`GET /api/v1/semaforo/groups`, contrato
 * §4.4) —el mismo que ve el líder de mentores—, y tocar un grupo abre su tabla CON nombres por la
 * puerta de administración (§4.3). Es de lectura: nadie cambia un semáforo desde acá.
 *
 * Se abre desde la raíz de Administración y desde el aviso del sábado (`/semaforo/grupos`).
 */
export function SemaforoAdminScreen({
  onVolver,
  onAbrirGrupo,
}: {
  onVolver: () => void;
  /** Con la semana que se estaba mirando, para que la tabla del grupo abra en la misma. */
  onAbrirGrupo: (grupo: GrupoDelResumen, inicio: InicioSemanal) => void;
}) {
  const { c } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const lectura = useResumenPorGrupos(true);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Semáforo" subtitulo="Cumplimiento de cada grupo" onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 4,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <ResumenDeGrupos
          lectura={lectura}
          ayudaPorGrupo="Toca un grupo para ver a cada aprendiz."
          onAbrirGrupo={grupo => onAbrirGrupo(grupo, lectura.inicio)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
