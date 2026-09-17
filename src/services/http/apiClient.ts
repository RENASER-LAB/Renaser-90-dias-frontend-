import { API_CONFIG } from '../../config/apiConfig';
import { almacenamientoSeguro } from '../storage/almacenamientoSeguro';
import { registrarHoraDelServidor } from './relojServidor';

/**
 * Cliente HTTP contra el backend Java (Spring Boot).
 *
 * La sesión NO viaja por cookie: el backend usa `HeaderHttpSessionIdResolver.xAuthToken()`,
 * o sea que devuelve el identificador de sesión en el header `X-Auth-Token` y espera recibirlo
 * de vuelta en ese mismo header. Para React Native eso es una ventaja — no hay que depender del
 * almacén de cookies de cada plataforma, que es la parte frágil.
 */

const HEADER_SESION = 'X-Auth-Token';

/** Error con el código HTTP a la vista, para que cada pantalla decida qué mostrar. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /**
   * `true` solo cuando el 401 llegó en una request que SÍ mandó sesión — o sea, el token murió.
   *
   * Un 401 del login (que va sin sesión) significa algo completamente distinto: credenciales mal.
   * Distinguirlos es lo que evita anunciarle "Correo o contraseña incorrectos" a alguien que ya
   * estaba adentro y lo único que le pasó fue que se le venció la sesión.
   */
  readonly sesionVencida: boolean;

  constructor(status: number, message: string, body?: unknown, sesionVencida = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.sesionVencida = sesionVencida;
  }

  /** Credenciales inválidas o sesión vencida. */
  get esNoAutenticado(): boolean {
    return this.status === 401;
  }

  /** Sin permiso, o cuenta suspendida. */
  get esProhibido(): boolean {
    return this.status === 403;
  }

  /** Conflicto de estado: p. ej. el correo ya tiene cuenta sin vínculo social. */
  get esConflicto(): boolean {
    return this.status === 409;
  }

  /** No hubo respuesta del servidor (backend apagado, IP equivocada, sin red). */
  get esDeRed(): boolean {
    return this.status === 0;
  }
}

let tokenSesion: string | null = null;

/**
 * Quién quiere enterarse de que la sesión se murió. Hoy lo escucha `AuthContext`, que limpia el
 * estado y con eso la app cae sola en el login.
 *
 * Es una lista y no un callback suelto para que registrarse no pueda pisar al anterior en
 * silencio: dos suscriptores conviviendo es raro, pero perder el único que había es un bug mudo.
 */
type OyenteSesionVencida = () => void;
const oyentesSesionVencida = new Set<OyenteSesionVencida>();

/** Evita encadenar varios cierres por un solo hecho. Ver `notificarSesionVencida`. */
let yaSeAvisoElVencimiento = false;

/** Se registra el oyente y se devuelve cómo darlo de baja (sirve de cleanup de `useEffect`). */
export function suscribirSesionVencida(oyente: OyenteSesionVencida): () => void {
  oyentesSesionVencida.add(oyente);
  return () => {
    oyentesSesionVencida.delete(oyente);
  };
}

/**
 * "El token ya no vale": descarta la sesión y avisa a quien escuche.
 *
 * Lo llama `apiFetch` solo, pero es público porque el chat NO pasa por `apiFetch` —lee SSE con
 * `fetch` a mano (`renasia/api/renasiaStream.ts`)— y era justamente la pantalla donde el
 * vencimiento se veía peor: un `Error 403` pelado y nada más.
 *
 * Se avisa **una sola vez por sesión**: al abrir la app varias pantallas piden datos a la vez y
 * pueden recibir 401 todas juntas, y eso es un único hecho —el token murió—, no cinco.
 */
export function notificarSesionVencida(): void {
  if (yaSeAvisoElVencimiento) {
    return;
  }
  yaSeAvisoElVencimiento = true;
  setTokenSesion(null);
  oyentesSesionVencida.forEach(oyente => oyente());
}

export function getTokenSesion(): string | null {
  return tokenSesion;
}

/**
 * Guardar en memoria es sincrónico a propósito: el header de la request siguiente ya tiene que
 * poder leerlo. La persistencia va aparte, sin esperarla — si el Keychain tarda o falla, la
 * sesión en curso funciona igual; lo único que se pierde es sobrevivir al cierre de la app.
 */
export function setTokenSesion(token: string | null): void {
  tokenSesion = token;
  if (token) {
    // Sesión nueva: el próximo vencimiento tiene que volver a avisar.
    yaSeAvisoElVencimiento = false;
    void almacenamientoSeguro.guardarToken(token);
  } else {
    void almacenamientoSeguro.borrarToken();
  }
}

