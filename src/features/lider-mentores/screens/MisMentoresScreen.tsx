import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TituloDeSeccion } from '../../../components/Legible';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { FilaDeMentorConCupo } from '../components/FilaDeMentorConCupo';
import { FilaPorResolver } from '../components/FilaPorResolver';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useMisMentores } from '../hooks/useMisMentores';
import type { FiltroDeGrupos } from '../types/gruposDelLider.types';
import { TODAS_LAS_ENTRADAS, cuposLibresEnPalabras, filasPorResolver, ordenarPorUrgencia, type EntradasDelLider } from '../utils/misMentores';

/**
 * «Mis mentores» (spec 056 historia 1, propuesta aprobada el 18/11), la entrada del líder. En una pantalla y sin textos de ayuda:
 *
 * 1. **Por resolver**, directo: hasta tres filas con su símbolo, una cifra corta y UN botón (grupos sin mentor → «Asignar»; consultas → «Recordar»;
 *    el mentor que peor va → «Ver»). Lo que no hay que resolver no aparece, y sin nada la sección tampoco.
 * 2. **Los mentores**, por urgencia, cada uno con su cupo, sus aprendices por estado (con su forma) y la barra de colores.
 * 3. **Accesos** al pie: Grupos, Consultas (con su cantidad), Reporte del mes y Todos los aprendices.
 *
 * Sin la insignia del rol en la cabecera (FR-001). Un solo scroll: `MarcoDelLider`.
 */
export function MisMentoresScreen({
  onVolver,
  onAbrirMentor,
  onAbrirGrupos,
  onAbrirConsultas,
  onAbrirReporte,
  onAbrirTodos,
  onAbrirHabitos,
  entradas = TODAS_LAS_ENTRADAS,
}: {
  /** Qué entradas le tocan a la cuenta (interruptores de Soporte TI): una apagada no se ofrece. Sin decirlo, todas. */
  entradas?: EntradasDelLider;
  onVolver: () => void;
  onAbrirMentor: (mentorId: string, nombre: string) => void;
  onAbrirGrupos: (filtro?: FiltroDeGrupos) => void;
  onAbrirConsultas: () => void;
  onAbrirReporte: () => void;
  /** Ausente = el servidor no ofrece «Todos los aprendices»: la fila no se dibuja. */
  onAbrirTodos?: () => void;
  /** «Hábitos de todos» (spec 029): solo si el servidor la ofrece. */
  onAbrirHabitos?: () => void;
}) {
  const lectura = useMisMentores();
  const { padron, porResolver } = lectura;
  const filas = filasPorResolver(porResolver, entradas);
  const mentores = padron ? ordenarPorUrgencia(padron.mentors) : [];
  const consultas = porResolver?.consultas?.cantidad ?? 0;

  const accion = (clave: (typeof filas)[number]['clave']) => {
    if (clave === 'grupos') onAbrirGrupos('sinMentor');
    else if (clave === 'consultas') onAbrirConsultas();
    else if (porResolver?.peorMentor) onAbrirMentor(porResolver.peorMentor.id, porResolver.peorMentor.nombre?.trim() || 'Mentor');
  };

  return (
    <MarcoDelLider titulo="Mis mentores" onVolver={onVolver}>
      {filas.length > 0 ? (
        <View style={estilos.seccion}>
          <TituloDeSeccion>Por resolver</TituloDeSeccion>
          {filas.map(fila => (
            <FilaPorResolver key={fila.clave} estado={fila.estado} texto={fila.texto} boton={fila.boton} onPress={() => accion(fila.clave)} />
          ))}
        </View>
      ) : null}

      {!entradas.mentores ? null : padron ? (
        <View style={estilos.seccion}>
          <TituloDeSeccion detalle={cuposLibresEnPalabras(padron.mentors)}>Mentores</TituloDeSeccion>
          {mentores.length === 0 ? <Linea>Todavía no hay mentores activos.</Linea> : null}
          {mentores.map(mentor => (
            <FilaDeMentorConCupo key={mentor.userId} mentor={mentor} onAbrir={() => onAbrirMentor(mentor.userId, mentor.fullName)} />
          ))}
        </View>
      ) : lectura.fallo ? (
        <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="tus mentores" onReintentar={lectura.recargar} />
      ) : (
        <CargandoLectura texto="Cargando tus mentores…" />
      )}

      <View style={estilos.accesos}>
        {entradas.grupos ? <Acceso titulo="Grupos" onPress={() => onAbrirGrupos()} /> : null}
        {entradas.consultas ? <Acceso titulo={consultas > 0 ? `Consultas · ${consultas}` : 'Consultas'} onPress={onAbrirConsultas} /> : null}
        {entradas.mentores ? <Acceso titulo="Reporte del mes" onPress={onAbrirReporte} /> : null}
        {onAbrirTodos ? <Acceso titulo="Todos los aprendices" onPress={onAbrirTodos} /> : null}
        {onAbrirHabitos ? <Acceso titulo="Hábitos de todos" onPress={onAbrirHabitos} /> : null}
      </View>
    </MarcoDelLider>
  );
}

/** Un acceso del pie: el título y la flecha, de 52 de alto. */
function Acceso({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={titulo} style={[estilos.acceso, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 16, flex: 1 }]}>{titulo}</Text>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: 10 },
  accesos: { gap: 8 },
  acceso: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
});
