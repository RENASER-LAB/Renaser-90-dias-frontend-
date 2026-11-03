import { createContext, useContext } from 'react';

import type { FormacionDeLaSesion } from '../types/formaciones.types';

/**
 * La formación de la sesión (spec 022). Nace de lo que dice el login (`/auth/me`) y se relee al volver la app al frente: así un
 * traslado, o un cambio de lo que Administración le asignó al personal, se nota sin cerrar la app. `elegir` es el cambio de
 * formación activa del personal con varias.
 *
 * Qué NO hace: no decide qué ve cada persona (eso es del servidor en cada lectura). Solo guarda cuál es la formación para que
 * las pantallas la nombren y para que, al cambiar, todo se vuelva a armar (ver `llaveDeLasVistas`).
 *
 * Este archivo es solo el CONTEXTO y su lectura (`useFormacionDeLaSesion`), sin `AuthContext` ni almacenamiento: así cualquier pantalla o hook puede leer la
 * formación —p. ej. `usePlazoDeLaSesion`— sin arrastrar la sesión entera ni su `AsyncStorage` (issue #103/#104). Quien la PROVEE es `FormacionContext.tsx`,
 * que re-exporta esto: los imports de siempre no cambian.
 */
export type ContextoDeFormacion = {
  /** Lo que se sabe. `null` = el servidor no la dijo (backend anterior) o todavía no se leyó: la persona es de la Escuela. */
  formacion: FormacionDeLaSesion | null;
  /** Elige la formación activa (personal con varias). Lanza el error del servidor si no se pudo. */
  elegir: (codigo: string) => Promise<void>;
  /** Vuelve a leerla del servidor, sin molestar si falla. */
  recargar: () => Promise<void>;
};

export const SIN_FORMACION: ContextoDeFormacion = {
  formacion: null,
  elegir: async () => undefined,
  recargar: async () => undefined,
};

export const Contexto = createContext<ContextoDeFormacion>(SIN_FORMACION);

export function useFormacionDeLaSesion(): ContextoDeFormacion {
  return useContext(Contexto);
}

