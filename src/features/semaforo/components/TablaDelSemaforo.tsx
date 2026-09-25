import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { LecturaDelGrupo } from '../hooks/useLecturaPorSemana';
import type { SemaforoDelGrupo } from '../types/semaforo.types';
import { CantidadesPorColor } from './CantidadesPorColor';
import { CargandoLectura, FalloDeLectura } from './EstadoDeLectura';
import { FilaAprendizDelSemaforo } from './FilaAprendizDelSemaforo';
import { NavegacionDeSemanas } from './NavegacionDeSemanas';

/**
 * La tabla del semáforo de un grupo (§4.3), la MISMA para el mentor y para administración: arriba
 * cuántos hay en cada color, abajo una fila por persona, en el orden del servidor (primero quien
 * más lo necesita).
 *
 * La lista se recorre con `map` dentro del scroll de la pantalla: un grupo son diez personas, y una
 * lista virtualizada adentro de otro scroll es el doble scroll que la guía prohíbe (AGENTS.md §2).
 */
export function TablaDelSemaforo({
  grupo,
  onAbrirAprendiz,
}: {
  grupo: SemaforoDelGrupo;
  /** Qué hacer al tocar a alguien. Devuelve `undefined` para una fila que no se abre. */
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
}) {
  const { c, t } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {grupo.resumen ? <CantidadesPorColor resumen={grupo.resumen} /> : null}
      {grupo.aprendices.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          No hay aprendices que mostrar en estos días.
        </Text>
      ) : (
        <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          {grupo.aprendices.map((aprendiz, i) => (
            <FilaAprendizDelSemaforo
              key={aprendiz.aprendizId}
              aprendiz={aprendiz}
              primera={i === 0}
              onPress={onAbrirAprendiz?.(aprendiz.aprendizId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * La tabla con su navegación de semanas y sus estados (cargando, fallo). Quien la usa decide antes
 * si un 404 o un 403 la esconden del todo (en el grupo del mentor, sí; en Administración se dice).
 */
export function VistaSemaforoDelGrupo({
  lectura,
  onAbrirAprendiz,
}: {
  lectura: LecturaDelGrupo;
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
}) {
  return (
    <View style={{ gap: 14 }}>
      <NavegacionDeSemanas lectura={lectura} />
      {lectura.datos ? (
        <TablaDelSemaforo grupo={lectura.datos} onAbrirAprendiz={onAbrirAprendiz} />
      ) : lectura.fallo ? (
        <FalloDeLectura
          fallo={lectura.fallo}
          detalle={lectura.detalleDelFallo}
          que="el semáforo del grupo"
          onReintentar={lectura.recargar}
        />
      ) : (
        <CargandoLectura texto="Cargando el semáforo del grupo…" />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  /* La misma caja que las listas de «Mi grupo» (borde 1, radio 16), con aire a los costados. */
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
});