/**
 * Rehidrata el token guardado al arrancar la app. No valida nada: si venció en Redis, la primera
 * request que lo use recibe 401 y el contexto lo descarta. Validarlo acá obligaría a una llamada
 * de red antes de poder pintar la primera pantalla.
 */
export async function cargarTokenPersistido(): Promise<string | null> {
  const token = await almacenamientoSeguro.leerToken();
  tokenSesion = token;
  return token;
}

type OpcionesPeticion = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Endpoints públicos (login, alta, OTP) no necesitan mandar sesión. */
  conSesion?: boolean;
};

/**
 * El backend responde los errores como `{ message, timestamp }` (ApiErrorResponse). Cuando algo
 * falla antes de llegar a la aplicación (un 500 del contenedor, un proxy) el cuerpo puede no ser
 * JSON, así que el texto crudo se usa como último recurso en vez de reventar con un error de
 * parseo que ocultaría el problema real.
 */
async function leerMensajeDeError(respuesta: Response): Promise<{ mensaje: string; cuerpo: unknown }> {
  const texto = await respuesta.text();
  if (!texto) {
    return { mensaje: `Error ${respuesta.status}`, cuerpo: null };
  }
  try {
    const json = JSON.parse(texto);
    return { mensaje: json?.message || `Error ${respuesta.status}`, cuerpo: json };
  } catch {
    return { mensaje: texto, cuerpo: texto };
  }
}

export async function apiFetch<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { method = 'GET', body, conSesion = true } = opciones;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  // Se guarda si la request LLEVÓ sesión: de eso depende qué significa un 401 más abajo.
  const tokenEnviado = conSesion ? tokenSesion : null;
  if (tokenEnviado) {
    headers[HEADER_SESION] = tokenEnviado;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_CONFIG.BASE_URL}${ruta}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // fetch solo rechaza cuando no hubo respuesta: backend apagado, IP mal puesta, sin red.
    // Un 4xx/5xx SÍ resuelve, y se maneja más abajo.
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa que el backend esté corriendo.', error);
  }

  // La hora del servidor viaja en CADA respuesta. De acá sale el desfase con el reloj del
  // teléfono, que el Código Renaser necesita para no abrir y cerrar sus franjas a destiempo.
  registrarHoraDelServidor(respuesta.headers.get('Date'));

  // El backend renueva el identificador de sesión al iniciarla; si viene, se guarda.
  const tokenNuevo = respuesta.headers.get(HEADER_SESION);
  if (tokenNuevo) {
    setTokenSesion(tokenNuevo);
  }

  if (!respuesta.ok) {
    const { mensaje, cuerpo } = await leerMensajeDeError(respuesta);
    // Un 401 en una request que mandó sesión no es "credenciales mal": es el token vencido. Se
    // cierra en UN lugar para que la app mande al login, en vez de que cada pantalla falle por su
    // cuenta y la persona concluya que la app se rompió.
    //
    // Deliberadamente NO incluye al 403: ahí el backend también responde "cuenta suspendida", y
    // tratarlo como vencimiento mandaría a loguearse una y otra vez a quien no puede entrar.
    const sesionVencida = respuesta.status === 401 && tokenEnviado !== null;
    if (sesionVencida) {
      notificarSesionVencida();
    }
    throw new ApiError(respuesta.status, mensaje, cuerpo, sesionVencida);
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  const texto = await respuesta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

/**
 * Traduce cualquier error a un texto para mostrar. La distinción importa: "no hay conexión" y
 * "la contraseña está mal" se arreglan de maneras muy distintas, y un mensaje único obliga a
 * quien usa la app a adivinar cuál de las dos le pasó.
 */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (!(error instanceof ApiError)) {
    return porDefecto;
  }
  if (error.esDeRed) {
    return error.message;
  }
  if (error.esNoAutenticado) {
    /* Dos situaciones muy distintas comparten el 401. Con sesión mandada, el token venció y lo
       único que hay que decir es que vuelva a entrar; sin sesión es el login, y ahí sí son las
       credenciales. Antes las dos decían lo mismo. */
    return error.sesionVencida ? 'Tu sesión venció. Vuelve a entrar.' : 'Correo o contraseña incorrectos.';
  }
  if (error.esProhibido) {
    /* El mensaje del backend gana. Antes se descartaba y TODO 403 decía lo mismo — que es el
       texto del login. A un mentor que rotó le anunciaba que su cuenta está bloqueada cuando
       lo único que cambió fue su grupo, y a cualquiera que tocara algo ajeno le sugería un
       problema de cuenta que no existe. `GlobalExceptionHandler` responde siempre con el
       mensaje de la excepción, así que siempre hay un texto pensado para leerse. */
    return error.message || 'Tu cuenta no está habilitada para ingresar.';
  }
  // El backend manda un texto pensado para leerse (ApiErrorResponse.message); si vino, se usa.
  return error.message || porDefecto;
}
