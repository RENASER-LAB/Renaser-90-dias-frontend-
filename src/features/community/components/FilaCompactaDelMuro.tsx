// pedido del dueño 2026-11-05 muro compacto
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { AvatarPersona } from '../../../components/ui';
import type { PostItem } from '../../../screens/ComunidadScreen';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { space } from '../../../theme/tokens';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import {
  LADO_DE_LA_MINIATURA,
  LINEAS_DE_LA_FILA,
  etiquetaDeComentarios,
  etiquetaDeLaFila,
  vistaDeLaFilaCompacta,
} from '../utils/filaCompactaDelMuro';
import { lineaDelAutor } from '../utils/lineaDelAutor';
import { FotoMuro } from './FotoMuro';

/** Lo que una fila le pide a la pantalla. Llega como UN objeto estable, para que `memo` sirva. */
export type AccionesDeLaFila = {
  /** Abre la publicación completa (la tarjeta de siempre). `conComentarios` la abre con los comentarios a la vista. */
  abrir: (postId: string, conComentarios?: boolean) => void;
  alternarLike: (postId: string) => void;
  /** El «…» de moderación (solo ADMIN y ALCHEMIST, ver `puedeModerar`). */
  moderar: (postId: string) => void;
};

type Props = {
  post: PostItem;
  /** La publicación a la que se llegó desde Hoy: borde dorado, como en la tarjeta. */
  destacada: boolean;
  /** Dibuja el «…» de moderación. Solo `true` para ADMIN y ALCHEMIST (`usePuedeModerarElMuro`), igual que en la tarjeta. */
  puedeModerar?: boolean;
  acciones: AccionesDeLaFila;
};

/**
 * Una publicación del Muro en lista compacta, estilo Skool (pedido del dueño, 2026-11-05): cabecera con la insignia del
 * día y el «…», el texto cortado a tres líneas con la primera foto a la derecha (y «+N» si hay más), y un pie delgado con
 * «me gusta» y comentarios. Tocar la fila abre la publicación completa (`TarjetaPublicacionMuro`, sin cambios).
 *
 * Sin animación propia: se toca decenas de veces por visita. Solo el hundimiento de `Presionable`.
 */
