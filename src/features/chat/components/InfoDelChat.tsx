import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { cuantosIntegrantes } from '../utils/formatoChat';
import type { IntegranteDeLaInfo } from '../utils/infoDelChat';
import { AvatarDeChat, type TipoDeAvatar } from './AvatarDeChat';
import { AvatarDeIntegrante } from './AvatarDeIntegrante';

/**
 * La info de una conversación, al estilo de WhatsApp con el tema de Renaser (pedido del dueño,
 * 2026-09-27: «si le doy en el círculo, ver la info del grupo tipo WhatsApp»). Se abre tocando el
 * avatar o el nombre en la cabecera del chat y ocupa la pantalla entera, como el chat.
 *
 * - Arriba, el avatar grande (el de `AvatarDeChat`: la tarjeta sin nombre en un grupo, la tarjeta
 *   con el nombre de su aprendiz en el soporte, el fénix en la comunidad; la foto o las iniciales en
 *   un 1 a 1), el nombre grande y una línea («Grupo · 5 integrantes», «Chat de soporte»,
 *   «Aprendiz»).
 * - En un grupo, la sección «N integrantes»: el mentor primero, cada uno con su marca («Mentor»,
 *   «Aprendiz») y su tarjeta con nombre (D-206, `AvatarDeIntegrante`). Tocar a alguien abre su 1 a 1
 *   cuando eso ya se podía hacer desde acá.
 *
 * > **Corregido 2026-09-27 (D-206).** Decía «el fénix en grupos, soporte y comunidad»: desde 8971acf el
 * > grupo lleva la tarjeta sin nombre, desde D-205 el soporte la de su aprendiz, y el fénix quedó solo
 * > para la comunidad. Los integrantes mostraban la foto subida o las iniciales.
 *
 * Nada más: la pantalla no inventa secciones que el backend no puede llenar.
 */
