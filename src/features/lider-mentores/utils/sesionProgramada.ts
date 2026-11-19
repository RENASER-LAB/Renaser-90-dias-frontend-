import { diaEnPalabras } from '../../eventos/utils/textosDeFecha';
import { fechaEnZona, horaEnZona } from '../../eventos/utils/zonaHoraria';

/**
 * Lo que la ficha de un mentor confirma al programar una sesión (spec 056 FR-034): «Sesión programada para el viernes 20 de noviembre a las 15:00.», con el día y la hora
 * en la zona de la sesión. Si la fecha no se lee, no se inventa un día: «Sesión programada.».
 */
export function sesionProgramadaEnPalabras(iniciaEn: string | null | undefined, zona: string | null | undefined): string {
  if (!iniciaEn || Number.isNaN(Date.parse(iniciaEn))) return 'Sesión programada.';
  const dia = diaEnPalabras(fechaEnZona(iniciaEn, zona ?? null));
  return `Sesión programada para el ${dia.charAt(0).toLowerCase()}${dia.slice(1)} a las ${horaEnZona(iniciaEn, zona ?? null)}.`;
}
