import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { cuantosIntegrantes } from '../utils/formatoChat';
import type { IntegranteDeLaInfo } from '../utils/infoDelChat';
import { CambiarFotoDelGrupo } from '../../community/components/CambiarFotoDelGrupo';
import { AvatarDeChat, type TipoDeAvatar } from './AvatarDeChat';
import { AvatarDeIntegrante } from './AvatarDeIntegrante';

/**
 * La info de una conversación, al estilo de WhatsApp con el tema de Renaser (pedido del dueño,
 * 2026-09-27: «si le doy en el círculo, ver la info del grupo tipo WhatsApp»). Se abre tocando el
 * avatar o el nombre en la cabecera del chat y ocupa la pantalla entera, como el chat.
 *
 * - Arriba, el avatar grande (el de `AvatarDeChat`: en un grupo, su foto propia o la tarjeta sin
 *   nombre (D-212); la tarjeta con el nombre de su aprendiz en el soporte, el fénix en la comunidad;
 *   la foto o las iniciales en un 1 a 1), el nombre grande y una línea («Grupo · 5 integrantes»,
 *   «Chat de soporte», «Aprendiz»).
 * - En todo chat menos un 1 a 1 (D-222), la sección «N integrantes»: cada uno con su marca («Mentor»,
 *   «Aprendiz», «Admin», «Alquimista», «Tú») y su tarjeta con nombre (D-206, `AvatarDeIntegrante`) o su foto;
 *   con buscador y «Ver más» cuando son muchos (la comunidad). En un grupo, el mentor primero. Tocar a alguien abre su 1 a 1,
 *   también al mentor (D-207). Al mentor de ESE grupo, cada aprendiz le muestra además un botón grande
 *   «Ver ficha», que abre la misma ficha que «Mi grupo» (D-207, `onVerFicha`).
 * - En un grupo, a quien puede cambiarla (el mentor de ese grupo o el ADMIN), la sección «Foto del grupo»
 *   con «Cambiar foto del grupo» y, si tiene foto propia, «Volver a la foto de Renaser» (D-212).
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
  onVerFicha,
  fotoDelGrupo = null,
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
  /**
   * La sección de integrantes; `null` en un 1 a 1, que ya muestra a la otra persona arriba. Desde D-222 la
   * tiene todo chat (comunidad, grupo, soporte) y todo rol, con el buscador y «Ver más» cuando son muchos.
   */
  integrantes: {
    filas: IntegranteDeLaInfo[];
    cifra: number | null;
    cargando: boolean;
    error: string | null;
    /** Cuando faltan por traer (la comunidad son cientos, se pide de a 50). */
    hayMas?: boolean;
    cargandoMas?: boolean;
    onVerMas?: () => void;
    /** Con `onBuscar` se muestra la caja de búsqueda por nombre. */
    busqueda?: string;
    onBuscar?: (texto: string) => void;
  } | null;
  onVolver: () => void;
  onAbrirChatCon: (usuarioId: string) => void;
  /** D-207: abre la ficha de un aprendiz (solo en las filas con `abreFicha`). */
  onVerFicha: (integrante: IntegranteDeLaInfo) => void;
  /**
   * D-212: el control para cambiar la foto del grupo, solo para quien puede (`puedeCambiarLaFotoDelGrupo`:
   * el ADMIN o el mentor de ese grupo). `null` en lo demás.
   */
  fotoDelGrupo?: { grupoId: string; tieneFotoPropia: boolean; onCambiada: () => void } | null;
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

        {fotoDelGrupo && (
          <View style={[styles.seccion, ancho, { backgroundColor: c.cardBg, borderColor: c.divider }]}>
            <Text style={[styles.tituloSeccion, { color: c.goldInk, paddingHorizontal: horizontalPadding }]}>
              Foto del grupo
            </Text>
            <View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 12 }}>
              <CambiarFotoDelGrupo
                grupoId={fotoDelGrupo.grupoId}
                tieneFotoPropia={fotoDelGrupo.tieneFotoPropia}
                onCambiada={fotoDelGrupo.onCambiada}
              />
            </View>
          </View>
        )}

        {integrantes && (
          <View style={[styles.seccion, ancho, { backgroundColor: c.cardBg, borderColor: c.divider }]}>
            <Text style={[styles.tituloSeccion, { color: c.goldInk, paddingHorizontal: horizontalPadding }]}>
              {integrantes.cifra !== null ? cuantosIntegrantes(integrantes.cifra) : 'Integrantes'}
            </Text>

            {/* «Cargando», «falló» y «no hay nadie» se dicen distinto a propósito: mostrar el último
                cuando se cayó la red le haría creer a la persona que su grupo está vacío. */}
            {integrantes.onBuscar && (
              <View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 8 }}>
                <TextInput
                  value={integrantes.busqueda ?? ''}
                  onChangeText={integrantes.onBuscar}
                  placeholder="Buscar por nombre"
                  placeholderTextColor={c.textSoft}
                  accessibilityLabel="Buscar integrantes por nombre"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={[styles.buscador, { color: c.textStrong, borderColor: c.border, backgroundColor: c.bg }]}
                />
              </View>
            )}

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
                {integrantes.busqueda?.trim() ? 'Nadie coincide con esa búsqueda.' : 'Todavía no hay integrantes en este chat.'}
              </Text>
            )}

            {integrantes.filas.map(fila => (
              <FilaDeIntegranteDelChat
                key={fila.clave}
                integrante={fila}
                margen={horizontalPadding}
                onAbrirChat={onAbrirChatCon}
                onVerFicha={onVerFicha}
              />
            ))}

            {integrantes.hayMas && integrantes.onVerMas && (
              <Pressable
                onPress={integrantes.onVerMas}
                disabled={integrantes.cargandoMas}
                accessibilityRole="button"
                accessibilityLabel="Ver más integrantes"
                style={({ pressed }) => [styles.verMas, { borderColor: c.gold, backgroundColor: pressed ? c.cardBg : c.goldWash }]}
              >
                {integrantes.cargandoMas ? (
                  <ActivityIndicator color={c.goldInk} />
                ) : (
                  <Text style={[styles.botonFichaTexto, { color: c.goldInk }]}>Ver más</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Una persona en la info del grupo, como en WhatsApp: avatar, nombre y debajo su marca. Tres formas:
 * - **Con «Ver ficha»** (D-207: quien mira es el mentor de este grupo): la fila no es un botón; lleva
 *   debajo del nombre un botón grande con texto, «Ver ficha» (nota del dueño: «el público es objetivo,
 *   lo mejor visible posible»), y a la derecha el ícono del 1 a 1 como botón aparte, de 48 px.
 * - **Si tocarla abre su 1 a 1:** toda la fila es el botón (72 px de alto) y lleva el ícono de chat.
 * - Si no hay acción (uno mismo), solo se lee.
 */
export function FilaDeIntegranteDelChat({
  integrante,
  margen,
  onAbrirChat,
  onVerFicha,
}: {
  integrante: IntegranteDeLaInfo;
  margen: number;
  onAbrirChat: (usuarioId: string) => void;
  onVerFicha: (integrante: IntegranteDeLaInfo) => void;
}) {
  const { c } = useTheme();
  const avatar = (
    <AvatarDeIntegrante
      nombre={integrante.nombreCompleto}
      avatarUrl={integrante.avatarUrl}
      fotoPath={integrante.fotoPath}
      size={48}
    />
  );
  const usuarioId = integrante.usuarioId;

  if (integrante.abreFicha && usuarioId) {
    return (
      <View style={[styles.fila, { paddingLeft: margen }]}>
        {avatar}
        <View style={[styles.filaTextos, { borderBottomColor: c.divider }]}>
          <View style={styles.columnaDeLaFila}>
            <NombreYMarca integrante={integrante} />
            <Pressable
              onPress={() => onVerFicha(integrante)}
              accessibilityRole="button"
              accessibilityLabel={`Ver la ficha de ${integrante.nombre}`}
              style={({ pressed }) => [
                styles.botonFicha,
                { borderColor: c.gold, backgroundColor: pressed ? c.cardBg : c.goldWash },
              ]}
            >
              <Icon name="doc" size={20} color={c.goldInk} />
              <Text style={[styles.botonFichaTexto, { color: c.goldInk }]}>Ver ficha</Text>
            </Pressable>
          </View>
          {integrante.abreChat && (
            <Pressable
              onPress={() => onAbrirChat(usuarioId)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`Escribirle a ${integrante.nombre}`}
              style={({ pressed }) => [styles.botonChat, pressed && { backgroundColor: c.goldWash }]}
            >
              <Icon name="chat" size={24} color={c.goldInk} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const contenido = (
    <>
      {avatar}
      <View style={[styles.filaTextos, { borderBottomColor: c.divider }]}>
        <View style={styles.columnaDeLaFila}>
          <NombreYMarca integrante={integrante} />
        </View>
        {integrante.abreChat && <Icon name="chat" size={24} color={c.goldInk} />}
      </View>
    </>
  );

  if (!integrante.abreChat || !usuarioId) {
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

/** El nombre («Tú» para uno mismo) y debajo su marca, «Mentor» en dorado o «Aprendiz». */
function NombreYMarca({ integrante }: { integrante: IntegranteDeLaInfo }) {
  const { c } = useTheme();
  /* El mentor y el staff (Admin, Alquimista) llevan la marca dorada; el aprendiz, la sobria. */
  const esMentor = integrante.rol !== 'Aprendiz';
  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  buscador: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Jost_400Regular',
    fontSize: 17,
  },
  verMas: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginHorizontal: 18,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
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
  columnaDeLaFila: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  botonFicha: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  botonFichaTexto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 17,
  },
  botonChat: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
