import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { laCarreraCorreEn } from '../utils/plataformaDeLaCarrera';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';

/**
 * ¿La persona dio solo la ubicación APROXIMADA? (spec 042 FR-056, #236). En Android 12 o más el permiso puede ser «Aproximada»
 * (`android.accuracy === 'coarse'`) y en iPhone «Ubicación exacta» puede estar apagada (`ios.accuracy === 'reduced'`): el permiso
 * está concedido, pero el GPS entrega puntos a cientos de metros y el mapa sale desviado. La carrera avisa y deja abrir los ajustes.
 */

type ModuloUbicacion = typeof import('expo-location');

function cargar(): ModuloUbicacion | null {
  if (!laCarreraCorreEn(Platform.OS)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-location') as ModuloUbicacion;
  } catch {
    return null;
  }
}

/** Si el permiso de ubicación está concedido pero solo aproximado. Sin permiso o sin poder leerlo, `false`: nunca lanza. */
export async function ubicacionEsAproximada(): Promise<boolean> {
  const L = cargar();
  if (!L) return false;
  try {
    const permiso = await L.getForegroundPermissionsAsync();
    if (!permiso.granted) return false;
    return permiso.android?.accuracy === 'coarse' || permiso.ios?.accuracy === 'reduced';
  } catch {
    return false;
  }
}

/**
 * Si hay que avisar que la ubicación es aproximada. Se lee al abrirse la pantalla y cada vez que la app vuelve al frente, que es
 * cuando la persona regresa de los ajustes. Una lectura que llega tarde no pisa a una más nueva.
 */
export function useUbicacionAproximada(): boolean {
  const [aproximada, setAproximada] = useState(false);
  useEffect(() => {
    let vivo = true;
    let ultima = 0;
    const leer = (): void => {
      const esta = ++ultima;
      void ubicacionEsAproximada().then(v => {
        if (vivo && esta === ultima) setAproximada(v);
      });
    };
    leer();
    const sub = AppState.addEventListener('change', estado => {
      if (estado === 'active') leer();
    });
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);
  return aproximada;
}

/** Abre los ajustes de la app, donde se cambia a ubicación precisa. Si no abren, dice dónde ir. Nunca lanza. */
export async function abrirAjustesDeLaUbicacion(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    Alert.alert(
      TEXTOS_DE_LA_CARRERA.sinAjustesTitulo,
      Platform.OS === 'ios' ? TEXTOS_DE_LA_CARRERA.sinAjustesIos : TEXTOS_DE_LA_CARRERA.sinAjustesAndroid,
    );
  }
}
