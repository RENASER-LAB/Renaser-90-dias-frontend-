import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TituloDeSeccion } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import type { InicioSemanal, LecturaDeGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import type { GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import { seOcultaLaSeccion } from '../../semaforo/utils/entradasDelSemaforo';
import { useBandejaDeTickets } from '../../tickets/hooks/useBandejaDeTickets';
import {
  consultasSinResponderEnPalabras,
  dichoDelGrupo,
  mentorDelGrupoEnPalabras,
  porcentajeDeLaFila,
} from '../utils/textosDeLasListas';
import { FilaDeLista, ListaDeFilas } from './FilaDeLista';

/**
 * «Mis mentores» de Hoy, para el líder de mentores (spec 018): el resultado de los últimos 7 días POR GRUPO, una fila por
 * grupo con su nombre, su mentor, el color y el porcentaje; y debajo, las consultas de mentores sin responder y el
 * padrón de mentores con el reporte del mes. Sin textos de ayuda: lo que cada fila abre se lee en la fila.
 *
 * Reemplaza a las tres tarjetas que el líder tenía sueltas en Hoy (tickets, semáforo por grupos y «Mis mentores»); abren
 * las mismas pantallas de siempre, ahora desde acá.
 *
 * - **Los datos son del servidor**: el resumen por grupos es la lectura que Hoy ya hace para el líder; el color y el
 *   porcentaje de cada fila son los del promedio de su grupo, sin recalcular nada.
 * - **Siempre los últimos 7 días**: al abrirse vuelve a la ventana vigente y la relee (el barrido corre cada hora y
 *   quien venía de otra semana no tiene que ver el rótulo mentir). Las semanas anteriores se miran dentro de cada
 *   grupo, con las flechas de siempre.
 * - **Un grupo sin mentor no se abre** (`puedeAbrirse` del servidor): su fila lo dice en rojo.
 * - **Cada lista es independiente**: si una lectura falla o su entrada no está disponible, las otras siguen.
 * - **«Todos los aprendices»** (2026-10-31): la última fila de las tres, con la misma forma que las otras. Abre la lista de
 *   todas las personas con su ficha, estén o no en un grupo. Solo existe si el servidor la ofrece (`verTodos`: la primera
 *   página de la lista respondió 200); con un backend anterior o con otro rol no se dibuja.
 */
export function MisMentoresEnHoy({
  lectura,
  verGrupos,
  verConsultas,
  verMentores,
  verTodos = false,
  onAbrirGrupo,
  onAbrirConsultas,
  onAbrirMentores,
  onAbrirTodos,
}: {
  lectura: LecturaDeGrupos;
  /** El resultado por grupo está disponible para esta cuenta (interruptor `semaforo`). */
  verGrupos: boolean;
  /** La bandeja de consultas de mentores (interruptor `tickets`). */
  verConsultas: boolean;
  /** El padrón de mentores y el reporte del mes (interruptor `lider`). */
  verMentores: boolean;
  /** La lista de todos los aprendices está disponible: el servidor respondió 200 a su primera página. */
  verTodos?: boolean;
  onAbrirGrupo: (grupo: GrupoDelResumen, inicio: InicioSemanal) => void;
  onAbrirConsultas: () => void;
  onAbrirMentores: () => void;
  onAbrirTodos?: () => void;
}) {
  /* Solo al abrir: la función cambia en cada render y no tiene que volver a correr. */
  const volverAVigente = useRef(lectura.volverAVigente);
  volverAVigente.current = lectura.volverAVigente;
  useEffect(() => {
    if (verGrupos) volverAVigente.current();
  }, [verGrupos]);

  const enlaces = verConsultas || verMentores || (verTodos && onAbrirTodos !== undefined);
  return (
    <View style={estilos.cuerpo}>
      {verGrupos ? <ResultadoPorGrupo lectura={lectura} onAbrirGrupo={onAbrirGrupo} /> : null}
      {enlaces ? (
        <ListaDeFilas>
          {verConsultas ? <FilaDeConsultas primera onAbrir={onAbrirConsultas} /> : null}
          {verMentores ? (
            <FilaDeLista
              primera={!verConsultas}
              titulo="Mentores y reporte del mes"
              onPress={onAbrirMentores}
              etiquetaAccesible="Mentores y reporte del mes. Abrir."
            />
          ) : null}
          {verTodos && onAbrirTodos ? (
            <FilaDeLista
              primera={!verConsultas && !verMentores}
              titulo="Todos los aprendices"
              onPress={onAbrirTodos}
              etiquetaAccesible="Todos los aprendices. Abrir."
            />
          ) : null}
        </ListaDeFilas>
      ) : null}
    </View>
  );
}

function ResultadoPorGrupo({
  lectura,
  onAbrirGrupo,
}: {
  lectura: LecturaDeGrupos;
  onAbrirGrupo: (grupo: GrupoDelResumen, inicio: InicioSemanal) => void;
}) {
  const { c, t } = useTheme();
  const datos = lectura.datos;
  /* Con 404 o 403 el servidor no tiene esta vista para la cuenta: la lista desaparece, el resto de Hoy sigue. */
  if (!datos && seOcultaLaSeccion(lectura)) return null;

  return (
    <View style={estilos.seccion}>
      <TituloDeSeccion detalle="Últimos 7 días">Resultado por grupo</TituloDeSeccion>
      {datos ? (
        datos.grupos.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>No hay grupos que mostrar.</Text>
        ) : (
          <ListaDeFilas>
            {datos.grupos.map((grupo, i) => (
              <FilaDeGrupo
                key={grupo.grupoId}
                grupo={grupo}
                primera={i === 0}
                onAbrir={grupo.puedeAbrirse ? () => onAbrirGrupo(grupo, lectura.inicio) : undefined}
              />
            ))}
          </ListaDeFilas>
        )
      ) : lectura.fallo ? (
        <FalloDeLectura
          fallo={lectura.fallo}
          detalle={lectura.detalleDelFallo}
          que="el resultado por grupo"
          onReintentar={lectura.recargar}
        />
      ) : (
        <CargandoLectura texto="Cargando los grupos…" />
      )}
    </View>
  );
}

function FilaDeGrupo({ grupo, primera, onAbrir }: { grupo: GrupoDelResumen; primera: boolean; onAbrir?: () => void }) {
  const { c, t } = useTheme();
  const color = grupo.colorDelPromedio ?? 'SIN_DATOS';
  const { relleno, tinta } = coloresDelSemaforo(color, c);
  return (
    <FilaDeLista
      primera={primera}
      izquierda={<View accessible={false} style={[estilos.punto, { backgroundColor: relleno }]} />}
      titulo={grupo.grupoNombre?.trim() || 'Grupo sin nombre'}
      subtitulo={mentorDelGrupoEnPalabras(grupo)}
      subtituloEnAlerta={grupo.sinMentor && !grupo.mentorNombre?.trim()}
      derecha={
        <Text style={[t.cardTitle, estilos.cifra, { color: grupo.promedio === null ? c.textSoft : tinta }]}>
          {porcentajeDeLaFila(grupo.promedio)}
        </Text>
      }
      onPress={onAbrir}
      etiquetaAccesible={dichoDelGrupo(grupo, onAbrir !== undefined)}
    />
  );
}

/** «Consultas de mentores · N sin responder»: abre la bandeja de tickets de siempre. La cifra se lee de la primera página. */
function FilaDeConsultas({ primera, onAbrir }: { primera: boolean; onAbrir: () => void }) {
  const bandeja = useBandejaDeTickets(true);
  const lectura = bandeja.cargando || bandeja.fallo ? null : bandeja.resumen.sinResponder;
  const cuantas = consultasSinResponderEnPalabras(lectura, bandeja.hayMas);
  return (
    <FilaDeLista
      primera={primera}
      titulo="Consultas de mentores"
      subtitulo={cuantas}
      onPress={onAbrir}
      etiquetaAccesible={`Consultas de mentores.${cuantas ? ` ${cuantas}.` : ''} Abrir.`}
    />
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 18 },
  seccion: { gap: 10 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  /* Cifras tabulares: 78.3 y 100 no bailan de ancho de una fila a la otra. */
  cifra: { fontVariant: ['tabular-nums'] },
});
