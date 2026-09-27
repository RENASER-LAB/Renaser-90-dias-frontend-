import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { LecturaDelGrupo } from '../hooks/useLecturaPorSemana';
import { TituloDeSeccion } from '../../../components/Legible';
import type { AprendizDelSemaforo, SemaforoDelGrupo } from '../types/semaforo.types';
import { partirPorAyuda } from '../utils/ayudaDelSemaforo';
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
  partirPorAyuda: partir = false,
}: {
  grupo: SemaforoDelGrupo;
  /** Qué hacer al tocar a alguien. Devuelve `undefined` para una fila que no se abre. */
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
  /**
   * «Mi grupo» del mentor (26/09, S-1): arriba «Necesitan tu ayuda esta semana» (rojo y amarillo),
   * abajo el resto. Administración ve la tabla entera, como antes.
   */
  partirPorAyuda?: boolean;
}) {
  const { c, t } = useTheme();
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  if (grupo.aprendices.length === 0) {
    return (
      <View style={{ gap: 12 }}>
        {grupo.resumen ? <CantidadesPorColor resumen={grupo.resumen} /> : null}
        <Text style={cuerpo}>No hay aprendices que mostrar en estos días.</Text>
      </View>
    );
  }

  if (!partir) {
    return (
      <View style={{ gap: 12 }}>
        {grupo.resumen ? <CantidadesPorColor resumen={grupo.resumen} /> : null}
        <ListaDeAprendices aprendices={grupo.aprendices} onAbrirAprendiz={onAbrirAprendiz} />
      </View>
    );
  }

  const { necesitan, resto } = partirPorAyuda(grupo.aprendices);
  const hayMedidos = grupo.aprendices.some(a => a.color === 'VERDE');
  return (
    <View style={{ gap: 12 }}>
      {necesitan.length > 0 ? (
        <ListaDeAprendices aprendices={necesitan} onAbrirAprendiz={onAbrirAprendiz} />
      ) : (
        <Text style={cuerpo}>
          {hayMedidos ? 'Nadie necesita ayuda esta semana.' : 'Todavía no hay actividad para medir esta semana.'}
        </Text>
      )}
      {resto.length > 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <TituloDeSeccion>El resto del grupo</TituloDeSeccion>
          <ListaDeAprendices aprendices={resto} onAbrirAprendiz={onAbrirAprendiz} />
        </View>
      ) : null}
      {grupo.resumen ? <CantidadesPorColor resumen={grupo.resumen} /> : null}
    </View>
  );
}

function ListaDeAprendices({
  aprendices,
  onAbrirAprendiz,
}: {
  aprendices: AprendizDelSemaforo[];
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
}) {
  const { c } = useTheme();
  return (
    <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      {aprendices.map((aprendiz, i) => (
        <FilaAprendizDelSemaforo
          key={aprendiz.aprendizId}
          aprendiz={aprendiz}
          primera={i === 0}
          onPress={onAbrirAprendiz?.(aprendiz.aprendizId)}
        />
      ))}
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
  partirPorAyuda: partir = false,
}: {
  lectura: LecturaDelGrupo;
  onAbrirAprendiz?: (aprendizId: string) => (() => void) | undefined;
  partirPorAyuda?: boolean;
}) {
  return (
    <View style={{ gap: 14 }}>
      <NavegacionDeSemanas lectura={lectura} />
      {lectura.datos ? (
        <TablaDelSemaforo grupo={lectura.datos} onAbrirAprendiz={onAbrirAprendiz} partirPorAyuda={partir} />
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
