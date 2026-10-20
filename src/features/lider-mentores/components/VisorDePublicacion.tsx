import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonSecundario } from '../../../components/Legible';
import { AvatarPersona } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { ApiError } from '../../../services/http/apiClient';
import { claveDeCacheDeLaFoto } from '../../evidence/utils/fotoDeEvidencia';
import { momentoDeCalculo } from '../../semaforo/utils/lecturaDelSemaforo';
import { obtenerPublicacion } from '../api/cumplimientoDelLiderApi';
import type { MotivoSinEvidencia } from '../api/cumplimientoDelLiderApi';
import type { PublicacionDelMuro } from '../types/cumplimientoDelLider.types';
import { textoDelFalloDeLaPublicacion } from '../utils/palabrasDeLaPersona';
import { BotonDeEvidencia } from './BotonDeEvidencia';

/**
 * «Ver publicación» del post diario (spec 005, US2; R-6): el hábito «Post diario en comunidad» se cumple
 * publicando en el Muro, y esa publicación es su evidencia. El botón abre una hoja desde abajo con lo que
 * se publicó —autor, fecha, texto y fotos—.
 *
 * Lo usan la ficha del líder, la del mentor y la de administración, así que el botón y la hoja viven
 * juntos: quien lo pone solo pasa el id. La publicación se pide AL ABRIR la hoja (sus fotos llevan una
 * firma que vence), y una publicación que ya no existe dice «Ya no está disponible» sin tumbar la ficha.
 *
 * La lectura es `GET /wall/{id}`, que abre a su autor, al liderazgo y al mentor o la guía que acompaña HOY al
 * autor. Quien ya no cumple eso (403) lee por qué, con todas sus letras; no hay respaldo en el Muro: las tres
 * fichas que ofrecen «Ver publicación» son de quienes sí pueden leerla, y mandar a otro lado a quien el servidor
 * acaba de rechazar solo escondería el rechazo.
 */
export function VerPublicacion({ publicacionId, titulo }: { publicacionId: string; titulo: string }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <BotonDeEvidencia
        etiqueta="Ver publicación"
        icono="newspaper"
        accessibilityLabel={`Ver la publicación de ${titulo}`}
        onPress={() => setAbierta(true)}
      />
      <HojaDesdeAbajo
        visible={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Publicación en el Muro"
        subtitulo={titulo}
        tamano="grande"
        etiquetaCerrar="Cerrar la publicación"
      >
        <CuerpoDeLaPublicacion publicacionId={publicacionId} />
      </HojaDesdeAbajo>
    </>
  );
}

type Lectura =
  | { estado: 'cargando' }
  | { estado: 'lista'; publicacion: PublicacionDelMuro }
  | { estado: 'fallo'; motivo: MotivoSinEvidencia };

function motivoDe(e: unknown): MotivoSinEvidencia {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'no_disponible';
    if (e.status === 403) return 'sin_permiso';
    if (e.status === 0) return 'sin_red';
  }
  return 'error';
}

function CuerpoDeLaPublicacion({ publicacionId }: { publicacionId: string }) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [lectura, setLectura] = useState<Lectura>({ estado: 'cargando' });
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vigente = true;
    setLectura({ estado: 'cargando' });
    obtenerPublicacion(publicacionId).then(
      publicacion => {
        if (vigente) setLectura({ estado: 'lista', publicacion });
      },
      (e: unknown) => {
        if (vigente) setLectura({ estado: 'fallo', motivo: motivoDe(e) });
      },
    );
    return () => {
      vigente = false;
    };
  }, [publicacionId, vuelta]);

  const texto = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <ScrollView
      contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {lectura.estado === 'cargando' ? (
        <View style={estilos.cargando} accessible accessibilityLabel="Abriendo la publicación">
          <ActivityIndicator color={c.goldInk} />
          <Text style={texto}>Abriendo…</Text>
        </View>
      ) : lectura.estado === 'fallo' ? (
        <View style={{ gap: 10 }}>
          <Text style={texto}>{textoDelFalloDeLaPublicacion(lectura.motivo).texto}</Text>
          {textoDelFalloDeLaPublicacion(lectura.motivo).reintentar ? (
            <BotonSecundario etiqueta="Reintentar" onPress={() => setVuelta(v => v + 1)} />
          ) : null}
        </View>
      ) : (
        <>
          <View style={estilos.autor}>
            <AvatarPersona nombre={lectura.publicacion.autor} avatarUrl={lectura.publicacion.avatarUrl} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={1}>
                {lectura.publicacion.autor ?? 'Autor sin nombre'}
              </Text>
              {momentoDeCalculo(lectura.publicacion.creadaEn) ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>{momentoDeCalculo(lectura.publicacion.creadaEn)}</Text>
              ) : null}
            </View>
          </View>
          {lectura.publicacion.texto.trim() ? (
            <Text selectable style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>
              {lectura.publicacion.texto}
            </Text>
          ) : null}
          {lectura.publicacion.fotos.map((foto, i) => (
            <Image
              key={foto.url}
              source={{ uri: foto.url, cacheKey: claveDeCacheDeLaFoto(foto.url) }}
              style={{ width: '100%', height: Math.min(440, Math.round(height * 0.5)), borderRadius: 14, backgroundColor: c.cardBgAlt }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={160}
              accessibilityLabel={`Foto ${i + 1} de la publicación`}
            />
          ))}
          {!lectura.publicacion.texto.trim() && lectura.publicacion.fotos.length === 0 ? (
            <Text style={texto}>La publicación no tiene texto ni fotos.</Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
