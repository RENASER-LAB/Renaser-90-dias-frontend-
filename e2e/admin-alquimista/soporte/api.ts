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
export class ApiDePruebas {
  private token: string | null = null;

  constructor(private readonly actor: Actor) {}

  async iniciarSesion(): Promise<string> {
    const respuesta = await fetch(`${ENTORNO.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.actor.email, password: this.actor.password }),
    });
    if (!respuesta.ok) {
      throw new Error(`Login de ${this.actor.rol} falló con ${respuesta.status}`);
    }
    const token = respuesta.headers.get('X-Auth-Token');
    if (!token) {
      throw new Error('El login no devolvió X-Auth-Token: el backend no está en modo sesión por header.');
    }
    this.token = token;
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
