import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { VistaSemaforoDelGrupo } from '../../semaforo/components/TablaDelSemaforo';
import { useSemaforoDelGrupo, type InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import { CabeceraAdmin } from '../components/CabeceraAdmin';

/**
 * La tabla del semáforo de un grupo, CON nombres, para administración y alquimista
 * (`GET /api/v1/admin/semaforo/groups/{groupId}`, contrato §4.3). **Es el mismo componente de tabla
 * que ve el mentor** (`VistaSemaforoDelGrupo`): dos tablas distintas serían dos verdades.
 *
 * Las filas no se abren: la persona se mira en su ficha (Personas), que ya tiene su tarjeta del
 * semáforo. Abre en la misma semana que se estaba mirando en el resumen.
 */
export function SemaforoGrupoAdminScreen({
  grupoId,
  grupoNombre,
  inicio,
  onVolver,
}: {
  grupoId: string;
  /** El nombre que ya se conocía por el resumen, para no dejar la cabecera vacía mientras carga. */
  grupoNombre: string | null;
  inicio?: InicioSemanal;
  onVolver: () => void;
}) {
  const { c } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const lectura = useSemaforoDelGrupo({ quien: 'admin', grupoId }, inicio);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const titulo = lectura.datos?.grupoNombre?.trim() || grupoNombre?.trim() || 'Grupo';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={titulo} subtitulo="Semáforo del grupo" onVolver={onVolver} />
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
        <VistaSemaforoDelGrupo lectura={lectura} />
      </ScrollView>
    </SafeAreaView>
  );
}
