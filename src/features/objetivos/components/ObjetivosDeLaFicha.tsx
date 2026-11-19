import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SeccionPlegable } from '../../../components/Legible';
import { MicroLabel } from '../../../components/ui';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { CargarObjetivos, ObjetivosDeLaPersona } from '../../lider-mentores/types/objetivosDeLaPersona.types';
import { cuantosObjetivos, useObjetivosDeLaFicha } from '../hooks/useObjetivosDeLaFicha';

/**
 * «Objetivos» en la ficha de una persona (spec 056 FR-016, FR-027): los del programa, el del mes y el de la semana con su avance, **solo
 * lectura**, en una sección que se abre y se cierra del mismo estilo que los pilares del día (`SeccionPlegable`). La ve el líder de la
 * formación; la ficha del mentor (055) no la monta.
 *
 * Mismo criterio que `CierresDelDia` y el diagnóstico: `cargar` es de cada ficha y estable por persona; sin `cargar`, mientras llega la
 * primera lectura, sin objetivos o con cualquier error (404, 403, red) no se dibuja nada —ni marco ni hueco—.
 */
export function ObjetivosDeLaFicha({ cargar }: { cargar: CargarObjetivos | null }) {
  const vista = useObjetivosDeLaFicha(cargar);
  if (vista.tipo !== 'lista') return null;
  const { objetivos } = vista;

  return (
    <View style={estilos.raiz}>
      <SeccionPlegable titulo="Objetivos" derecha={<Resumen objetivos={objetivos} />}>
        <View style={estilos.cuerpo}>
          {objetivos.noventaDias.length > 0 ? (
            <Grupo rotulo="Del programa">
              {objetivos.noventaDias.map(o => (
                <FilaDeObjetivo key={o.id} id={o.id} titulo={o.titulo} avance={o.avance} />
              ))}
            </Grupo>
          ) : null}
          {objetivos.mes ? (
            <Grupo rotulo="Del mes">
              <FilaDeObjetivo id="mes" titulo={objetivos.mes.titulo} avance={objetivos.mes.avance} />
            </Grupo>
          ) : null}
          {objetivos.semana ? (
            <Grupo rotulo="De la semana">
              <FilaDeObjetivo id="semana" titulo={objetivos.semana.titulo} cifra={`${objetivos.semana.cumplidas} de ${objetivos.semana.planificadas}`} />
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
