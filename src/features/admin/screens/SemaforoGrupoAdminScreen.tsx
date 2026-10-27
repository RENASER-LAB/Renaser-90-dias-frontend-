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
import type { PersonaDeFicha } from '../types/admin.types';
import { destinoDeLaPersonaDelSemaforo } from '../utils/susDiasYEvidencias';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * La tabla del semáforo de un grupo, CON nombres, para administración y alquimista
 * (`GET /api/v1/admin/semaforo/groups/{groupId}`, contrato §4.3). **Es el mismo componente de tabla
 * que ve el mentor** (`VistaSemaforoDelGrupo`): dos tablas distintas serían dos verdades.
 *
 * Tocar una fila abre la ficha de esa persona (26/09, S-3: llegar a alguien en 4 toques o menos:
 * Administración → Semáforo → grupo → persona). Abre en la misma semana que se estaba mirando en el
 * resumen.
 *
 * > **Corregido 2026-09-26.** Decía «las filas no se abren: la persona se mira en su ficha
 * > (Personas)». Eso obligaba a salir, ir a Personas y buscarla por nombre.
 *
 * **Sus días y evidencias, como el líder** (2026-10-27): si el servidor dice que el grupo se puede abrir
 * (`puedeAbrirse`: tiene mentor), tocar a una persona abre sus días y evidencias (`PersonaDelLiderScreen`) en la
 * ventana que se está mirando, con un botón a su ficha; con un grupo sin mentor, su ficha de siempre.
 */
export function SemaforoGrupoAdminScreen({
  grupoId,
  grupoNombre,
  inicio,
  puedeAbrirse = false,
  onVolver,
  onAbrirAprendiz,
  onAbrirDiasYEvidencias,
}: {
  grupoId: string;
  /** El nombre que ya se conocía por el resumen, para no dejar la cabecera vacía mientras carga. */
  grupoNombre: string | null;
  inicio?: InicioSemanal;
  /** Lo dijo el resumen por grupos para ESTE grupo: tiene mentor y se puede bajar a sus personas. */
  puedeAbrirse?: boolean;
  onVolver: () => void;
  /** Abre la ficha de la persona tocada. Se reusa la ficha de Personas. */
  onAbrirAprendiz: (persona: PersonaDeFicha) => void;
  /** Abre sus días y evidencias en la ventana que se está mirando. Sin esto, la persona siempre abre su ficha. */
  onAbrirDiasYEvidencias?: (abierta: { persona: PersonaDeFicha; avatarUrl: string | null; inicio: InicioSemanal }) => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
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
        {...barraAlDesplazar}
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
        <VistaSemaforoDelGrupo
          lectura={lectura}
          onAbrirAprendiz={aprendizId => {
            const fila = lectura.datos?.aprendices.find(a => a.aprendizId === aprendizId);
            const persona: PersonaDeFicha = { id: aprendizId, fullName: fila?.nombre ?? null, cellId: grupoId };
            if (onAbrirDiasYEvidencias && destinoDeLaPersonaDelSemaforo({ puedeAbrirse }) === 'dias-y-evidencias') {
              return () => onAbrirDiasYEvidencias({ persona, avatarUrl: fila?.avatarUrl ?? null, inicio: lectura.inicio });
            }
            return () => onAbrirAprendiz(persona);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
