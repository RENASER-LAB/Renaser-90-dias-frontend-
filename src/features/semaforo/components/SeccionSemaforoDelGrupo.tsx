import React from 'react';
import { View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { MicroLabel } from '../../../components/ui';
import { useSemaforoDelGrupo } from '../hooks/useLecturaPorSemana';
import { seOcultaLaSeccion } from '../utils/entradasDelSemaforo';
import { VistaSemaforoDelGrupo } from './TablaDelSemaforo';

/**
 * «Semáforo del grupo» dentro de «Mi grupo» (vista del mentor): `GET /api/v1/mentor/groups/{g}/semaforo`,
 * con las cantidades por color, una fila por aprendiz y la navegación de semanas.
 *
 * Convive con lo que la pantalla ya tenía («requieren seguimiento / al día / sin datos», que sale de
 * `mentor/reglas.ts`): son indicadores distintos y ninguno reemplaza al otro.
 *
 * Pide sus datos por su cuenta y **no se dibuja** si el servidor todavía no tiene la ruta (404) o si
 * el mentor ya no acompaña este grupo (403): el resto de la pantalla queda exactamente como estaba.
 */
export function SeccionSemaforoDelGrupo({
  grupoId,
  onAbrirAprendiz,
}: {
  grupoId: string;
  /** Qué hacer al tocar a alguien; `undefined` para una fila que no se abre (ya no está en el grupo). */
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
}) {
  const lectura = useSemaforoDelGrupo({ quien: 'mentor', grupoId });

  if (seOcultaLaSeccion(lectura)) return null;

  return (
    <Aparicion retardo={100} style={{ marginTop: 22 }}>
      <View style={{ gap: 10 }}>
        <MicroLabel>Semáforo del grupo</MicroLabel>
        <VistaSemaforoDelGrupo lectura={lectura} onAbrirAprendiz={onAbrirAprendiz} />
      </View>
    </Aparicion>
  );
}
