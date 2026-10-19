import { Linking } from 'react-native';

import { Alert } from '../../components/Alerta';
import { abrirAjusteDeLaMarca, type AjusteDeLaMarcaAbierto } from './alarmaExactaNativa';

/**
 * Lo que hace el botón de la guía de batería, en Yo → Alarmas y en el aviso de «tu teléfono cerró Renaser»
 * (spec 007, historia 2, FR-008): abrir la pantalla donde se evita que el teléfono cierre la app.
 *
 * 1. La del fabricante, si la hay («Inicio de aplicaciones» en Honor y Huawei…); si no, la lista de batería
 *    del sistema; si no, los ajustes de Renaser (todo eso lo decide el módulo nativo).
 * 2. Sin módulo nativo, o si no abrió nada (`'ninguna'`): los ajustes de Renaser con `Linking.openSettings`,
 *    como antes de esta spec.
 * 3. Si ni eso, un aviso con el camino escrito. Nunca lanza.
 *
 * Los dos parámetros existen para las pruebas.
 */
export const TITULO_SIN_AJUSTES = 'No se pudo abrir';
export const TEXTO_SIN_AJUSTES = 'Abre los Ajustes del teléfono, entra a Apps → Renaser → Batería.';

export interface AbridorDeAjustesDeLaApp {
  openSettings(): Promise<void>;
}

export async function abrirGuiaDeLaMarca(
  linking: AbridorDeAjustesDeLaApp = Linking,
  nativo: () => AjusteDeLaMarcaAbierto = abrirAjusteDeLaMarca,
): Promise<AjusteDeLaMarcaAbierto> {
  const abierto = nativo();
  if (abierto !== 'ninguna') return abierto;
  try {
    await linking.openSettings();
    return 'ajustes_de_la_app';
  } catch {
    Alert.alert(TITULO_SIN_AJUSTES, TEXTO_SIN_AJUSTES);
    return 'ninguna';
  }
}
