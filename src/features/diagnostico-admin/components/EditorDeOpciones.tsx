import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import type { DestinoDeLaPregunta, TipoDePregunta } from '../../diagnostico/types/diagnostico.types';
import { opcionNueva, type OpcionEnEdicion } from '../utils/borradorDePregunta';
import { moverEnLista } from '../utils/reordenar';
import { codigosDelDestino, esConsentimiento, nombreDeLasOpciones } from '../utils/tiposDePregunta';
import { BotonDeAccion, BotonDeIcono, CampoDeTexto, TextoDeError } from './piezas';

/**
 * Las opciones de una pregunta (en la cuadrícula, sus filas): escribirlas, ordenarlas con subir y bajar, quitarlas y añadir otra. Con un
 * destino que lleva códigos (la prioridad y el trato) cada opción dice, además, a cuál corresponde. En el consentimiento no hay lista: es
 * el texto de su única casilla.
 */
export function EditorDeOpciones({
  tipo,
  opciones,
  destino,
  onCambiar,
  error,
  errorDeCodigos,
}: {
  tipo: TipoDePregunta;
  opciones: OpcionEnEdicion[];
  destino: DestinoDeLaPregunta | null;
  onCambiar: (opciones: OpcionEnEdicion[]) => void;
  error?: string | null;
  errorDeCodigos?: string | null;
}) {
  if (esConsentimiento(tipo)) {
    const casilla = opciones[0] ?? null;
    return (
      <CampoDeTexto
        rotulo="Texto de la casilla"
        ayuda="Lo que la persona marca para aceptar, por ejemplo «Acepto lo anterior». La declaración va arriba, en la ayuda."
        value={casilla?.etiqueta ?? ''}
        onChangeText={etiqueta => onCambiar(casilla ? [{ ...casilla, etiqueta }, ...opciones.slice(1)] : [opcionNueva(etiqueta)])}
        error={error}
        maxLength={300}
        autoCapitalize="sentences"
      />
    );
  }

  const nombre = nombreDeLasOpciones(tipo);
  const codigos = codigosDelDestino(destino);

  const cambiar = (id: string, parcial: Partial<OpcionEnEdicion>) => onCambiar(opciones.map(o => (o.id === id ? { ...o, ...parcial } : o)));

  return (
    <View style={{ gap: 14 }}>
      {opciones.map((o, i) => (
        <View key={o.id} style={{ gap: 6 }}>
          <View style={estilos.fila}>
            <View style={estilos.campo}>
              <CampoDeTexto
                rotulo={`${nombre.singular} ${i + 1}`}
                rotuloOculto
                value={o.etiqueta}
                onChangeText={etiqueta => cambiar(o.id, { etiqueta })}
                placeholder={`${nombre.singular} ${i + 1}`}
                maxLength={300}
                autoCapitalize="sentences"
              />
            </View>
            <View style={estilos.botones}>
              <BotonDeIcono icono="chevron" girar={-90} etiqueta={`Subir la ${nombre.singular.toLowerCase()} ${i + 1}`} deshabilitado={i === 0} onPress={() => onCambiar(moverEnLista(opciones, i, 'arriba'))} />
              <BotonDeIcono icono="chevron" girar={90} etiqueta={`Bajar la ${nombre.singular.toLowerCase()} ${i + 1}`} deshabilitado={i === opciones.length - 1} onPress={() => onCambiar(moverEnLista(opciones, i, 'abajo'))} />
              <BotonDeIcono icono="trash" peligro etiqueta={`Quitar la ${nombre.singular.toLowerCase()} ${i + 1}`} onPress={() => onCambiar(opciones.filter(x => x.id !== o.id))} />
            </View>
          </View>
          {codigos.length > 0 ? (
            <View style={estilos.codigos} accessibilityRole="radiogroup" accessibilityLabel={`A qué corresponde la ${nombre.singular.toLowerCase()} ${i + 1}`}>
              {codigos.map(c => (
                <ChipDeOpcion key={c.codigo} etiqueta={c.etiqueta} activo={o.codigo === c.codigo} onPress={() => cambiar(o.id, { codigo: c.codigo })} />
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <View style={{ alignItems: 'flex-start' }}>
        <BotonDeAccion etiqueta={nombre.agregar} icono="plus" onPress={() => onCambiar([...opciones, opcionNueva()])} />
      </View>
      {errorDeCodigos ? <TextoDeError texto={errorDeCodigos} /> : null}
      {error ? <TextoDeError texto={error} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  campo: { flexGrow: 1, flexBasis: 150, minWidth: 150 },
  botones: { flexDirection: 'row' },
  codigos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
