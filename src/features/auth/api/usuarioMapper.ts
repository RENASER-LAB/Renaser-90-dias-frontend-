import type { User, UsuarioApi } from '../types/auth.types';

/**
 * Traducción entre la forma del backend y la que usan las pantallas. Vive en un solo lugar a
 * propósito: si mañana el backend renombra un campo, se absorbe acá y ninguna pantalla se entera.
 */

/** El backend devuelve `fullName`; la app venía usando `name`. Se traduce en un solo lugar. */
export function aUsuario(api: UsuarioApi): User {
  return {
    id: api.id,
    name: api.fullName || api.email.split('@')[0] || 'Miembro Renaser',
    email: api.email,
    role: api.role,
    status: api.status,
    avatarUrl: api.avatarUrl,
  };
}
