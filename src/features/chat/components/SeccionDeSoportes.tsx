import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { useTheme } from '../../../theme/ThemeContext';
import { rotuloDeLaSeccion } from '../utils/seccionDeSoportes';
import { FilaDeConversacion } from './FilaDeConversacion';

/**
 * La sección plegable «Soporte · N» de Tribu, solo para Admin y Alquimista (D-249). Al tocar la cabecera
 * se abre: buscador (nombre o correo, en el servidor) y los chats de soporte de a una página; la pantalla
 * pide la siguiente al acercarse al final (`useSoportesPaginados.pedirMas`). Las filas son las mismas de
 * siempre (`FilaDeConversacion`) y abren el chat por el mismo camino.
 */
export function SeccionDeSoportes(props: {
  abierta: boolean;
  onAlternar: () => void;
  total: number | null;
  conNoLeidos: number;
  texto: string;
  onCambiarTexto: (texto: string) => void;
  buscando: boolean;
  filas: ChatConversation[];
  tituloDe: (fila: ChatConversation) => string;
  ahora: Date;
  onAbrir: (fila: ChatConversation) => void;
  cargando: boolean;
  cargandoMas: boolean;
  error: string | null;
  onReintentar: () => void;
}) {
  const { c, t } = useTheme();
  const { abierta, total, conNoLeidos } = props;

  return (
    <View style={estilos.seccion}>
      {/* La cabecera se hunde al apoyar el dedo (2026-10-05, `Presionable`). */}
      <Presionable
        onPress={props.onAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        accessibilityLabel={`${rotuloDeLaSeccion(total)}${conNoLeidos > 0 ? `, ${conNoLeidos} con mensajes sin leer` : ''}`}
        style={estilos.cabecera}
      >
        <Text style={[t.micro, { color: c.micro, flex: 1 }]}>{rotuloDeLaSeccion(total)}</Text>
        {conNoLeidos > 0 && (
          <View style={[estilos.contador, { backgroundColor: c.gold }]}>
            <Text style={[estilos.contadorTexto, { color: c.onGold }]}>{conNoLeidos > 99 ? '99+' : conNoLeidos}</Text>
          </View>
        )}
        {/* `chevron` apunta a la derecha: 90° baja (plegada), −90° sube (abierta). */}
        <View style={{ transform: [{ rotate: abierta ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.goldInk} />
        </View>
      </Presionable>

      {abierta && (
        <>
          {/* Con lupa (2026-10-05): sin ella el buscador parecía un campo cualquiera del formulario. */}
          <View style={[estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <Icon name="search" size={TAMANO_ICONO.normal} color={c.textSoft} />
            <TextInput
              value={props.texto}
              onChangeText={props.onCambiarTexto}
              placeholder="Buscar por nombre o correo"
              placeholderTextColor={c.micro}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar un chat de soporte"
              style={[t.body, estilos.campo, { color: c.text }]}
            />
            {props.texto.length > 0 && (
              <Pressable
                onPress={() => props.onCambiarTexto('')}
                accessibilityRole="button"
                accessibilityLabel="Borrar la búsqueda"
                hitSlop={12}
                style={estilos.borrar}
              >
                <Icon name="close" size={16} color={c.textSoft} />
              </Pressable>
            )}
          </View>

          {props.cargando && props.filas.length === 0 && (
            <Text style={[t.body, estilos.aviso, { color: c.textSoft }]}>Cargando…</Text>
          )}
          {!props.cargando && !props.error && props.filas.length === 0 && (
            <Text style={[t.body, estilos.aviso, { color: c.textSoft }]}>
              {props.buscando ? `Sin resultados para «${props.texto.trim()}».` : 'Todavía no hay chats de soporte.'}
            </Text>
          )}

          <View style={{ marginTop: 6 }}>
            {props.filas.map(fila => (
              <FilaDeConversacion
                key={fila.id}
                conversacion={fila}
                titulo={props.tituloDe(fila)}
                ahora={props.ahora}
                onPress={() => props.onAbrir(fila)}
              />
            ))}
          </View>

          {props.cargandoMas && (
            <View style={estilos.pie} accessibilityLabel="Cargando más chats de soporte">
              <ActivityIndicator color={c.goldInk} />
              <Text style={[t.small, { color: c.textSoft }]}>Cargando más…</Text>
            </View>
          )}
          {props.error && (
            <Pressable onPress={props.onReintentar} accessibilityRole="button" style={estilos.pie}>
              <Text style={[t.small, { color: c.danger }]}>{props.error} Toca para reintentar.</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: {
    marginTop: 24,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  contador: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontFamily: 'Jost_700Bold',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  campo: {
    flex: 1,
    fontSize: 16,
    minHeight: 50,
  },
  borrar: {
    paddingLeft: 8,
  },
  aviso: {
    marginTop: 14,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
  },
});