function FilaCompactaDelMuroBase({ post, destacada, puedeModerar = false, acciones }: Props) {
  const { c, t } = useTheme();
  const reacciones = useFuncionalidad(CLAVES.muroReacciones);
  const comentarios = useFuncionalidad(CLAVES.muroComentarios);
  const vista = vistaDeLaFilaCompacta(post);
  const leGusta = post.userReaction === 'like';
  /* Una publicación que todavía se está subiendo no tiene id del servidor: no se abre ni se modera. */
  const abrible = !post.pendiente;

  return (
    <Presionable
      onPress={abrible ? () => acciones.abrir(post.id) : undefined}
      disabled={!abrible}
      escalaAlApretar={0.985}
      accessibilityRole="button"
      accessibilityLabel={etiquetaDeLaFila(post)}
      style={[
        estilos.fila,
        { backgroundColor: c.cardBg, borderColor: destacada ? c.gold : c.border },
        post.pendiente && { opacity: 0.55 },
      ]}
    >
      <View style={estilos.cabecera}>
        <View style={estilos.autor}>
          <AvatarPersona nombre={post.author} avatarUrl={post.avatarUrl} size={44} />
          <View style={estilos.autorTextos}>
            <Text numberOfLines={2} style={[t.cardTitle, { color: c.textStrong }]}>
              {post.author}
            </Text>
            <Text numberOfLines={1} style={[t.small, { color: c.textSoft }]}>
              {lineaDelAutor(post.cell, post.timeAgo)}
            </Text>
          </View>
        </View>
        <View style={estilos.insigniaYModerar}>
          {post.diaPrograma !== null ? (
            <View style={[estilos.insigniaDelDia, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: fuentes.negrita }]}>
                Día {post.diaPrograma}
              </Text>
            </View>
          ) : null}
          {puedeModerar && abrible ? (
            <Presionable
              onPress={() => acciones.moderar(post.id)}
              accessibilityRole="button"
              accessibilityLabel="Opciones de moderación"
              style={estilos.botonModerar}
            >
              <Icon name="ellipsis" size={TAMANO_ICONO.grande} color={c.textSoft} />
            </Presionable>
          ) : null}
        </View>
      </View>

      <View style={estilos.cuerpo}>
        <Text numberOfLines={LINEAS_DE_LA_FILA} style={[t.body, estilos.texto, { color: c.text }]}>
          {post.text}
        </Text>
        {vista.miniatura ? (
          <View style={[estilos.miniatura, { backgroundColor: c.placeholderA }]} testID="miniatura-del-muro">
            <Text style={[t.micro, { color: c.goldInk, fontSize: 10 }]} numberOfLines={1}>
              {vista.miniatura.titulo}
            </Text>
            <FotoMuro url={vista.miniatura.url} mimeType={vista.miniatura.mimeType} radioBorde={10} colorFondo={c.cardBgAlt} />
            {vista.fotosDeMas > 0 ? (
              <View style={estilos.chapaDeMas} accessibilityLabel={`${vista.fotosDeMas} fotos más`}>
                <Text style={estilos.chapaDeMasTexto}>+{vista.fotosDeMas}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={estilos.pie}>
        {reacciones.disponible ? (
          <Pressable
            onPress={() => acciones.alternarLike(post.id)}
            disabled={!abrible}
            accessibilityRole="button"
            accessibilityLabel={leGusta ? `Quitar me gusta. ${post.likes}` : `Me gusta. ${post.likes}`}
            accessibilityState={{ selected: leGusta }}
            style={({ pressed }) => [
              estilos.botonDelPie,
              (leGusta || pressed) && { backgroundColor: c.goldWash },
            ]}
          >
            <Icon name="thumbsUp" size={TAMANO_ICONO.chico} color={leGusta ? c.goldInk : c.textSoft} />
            <Text
              style={[
                t.small,
                estilos.cifra,
                leGusta ? { color: c.goldInk, fontFamily: fuentes.negrita } : { color: c.textSoft },
              ]}
            >
              {post.likes}
            </Text>
          </Pressable>
        ) : null}
        {comentarios.disponible ? (
          <Pressable
            onPress={abrible ? () => acciones.abrir(post.id, true) : undefined}
            disabled={!abrible}
            accessibilityRole="button"
            accessibilityLabel={etiquetaDeComentarios(vista.comentarios)}
            style={({ pressed }) => [estilos.botonDelPie, pressed && { backgroundColor: c.goldWash }]}
          >
            <Icon name="messageCircle" size={TAMANO_ICONO.chico} color={c.textSoft} />
            <Text style={[t.small, estilos.cifra, { color: c.textSoft }]}>{vista.comentarios}</Text>
          </Pressable>
        ) : null}
      </View>
    </Presionable>
  );
}

export const FilaCompactaDelMuro = memo(FilaCompactaDelMuroBase);

const estilos = StyleSheet.create({
  fila: {
    borderWidth: 1,
    borderRadius: space.radius,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  autor: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  autorTextos: { flexShrink: 1, minWidth: 0 },
  insigniaYModerar: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  insigniaDelDia: { borderRadius: space.radiusSm, paddingHorizontal: 8, paddingVertical: 4 },
  botonModerar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginVertical: -6, marginRight: -12 },
  cuerpo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 10 },
  texto: { flex: 1, minWidth: 0 },
  miniatura: {
    width: LADO_DE_LA_MINIATURA,
    height: LADO_DE_LA_MINIATURA,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chapaDeMas: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  chapaDeMasTexto: { color: '#FFFFFF', fontSize: 12, fontFamily: fuentes.negrita, fontVariant: ['tabular-nums'] },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: -8 },
  botonDelPie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: space.radiusSm,
  },
  cifra: { fontVariant: ['tabular-nums'] },
});
