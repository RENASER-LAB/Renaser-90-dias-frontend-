/**
 * Qué `key` lleva la pantalla de un rol en la consola. Al crear uno, la vista pasa de `id: null` a su id nuevo; si la
 * `key` cambiara con el id, React montaría otra pantalla y se perdería el aviso «Rol «…» creado.» (se vio en Maestro,
 * flujo 38). El rol recién creado conserva la `key` con que se abrió el formulario vacío.
 */
export type VistaDeRol = { id: string | null; montaje?: string };

export const MONTAJE_DE_ROL_NUEVO = 'nuevo';

export function montajeDelRol(vista: VistaDeRol): string {
  return vista.montaje ?? vista.id ?? MONTAJE_DE_ROL_NUEVO;
}

export function vistaTrasCrearRol(id: string): { tipo: 'rol'; id: string; montaje: string } {
  return { tipo: 'rol', id, montaje: MONTAJE_DE_ROL_NUEVO };
}
