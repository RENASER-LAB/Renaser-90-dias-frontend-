import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { LecturaDeGrupos } from '../hooks/useLecturaPorSemana';
import type { GrupoDelResumen } from '../types/semaforo.types';
import { aprendicesEnPalabras, promedioEnPalabras, resumenEnPalabras } from '../utils/lecturaDelSemaforo';
import { CantidadesPorColor } from './CantidadesPorColor';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';
import { CargandoLectura, FalloDeLectura } from './EstadoDeLectura';
import { NavegacionDeSemanas } from './NavegacionDeSemanas';

/**
 * El resumen por grupos (§4.4): los totales y una tarjeta por grupo con su mentor, cuántos hay en
 * cada color y el promedio. **Sin un solo nombre de aprendiz** (RL-07): la respuesta no los trae y
 * esta vista no tiene dónde ponerlos.
 *
 * Lo usan el líder de mentores (solo mirar) y Administración (tocar un grupo abre su tabla, con
 * nombres, por la puerta de administración).
 */
export function ResumenDeGrupos({
  lectura,
  onAbrirGrupo,
  ayudaPorGrupo,
}: {
  lectura: LecturaDeGrupos;
  /** Sin esto las tarjetas no se tocan: el líder ve cantidades, no personas. */
  onAbrirGrupo?: (grupo: GrupoDelResumen) => void;
  /** Una línea bajo «Por grupo» que dice qué se puede hacer (o por qué no hay nombres). */
  ayudaPorGrupo?: string;
}) {
  const { c, t } = useTheme();
  const datos = lectura.datos;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <View style={{ gap: 16 }}>
      <NavegacionDeSemanas lectura={lectura} />
      {datos ? (
        <>
          {datos.totales ? (
            <View style={{ gap: 8 }}>
              <MicroLabel>Todos los grupos</MicroLabel>
              <CantidadesPorColor resumen={datos.totales} />
              <Text style={cuerpo}>
                {`${datos.grupos.length === 1 ? '1 grupo' : `${datos.grupos.length} grupos`} · ${aprendicesEnPalabras(
                  datos.totales.total,
                )}`}
              </Text>
            </View>
          ) : null}
          {datos.grupos.length === 0 ? (
            <Text style={cuerpo}>No hay grupos con mentor que mostrar en estos días.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              <MicroLabel>Por grupo</MicroLabel>
              {ayudaPorGrupo ? <Text style={cuerpo}>{ayudaPorGrupo}</Text> : null}
              {datos.grupos.map(grupo => (
                <TarjetaDeGrupo
                  key={grupo.grupoId}
                  grupo={grupo}
                  onPress={onAbrirGrupo ? () => onAbrirGrupo(grupo) : undefined}
                />
              ))}
            </View>
          )}
        </>
      ) : lectura.fallo ? (
        <FalloDeLectura
          fallo={lectura.fallo}
          detalle={lectura.detalleDelFallo}
          que="el semáforo por grupos"
          onReintentar={lectura.recargar}
        />
      ) : (
        <CargandoLectura texto="Cargando el semáforo de los grupos…" />
      )}
    </View>
  );
}

/** Un grupo: nombre, mentor, cantidades por color con palabras y el promedio con su color y su palabra. */
function TarjetaDeGrupo({ grupo, onPress }: { grupo: GrupoDelResumen; onPress?: () => void }) {
  const { c, t } = useTheme();
  const nombre = grupo.grupoNombre?.trim() || 'Grupo sin nombre';
  const promedio = promedioEnPalabras(grupo.promedio);
  const dicho = [
    nombre,
    grupo.mentorNombre ? `Mentor: ${grupo.mentorNombre}` : null,
    grupo.resumen ? resumenEnPalabras(grupo.resumen) : null,
    promedioEnPalabras(grupo.promedio, grupo.colorDelPromedio, grupo.etiquetaDelPromedio),
  ]
    .filter(Boolean)
    .join('. ');

  const contenido = (
    <>
      <View style={estilos.cabecera}>
        <Text style={[t.cardTitle, { color: c.textStrong, flex: 1, minWidth: 0 }]} numberOfLines={2}>
          {nombre}
        </Text>
        {onPress ? <Icon name="chevron" size={16} color={c.chevron} /> : null}
      </View>
      {grupo.mentorNombre ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>Mentor: {grupo.mentorNombre}</Text>
      ) : null}
      {grupo.resumen ? <CantidadesPorColor resumen={grupo.resumen} /> : null}
      <View style={estilos.promedio}>
        {/* El color del promedio lo manda el servidor; sin él (backend anterior), queda neutro. */}
        {grupo.colorDelPromedio ? (
          <EtiquetaSemaforo color={grupo.colorDelPromedio} etiqueta={grupo.etiquetaDelPromedio} />
        ) : null}
        <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] }]}>
          {grupo.resumen ? `${promedio} · ${aprendicesEnPalabras(grupo.resumen.total)}` : promedio}
        </Text>
      </View>
    </>
  );

  const caja = [estilos.tarjeta, { borderColor: c.border }];
  if (!onPress) {
    return (
      <View style={[caja, { backgroundColor: c.cardBg }]} accessible accessibilityLabel={dicho}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${dicho}. Abrir el semáforo del grupo.`}
      style={({ pressed }) => [caja, { backgroundColor: pressed ? c.goldWash : c.cardBg }]}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /* Misma caja que las tarjetas de Administración (radio 14, borde 1). */
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, width: '100%' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promedio: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 },
});
