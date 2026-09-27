import { ApiError } from '../../../services/http/apiClient';
import type { FotoCuadrada } from '../../auth/utils/elegirFotoDePerfil';
import { almacenamientoSinConfigurar } from '../../community/api/wallApi';
import { SIN_ALMACENAMIENTO, mensajeDeErrorDeBienvenida } from './bienvenida';
import type { TarjetaDeMuestra } from './tarjetaDeMuestra';

/**
 * Cambiar la portada de la tarjeta de bienvenida, hasta la vista previa (backend D-210): elegir la
 * imagen del teléfono → pedir dónde subirla → subirla directo al almacenamiento → pedirle al servidor
 * la tarjeta con esa portada, ya revisada. Recién ahí la persona decide «Usar esta portada» (que es
 * `confirmarPortadaDeBienvenida`, fuera de esta función).
 *
 * Es el mismo flujo de tres pasos que la portada de un evento (`eventos/utils/portadaDelEvento.ts`),
 * con las mismas piezas: `almacenamientoSinConfigurar` y `subirImagenAS3` del Muro. Las piezas llegan
 * inyectadas para poder probar cada salida sin teléfono ni red.
 */

export type PasoDeLaPortada = 'subiendo' | 'revisando';

export type PortadaCandidata =
  /** Canceló la galería o negó el permiso (el selector ya avisó). */
  | { tipo: 'cancelada' }
  /** Subida y revisada: `uri` es la vista previa de la tarjeta con esa portada. */
  | { tipo: 'lista'; ruta: string; uri: string }
  /** El servidor revisó la imagen y no sirve (o no la encontró): se ofrece elegir otra. */
  | { tipo: 'rechazada'; mensaje: string }
  /** Algo del camino falló (red, almacenamiento sin configurar, permisos): no es culpa de la imagen. */
  | { tipo: 'fallo'; mensaje: string };

export interface PiezasDeLaPortada {
  elegir: () => Promise<FotoCuadrada | null>;
  pedirSubida: (tipoContenido: string) => Promise<{ url: string; ruta: string }>;
  subir: (url: string, uri: string, tipoContenido: string) => Promise<void>;
  traerMuestra: (ruta: string) => Promise<TarjetaDeMuestra>;
  /** Para mostrar «Subiendo la imagen…» y «Revisando la imagen…». */
  alAvanzar?: (paso: PasoDeLaPortada) => void;
}

export async function prepararPortadaCandidata(piezas: PiezasDeLaPortada): Promise<PortadaCandidata> {
  const foto = await piezas.elegir();
  if (!foto) return { tipo: 'cancelada' };

  piezas.alAvanzar?.('subiendo');
  let subida: { url: string; ruta: string };
  try {
    subida = await piezas.pedirSubida(foto.mimeType);
  } catch (error) {
    return { tipo: 'fallo', mensaje: mensajeDeErrorDeBienvenida(error, 'No se pudo preparar la subida de la imagen.') };
  }
  // En local el almacenamiento es de marcador: un PUT a `about:blank#…` no sube nada.
  if (almacenamientoSinConfigurar(subida.url)) return { tipo: 'fallo', mensaje: SIN_ALMACENAMIENTO };
  try {
    await piezas.subir(subida.url, foto.uri, foto.mimeType);
  } catch (error) {
    const sinRed = error instanceof ApiError && error.esDeRed;
    return {
      tipo: 'fallo',
      mensaje: sinRed
        ? 'Sin conexión: la imagen no se subió.'
        : 'No se pudo subir la imagen. Revisa la conexión y vuelve a intentar.',
    };
  }

  piezas.alAvanzar?.('revisando');
  const muestra = await piezas.traerMuestra(subida.ruta);
  if (muestra.ok) return { tipo: 'lista', ruta: subida.ruta, uri: muestra.uri };
  // 400: la imagen no sirve (formato, peso, medidas, el nombre no se leería). 404: no llegó a subirse.
  // En los dos casos lo que sigue es elegir otra; lo demás no depende de la imagen.
  if (muestra.status === 400 || muestra.status === 404) return { tipo: 'rechazada', mensaje: muestra.mensaje };
  return { tipo: 'fallo', mensaje: muestra.mensaje };
}
