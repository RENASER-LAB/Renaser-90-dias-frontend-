import type { DetalleDeFormacion, ResumenDeFormacion, TarjetaDeFormacion } from '../types/formaciones.types';

/**
 * Los textos del centro «Formaciones» (spec 022), armados aparte para probarlos sin pantalla. Tipo oración y tuteo; los plurales se
 * dicen bien («1 aprendiz», «2 aprendices») y una cifra que no se pudo leer nunca se escribe como 0.
 */

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** «3 meses · 1 año». Sin duraciones (no debería pasar) dice «Sin duración». */
export function lineaDeDuraciones(resumen: Pick<ResumenDeFormacion, 'etiquetasDeDuracion'>): string {
  return resumen.etiquetasDeDuracion.length > 0 ? resumen.etiquetasDeDuracion.join(' · ') : 'Sin duración';
}

/** «12 aprendices · 3 de personal · 2 grupos». */
export function lineaDeCifras(tarjeta: Pick<TarjetaDeFormacion, 'aprendicesActivos' | 'personal' | 'grupos'>): string {
  return [
    plural(tarjeta.aprendicesActivos, 'aprendiz', 'aprendices'),
    `${tarjeta.personal} de personal`,
    plural(tarjeta.grupos, 'grupo', 'grupos'),
  ].join(' · ');
}

/**
 * Lo que dice «N por atender» en la tarjeta: los grupos sin mentor y los aprendices sin grupo DE ESA formación. El personal sin ninguna
 * formación no es de ninguna, así que no se suma a ninguna tarjeta (se ve aparte en el detalle y en «Equipo y roles»).
 */
export function totalPorAtender(porAtender: DetalleDeFormacion['porAtender']): number {
  return porAtender.gruposSinMentor + porAtender.aprendicesSinGrupo;
}

/** El estado en una palabra: lo que se ve en el detalle bajo el nombre. */
export function estadoDeLaFormacion(resumen: Pick<ResumenDeFormacion, 'activa'>): string {
  return resumen.activa ? 'Disponible' : 'No disponible';
}

/** Cómo terminó una formación anterior, en palabras. */
export function resultadoEnPalabras(resultado: string): string {
  return resultado === 'DADA_POR_TERMINADA' ? 'La dieron por terminada' : 'Terminó';
}
