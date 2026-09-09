import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Row, RowBetween } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { AvisoCalidad } from '../tipos';
import { ULTIMO_PASO_CONTADO } from '../tipos';

/**
 * Piezas visuales del Mapa de Renacimiento, calcadas de las once vistas del diseño (V01–V11):
 * cabecera con "Día 7 · Paso X de 10" y barra dorada, pastillas de selección, campos con
 * etiqueta y contador, escala 1–10, tarjeta de meta redactada y aviso de calidad.
 *
 * Reglas de experiencia del manual (§2.1) que viven acá: objetivo táctil mínimo 44×44, mensajes
 * que no dependen solo del color (llevan texto), y contraste AA sobre los tokens del tema.
 */

const ALTO_TACTIL = 44;

export function PasoCabecera({ paso }: { paso: number }) {
  const { c, t } = useTheme();
  const progreso = Math.min(1, paso / ULTIMO_PASO_CONTADO);
  return (
    <View style={{ marginBottom: 18 }}>
      <RowBetween>
        <Text style={[t.small, { color: c.textSoft }]}>Día 7</Text>
        <Text style={[t.small, { color: c.textSoft }]}>Paso {paso} de {ULTIMO_PASO_CONTADO}</Text>
      </RowBetween>
      <View style={[styles.barra, { backgroundColor: c.divider }]}>
        <View style={[styles.barraLlena, { backgroundColor: c.gold, width: `${Math.round(progreso * 100)}%` }]} />
      </View>
    </View>
  );
}

export function Pregunta({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 22, letterSpacing: 0, lineHeight: 29 }]}>{children}</Text>;
}

