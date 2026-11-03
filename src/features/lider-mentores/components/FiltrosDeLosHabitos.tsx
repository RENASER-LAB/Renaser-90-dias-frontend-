import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { FiltroDeFormacion } from '../../formaciones/components/FiltroDeFormacion';
import { SIN_GRUPO, type OpcionDeDimension } from '../utils/habitosDeTodos';

export interface GrupoParaFiltrar {
  grupoId: string;
  grupoNombre: string | null;
}

/**
 * Los filtros de «Hábitos de todos» (spec 029): dimensión, formación (solo para quien ve más de una formación a la vez) y grupo (con
 * «Sin grupo»). Cada fila de opciones se desliza de lado; la pantalla sigue teniendo UN solo scroll vertical. Cambian al instante y sin
 * animación: se tocan seguido y la lista de abajo tiene que responder en el acto.
 *
 * - Una fila con una sola opción posible no se dibuja: un filtro que no filtra nada es ruido.
 * - Quitar un filtro es volver a «Todas» / «Todos»; el estado no depende solo del color (la elegida va en negrita y con borde dorado).
 */
export function FiltrosDeLosHabitos({
  dimensiones,
  categoria,
  onCategoria,
  verFormacion,
  formacion,
  onFormacion,
  grupos,
  grupo,
  onGrupo,
}: {
  dimensiones: readonly OpcionDeDimension[];
  categoria: string | null;
  onCategoria: (clave: string | null) => void;
  verFormacion: boolean;
  formacion: string | null;
  onFormacion: (codigo: string | null) => void;
  grupos: readonly GrupoParaFiltrar[];
  grupo: string | null;
  onGrupo: (id: string | null) => void;
}) {
  const verDimension = dimensiones.length > 1 || categoria !== null;
  const verGrupo = grupos.length > 0 || grupo !== null;
  if (!verDimension && !verFormacion && !verGrupo) return null;

  return (
    <View style={estilos.cuerpo}>
      {verDimension ? (
        <FilaDeOpciones
          rotulo="Dimensión"
          opciones={[{ clave: null, etiqueta: 'Todas' }, ...dimensiones.map(d => ({ clave: d.clave, etiqueta: d.etiqueta }))]}
          valor={categoria}
          onElegir={onCategoria}
        />
      ) : null}
      {verFormacion ? (
        <View style={{ gap: 6 }}>
          <MicroLabel>Formación</MicroLabel>
          <FiltroDeFormacion valor={formacion} onCambiar={onFormacion} />
        </View>
      ) : null}
      {verGrupo ? (
        <FilaDeOpciones
          rotulo="Grupo"
          opciones={[
            { clave: null, etiqueta: 'Todos' },
            ...grupos.map(g => ({ clave: g.grupoId, etiqueta: g.grupoNombre?.trim() || 'Grupo sin nombre' })),
            { clave: SIN_GRUPO, etiqueta: 'Sin grupo' },
          ]}
          valor={grupo}
          onElegir={onGrupo}
        />
      ) : null}
    </View>
  );
}

function FilaDeOpciones({
  rotulo,
  opciones,
  valor,
  onElegir,
}: {
  rotulo: string;
  opciones: Array<{ clave: string | null; etiqueta: string }>;
  valor: string | null;
  onElegir: (clave: string | null) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <MicroLabel>{rotulo}</MicroLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="radiogroup"
        accessibilityLabel={rotulo}
        contentContainerStyle={estilos.opciones}
      >
        {opciones.map(opcion => {
          const activa = valor === opcion.clave;
          return (
            <Presionable
              key={opcion.clave ?? 'todas'}
              onPress={() => {
                if (activa) return;
                tacto.seleccion();
                onElegir(opcion.clave);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={`${rotulo}: ${opcion.etiqueta}`}
              style={[
                estilos.chip,
                { borderColor: activa ? c.goldInk : c.border, backgroundColor: activa ? c.goldWash : c.cardBg },
              ]}
            >
              <Text
                style={[t.body, { color: activa ? c.goldInk : c.textSoft, fontSize: 16, fontFamily: activa ? fuentes.negrita : fuentes.regular }]}
                numberOfLines={1}
              >
                {opcion.etiqueta}
              </Text>
            </Presionable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12 },
  opciones: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  /* 48 de alto: se toca con el pulgar sin apuntar (AGENTS.md §4). */
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
});
