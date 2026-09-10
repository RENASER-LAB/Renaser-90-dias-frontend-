/**
 * Lo que la suite necesita del entorno, en un solo lugar y sin valores por defecto peligrosos.
 *
 * **Nada de credenciales dentro del repositorio.** Todo llega por variables de entorno; si falta
 * alguna, la suite se detiene con un mensaje que dice cuál. Poner un usuario y una contraseña de
 * ejemplo en un archivo versionado es como terminan las credenciales reales en Git: alguien las
 * reemplaza "un momento" para probar y las commitea.
 *
 * **Tampoco un backend por defecto.** `E2E_API_URL` es obligatoria justamente para que nadie
 * apunte la suite a producción por olvido: sin la variable no arranca, en vez de caer en un
 * localhost que en la máquina equivocada podría ser otra cosa.
 */
export type Actor = {
  email: string;
  password: string;
  rol: 'ADMIN' | 'ALCHEMIST' | 'MENTOR' | 'TRAINEE' | 'SUSPENDED';
};

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || !valor.trim()) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. La suite E2E no corre sin entorno de pruebas ` +
        'declarado: ver specs/003-admin-alquimista/e2e.md, sección "Entorno real, aislado y reproducible".',
    );
  }
  return valor.trim();
}

function actor(prefijo: string, rol: Actor['rol']): Actor {
  return {
    email: requerida(`${prefijo}_EMAIL`),
    password: requerida(`${prefijo}_PASSWORD`),
    rol,
  };
}

export const ENTORNO = {
  /** URL del backend de PRUEBAS. Nunca la de producción. */
  get apiUrl(): string {
    return requerida('E2E_API_URL').replace(/\/+$/, '');
  },
  /** URL donde sirve la app web. La app exige el 8081 por CORS del backend. */
  get appUrl(): string {
    return (process.env.E2E_APP_URL ?? 'http://localhost:8081').replace(/\/+$/, '');
  },
  /**
   * Marca esta ejecución. Todo lo que la suite crea lleva el runId en el nombre, así dos
   * ejecuciones simultáneas no se pisan y la limpieza sabe qué es suyo — nunca se trunca nada.
   */
  get runId(): string {
    return process.env.E2E_RUN_ID ?? `e2e-${Date.now().toString(36)}`;
  },
  get admin(): Actor {
    return actor('E2E_ADMIN', 'ADMIN');
  },
  get alquimista(): Actor {
    return actor('E2E_ALCHEMIST', 'ALCHEMIST');
  },
  get mentor(): Actor {
    return actor('E2E_MENTOR', 'MENTOR');
  },
  get aprendiz(): Actor {
    return actor('E2E_TRAINEE', 'TRAINEE');
  },
  get suspendido(): Actor {
    return actor('E2E_SUSPENDED', 'SUSPENDED');
  },
};

/** Los dos roles que comparten Administración. Los recorridos se ejecutan con ambos. */
export function rolesAdministrativos(): Array<{ nombre: string; actor: () => Actor }> {
  return [
    { nombre: 'ADMIN', actor: () => ENTORNO.admin },
    { nombre: 'ALQUIMISTA', actor: () => ENTORNO.alquimista },
  ];
}
