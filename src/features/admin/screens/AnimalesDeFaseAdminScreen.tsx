import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { FASES_EN_ORDEN } from '../../home/hooks/useResumenHome';
import { ANIMAL_DE_FASE } from '../../yo/data/animalesDeFase';
import { animalConfigurado } from '../../yo/utils/animalConfigurado';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import type { useAnimalesDeFaseAdmin } from '../hooks/useAnimalesDeFaseAdmin';
import { estadoDeLaImagen, SIN_PERMISO_DE_ANIMALES } from '../utils/animalesDeFase';

/**
 * «Imágenes de las fases» (pedido del dueño, 2026-10-06; backend D-258): las cuatro fases con su imagen
 * de hoy —la que cambió Administración o la que trae la app— y, al tocar una, la pantalla donde se
 * cambia con vista previa. Solo llegan acá ADMIN y ALCHEMIST (Administración se muestra por
 * `canAdminister`); un 403 del servidor igual se dice con palabras.
 */
export function AnimalesDeFaseAdminScreen({
  estado,
  onAbrirFase,
  onVolver,
}: {
  estado: ReturnType<typeof useAnimalesDeFaseAdmin>;
  onAbrirFase: (numero: number) => void;
  onVolver: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { animales, cargando, fallo, recargar } = estado;

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Imágenes de las fases" subtitulo="El animal que ve cada aprendiz en Yo" onVolver={onVolver} />
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
        {cargando && !animales ? <Text style={cuerpo}>Cargando las fases…</Text> : null}
        {!cargando && fallo && !animales ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo === 'sin_permiso'
                ? SIN_PERMISO_DE_ANIMALES
                : fallo === 'sin_red'
                  ? 'Sin conexión con el servidor.'
                  : 'No se pudieron cargar las fases.'}
            </Text>
            {fallo !== 'sin_permiso' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
          </View>
        ) : null}
        {animales ? (
          <>
            <TituloDeSeccion detalle="Toca una fase para cambiar su imagen y ver cómo queda la tarjeta.">
              Las cuatro fases
            </TituloDeSeccion>
            {FASES_EN_ORDEN.map(fase => {
              const configurado = animales.find(a => a.fase === fase.numero);
              const animal = animalConfigurado(ANIMAL_DE_FASE[fase.clave], configurado);
              return (
                <Presionable
                  key={fase.clave}
                  onPress={() => onAbrirFase(fase.numero)}
                  accessibilityRole="button"
                  accessibilityLabel={`Fase ${fase.numero}, ${animal.nombre}. ${estadoDeLaImagen(configurado)}`}
                  style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                >
                  <View style={[estilos.miniatura, { backgroundColor: c.goldWash }]}>
                    <Image source={animal.imagen} contentFit="contain" style={estilos.imagen} accessibilityIgnoresInvertColors />
                  </View>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
                      Fase {fase.numero} · {animal.nombre}
                    </Text>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>{estadoDeLaImagen(configurado)}</Text>
                  </View>
                  <Icon name="chevron" size={18} color={c.chevron} />
                </Presionable>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 12 },
  miniatura: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  imagen: { width: 56, height: 56 },
});
