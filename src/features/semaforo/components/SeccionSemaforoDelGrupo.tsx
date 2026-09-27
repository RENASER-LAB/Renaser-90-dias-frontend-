import React from 'react';
import { View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { TituloDeSeccion } from '../../../components/Legible';
import type { LecturaDelGrupo } from '../hooks/useLecturaPorSemana';
import { seOcultaLaSeccion } from '../utils/entradasDelSemaforo';
import { VistaSemaforoDelGrupo } from './TablaDelSemaforo';

/**
 * El semáforo del grupo dentro de «Mi grupo» (vista del mentor): `GET /api/v1/mentor/groups/{g}/semaforo`.
 *
 * **Desde el 26/09 (S-1) es lo primero de la pantalla** y se titula «Necesitan tu ayuda esta semana»:
 * arriba quien está en rojo o amarillo, abajo el resto. El indicador que convivía con esta sección
 * («requieren seguimiento / al día / sin datos», de `mentor/reglas.ts`) se quitó: nunca recibía datos
 * (`mentorApi.ts` los mandaba en `null`) y decía «sin avance registrado» de todo el mundo.
 *
 * La lectura la hace la pantalla y llega por props: así «Mi grupo» sabe si el semáforo respondió y,
 * si no (404 o 403), muestra la lista simple del grupo en su lugar. Con 404 o 403 esta sección no se
 * dibuja.
 */
export function SeccionSemaforoDelGrupo({
  lectura,
  onAbrirAprendiz,
}: {
  lectura: LecturaDelGrupo;
  /** Qué hacer al tocar a alguien; `undefined` para una fila que no se abre (ya no está en el grupo). */
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
}) {
  if (seOcultaLaSeccion(lectura)) return null;

  return (
    <Aparicion retardo={40} style={{ marginTop: 18 }}>
      <View style={{ gap: 10 }}>
        <TituloDeSeccion>Necesitan tu ayuda esta semana</TituloDeSeccion>
        <VistaSemaforoDelGrupo lectura={lectura} onAbrirAprendiz={onAbrirAprendiz} partirPorAyuda />
      </View>
    </Aparicion>
  );
}
