import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SeccionPlegable } from '../../../components/Legible';
import { MicroLabel } from '../../../components/ui';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { CargarObjetivos, ObjetivosDeLaPersona } from '../../lider-mentores/types/objetivosDeLaPersona.types';
import { nombreDelEje } from '../../ochenta-veinte/utils/textosDelOchentaVeinte';
import { cuantosObjetivos, useObjetivosDeLaFicha } from '../hooks/useObjetivosDeLaFicha';

/**
 * «Objetivos» en la ficha de una persona (spec 056 FR-016, FR-027): los del programa, el del mes y el de la semana con su avance, **solo
 * lectura**, en una sección que se abre y se cierra del mismo estilo que los pilares del día (`SeccionPlegable`). La ven el líder de la
 * formación y, desde la spec 057 (FR-004), el mentor que acompaña a la persona: con el plazo de **su formación** («Objetivo de N días») y
 * la fase en la que va arriba, si el servidor los manda.
 *
 * Mismo criterio que `CierresDelDia` y el diagnóstico: `cargar` es de cada ficha y estable por persona; sin `cargar`, mientras llega la
 * primera lectura, sin objetivos o con cualquier error (404, 403, red) no se dibuja nada —ni marco ni hueco—. La única excepción: un 404
 * con `SIN_PROGRAMA_ACTIVO` dice en una línea que todavía no tiene objetivos.
 */
export function ObjetivosDeLaFicha({ cargar }: { cargar: CargarObjetivos | null }) {
  const vista = useObjetivosDeLaFicha(cargar);
  const { c, t } = useTheme();
  if (vista.tipo === 'sin-programa') {
    return (
      <View style={estilos.raiz}>
        <Text style={[t.body, { color: c.textSoft }]}>Todavía no tiene objetivos</Text>
      </View>
    );
  }
  if (vista.tipo !== 'lista') return null;
  const { objetivos } = vista;
  const fase = objetivos.fase;

  return (
    <View style={estilos.raiz}>
      <SeccionPlegable titulo="Objetivos" derecha={<Resumen objetivos={objetivos} />}>
        <View style={estilos.cuerpo}>
          {fase ? (
            <Text testID="fase-del-programa" style={[t.body, { color: c.textSoft, fontFamily: fuentes.media, fontVariant: ['tabular-nums'] }]}>
              {`Fase ${fase.numero} · días ${fase.primerDia} a ${fase.ultimoDia}`}
            </Text>
          ) : null}
          {objetivos.noventaDias.length > 0 ? (
            <Grupo rotulo={objetivos.duracionDias ? `Objetivo de ${objetivos.duracionDias} días` : 'Del programa'}>
              {objetivos.noventaDias.map(o => (
                <FilaDeObjetivo key={o.id} id={o.id} titulo={o.titulo} avance={o.avance} />
              ))}
            </Grupo>
          ) : null}
          {objetivos.mes ? (
            <Grupo rotulo={objetivos.mes.objetivos?.length ? `Del mes · ${objetivos.mes.titulo}` : 'Del mes'}>
              {objetivos.mes.objetivos?.length ? (
                /* Spec 057: un objetivo por eje, con el eje a la derecha. */
                objetivos.mes.objetivos.map(o => <FilaDeObjetivo key={`mes-${o.eje}`} id={`mes-${o.eje}`} titulo={o.texto} cifra={nombreDelEje(o.eje)} />)
              ) : (
                <FilaDeObjetivo id="mes" titulo={objetivos.mes.titulo} avance={objetivos.mes.avance} />
              )}
            </Grupo>
          ) : null}
          {objetivos.semana ? (
            <Grupo rotulo={objetivos.semana.objetivos?.length ? `De la semana · ${objetivos.semana.titulo}` : 'De la semana'}>
              {objetivos.semana.objetivos?.map(o => (
                <FilaDeObjetivo key={`semana-${o.eje}`} id={`semana-${o.eje}`} titulo={o.texto} cifra={nombreDelEje(o.eje)} />
              ))}
              <FilaDeObjetivo
                id="semana"
                titulo={objetivos.semana.objetivos?.length ? 'Acciones cumplidas' : objetivos.semana.titulo}
                cifra={`${objetivos.semana.cumplidas} de ${objetivos.semana.planificadas}`}
              />
            </Grupo>
          ) : null}
        </View>
      </SeccionPlegable>
    </View>
  );
}

/** Plegada, la sección dice cuántos objetivos tiene (o, si solo hay semana, sus acciones). */
function Resumen({ objetivos }: { objetivos: ObjetivosDeLaPersona }) {
  const { c, t } = useTheme();
  const cuantos = cuantosObjetivos(objetivos);
  const texto = cuantos > 0 ? `${cuantos} ${cuantos === 1 ? 'objetivo' : 'objetivos'}` : objetivos.semana ? `${objetivos.semana.cumplidas} de ${objetivos.semana.planificadas}` : null;
  if (!texto) return null;
  return <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, fontFamily: fuentes.media, fontVariant: ['tabular-nums'] }]}>{texto}</Text>;
}

function Grupo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.grupo}>
      <MicroLabel>{rotulo}</MicroLabel>
      {children}
    </View>
  );
}

/**
 * Un objetivo: su título y, a la derecha, la cifra (el porcentaje o «N de M»), con una barra fina debajo cuando hay avance. La barra
 * no es lo único que dice el avance: la cifra siempre va escrita. Sin cifra (un objetivo solo cualitativo) no hay barra ni porcentaje.
 */
function FilaDeObjetivo({ id, titulo, avance, cifra }: { id: string; titulo: string; avance?: number | null; cifra?: string }) {
  const { c, t } = useTheme();
  const porcentaje = avance === null || avance === undefined ? null : Math.round(avance);
  const texto = cifra ?? (porcentaje === null ? null : `${porcentaje} %`);
  return (
    <View style={estilos.fila}>
      <View style={estilos.lineaDelTitulo}>
        <Text style={[t.body, estilos.titulo, { color: c.text }]}>{titulo}</Text>
        {texto ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, fontFamily: fuentes.media, fontVariant: ['tabular-nums'] }]}>{texto}</Text> : null}
      </View>
      {porcentaje !== null ? (
        <View testID={`avance-del-objetivo-${id}`} accessible={false} style={[estilos.pista, { backgroundColor: c.border }]}>
          <View testID={`relleno-del-avance-${id}`} style={[estilos.relleno, { width: `${porcentaje}%`, backgroundColor: c.gold }]} />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { marginTop: 18 },
  cuerpo: { gap: 16 },
  grupo: { gap: 8 },
  fila: { gap: 6, minHeight: 40, justifyContent: 'center' },
  lineaDelTitulo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  titulo: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21 },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3 },
});
