import type { AnimalDeFaseApi } from '../api/animalesDeFaseApi';
import type { AnimalDeFase } from '../data/animalesDeFase';

/** Lo que la tarjeta necesita de un animal: lo configurado si hay, y lo incluido en la app como respaldo. */
export interface AnimalParaLaTarjeta {
  nombre: string;
  imagen: AnimalDeFase['imagen'];
  /** La que viene en el APK: se usa si no hay imagen configurada o si la configurada no carga. */
  imagenDeRespaldo: AnimalDeFase['imagen'];
}

/**
 * El animal de una fase con lo que configuró Administración encima de lo incluido en la app. Sin nada
 * configurado (o sin respuesta del servidor) sale exactamente el de la app. La imagen remota lleva
 * `cacheKey` = la ruta del objeto: la URL firmada cambia cada hora y sin esto el teléfono la
 * descargaría de nuevo en cada apertura.
 */
export function animalConfigurado(porDefecto: AnimalDeFase, configurado: AnimalDeFaseApi | null | undefined): AnimalParaLaTarjeta {
  const nombre = configurado?.nombre?.trim() || porDefecto.nombre;
  const url = configurado?.imagenUrl;
  const imagen = url ? { uri: url, cacheKey: configurado?.imagenRuta ?? url } : porDefecto.imagen;
  return { nombre, imagen, imagenDeRespaldo: porDefecto.imagen };
}
