import { nombreCortoDeFormacion } from '../../../formaciones/utils/nombreDeFormacion';
import type { ResumenDeTerminosApi, VersionDeTerminosApi } from '../api/terminosSchemas';

/** «31 oct 2026», en la zona del teléfono de quien mira. */
export function fechaDeVersion(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/** Lo que dice la tarjeta de una formación en la lista: «Versión 2 · publicada el 31 oct 2026» o «Por revisar». */
export function estadoDeLaFormacion(resumen: ResumenDeTerminosApi): { titulo: string; detalle: string; porRevisar: boolean } {
  const vigente = resumen.current;
  if (!vigente || vigente.number == null) {
    return {
      titulo: 'Por revisar',
      detalle: 'Trae una copia de los términos de la Escuela. Revísala y publícala antes de aceptar a alguien en esta formación.',
      porRevisar: true,
    };
  }
  const fecha = fechaDeVersion(vigente.publishedAt);
  return {
    titulo: `Versión ${vigente.number}${fecha ? ` · publicada el ${fecha}` : ''}`,
    detalle: resumen.hasDraft ? 'Hay un borrador sin publicar.' : '',
    porRevisar: false,
  };
}

/** Cuántas personas aceptaron la versión vigente, con la palabra en singular o plural. */
export function textoDeAceptantes(cuantas: number): string {
  if (cuantas === 0) return 'Nadie la aceptó todavía';
  return cuantas === 1 ? '1 persona la aceptó' : `${cuantas} personas la aceptaron`;
}

/** Una línea del historial: «Versión 2 · 31 oct 2026 · Ana · 12 personas la aceptaron». */
export function lineaDelHistorial(version: VersionDeTerminosApi, publicadaPor: string | null | undefined, aceptantes: number): string {
  const partes = [`Versión ${version.number ?? '?'}`, fechaDeVersion(version.publishedAt), publicadaPor ?? '', textoDeAceptantes(aceptantes)];
  return partes.filter(p => p !== '').join(' · ');
}

/** «Términos de la Escuela». */
export function tituloDeLaFormacion(codigo: string, nombre?: string): string {
  return nombre?.trim() ? `Términos de ${nombre}` : `Términos de ${nombreCortoDeFormacion(codigo)}`;
}
