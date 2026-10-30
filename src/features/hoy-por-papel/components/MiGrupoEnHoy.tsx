import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { AvatarPersona } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { FalloCelula, VistaCelula } from '../../mentor/hooks/useCelulaQueAcompano';
import type { AlumnoConEstado } from '../../mentor/types/mentor.types';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { useSemaforoDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import { estadoDeLaFilaEnPalabras, porcentajeDeLaFila, rotuloDelGrupo } from '../utils/textosDeLasListas';
import { FilaDeLista, ListaDeFilas } from './FilaDeLista';

/**
 * «Mi grupo» de Hoy (spec 018): la lista de los aprendices del grupo que acompaña, cada uno con su foto, su color y su
 * porcentaje de los últimos 7 días. Tocar a uno abre su ficha, la de siempre (`AlumnoScreen`); el rótulo de arriba abre
 * el grupo entero (`MiCelulaScreen`: el chat, la info y, si acompaña varios, el selector).
 *
 * El color y el porcentaje son los del semáforo del grupo (`GET /mentor/groups/{g}/semaforo`, el mismo que lee «Mi
 * grupo» por dentro): la app no los calcula, y el orden es el del servidor (primero quien más lo necesita). Si esa
 * lectura no está —404, 403, sin red—, la lista sale igual, con los nombres y sin color: nunca queda vacía por un dato
 * que falta.
 */
export function MiGrupoEnHoy({
  vista,
  cargando,
  fallo,
  onReintentar,
  onAbrirGrupo,
  onAbrirAlumno,
}: {
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
  onReintentar: () => void;
  onAbrirGrupo: () => void;
  onAbrirAlumno: (alumno: AlumnoConEstado) => void;
}) {
  const { c, t } = useTheme();
  const grupoId = vista?.celula.id ?? null;
  const semaforo = useSemaforoDelGrupo(grupoId ? { quien: 'mentor', grupoId } : null);

  if (!vista) {
    if (fallo && fallo !== 'sin_celula') {
      return <FalloDeLectura fallo={fallo} que="tu grupo" onReintentar={onReintentar} />;
    }
    return cargando ? <CargandoLectura texto="Cargando tu grupo…" /> : null;
  }

  const rotulo = rotuloDelGrupo(vista.celula.nombre, vista.todos.length);
  const delSemaforo = semaforo.datos?.aprendices ?? [];
  const alumnoDe = (id: string) => vista.todos.find(a => a.participanteId === id);

  return (
    <View style={estilos.cuerpo}>
      <Presionable
        onPress={onAbrirGrupo}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}. Abrir el grupo.`}
        style={estilos.rotulo}
      >
        <Text style={[t.cardTitle, { color: c.textStrong, flex: 1 }]} numberOfLines={2}>
          {rotulo}
        </Text>
        <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
      </Presionable>

      {vista.todos.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          Todavía no tienes aprendices asignados.
        </Text>
      ) : (
        <ListaDeFilas>
          {delSemaforo.length > 0
            ? delSemaforo.map((fila, i) => {
                const alumno = alumnoDe(fila.aprendizId);
                const nombre = fila.nombre?.trim() || alumno?.nombre?.trim() || 'Aprendiz sin nombre';
                const { relleno, tinta } = coloresDelSemaforo(fila.color, c);
                return (
                  <FilaDeLista
                    key={fila.aprendizId}
                    primera={i === 0}
                    izquierda={<AvatarPersona nombre={nombre} avatarUrl={fila.avatarUrl} size={40} />}
                    titulo={nombre}
                    derecha={
                      <View style={estilos.estado}>
                        <View accessible={false} style={[estilos.punto, { backgroundColor: relleno }]} />
                        <Text style={[t.cardTitle, estilos.cifra, { color: fila.porcentaje === null ? c.textSoft : tinta }]}>
                          {porcentajeDeLaFila(fila.porcentaje)}
                        </Text>
                      </View>
                    }
                    onPress={alumno ? () => onAbrirAlumno(alumno) : undefined}
                    etiquetaAccesible={`${nombre}. ${estadoDeLaFilaEnPalabras(fila.porcentaje, fila.color, fila.etiqueta)}.${
                      alumno ? ' Abrir su ficha.' : ''
                    }`}
                  />
                );
              })
            : vista.todos.map((alumno, i) => {
                const nombre = alumno.nombre?.trim() || 'Aprendiz sin nombre';
                return (
                  <FilaDeLista
                    key={alumno.participanteId}
                    primera={i === 0}
                    izquierda={<AvatarPersona nombre={nombre} size={40} />}
                    titulo={nombre}
                    onPress={() => onAbrirAlumno(alumno)}
                    etiquetaAccesible={`${nombre}. Abrir su ficha.`}
                  />
                );
              })}
        </ListaDeFilas>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12 },
  /* 48 de alto como mínimo: es un botón (AGENTS.md §4). */
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  /* Cifras tabulares: 78.3 y 100 no bailan de ancho de una fila a la otra. */
  cifra: { fontVariant: ['tabular-nums'] },
});
