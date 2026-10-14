/**
 * El rol Soporte TI (spec 002, plan §D5): `IT_SUPPORT` en la API y `SOPORTE_TI` en la base (el chat y otras listas
 * mandan el nombre de la base). Lo asigna solo el dueño, por script en la base: **no** entra en `ROLES_ASIGNABLES`,
 * ni al aprobar ni en «Equipo y roles».
 */
export const ROLES_SOPORTE_TI = ['IT_SUPPORT', 'SOPORTE_TI'] as const;

export const ETIQUETA_SOPORTE_TI = 'Soporte TI';

/** ¿Esta cuenta es Soporte TI? En los dos idiomas y sin importar mayúsculas; sin rol, no. */
export function esSoporteTi(rol: string | null | undefined): boolean {
  const clave = rol?.trim().toUpperCase();
  return Boolean(clave && (ROLES_SOPORTE_TI as readonly string[]).includes(clave));
}
