import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarPersona } from '../../../../components/ui';
import { Icon, type IconName } from '../../../../components/Icon';
import { Interruptor } from '../../../../components/Interruptor';
import { Presionable } from '../../../../components/Presionable';
import { BotonSecundario } from '../../../../components/Legible';
import { fuentes } from '../../../../theme/fuentes';
import { useTheme } from '../../../../theme/ThemeContext';
import { tacto } from '../../../../utils/tacto';
import type { ColorDelSemaforo, OpcionesDeAudiencia, PersonaConvocable, TipoDeParte } from '../../types/audiencia.types';
import {
  COLORES,
  NOMBRE_DE_LA_PARTE,
  alternar,
  alternarColor,
  alternarGrupo,
  alternarPersona,
  partesEnOrden,
  type AudienciaDelFormulario,
} from '../../utils/audienciaDelFormulario';
import { Parrafo } from '../piezas';
import { ElegirPersonasHoja } from './ElegirPersonasHoja';

const ICONO_DE_LA_PARTE: Record<TipoDeParte | 'ALL', IconName> = {
  ALL: 'globe',
  PERSON: 'user',
  MY_LEARNERS: 'users',
  GROUP: 'layoutGrid',
  MENTORS: 'award',
  TRAFFIC_LIGHT: 'gauge',
  STAFF: 'badgeCheck',
};

/** Cada color con palabra e ícono, nunca solo color (FR-033). */
export const ICONO_DEL_COLOR: Record<ColorDelSemaforo, IconName> = { GREEN: 'checkCircle', YELLOW: 'alertTriangle', RED: 'ban' };

/**
 * «¿Para quién es?» (spec 044, FR-033): los chips de lo que el servidor deja elegir a esta cuenta y, debajo de cada uno elegido, su detalle: las
 * personas (buscador en una hoja), los colores del semáforo con su cifra de hoy, los grupos o el personal. Se pueden sumar (P4). Sin animaciones
 * nuevas: `Presionable` y el «tic» de selección.
 */
