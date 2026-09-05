import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

/**
 * Pinta la respuesta de un asistente interpretando el markdown básico que los modelos emiten
 * siempre, en vez de mostrarlo crudo.
 *
 * BUG (2026-09-04): la burbuja renderizaba `{mensaje.texto}` como texto plano, así que en pantalla
 * se leía literalmente `Entra en la sección **"Plan"**` y `**Sparkie**`, con los asteriscos a la
 * vista, y las listas numeradas quedaban pegadas sin sangría.
 *
 * NO se usa una librería de markdown a propósito: las respuestas de este producto son texto corto
 * de chat (negritas, cursivas, `código`, listas y algún título), no documentos. Un parser completo
 * traería tablas, HTML embebido, imágenes y enlaces —superficie que acá no se quiere— y sus estilos
 * por defecto pelearían con la tipografía Jost y la paleta dorada. Esto cubre lo que el modelo usa
 * de verdad y nada más.
 *
 * Lo que NO se interpreta se muestra tal cual, que es el comportamiento seguro: ante un markdown
 * raro se ve el texto original, nunca una burbuja vacía.
 */

type Props = {
  texto: string;
  /** Estilo base del párrafo (tipografía y color ya resueltos por la burbuja). */
  estilo: StyleProp<TextStyle>;
  /** Color de los marcadores de lista y de los títulos — el dorado de la marca. */
  colorAcento: string;
};

/** Un trozo de línea ya clasificado. `codigo` se pinta monoespaciado, sin resaltado de sintaxis. */
type Trozo = { texto: string; negrita?: boolean; cursiva?: boolean; codigo?: boolean };

/** `**negrita**`, `__negrita__`, `*cursiva*`, `_cursiva_` y `` `codigo` ``, en un solo barrido. */
const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

function trozosDe(linea: string): Trozo[] {
  const trozos: Trozo[] = [];
  let ultimo = 0;
  for (const m of linea.matchAll(INLINE)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) trozos.push({ texto: linea.slice(ultimo, inicio) });
    const token = m[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      trozos.push({ texto: token.slice(2, -2), negrita: true });
    } else if (token.startsWith('`')) {
      trozos.push({ texto: token.slice(1, -1), codigo: true });
    } else {
      trozos.push({ texto: token.slice(1, -1), cursiva: true });
    }
    ultimo = inicio + token.length;
  }
  if (ultimo < linea.length) trozos.push({ texto: linea.slice(ultimo) });
  return trozos.length ? trozos : [{ texto: linea }];
}

type Bloque =
  | { clase: 'parrafo'; linea: string }
  | { clase: 'titulo'; linea: string }
  | { clase: 'lista'; marcador: string; linea: string };

const ORDENADA = /^\s*(\d+)[.)]\s+(.*)$/;
const VINETA = /^\s*[-*•]\s+(.*)$/;
const TITULO = /^\s*#{1,6}\s+(.*)$/;

function bloquesDe(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  for (const cruda of texto.split('\n')) {
    const linea = cruda.trimEnd();
    if (!linea.trim()) continue; // el espaciado entre bloques lo da el `gap`, no las líneas vacías
    const titulo = TITULO.exec(linea);
    if (titulo) {
      bloques.push({ clase: 'titulo', linea: titulo[1] });
      continue;
    }
    const ordenada = ORDENADA.exec(linea);
    if (ordenada) {
      bloques.push({ clase: 'lista', marcador: `${ordenada[1]}.`, linea: ordenada[2] });
      continue;
    }
    const vineta = VINETA.exec(linea);
    if (vineta) {
      bloques.push({ clase: 'lista', marcador: '•', linea: vineta[1] });
      continue;
    }
    bloques.push({ clase: 'parrafo', linea });
  }
  return bloques;
}

function Linea({ texto, estilo }: { texto: string; estilo: StyleProp<TextStyle> }) {
  return (
    <Text style={estilo}>
      {trozosDe(texto).map((trozo, i) => (
        <Text
          key={i}
          style={[
            // `fontWeight` no alcanza: con una familia cargada por archivo (Jost) hay que nombrar
            // la variante, o Android la ignora y el texto sale igual que el normal.
            trozo.negrita ? styles.negrita : null,
            trozo.cursiva ? styles.cursiva : null,
            trozo.codigo ? styles.codigo : null,
          ]}
        >
          {trozo.texto}
        </Text>
      ))}
    </Text>
  );
}

export function TextoAsistente({ texto, estilo, colorAcento }: Props) {
  const bloques = useMemo(() => bloquesDe(texto), [texto]);

  return (
    <View style={styles.contenedor}>
      {bloques.map((bloque, i) => {
        if (bloque.clase === 'lista') {
          return (
            <View key={i} style={styles.filaLista}>
              <Text style={[estilo, styles.marcador, { color: colorAcento }]}>{bloque.marcador}</Text>
              <Linea texto={bloque.linea} estilo={[estilo, styles.textoLista]} />
            </View>
          );
        }
        if (bloque.clase === 'titulo') {
          return <Linea key={i} texto={bloque.linea} estilo={[estilo, styles.negrita, { color: colorAcento }]} />;
        }
        return <Linea key={i} texto={bloque.linea} estilo={estilo} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 8 },
  negrita: { fontFamily: 'Jost_700Bold' },
  cursiva: { fontStyle: 'italic' },
  codigo: { fontFamily: 'Jost_500Medium', letterSpacing: 0.3 },
  filaLista: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  // Ancho fijo para que "1." y "10." alineen su texto en la misma columna.
  marcador: { minWidth: 18, fontFamily: 'Jost_700Bold' },
  textoLista: { flex: 1 },
});
