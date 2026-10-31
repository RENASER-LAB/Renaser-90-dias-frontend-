import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon } from '../../../components/Icon';
import { BotonPeligro, BotonSecundario } from '../../../components/Legible';
import { AvatarPersona } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { FotoMuro } from '../../community/components/FotoMuro';
import type { WallPost } from '../../community/types/community.types';
import { SIN_PERMISO_PARA_MODERAR, fechaDeLaPublicacion } from '../../community/utils/moderacionDelMuro';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { usePublicacionesOcultas } from '../hooks/usePublicacionesOcultas';

/**
 * «Publicaciones ocultas» (Administración → Más opciones; solo ADMIN y ALCHEMIST, 2026-10-31): lo que se sacó del Muro,
 * para devolverlo o eliminarlo para siempre. Cada publicación muestra a su autor (foto o iniciales), la fecha, el texto
 * recortado a dos líneas (o «Sin texto») y la miniatura de su primera foto, si tiene.
 *
 * Movimiento (`emil-design-eng`): nada nuevo se anima. Los botones son los de siempre; la línea «Publicación devuelta al
 * Muro» es la `ConfirmacionEnLinea` de la app y flota arriba (la publicación que se tocó ya salió de la lista).
 * El atrás del sistema vuelve a «Más opciones».
 */
export function PublicacionesOcultasScreen({ onVolver }: { onVolver: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const estado = usePublicacionesOcultas();
  const { filas, cargando, cargandoMas, fallo, falloAlTraerMas, hayMas, ocupadas, aviso } = estado;

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Publicaciones ocultas" subtitulo="Lo que se sacó del Muro" onVolver={onVolver} />
      <View style={{ flex: 1 }}>
        <ScrollView
          {...barraAlDesplazar}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: horizontalPadding,
            paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
            gap: 12,
          }}
        >
          {cargando && !filas ? <Text style={cuerpo}>Cargando las publicaciones ocultas…</Text> : null}

          {!cargando && fallo && !filas ? (
            <View style={{ gap: 10 }}>
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
                {fallo === 'sin_permiso'
                  ? SIN_PERMISO_PARA_MODERAR
                  : fallo === 'sin_red'
                    ? 'Sin conexión con el servidor.'
                    : 'No se pudieron cargar las publicaciones ocultas.'}
              </Text>
              {fallo !== 'sin_permiso' ? (
                <BotonSecundario etiqueta="Reintentar" onPress={() => void estado.recargar()} />
              ) : null}
            </View>
          ) : null}

          {filas && filas.length === 0 ? <Text style={cuerpo}>No hay publicaciones ocultas.</Text> : null}

          {filas?.map(post => (
            <FilaOculta
              key={post.id}
              post={post}
              ocupada={ocupadas[post.id]}
              alDevolver={() => void estado.devolver(post.id)}
              alEliminar={() => estado.eliminar(post.id)}
            />
          ))}

          {filas && hayMas ? (
            <View style={{ gap: 8 }}>
              {falloAlTraerMas ? (
                <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
                  No se pudieron traer más publicaciones.
                </Text>
              ) : null}
              <BotonSecundario
                etiqueta={falloAlTraerMas ? 'Reintentar' : 'Ver más publicaciones'}
                cargando={cargandoMas}
                onPress={() => void estado.traerMas()}
              />
            </View>
          ) : null}
        </ScrollView>

        {aviso ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 8, left: horizontalPadding, right: horizontalPadding, alignItems: 'center' }}
          >
            <ConfirmacionEnLinea key={aviso.clave} texto={aviso.texto} onTerminar={estado.cerrarAviso} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function FilaOculta({
  post,
  ocupada,
  alDevolver,
  alEliminar,
}: {
  post: WallPost;
  ocupada: 'devolver' | 'eliminar' | undefined;
  alDevolver: () => void;
  alEliminar: () => void;
}) {
  const { c, t } = useTheme();
  const autor = post.authorName?.trim() || 'Miembro Renaser';
  const texto = post.text.trim();
  const primera = post.media[0];
  const ocupadaAlgo = ocupada !== undefined;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <View style={estilos.autor}>
        <AvatarPersona nombre={autor} avatarUrl={post.authorAvatarUrl} size={36} />
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text numberOfLines={1} style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
            {autor}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{fechaDeLaPublicacion(post.createdAt)}</Text>
        </View>
      </View>

      <View style={estilos.contenido}>
        <Text
          numberOfLines={2}
          style={[t.body, { flex: 1, flexShrink: 1, fontSize: 16, lineHeight: 23, color: texto ? c.text : c.textSoft }]}
        >
          {texto || 'Sin texto'}
        </Text>
        {primera ? (
          <View
            accessible
            accessibilityLabel={post.media.length > 1 ? `${post.media.length} fotos` : 'Una foto'}
            style={[estilos.miniatura, { backgroundColor: c.cardBgAlt }]}
          >
            <Icon name={primera.mimeType.startsWith('video/') ? 'video' : 'image'} size={20} color={c.chevron} />
            <FotoMuro url={primera.url} mimeType={primera.mimeType} radioBorde={10} colorFondo={c.cardBgAlt} />
          </View>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <BotonSecundario
          etiqueta="Devolver al Muro"
          cargando={ocupada === 'devolver'}
          deshabilitado={ocupadaAlgo}
          onPress={alDevolver}
        />
        <BotonPeligro
          etiqueta="Eliminar para siempre"
          cargando={ocupada === 'eliminar'}
          deshabilitado={ocupadaAlgo}
          onPress={alEliminar}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contenido: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  miniatura: { width: 64, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
