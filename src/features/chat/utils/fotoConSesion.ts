import { API_CONFIG } from '../../../config/apiConfig';

/**
 * Las fotos del chat que sirve el backend CON sesión, por la ruta que manda en la respuesta
 * (decisiones del dueño del 2026-09-27):
 * - **La del chat de soporte** (D-205): la tarjeta de Canva con el primer nombre de su aprendiz,
 *   `photoPath` de la conversación (`GET /api/v1/chat/conversations/{id}/foto`).
 * - **La de cada integrante** de la info de un grupo (D-206): su tarjeta con su primer nombre,
 *   `mentorPhotoPath` de `/me/cells` y `photoPath` de `/me/cells/{id}/members`
 *   (`GET /api/v1/chat/conversations/{id}/miembros/{usuarioId}/foto`).
 *
 * **El endpoint pide la sesión** (`X-Auth-Token`), igual que el resto del chat, y eso cambia según la
 * plataforma:
 * - **Android/iOS:** `Image` acepta cabeceras en `source`, así que se le pasa la URL con la sesión y
 *   el cargador nativo la guarda en su caché como cualquier foto.
 * - **Web:** `<img>` no manda cabeceras. Se trae la imagen con la sesión y se muestra desde un object
 *   URL, guardado en memoria por ruta para no volver a bajarla en cada fila y cabecera.
 *
 * Si algo falla, quien llama muestra lo que tenga debajo (la tarjeta sin nombre en el soporte, las
 * iniciales en un integrante): la foto es un adorno, nunca un error.
 *
 * > **Corregido 2026-09-27 (D-206).** Se llamaba `fotoDelSoporte.ts` y solo servía la del soporte; es
 * > el mismo camino para cualquier ruta, así que se generalizó en vez de copiarlo.
 */

const HEADER_SESION = 'X-Auth-Token';

/** Lo que va en `source` de un `Image` nativo: la URL completa y la sesión en la cabecera. */
export interface FuenteConSesion {
  uri: string;
  headers: Record<string, string>;
}

export function urlDeLaFoto(ruta: string): string {
  return `${API_CONFIG.BASE_URL}${ruta}`;
}

/** Android/iOS. Sin sesión no hay foto que pedir: `null` (queda lo de debajo). */
export function fuenteNativaDeLaFoto(ruta: string, token: string | null): FuenteConSesion | null {
  if (!token) return null;
  return { uri: urlDeLaFoto(ruta), headers: { [HEADER_SESION]: token } };
}

/** Lo que la versión web necesita del entorno; inyectable para probarla sin navegador. */
export interface EntornoWeb {
  pedir: (url: string, opciones: { headers: Record<string, string> }) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;
  crearUrl: (blob: Blob) => string;
  liberarUrl: (url: string) => void;
}

const entornoDelNavegador: EntornoWeb = {
  pedir: (url, opciones) => fetch(url, opciones),
  crearUrl: blob => URL.createObjectURL(blob),
  liberarUrl: url => URL.revokeObjectURL(url),
};

/** Las fotos ya pedidas en web, por ruta (una por soporte o por integrante). `null` = falló: no se reintenta. */
const fotosWeb = new Map<string, Promise<string | null>>();
/** De qué sesión son las de arriba: al cambiar de sesión se liberan y se vuelven a pedir. */
let sesionDeLasFotosWeb: string | null = null;

/**
 * Web: el object URL de la foto de esa ruta, o `null` si no se pudo traer. Un solo pedido por ruta y
 * sesión, aunque la pidan a la vez la fila, la cabecera y la info.
 */
export function fotoParaWeb(
  ruta: string,
  token: string | null,
  entorno: EntornoWeb = entornoDelNavegador
): Promise<string | null> {
  if (!token) return Promise.resolve(null);
  if (token !== sesionDeLasFotosWeb) {
    olvidarFotosWeb(entorno);
    sesionDeLasFotosWeb = token;
  }
  let foto = fotosWeb.get(ruta);
  if (!foto) {
    foto = traerFoto(ruta, token, entorno);
    fotosWeb.set(ruta, foto);
  }
  return foto;
}

async function traerFoto(ruta: string, token: string, entorno: EntornoWeb): Promise<string | null> {
  try {
    const respuesta = await entorno.pedir(urlDeLaFoto(ruta), { headers: { [HEADER_SESION]: token } });
    if (!respuesta.ok) return null;
    return entorno.crearUrl(await respuesta.blob());
  } catch {
    return null;
  }
}

/** Libera los object URL de una sesión que terminó (y sirve para empezar limpio en las pruebas). */
export function olvidarFotosWeb(entorno: EntornoWeb = entornoDelNavegador): void {
  const anteriores = [...fotosWeb.values()];
  fotosWeb.clear();
  sesionDeLasFotosWeb = null;
  anteriores.forEach(foto =>
    void foto.then(url => {
      if (url) entorno.liberarUrl(url);
    })
  );
}

/**
 * Android/iOS: las fotos que ya fallaron en esta sesión (un 403, sin red). Se recuerdan para mostrar
 * lo de debajo de una vez, sin reintentar en cada fila que se vuelve a pintar.
 */
const fallidasNativas = new Set<string>();

export function marcarQueFallo(ruta: string, token: string | null): void {
  fallidasNativas.add(`${token ?? ''}|${ruta}`);
}

export function yaFallo(ruta: string, token: string | null): boolean {
  return fallidasNativas.has(`${token ?? ''}|${ruta}`);
}

/** Solo para las pruebas. */
export function olvidarFallidas(): void {
  fallidasNativas.clear();
}