export function InfoDelChat({
  tipo,
  titulo,
  nombre,
  avatarUrl,
  fotoPath,
  subtitulo,
  detalle,
  integrantes,
  onVolver,
  onAbrirChatCon,
}: {
  tipo: TipoDeAvatar;
  /** «Info. del grupo», «Info. del contacto», «Info. del chat». */
  titulo: string;
  nombre: string;
  avatarUrl?: string | null;
  /** Solo en un soporte: la ruta de su foto (D-205). */
  fotoPath?: string | null;
  subtitulo: string;
  /** Una línea más bajo el subtítulo, si hay dato (la cohorte de un grupo). */
  detalle?: string | null;
  /** La sección de integrantes; `null` en lo que no es un grupo. */
  integrantes: {
    filas: IntegranteDeLaInfo[];
    cifra: number | null;
    cargando: boolean;
    error: string | null;
  } | null;
  onVolver: () => void;
  onAbrirChatCon: (usuarioId: string) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();
  const ancho = { maxWidth: contentMaxWidth, width: '100%' as const, alignSelf: 'center' as const };

  return (
    <View style={[styles.pantalla, { backgroundColor: c.bg }]}>
      <View style={[styles.barra, { backgroundColor: c.cardBg, borderBottomColor: c.divider }]}>
        <Pressable
          onPress={onVolver}
          hitSlop={8}
          style={styles.volver}
          accessibilityRole="button"
          accessibilityLabel="Volver al chat"
        >
          <Icon name="arrowLeft" size={24} color={c.goldInk} />
        </Pressable>
        <Text numberOfLines={1} accessibilityRole="header" style={[styles.tituloBarra, { color: c.textStrong }]}>
          {titulo}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.contenido, { paddingHorizontal: isTablet ? horizontalPadding : 0 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.portada, ancho, { backgroundColor: c.cardBg, borderColor: c.divider }]}>
          <AvatarDeChat tipo={tipo} nombre={nombre} avatarUrl={avatarUrl} fotoPath={fotoPath} size={120} conSello={false} />
          <Text style={[t.screenTitle, styles.nombre, { color: c.textStrong }]} numberOfLines={3}>
            {nombre}
          </Text>
          <Text style={[styles.subtitulo, { color: c.textSoft }]}>{subtitulo}</Text>
          {detalle ? <Text style={[styles.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
        </View>

        {integrantes && (
          <View style={[styles.seccion, ancho, { backgroundColor: c.cardBg, borderColor: c.divider }]}>
            <Text style={[styles.tituloSeccion, { color: c.goldInk, paddingHorizontal: horizontalPadding }]}>
              {integrantes.cifra !== null ? cuantosIntegrantes(integrantes.cifra) : 'Integrantes'}
            </Text>

            {/* «Cargando», «falló» y «no hay nadie» se dicen distinto a propósito: mostrar el último
                cuando se cayó la red le haría creer a la persona que su grupo está vacío. */}
            {integrantes.cargando && integrantes.filas.length === 0 && (
              <Text style={[styles.aviso, { color: c.textSoft, paddingHorizontal: horizontalPadding }]}>
                Cargando integrantes…
              </Text>
            )}
            {!integrantes.cargando && integrantes.error && (
              <Text style={[styles.aviso, { color: c.danger, paddingHorizontal: horizontalPadding }]}>
                {integrantes.error}
              </Text>
            )}
            {!integrantes.cargando && !integrantes.error && integrantes.filas.length === 0 && (
              <Text style={[styles.aviso, { color: c.textSoft, paddingHorizontal: horizontalPadding }]}>
                Todavía no hay integrantes en este grupo.
              </Text>
            )}

            {integrantes.filas.map(fila => (
              <FilaDeIntegranteDelChat
                key={fila.clave}
                integrante={fila}
                margen={horizontalPadding}
                onAbrirChat={onAbrirChatCon}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Una persona en la info del grupo, como en WhatsApp: avatar, nombre y debajo su marca. Si tocarla
 * abre su 1 a 1, toda la fila es el botón (72 px de alto) y lleva el ícono de chat a la derecha.
 */
export function FilaDeIntegranteDelChat({
  integrante,
  margen,
  onAbrirChat,
}: {
  integrante: IntegranteDeLaInfo;
  margen: number;
  onAbrirChat: (usuarioId: string) => void;
}) {
  const { c } = useTheme();
  const esMentor = integrante.rol === 'Mentor';
  const contenido = (
    <>
      <AvatarDeIntegrante
        nombre={integrante.nombreCompleto}
        avatarUrl={integrante.avatarUrl}
        fotoPath={integrante.fotoPath}
        size={48}
      />
      <View style={[styles.filaTextos, { borderBottomColor: c.divider }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text numberOfLines={2} style={[styles.filaNombre, { color: c.textStrong }]}>
            {integrante.nombre}
          </Text>
          <View
            style={[
              styles.marca,
              esMentor
                ? { backgroundColor: c.goldWash, borderColor: c.gold }
                : { backgroundColor: 'transparent', borderColor: c.border },
            ]}
          >
            <Text style={[styles.marcaTexto, { color: esMentor ? c.goldInk : c.textSoft }]}>{integrante.rol}</Text>
          </View>
        </View>
        {integrante.abreChat && <Icon name="chat" size={24} color={c.goldInk} />}
      </View>
    </>
  );

  if (!integrante.abreChat || !integrante.usuarioId) {
    return (
      <View
        style={[styles.fila, { paddingLeft: margen }]}
        accessible
        accessibilityLabel={`${integrante.nombre}, ${integrante.rol}`}
      >
        {contenido}
      </View>
    );
  }
  const usuarioId = integrante.usuarioId;
  return (
    <Pressable
      onPress={() => onAbrirChat(usuarioId)}
      accessibilityRole="button"
      accessibilityLabel={`Escribirle a ${integrante.nombre}, ${integrante.rol}`}
      style={({ pressed }) => [styles.fila, { paddingLeft: margen }, pressed && { backgroundColor: c.goldWash }]}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 60,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  volver: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBarra: {
    flex: 1,
    fontFamily: 'Jost_500Medium',
    fontSize: 19,
  },
  contenido: {
    flexGrow: 1,
    paddingBottom: 36,
    gap: 10,
  },
  portada: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nombre: {
    marginTop: 12,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: 'Jost_400Regular',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  detalle: {
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  seccion: {
    paddingTop: 16,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tituloSeccion: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    marginBottom: 6,
    fontVariant: ['tabular-nums'],
  },
  aviso: {
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
    lineHeight: 23,
    paddingVertical: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
  },
  filaTextos: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingRight: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaNombre: {
    fontFamily: 'Jost_500Medium',
    fontSize: 17,
    lineHeight: 23,
  },
  marca: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  marcaTexto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
  },
});
