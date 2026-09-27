import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { MensajeDeBienvenida } from '../components/MensajeDeBienvenida';
import { PortadaDeBienvenida } from '../components/PortadaDeBienvenida';
import { useBienvenidaAdmin } from '../hooks/useBienvenidaAdmin';
import {
  AVISO_APAGADA,
  NOMBRE_DE_EJEMPLO,
  SIN_PERMISO,
  acotarNombreDeEjemplo,
} from '../utils/bienvenida';
import { entornoDeLaPlataforma } from '../utils/tarjetaDeMuestra';

/**
 * La bienvenida de quien entra al programa, editable por Administración y Alquimista (pedido del
 * dueño del 27/09; backend D-210): la portada de la tarjeta y los tres mensajes.
 *
 * Arriba, un nombre de ejemplo que usan las dos vistas previas (la tarjeta la dibuja el servidor con
 * ese nombre; los mensajes se muestran con los marcadores reemplazados). Después la tarjeta y los
 * mensajes, cada uno con su estado —original o cambiado, por quién y cuándo— y su «volver al original».
 *
 * Solo llegan acá ADMIN y ALCHEMIST activos (Administración se muestra por `canAdminister`); igual, un
 * 403 del servidor se dice con palabras, sin pantalla rota.
 */
export function BienvenidaAdminScreen({ onVolver }: { onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { bienvenida, cargando, fallo, recargar, actualizar } = useBienvenidaAdmin();
  const [nombre, setNombre] = useState(NOMBRE_DE_EJEMPLO);
  // Uno por pantalla: la vista previa de la tarjeta lo usa para convertir la imagen y liberarla.
  const entorno = useMemo(() => entornoDeLaPlataforma(), []);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Bienvenida" subtitulo="La tarjeta y los mensajes de quien entra" onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 22,
        }}
      >
        {cargando && !bienvenida ? <Text style={cuerpo}>Cargando la bienvenida…</Text> : null}

        {!cargando && fallo && !bienvenida ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo === 'sin_permiso'
                ? SIN_PERMISO
                : fallo === 'sin_red'
                  ? 'Sin conexión con el servidor.'
                  : 'No se pudo cargar la bienvenida.'}
            </Text>
            {fallo !== 'sin_permiso' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
          </View>
        ) : null}

        {bienvenida ? (
          <>
            {!bienvenida.activa ? (
              <View style={[estilos.aviso, { borderColor: c.borderStrong, backgroundColor: c.goldWash }]}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>{AVISO_APAGADA}</Text>
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <Text style={[estilos.rotulo, { color: c.textStrong }]}>Nombre de ejemplo</Text>
              <TextInput
                value={nombre}
                onChangeText={v => setNombre(acotarNombreDeEjemplo(v))}
                placeholder={NOMBRE_DE_EJEMPLO}
                placeholderTextColor={c.micro}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Nombre de ejemplo para las vistas previas"
                style={[
                  t.body,
                  estilos.campo,
                  { backgroundColor: c.cardBg, borderColor: c.border, color: c.text, fontSize: 18 },
                ]}
              />
              <Text style={cuerpo}>Se usa para ver cómo quedan la tarjeta y los mensajes con un nombre.</Text>
            </View>

            <PortadaDeBienvenida portada={bienvenida.portada} nombre={nombre} entorno={entorno} onCambio={actualizar} />

            <View style={{ gap: 12 }}>
              <TituloDeSeccion detalle="Los que recibe cada persona al entrar. Donde dice {nombre} va su nombre.">
                Los mensajes
              </TituloDeSeccion>
              {bienvenida.textos.map(texto => (
                <MensajeDeBienvenida
                  key={texto.clave}
                  texto={texto}
                  largoMaximo={bienvenida.largoMaximo}
                  nombre={nombre}
                  onCambio={actualizar}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  aviso: { borderWidth: 1, borderRadius: 14, padding: 14 },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 56 },
});
