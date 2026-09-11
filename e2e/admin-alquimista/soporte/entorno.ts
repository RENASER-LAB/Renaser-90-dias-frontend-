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

/**
 * Un actor que puede no estar configurado.
 *
 * Se usa para las cuentas que solo necesita UN caso: exigirlas como obligatorias haría que la
 * suite entera se negara a arrancar en un entorno donde ese caso no interesa. Quien las use se
 * saltea con un motivo explícito si faltan.
 */
function actorOpcional(prefijo: string, rol: Actor['rol']): Actor | null {
  const email = process.env[`${prefijo}_EMAIL`]?.trim();
  const password = process.env[`${prefijo}_PASSWORD`]?.trim();
  return email && password ? { email, password, rol } : null;
}

function actor(prefijo: string, rol: Actor['rol']): Actor {
  return {
    email: requerida(`${prefijo}_EMAIL`),
    password: requerida(`${prefijo}_PASSWORD`),
    rol,
  };
}

/**
 * Se calcula UNA vez, al cargar el módulo, y no en cada lectura.
 *
 * <blockquote>Era un getter con `Date.now()` adentro. Sin `E2E_RUN_ID` en el entorno, cada lectura
 * devolvía un identificador distinto: E06 creaba «Renombrar [e2e-mtx3qcee]» y un instante después
 * buscaba en pantalla «Renombrar [e2e-mtx3qdsu]», que no existía. El caso moría por timeout
 * señalando a la interfaz, cuando el defecto estaba acá. Funcionaba solo si quien lanzaba la suite
 * se acordaba de exportar la variable — y una prueba que depende de que alguien recuerde algo es
 * una prueba que va a fallar el día que no esté esa persona.</blockquote>
 */
const RUN_ID = process.env.E2E_RUN_ID?.trim() || `e2e-${Date.now().toString(36)}`;

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
    return RUN_ID;
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
  /**
   * Dos cuentas administrativas que NO iniciaron su programa de 90 días.
   *
   * <blockquote>Existen porque E02 mide la invitación a ese programa, y esa invitación solo
   * aparece para quien todavía puede iniciarlo. La primera versión reutilizaba las cuentas
   * principales y les borraba la participación en cada siembra — funcionaba, pero dejaba a
   * `e2e-admin` sin programa, y entonces cada carga de Hoy pedía datos que ya no existían y el
   * log del backend se llenaba de 404 que no eran un fallo de nada. Mutar la cuenta principal
   * para satisfacer un caso fue un error de diseño: el caso se trae las suyas.</blockquote>
   */
  get adminSinPrograma(): Actor | null {
    return actorOpcional('E2E_FRESH_ADMIN', 'ADMIN');
  },
  get alquimistaSinPrograma(): Actor | null {
    return actorOpcional('E2E_FRESH_ALCHEMIST', 'ALCHEMIST');
  },
};

/** Los dos roles que comparten Administración. Los recorridos se ejecutan con ambos. */
export function rolesAdministrativos(): Array<{ nombre: string; actor: () => Actor }> {
  return [
    { nombre: 'ADMIN', actor: () => ENTORNO.admin },
    { nombre: 'ALQUIMISTA', actor: () => ENTORNO.alquimista },
  ];
}
