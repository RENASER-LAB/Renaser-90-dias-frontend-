import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { PreguntaAdmin, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { describirLaCondicion } from '../utils/condiciones';
import { etiquetaDelDestino, etiquetaDelTipo, textoDeFormaciones } from '../utils/tiposDePregunta';
import { verLasMarcas } from '../utils/textos';
import { BotonDeIcono } from './piezas';

/** Las líneas de apoyo de una pregunta, una por cosa, en el orden en que se leen. Aparte del componente para probarlas. */
export function lineasDeLaPregunta(
  p: PreguntaAdmin,
  secciones: readonly SeccionAdmin[],
  retiradas: readonly PreguntaAdmin[] = [],
): Array<{ texto: string; destacada: boolean }> {
  const lineas = [{ texto: `${etiquetaDelTipo(p.tipo)} · ${p.requerida ? 'Obligatoria' : 'Opcional'}`, destacada: false }];
  if (p.respuestas > 0) lineas.push({ texto: p.respuestas === 1 ? '1 persona la respondió' : `${p.respuestas} personas la respondieron`, destacada: false });
  if (p.alimenta) lineas.push({ texto: `Alimenta: ${etiquetaDelDestino(p.alimenta)}`, destacada: true });
  if (p.seMuestraSi) lineas.push({ texto: describirLaCondicion(p.seMuestraSi, secciones, retiradas), destacada: true });
  if (p.formaciones && p.formaciones.length > 0) lineas.push({ texto: textoDeFormaciones(p.formaciones), destacada: true });
  return lineas;
}

/**
 * Una pregunta en el editor. Tocarla la abre; a la derecha, subir y bajar (48 cada uno, sin arrastre). En el modo «Quitar preguntas» la
 * fila se marca en vez de abrirse, y las protegidas (el candado) no se pueden marcar.
 *
 * Movimiento (`emil-design-eng`): se toca decenas de veces, así que solo responde al apretar (`Presionable`); marcar y subir/bajar
 * cambian en el acto, sin animación.
 */
export function FilaDePregunta({
  pregunta,
  secciones,
  retiradas,
  puedeSubir,
  puedeBajar,
  modoQuitar,
  marcada,
  onAbrir,
  onSubir,
  onBajar,
  onMarcar,
}: {
  pregunta: PreguntaAdmin;
  secciones: readonly SeccionAdmin[];
  retiradas?: readonly PreguntaAdmin[];
  puedeSubir: boolean;
  puedeBajar: boolean;
  modoQuitar: boolean;
  marcada: boolean;
  onAbrir: () => void;
  onSubir: () => void;
  onBajar: () => void;
  onMarcar: () => void;
}) {
  const { c, t } = useTheme();
  const lineas = lineasDeLaPregunta(pregunta, secciones, retiradas);
  const bloqueada = modoQuitar && pregunta.protegida;
  const etiqueta = `${verLasMarcas(pregunta.texto)}. ${lineas.map(l => l.texto).join('. ')}${pregunta.protegida ? '. Protegida: no se puede quitar' : ''}`;

  return (
    <View style={[estilos.fila, { backgroundColor: marcada ? c.goldWash : c.cardBg, borderColor: marcada ? c.gold : c.border }]}>
      <Presionable
        onPress={() => {
          if (modoQuitar) {
            if (bloqueada) return;
            tacto.seleccion();
            onMarcar();
          } else {
            onAbrir();
          }
        }}
        disabled={bloqueada}
        accessibilityRole={modoQuitar ? 'checkbox' : 'button'}
        accessibilityState={modoQuitar ? { checked: marcada, disabled: bloqueada } : undefined}
        accessibilityLabel={etiqueta}
        accessibilityHint={modoQuitar ? undefined : 'Abre la pregunta para editarla'}
        contenedorStyle={{ flex: 1, flexShrink: 1 }}
        style={estilos.cuerpo}
      >
        {modoQuitar ? (
          <View
            style={[
              estilos.marca,
              { borderColor: marcada ? c.gold : c.borderStrong, backgroundColor: marcada ? c.gold : 'transparent', opacity: bloqueada ? 0.4 : 1 },
            ]}
          >
            {marcada ? <Icon name="check" size={16} color={c.onGold} /> : null}
          </View>
        ) : null}
        <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>{verLasMarcas(pregunta.texto)}</Text>
          {lineas.map(linea => (
            <Text key={linea.texto} style={[t.body, { color: linea.destacada ? c.goldInk : c.textSoft, fontSize: 16, lineHeight: 22 }]}>
              {linea.texto}
            </Text>
          ))}
          {pregunta.protegida ? (
            <View style={estilos.candado}>
              <Icon name="lock" size={16} color={c.textSoft} />
              <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Protegida</Text>
            </View>
          ) : null}
        </View>
      </Presionable>
      {modoQuitar ? null : (
        <View style={estilos.mover}>
          <BotonDeIcono icono="chevron" girar={-90} etiqueta="Subir esta pregunta" onPress={onSubir} deshabilitado={!puedeSubir} />
          <BotonDeIcono icono="chevron" girar={90} etiqueta="Bajar esta pregunta" onPress={onBajar} deshabilitado={!puedeBajar} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 14, paddingLeft: 12, paddingRight: 4, minHeight: 64 },
  cuerpo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  marca: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mover: { flexDirection: 'row' },
  candado: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
