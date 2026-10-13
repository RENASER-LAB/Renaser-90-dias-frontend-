/**
 * El sello de la cabecera de «Mi grupo». Quien acompaña con el rol Guía de aprendiz (backend D-265) lee
 * «GUÍA DE APRENDIZ»: hace lo mismo que un mentor, pero el dueño pidió que se lo clasifique así. Cualquier otro que
 * acompañe un grupo (mentor, líder, administración) sigue con «MENTOR», que es la función que cumple en el grupo.
 * El rol llega en las dos nomenclaturas (API y base).
 */
export function insigniaDeQuienAcompana(rol: string | null | undefined): string {
  const clave = (rol ?? '').trim().toUpperCase();
  return clave === 'TRAINEE_GUIDE' || clave === 'GUIA_APRENDIZ' ? 'GUÍA DE APRENDIZ' : 'MENTOR';
}
