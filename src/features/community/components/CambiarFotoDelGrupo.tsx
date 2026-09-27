import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { elegirFotoDePerfil, type FotoDePerfil } from '../../auth/utils/elegirFotoDePerfil';
import { subirFotoDelGrupo, volverALaFotoDeRenaser } from '../api/fotoDelGrupoApi';

/**
 * Cambiar la foto de un grupo (D-212, decisión del dueño del 2026-09-27: «Admin y el mentor de ese
 * grupo»). Lo muestran la info del chat del grupo, al mentor que lo acompaña, y la pantalla del grupo del
 * panel de administración, al ADMIN. Quién puede de verdad lo decide el servidor.
 *
 * 1. «Cambiar foto del grupo», grande y con texto: abre el selector de siempre (`elegirFotoDePerfil`),
 *    que deja encuadrar en cuadrado y la reduce a 512 px.
 * 2. Vista previa en el círculo en que se va a ver, con «Guardar foto» y «Cancelar»: nada se sube sin
 *    que la persona la haya visto.
 * 3. «Volver a la foto de Renaser», solo si el grupo tiene foto propia, con confirmación.
 *
 * `onCambiada` corre después de guardar o de volver a la de Renaser, para que quien lo muestra relea lo
 * suyo (la lista de chats trae la ruta nueva con `?v=`; el panel, el estado del grupo).
 */
export function CambiarFotoDelGrupo({
  grupoId,
  tieneFotoPropia,
  onCambiada,
}: {
  grupoId: string;
  tieneFotoPropia: boolean;
  onCambiada: () => void;
}) {
  const { c } = useTheme();
  const [elegida, setElegida] = useState<FotoDePerfil | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const elegir = async () => {
    const foto = await elegirFotoDePerfil({ para: 'la foto del grupo' });
    if (foto) setElegida(foto);
  };

  const guardar = async () => {
    if (!elegida) return;
    setTrabajando(true);
    try {
      await subirFotoDelGrupo(grupoId, elegida);
      setElegida(null);
      onCambiada();
    } catch (e) {
      Alert.alert('No se pudo cambiar la foto', mensajeDeError(e, 'Inténtalo de nuevo en un momento.'));
    } finally {
      setTrabajando(false);
    }
  };

  const volver = () => {
    Alert.alert('¿Volver a la foto de Renaser?', 'El grupo va a mostrar otra vez la tarjeta de Renaser.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Volver a la de Renaser',
        onPress: () => {
          setTrabajando(true);
          volverALaFotoDeRenaser(grupoId)
            .then(onCambiada)
            .catch(e => Alert.alert('No se pudo cambiar la foto', mensajeDeError(e, 'Inténtalo de nuevo en un momento.')))
            .finally(() => setTrabajando(false));
        },
      },
    ]);
  };

  if (elegida) {
    return (
      <View style={styles.previa}>
        <Image
          source={{ uri: elegida.uri }}
          style={[styles.circulo, { borderColor: c.gold }]}
          accessibilityLabel="Vista previa de la foto nueva del grupo"
        />
        <Text style={[styles.texto, { color: c.textSoft }]}>Así se va a ver en el chat del grupo.</Text>
        <BotonPrincipal etiqueta="Guardar foto" icono="check" onPress={() => void guardar()} cargando={trabajando} />
        <BotonSecundario etiqueta="Cancelar" onPress={() => setElegida(null)} deshabilitado={trabajando} />
      </View>
    );
  }

  return (
    <View style={styles.acciones}>
      <BotonPrincipal
        etiqueta="Cambiar foto del grupo"
        icono="camera"
        onPress={() => void elegir()}
        deshabilitado={trabajando}
      />
      {tieneFotoPropia && (
        <BotonSecundario etiqueta="Volver a la foto de Renaser" onPress={volver} cargando={trabajando} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  acciones: {
    gap: 10,
  },
  previa: {
    alignItems: 'stretch',
    gap: 10,
  },
  circulo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  texto: {
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
});
