import { useCallback, useEffect, useState } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';

import { getTokenSesion } from '../../../services/http/apiClient';
import { fotoParaWeb, fuenteNativaDeLaFoto, marcarQueFallo, yaFallo } from '../utils/fotoConSesion';

/**
 * Una foto que el backend sirve con sesión, lista para un `Image`: la del soporte (D-205) o la tarjeta
 * de un integrante en la info del grupo (D-206). Ver `utils/fotoConSesion.ts`.
 *
 * Devuelve `fuente: null` mientras no hay nada que mostrar —sin ruta, sin sesión, cargando en web o
 * después de un error— y quien la usa deja ver lo de debajo (la tarjeta sin nombre, las iniciales).
 * `alFallar` va en el `onError` del `Image`: recuerda el fallo en esta sesión para no reintentar en
 * cada fila.
 *
 * Lo que se guarda en el estado lleva su ruta: la cabecera es el MISMO componente al pasar de un
 * soporte a otro (el staff los recorre), y sin eso mostraría un instante la tarjeta del anterior o
 * heredaría su fallo.
 *
 * > **Corregido 2026-09-27 (D-206).** Se llamaba `useFotoDelSoporte`; es el mismo hook para cualquier
 * > ruta.
 */
export function useFotoConSesion(ruta: string | null | undefined): {
  fuente: ImageSourcePropType | null;
  alFallar: () => void;
} {
  const token = getTokenSesion();
  const esWeb = Platform.OS === 'web';
  const [web, setWeb] = useState<{ ruta: string; url: string | null } | null>(null);
  const [rutaQueFallo, setRutaQueFallo] = useState<string | null>(null);

  useEffect(() => {
    if (!esWeb || !ruta) return;
    let vigente = true;
    void fotoParaWeb(ruta, token).then(url => {
      if (vigente) setWeb({ ruta, url });
    });
    return () => {
      vigente = false;
    };
  }, [esWeb, ruta, token]);

  const alFallar = useCallback(() => {
    if (!ruta) return;
    marcarQueFallo(ruta, token);
    setRutaQueFallo(ruta);
  }, [ruta, token]);

  if (!ruta || rutaQueFallo === ruta || yaFallo(ruta, token)) return { fuente: null, alFallar };
  if (!esWeb) return { fuente: fuenteNativaDeLaFoto(ruta, token), alFallar };
  const url = web?.ruta === ruta ? web.url : null;
  return { fuente: url ? { uri: url } : null, alFallar };
}
