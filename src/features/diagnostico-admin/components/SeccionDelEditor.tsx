import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { PreguntaAdmin, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import type { Direccion } from '../utils/reordenar';
import { cantidad } from '../utils/textos';
import { FilaDePregunta } from './FilaDePregunta';
import { BotonDeAccion, Tarjeta } from './piezas';

/** La portada: la primera pantalla de la ficha. No es un paso ni recibe preguntas; solo se edita su título y su mensaje. */
export function PortadaDelEditor({ seccion, onEditar }: { seccion: SeccionAdmin; onEditar: () => void }) {
  const { c, t } = useTheme();
  return (
    <Tarjeta>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Portada</Text>
      <Text style={[t.cardTitle, { color: c.textStrong }]}>{seccion.titulo}</Text>
      {seccion.descripcion ? (
        <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{seccion.descripcion}</Text>
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>Todavía sin mensaje.</Text>
      )}
      <View style={estilos.acciones}>
        <BotonDeAccion etiqueta="Editar la portada" icono="pencil" onPress={onEditar} />
      </View>
    </Tarjeta>
  );
}

/**
 * Un paso de la ficha con sus preguntas. Arriba, su título y lo que se puede hacer con él (editarlo, subirlo, bajarlo, quitarlo); abajo,
 * «Añadir pregunta». En el modo «Quitar preguntas» las acciones de la sección y de «Añadir» se esconden y las filas se marcan.
 */
export function SeccionDelEditor({
  seccion,
  secciones,
  retiradas,
  puedeSubir,
  puedeBajar,
  puedeMoverPregunta,
  modoQuitar,
  marcadas,
  onEditar,
  onMover,
  onQuitar,
  onAnadirPregunta,
  onAbrirPregunta,
  onMoverPregunta,
  onMarcar,
}: {
  seccion: SeccionAdmin;
  secciones: readonly SeccionAdmin[];
  retiradas: readonly PreguntaAdmin[];
  puedeSubir: boolean;
  puedeBajar: boolean;
  puedeMoverPregunta: (preguntaId: number, direccion: Direccion) => boolean;
  modoQuitar: boolean;
  marcadas: readonly number[];
  onEditar: () => void;
  onMover: (direccion: Direccion) => void;
  onQuitar: () => void;
  onAnadirPregunta: () => void;
  onAbrirPregunta: (pregunta: PreguntaAdmin) => void;
  onMoverPregunta: (pregunta: PreguntaAdmin, direccion: Direccion) => void;
  onMarcar: (pregunta: PreguntaAdmin) => void;
}) {
  const { c, t } = useTheme();
  return (
    <Tarjeta>
      <View style={{ gap: 2 }}>
        <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong }]}>
          {seccion.titulo}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{cantidad(seccion.preguntas.length, 'pregunta', 'preguntas')}</Text>
        {seccion.descripcion ? <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22, fontFamily: fuentes.regular }]}>{seccion.descripcion}</Text> : null}
      </View>

      {modoQuitar ? null : (
        <View style={estilos.acciones}>
          <BotonDeAccion etiqueta="Editar" icono="pencil" accessibilityLabel={`Editar la sección ${seccion.titulo}`} onPress={onEditar} />
          <BotonDeAccion etiqueta="Subir" accessibilityLabel={`Subir la sección ${seccion.titulo}`} deshabilitado={!puedeSubir} onPress={() => onMover('arriba')} />
          <BotonDeAccion etiqueta="Bajar" accessibilityLabel={`Bajar la sección ${seccion.titulo}`} deshabilitado={!puedeBajar} onPress={() => onMover('abajo')} />
          <BotonDeAccion etiqueta="Quitar" icono="trash" peligro accessibilityLabel={`Quitar la sección ${seccion.titulo}`} onPress={onQuitar} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        {seccion.preguntas.map(p => (
          <FilaDePregunta
            key={p.id}
            pregunta={p}
            secciones={secciones}
            retiradas={retiradas}
            puedeSubir={puedeMoverPregunta(p.id, 'arriba')}
            puedeBajar={puedeMoverPregunta(p.id, 'abajo')}
            modoQuitar={modoQuitar}
            marcada={marcadas.includes(p.id)}
            onAbrir={() => onAbrirPregunta(p)}
            onSubir={() => onMoverPregunta(p, 'arriba')}
            onBajar={() => onMoverPregunta(p, 'abajo')}
            onMarcar={() => onMarcar(p)}
          />
        ))}
        {seccion.preguntas.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>Esta sección todavía no tiene preguntas.</Text>
        ) : null}
      </View>

      {modoQuitar ? null : (
        <View style={estilos.acciones}>
          <BotonDeAccion etiqueta="Añadir pregunta" icono="plus" accessibilityLabel={`Añadir una pregunta a ${seccion.titulo}`} onPress={onAnadirPregunta} />
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
