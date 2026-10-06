/**
 * Lo que se le revisa a la imagen de un animal ANTES de subirla, para decirlo en seguida y sin gastar
 * datos. Son los mismos límites que aplica el servidor al confirmar (backend D-258,
 * `ImagenDeAnimal.java`): PNG o WebP, hasta 2 MB, entre 256 y 4096 px por lado. El servidor es quien
 * decide de verdad (mira el contenido, no el tipo que declara el teléfono); esto solo adelanta el aviso.
 */
export const TIPOS_DE_IMAGEN_DE_ANIMAL = ['image/png', 'image/webp'] as const;
export const PESO_MAXIMO_DE_IMAGEN = 2 * 1024 * 1024;
export const LADO_MINIMO_DE_IMAGEN = 256;
export const LADO_MAXIMO_DE_IMAGEN = 4096;
export const RECOMENDACION_DE_IMAGEN = 'PNG o WebP con fondo transparente.';

export interface ImagenElegida {
  uri: string;
  mimeType: string;
  /** Bytes, si el selector los sabe. */
  peso?: number | null;
  ancho?: number | null;
  alto?: number | null;
}

function megas(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',').replace(',0', '');
}

/** El motivo, en palabras simples, por el que la imagen no sirve; `null` si sirve (o no se puede saber). */
export function motivoDeRechazoDeLaImagen(imagen: ImagenElegida): string | null {
  if (!(TIPOS_DE_IMAGEN_DE_ANIMAL as readonly string[]).includes(imagen.mimeType.toLowerCase())) {
    return 'La imagen tiene que ser PNG o WebP.';
  }
  if (imagen.peso != null && imagen.peso > PESO_MAXIMO_DE_IMAGEN) {
    return `La imagen pesa ${megas(imagen.peso)} MB: el máximo es ${megas(PESO_MAXIMO_DE_IMAGEN)} MB.`;
  }
  if (imagen.ancho != null && imagen.alto != null) {
    if (Math.min(imagen.ancho, imagen.alto) < LADO_MINIMO_DE_IMAGEN) {
      return `La imagen es muy chica (${imagen.ancho} × ${imagen.alto} px): tiene que medir al menos ${LADO_MINIMO_DE_IMAGEN} px por lado.`;
    }
    if (Math.max(imagen.ancho, imagen.alto) > LADO_MAXIMO_DE_IMAGEN) {
      return `La imagen es demasiado grande (${imagen.ancho} × ${imagen.alto} px): el máximo es ${LADO_MAXIMO_DE_IMAGEN} px por lado.`;
    }
  }
  return null;
}
