import { ENTORNO, type Actor } from './entorno';

/**
 * Cliente HTTP para PREPARAR y COMPROBAR, nunca para ejecutar el recorrido.
 *
 * La distinción no es cosmética: un caso que crea el grupo por API y después verifica por API no
 * probó la interfaz, probó el backend — y eso ya lo cubren las pruebas de integración. Acá la API
 * sirve para dejar el mundo en un estado conocido antes de abrir el navegador, y para mirar
 * después si lo que hizo la interfaz quedó realmente escrito.
 *
 * La sesión es real: se hace login y se usa el `X-Auth-Token` que devuelve el backend, como
 * cualquier cliente. No se inventan JWT ni se inyectan roles en el navegador.
 */
/**
 * Sesiones ya obtenidas, por correo.
 *
 * <b>No es una optimización.</b> El backend limita los intentos de login, y la suite hacía uno por
 * cada prueba: a partir del séptimo, todas fallaban con `429` — incluidas las que no tenían nada
 * que ver. Un actor entra UNA vez y su token se reutiliza, que además es lo que hace un cliente
 * real.
 *
 * La caché es por CORREO, nunca compartida entre actores: la mitad de lo que esta suite comprueba
 * es quién puede ver qué, y un token compartido haría pasar justo los casos que deben fallar.
 */
const sesiones = new Map<string, string>();

/**
 * Un token por CORREO, compartido por toda la ejecución.
 *
 * <blockquote>Sin esto, cada prueba construía su propio {@link ApiDePruebas} y hacía su propio
 * login. El backend limita a 10 por correo cada hora, así que a mitad de la suite el ADMIN
 * empezaba a recibir 429 y todo lo que seguía fallaba por eso. Es el mismo problema que ya se
 * resolvió para los logins de pantalla con `storageState`; faltaba resolverlo del lado de la
 * API.</blockquote>
 *
 * Se cachea por correo y NO por instancia: dos pruebas distintas pidiendo el mismo actor tienen
 * que compartir la sesión. Actores distintos siguen teniendo la suya.
 */
const SESIONES = new Map<string, string>();

export class ApiDePruebas {
  private token: string | null = null;

  constructor(private readonly actor: Actor) {
    this.token = SESIONES.get(actor.email) ?? null;
  }

  async iniciarSesion(): Promise<string> {
    const yaObtenida = sesiones.get(this.actor.email);
    if (yaObtenida) {
      this.token = yaObtenida;
      return yaObtenida;
    }
    return this.autenticar();
  }

  /** El login de verdad. Separado para que {@link iniciarSesion} pueda cortocircuitar. */
  private async autenticar(): Promise<string> {
    const respuesta = await fetch(`${ENTORNO.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `contrasena`, en castellano: es el nombre real del campo en `LoginRequest`. Mandar
      // `password` devuelve 400 "no debe estar vacío", que despista porque parece un problema
      // de credenciales y es un problema de contrato.
      body: JSON.stringify({ email: this.actor.email, contrasena: this.actor.password }),
    });
    if (!respuesta.ok) {
      throw new Error(`Login de ${this.actor.rol} falló con ${respuesta.status}`);
    }
    const token = respuesta.headers.get('X-Auth-Token');
    if (!token) {
      throw new Error('El login no devolvió X-Auth-Token: el backend no está en modo sesión por header.');
    }
    this.token = token;
    sesiones.set(this.actor.email, token);
    return token;
  }

  async pedir<T>(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<T> {
    if (!this.token) await this.iniciarSesion();
    const respuesta = await fetch(`${ENTORNO.apiUrl}${ruta}`, {
      method: opciones.method ?? 'GET',
      headers: {
        'X-Auth-Token': this.token as string,
        ...(opciones.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    });
    if (!respuesta.ok) {
      throw new Error(`${opciones.method ?? 'GET'} ${ruta} devolvió ${respuesta.status}`);
    }
    if (respuesta.status === 204) return undefined as T;
    return (await respuesta.json()) as T;
  }

  /** El código HTTP crudo, para los casos negativos: acá un 403 es el resultado esperado. */
  async codigoDe(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<number> {
    if (!this.token) await this.iniciarSesion();
    const respuesta = await fetch(`${ENTORNO.apiUrl}${ruta}`, {
      method: opciones.method ?? 'GET',
      headers: {
        'X-Auth-Token': this.token as string,
        ...(opciones.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    });
    return respuesta.status;
  }
}

/** Nombre con el runId adentro: lo que crea esta ejecución se reconoce y se limpia. */
export function nombreDePrueba(base: string): string {
  return `${base} [${ENTORNO.runId}]`;
}