export function Apoyo({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { c, t } = useTheme();
  return <Text style={[t.small, { color: c.textSoft, lineHeight: 19, marginTop: 8 }, style]}>{children}</Text>;
}

export function Etiqueta({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return <Text style={[t.small, { color: c.text, marginTop: 16, marginBottom: 6 }]}>{children}</Text>;
}

export function Pastillas<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { clave: T; etiqueta: string }[];
  valor: T | null;
  onCambiar: (clave: T) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={styles.pastillas}>
      {opciones.map(o => {
        const activa = o.clave === valor;
        return (
          <Pressable
            key={o.clave}
            onPress={() => onCambiar(o.clave)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            style={[
              styles.pastilla,
              { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.cardBgAlt : c.cardBg },
            ]}
          >
            {activa ? <Icon name="check" size={11} color={c.goldInk} /> : null}
            <Text style={[t.small, { color: activa ? c.goldInk : c.text }]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PastillasMultiples<T extends string>({
  opciones,
  valores,
  onCambiar,
  maximo,
}: {
  opciones: { clave: T; etiqueta: string }[];
  valores: T[];
  onCambiar: (claves: T[]) => void;
  maximo?: number;
}) {
  const { c, t } = useTheme();
  const alternar = (clave: T) => {
    if (valores.includes(clave)) return onCambiar(valores.filter(v => v !== clave));
    if (maximo && valores.length >= maximo) return;
    onCambiar([...valores, clave]);
  };
  return (
    <View style={styles.pastillas}>
      {opciones.map(o => {
        const activa = valores.includes(o.clave);
        const bloqueada = !activa && !!maximo && valores.length >= maximo;
        return (
          <Pressable
            key={o.clave}
            onPress={() => alternar(o.clave)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa, disabled: bloqueada }}
            style={[
              styles.pastilla,
              { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.cardBgAlt : c.cardBg, opacity: bloqueada ? 0.45 : 1 },
            ]}
          >
            <Text style={[t.small, { color: activa ? c.goldInk : c.text }]}>{o.etiqueta}</Text>
            {activa ? <Icon name="check" size={11} color={c.goldInk} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Entrada({
  valor,
  onCambiar,
  placeholder,
  numerico,
  multilinea,
  maximo,
  minimo,
  style,
}: {
  valor: string;
  onCambiar: (texto: string) => void;
  placeholder?: string;
  numerico?: boolean;
  multilinea?: boolean;
  maximo?: number;
  minimo?: number;
  style?: ViewStyle;
}) {
  const { c, t } = useTheme();
  const largo = valor.trim().length;
  const corto = !!minimo && largo > 0 && largo < minimo;
  return (
    <View style={style}>
      <TextInput
        value={valor}
        onChangeText={texto => onCambiar(maximo ? texto.slice(0, maximo) : texto)}
        placeholder={placeholder}
        placeholderTextColor={c.chevron}
        keyboardType={numerico ? 'decimal-pad' : 'default'}
        multiline={!!multilinea}
        style={[
          t.body,
          styles.entrada,
          { color: c.textStrong, borderColor: corto ? c.danger : c.border, backgroundColor: c.cardBg, minHeight: multilinea ? 72 : ALTO_TACTIL },
        ]}
      />
      {(maximo || minimo) ? (
        <Text style={[t.micro, { color: corto ? c.danger : c.micro, marginTop: 4, alignSelf: 'flex-end', letterSpacing: 0.4 }]}>
          {minimo && largo < minimo ? `mínimo ${minimo} · ` : ''}{largo}{maximo ? `/${maximo}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

/** Escala 1–10 táctil (V05). Un slider de verdad exigiría una dependencia nueva; esto es accesible y suficiente. */
export function EscalaDiez({ valor, onCambiar }: { valor: number | null; onCambiar: (n: number) => void }) {
  const { c, t } = useTheme();
  return (
    <RowBetween style={{ marginTop: 6 }}>
      <Row gap={4} style={{ flex: 1, flexWrap: 'wrap' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const activo = valor !== null && n <= valor;
          const elegido = n === valor;
          return (
            <Pressable
              key={n}
              onPress={() => onCambiar(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n} de 10`}
              hitSlop={6}
              style={[
                styles.tick,
                { backgroundColor: activo ? c.gold : c.divider, borderColor: elegido ? c.textStrong : 'transparent' },
              ]}
            />
          );
        })}
      </Row>
      <Text style={[t.metric, { color: c.textStrong, fontSize: 22, marginLeft: 12, minWidth: 30, textAlign: 'right' }]}>
        {valor ?? '–'}
      </Text>
    </RowBetween>
  );
}

export function TarjetaMeta({
  texto,
  editando,
  onEditar,
  onCambiar,
}: {
  texto: string;
  editando: boolean;
  onEditar: () => void;
  onCambiar: (texto: string) => void;
}) {
  const { c, t } = useTheme();
  if (!texto && !editando) return null;
  return (
    <View style={[styles.tarjetaMeta, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
      <RowBetween>
        <Row gap={6}>
          <Icon name="spark" size={12} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, letterSpacing: 1 }]}>TU META REDACTADA</Text>
        </Row>
        <Pressable onPress={onEditar} hitSlop={8} accessibilityRole="button">
          <Text style={[t.micro, { color: c.textSoft }]}>{editando ? 'LISTO' : 'EDITAR'}</Text>
        </Pressable>
      </RowBetween>
      {editando ? (
        <TextInput
          value={texto}
          onChangeText={onCambiar}
          multiline
          style={[t.small, { color: c.textStrong, lineHeight: 19, marginTop: 8, minHeight: 60 }]}
        />
      ) : (
        <Text style={[t.small, { color: c.text, lineHeight: 19, marginTop: 8 }]}>{texto}</Text>
      )}
    </View>
  );
}

export function Avisos({ avisos, soloBloqueantes }: { avisos: AvisoCalidad[]; soloBloqueantes?: boolean }) {
  const { c, t } = useTheme();
  const visibles = soloBloqueantes ? avisos.filter(a => a.bloquea) : avisos;
  if (visibles.length === 0) return null;
  return (
    <View style={{ marginTop: 12, gap: 6 }}>
      {visibles.map(a => (
        <Row key={a.codigo} gap={8} align="flex-start" style={[styles.aviso, { borderColor: a.bloquea ? c.danger : c.border, backgroundColor: c.cardBg }]}>
          <Icon name="info" size={13} color={a.bloquea ? c.danger : c.goldInk} />
          <Text style={[t.small, { color: c.text, flex: 1, lineHeight: 18 }]}>{a.mensaje}</Text>
        </Row>
      ))}
    </View>
  );
}

export function Nota({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return (
    <Row gap={8} align="flex-start" style={[styles.aviso, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 14 }]}>
      <Icon name="info" size={13} color={c.goldInk} />
      <Text style={[t.small, { color: c.textSoft, flex: 1, lineHeight: 18 }]}>{children}</Text>
    </Row>
  );
}

export function TarjetaSeccion({ titulo, icono, onEditar, children }: {
  titulo: string;
  icono: 'heart' | 'briefcase' | 'users' | 'star' | 'stack' | 'zap' | 'award' | 'calendar';
  onEditar?: () => void;
  children: React.ReactNode;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[styles.seccion, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <RowBetween>
        <Row gap={8}>
          <Icon name={icono} size={14} color={c.goldInk} />
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>{titulo}</Text>
        </Row>
        {onEditar ? (
          <Pressable onPress={onEditar} hitSlop={8} accessibilityRole="button">
            <Text style={[t.micro, { color: c.textSoft }]}>EDITAR</Text>
          </Pressable>
        ) : null}
      </RowBetween>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barraLlena: { height: 4, borderRadius: 2 },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pastilla: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 14, minHeight: 38, justifyContent: 'center',
  },
  entrada: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  tick: { width: 22, height: 10, borderRadius: 5, borderWidth: 1.5, marginVertical: 4 },
  tarjetaMeta: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 18 },
  aviso: { borderWidth: 1, borderRadius: 12, padding: 12 },
  seccion: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
});
