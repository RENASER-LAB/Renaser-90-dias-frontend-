import React, { useEffect } from 'react';
import { Share, View } from 'react-native';

import { Alert } from '../../../../components/Alerta';
import { ALTO_TAB_BAR, DIAMETRO, SEPARACION } from '../../../renasia/components/lugarDelLanzador';
import { useAhora } from '../../hooks/useAhora';
import { usePasarLista } from '../../hooks/usePasarLista';
import type { Ocurrencia } from '../../types/eventos.types';
import { momentoDeLaLista, textoParaCompartir } from '../../utils/asistencia';
import { BotonVolver, Parrafo } from '../piezas';
import { AvisoDeshacer } from './AvisoDeshacer';
import { ListaCerrada } from './ListaCerrada';
import { PasarLista } from './PasarLista';

/**
 * Dónde va el aviso «Deshacer»: encima de los botones flotantes de SER. Esos se ubican contra el borde
 * de la PANTALLA (no de esta sección), así que cuando la barra de pestañas se esconde al desplazar, la
 * sección llega hasta abajo y un aviso pegado a su borde quedaba debajo del botón (visto en la captura
 * del 2026-10-06). Se deja el alto de la barra más el del botón y su separación.
 */
const ENCIMA_DE_SER = ALTO_TAB_BAR + DIAMETRO + SEPARACION;

/**
 * «Pasar lista» y la lista cerrada de una fecha (D-256). Coordina: lee y marca con `usePasarLista`, y
 * elige qué mostrar según la lista esté abierta para marcar o no. El aviso «Deshacer» va FUERA del
 * desplazamiento (`envolver` es el `ScrollView` de la sección), para que se vea esté donde esté la lista.
 */
export function PantallaDeAsistencia({
  oc,
  onVolver,
  envolver,
}: {
  oc: Ocurrencia;
  onVolver: () => void;
  envolver: (hijo: React.ReactNode) => React.ReactNode;
}) {
  const ahora = useAhora();
  const p = usePasarLista(oc.evento.id, oc.inicioOcurrencia);

  useEffect(() => {
    if (!p.aviso) return;
    Alert.alert('No se pudo guardar', p.aviso);
    p.descartarAviso();
  }, [p.aviso, p.descartarAviso]);

  const volver = () => {
    if (!p.hayPendientes) {
      onVolver();
      return;
    }
    Alert.alert('Hay marcas sin guardar', 'Se guardan solas en cuanto vuelva la conexión, si te quedas en esta pantalla.', [
      { text: 'Quedarme', style: 'cancel' },
      { text: 'Salir igual', style: 'destructive', onPress: onVolver },
    ]);
  };

  if (!p.lista) {
    return envolver(
      <View style={{ gap: 14 }}>
        <BotonVolver etiqueta="Volver al evento" onPress={onVolver} />
        <Parrafo tono={p.fallo ? 'peligro' : 'suave'}>{p.fallo ?? 'Abriendo la lista…'}</Parrafo>
      </View>,
    );
  }

  const lista = p.lista;
  const momento = momentoDeLaLista(lista, ahora);
  const compartir = async () => {
    try {
      await Share.share({ message: textoParaCompartir(oc.titulo, oc.iniciaEn, oc.evento.zona, lista) });
    } catch {
      Alert.alert('No se pudo compartir', 'Intenta de nuevo en unos segundos.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {envolver(
        lista.abierta ? (
          <PasarLista
            oc={oc}
            lista={lista}
            pendientes={p.pendientes}
            hayPendientes={p.hayPendientes}
            ocupada={p.ocupada}
            ahoraMs={ahora}
            onVolver={volver}
            onMarcar={p.marcar}
            onCerrar={() => void p.cerrar()}
          />
        ) : (
          <ListaCerrada
            oc={oc}
            lista={lista}
            momento={momento}
            ahoraMs={ahora}
            ocupada={p.ocupada}
            onVolver={volver}
            onCorregir={() => void p.reabrir()}
            onCompartir={() => void compartir()}
          />
        ),
      )}
      <AvisoDeshacer
        deshacer={lista.abierta ? p.deshacer : null}
        alDeshacer={p.deshacerUltima}
        alVencer={p.olvidarDeshacer}
        abajo={ENCIMA_DE_SER}
      />
    </View>
  );
}