export function ParaQuienEs({
  opciones,
  valor,
  onCambiar,
  editando,
  formation,
}: {
  opciones: OpcionesDeAudiencia;
  valor: AudienciaDelFormulario;
  onCambiar: (a: AudienciaDelFormulario) => void;
  /** Al editar un evento con colores se ofrece «Volver a calcular» (FR-011). */
  editando: boolean;
  formation: string | null;
}) {
  const { c } = useTheme();
  const [abiertas, setAbiertas] = useState<Set<TipoDeParte>>(() => {
    const ya = new Set<TipoDeParte>();
    if (valor.personas.length > 0) ya.add('PERSON');
    if (valor.colores.length > 0) ya.add('TRAFFIC_LIGHT');
    if (valor.grupos.length > 0) ya.add('GROUP');
    if (valor.personal.length > 0 || valor.todoElPersonal) ya.add('STAFF');
    return ya;
  });
  const [eligiendoPersonas, setEligiendoPersonas] = useState(false);
  const esMentor = opciones.partes.includes('MY_LEARNERS');

  const marcada = (parte: TipoDeParte | 'ALL'): boolean => {
    switch (parte) {
      case 'ALL':
        return valor.todos;
      case 'MY_LEARNERS':
        return valor.misAlumnos;
      case 'MENTORS':
        return valor.mentores;
      default:
        return abiertas.has(parte);
    }
  };

  const tocarChip = (parte: TipoDeParte | 'ALL') => {
    tacto.seleccion();
    if (parte === 'ALL' || parte === 'MY_LEARNERS' || parte === 'MENTORS') {
      onCambiar(alternar(valor, parte));
      if (parte === 'ALL' && !valor.todos) setAbiertas(new Set());
      return;
    }
    const nuevas = new Set(abiertas);
    if (nuevas.has(parte)) {
      nuevas.delete(parte);
      // Cerrar el chip quita lo que tenía elegido: lo que no se ve no se manda.
      if (parte === 'PERSON') onCambiar({ ...valor, personas: [] });
      if (parte === 'TRAFFIC_LIGHT') onCambiar({ ...valor, colores: [] });
      if (parte === 'GROUP') onCambiar({ ...valor, grupos: [] });
      if (parte === 'STAFF') onCambiar({ ...valor, personal: [], todoElPersonal: false });
    } else {
      nuevas.add(parte);
      if (valor.todos) onCambiar({ ...valor, todos: false });
      if (parte === 'PERSON' && valor.personas.length === 0) setEligiendoPersonas(true);
    }
    setAbiertas(nuevas);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={[estilos.pregunta, { color: c.textStrong }]}>
          ¿Para quién es?
        </Text>
        <Parrafo>{esMentor ? 'Solo tus alumnos.' : 'Elige una o varias opciones.'}</Parrafo>
      </View>

      <View style={estilos.chips}>
        {partesEnOrden(opciones).map(parte => {
          const on = marcada(parte);
          return (
            <Presionable
              key={parte}
              onPress={() => tocarChip(parte)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={NOMBRE_DE_LA_PARTE[parte]}
              style={[estilos.chip, { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.goldWash : c.cardBg }]}
            >
              <Icon name={ICONO_DE_LA_PARTE[parte]} size={20} color={on ? c.goldInk : c.textSoft} />
              <Text style={[estilos.chipTexto, { color: c.textStrong, fontFamily: on ? fuentes.seminegrita : fuentes.media }]}>
                {NOMBRE_DE_LA_PARTE[parte]}
              </Text>
            </Presionable>
          );
        })}
      </View>

      {valor.misAlumnos ? <Parrafo>{`Tus ${opciones.misAlumnos} ${opciones.misAlumnos === 1 ? 'alumno' : 'alumnos'} de hoy.`}</Parrafo> : null}
      {valor.mentores ? <Parrafo>Todos los mentores y guías de tu formación.</Parrafo> : null}

      {abiertas.has('TRAFFIC_LIGHT') ? (
        <View style={{ gap: 8 }}>
          <Text style={[estilos.rotulo, { color: c.textSoft }]}>{esMentor ? 'Tus alumnos por semáforo · hoy' : 'Por semáforo · hoy'}</Text>
          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {COLORES.map((color, i) => {
              const on = valor.colores.includes(color.clave);
              return (
                <FilaElegible
                  key={color.clave}
                  primera={i === 0}
                  marcada={on}
                  titulo={color.nombre}
                  subtitulo={color.ayuda}
                  cifra={opciones.colores[color.clave]}
                  icono={<Icon name={ICONO_DEL_COLOR[color.clave]} size={20} color={colorDelSemaforo(c, color.clave)} />}
                  onPress={() => {
                    tacto.seleccion();
                    onCambiar(alternarColor(valor, color.clave));
                  }}
                />
              );
            })}
          </View>
          {editando && valor.colores.length > 0 ? (
            <View style={[estilos.interruptor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.chipTexto, { color: c.textStrong }]}>Volver a calcular</Text>
                <Parrafo>Usa el semáforo de hoy en vez del que tenía al guardarlo.</Parrafo>
              </View>
              <Interruptor valor={valor.recalcular} onCambiar={v => onCambiar({ ...valor, recalcular: v })} etiqueta="Volver a calcular" />
            </View>
          ) : null}
        </View>
      ) : null}

      {abiertas.has('GROUP') ? (
        <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          {opciones.grupos.length === 0 ? <Parrafo>No hay grupos en esta formación.</Parrafo> : null}
          {opciones.grupos.map((g, i) => (
            <FilaElegible
              key={g.id}
              primera={i === 0}
              marcada={valor.grupos.includes(g.id)}
              titulo={g.nombre}
              cifra={g.integrantes}
              onPress={() => {
                tacto.seleccion();
                onCambiar(alternarGrupo(valor, g.id));
              }}
            />
          ))}
        </View>
      ) : null}

      {abiertas.has('STAFF') ? (
        <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <FilaElegible
            primera
            marcada={valor.todoElPersonal}
            titulo="Todo el personal"
            subtitulo="Administración y Alquimista"
            onPress={() => {
              tacto.seleccion();
              onCambiar({ ...valor, todos: false, todoElPersonal: !valor.todoElPersonal, personal: [] });
            }}
          />
          {opciones.personal.map(p => (
            <FilaElegible
              key={p.id}
              marcada={!valor.todoElPersonal && valor.personal.some(x => x.id === p.id)}
              titulo={p.nombre}
              subtitulo={p.rol ?? undefined}
              icono={<AvatarPersona nombre={p.nombre} avatarUrl={p.fotoUrl} size={40} />}
              onPress={() => {
                tacto.seleccion();
                onCambiar({ ...valor, todos: false, todoElPersonal: false, personal: alternarPersona(valor.personal, p) });
              }}
            />
          ))}
        </View>
      ) : null}

      {abiertas.has('PERSON') ? (
        <View style={{ gap: 8 }}>
          <PildorasDePersonas personas={valor.personas} onQuitar={p => onCambiar({ ...valor, personas: alternarPersona(valor.personas, p) })} />
          <BotonSecundario etiqueta="Elegir personas" icono="search" onPress={() => setEligiendoPersonas(true)} />
        </View>
      ) : null}

      <View style={[estilos.nota, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <Icon name="eyeOff" size={18} color={c.goldInk} />
        <Text style={[estilos.notaTexto, { color: c.textSoft }]}>
          {esMentor ? 'Tus alumnos no ven por qué los elegiste.' : 'Tus invitados no ven por qué los elegiste ni a quién más invitaste.'}
        </Text>
      </View>

      <ElegirPersonasHoja
        visible={eligiendoPersonas}
        elegidas={valor.personas}
        formation={formation}
        onListo={personas => {
          setEligiendoPersonas(false);
          onCambiar({ ...valor, todos: false, personas });
          if (personas.length === 0) {
            const nuevas = new Set(abiertas);
            nuevas.delete('PERSON');
            setAbiertas(nuevas);
          }
        }}
      />
    </View>
  );
}

export function colorDelSemaforo(c: ReturnType<typeof useTheme>['c'], color: ColorDelSemaforo): string {
  return color === 'GREEN' ? c.success : color === 'YELLOW' ? c.goldInk : c.danger;
}

function FilaElegible({
  titulo,
  subtitulo,
  cifra,
  icono,
  marcada,
  primera = false,
  onPress,
}: {
  titulo: string;
  subtitulo?: string;
  cifra?: number;
  icono?: React.ReactNode;
  marcada: boolean;
  primera?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={`${titulo}${subtitulo ? `, ${subtitulo}` : ''}${cifra !== undefined ? `, ${cifra}` : ''}`}
      style={[estilos.fila, !primera ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
    >
      {icono}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[estilos.filaTitulo, { color: c.textStrong }]} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? <Text style={[estilos.filaSub, { color: c.textSoft }]}>{subtitulo}</Text> : null}
      </View>
      {cifra !== undefined ? <Text style={[estilos.cifra, { color: c.textSoft }]}>{cifra}</Text> : null}
      <View style={[estilos.casilla, { borderColor: marcada ? c.gold : c.borderStrong, backgroundColor: marcada ? c.gold : 'transparent' }]}>
        {marcada ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
      </View>
    </Presionable>
  );
}

export function PildorasDePersonas({ personas, onQuitar }: { personas: PersonaConvocable[]; onQuitar: (p: PersonaConvocable) => void }) {
  const { c } = useTheme();
  if (personas.length === 0) return null;
  return (
    <View style={estilos.pildoras}>
      {personas.map(p => (
        <View key={p.id} style={[estilos.pildora, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <AvatarPersona nombre={p.nombre} avatarUrl={p.fotoUrl} size={28} />
          <Text style={[estilos.pildoraTexto, { color: c.textStrong }]} numberOfLines={1}>
            {p.nombre}
          </Text>
          <Presionable
            onPress={() => onQuitar(p)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar a ${p.nombre}`}
            hitSlop={8}
            style={estilos.quitar}
          >
            <Icon name="close" size={16} color={c.goldInk} />
          </Presionable>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pregunta: { fontFamily: fuentes.negrita, fontSize: 22, lineHeight: 28 },
  rotulo: { fontFamily: fuentes.negrita, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipTexto: { fontSize: 16, lineHeight: 22 },
  tarjeta: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  fila: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 6 },
  filaTitulo: { fontFamily: fuentes.seminegrita, fontSize: 16, lineHeight: 22 },
  filaSub: { fontFamily: fuentes.regular, fontSize: 14, lineHeight: 19 },
  cifra: { fontFamily: fuentes.seminegrita, fontSize: 15, fontVariant: ['tabular-nums'] },
  casilla: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  nota: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12 },
  notaTexto: { flex: 1, fontFamily: fuentes.regular, fontSize: 14, lineHeight: 20 },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pildora: { minHeight: 40, borderWidth: 1, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, maxWidth: '100%' },
  pildoraTexto: { fontFamily: fuentes.seminegrita, fontSize: 14, flexShrink: 1 },
  quitar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
