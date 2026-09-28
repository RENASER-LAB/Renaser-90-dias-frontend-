import { Platform } from 'react-native';

import { apiFetch } from '../../../services/http/apiClient';
import type { FotoDePerfil } from '../../auth/utils/elegirFotoDePerfil';
import { fotoDelGrupoSchema, validarRespuesta } from './celulaSchemas';

/**
 * La foto propia de un grupo (D-212, decisión del dueño del 2026-09-27: la cambian «Admin y el mentor de
 * ese grupo»). El servidor decide quién puede: la app solo muestra el control a quien hoy puede.
 *
 * La foto se sube por multipart (la parte `foto`): el servidor la lee, la recorta y la guarda como un
 * JPEG de 512 px. Después la sirve el chat del grupo: la conversación trae `photoPath` con `?v=`, y así
 * la lista y la cabecera muestran la nueva sin reinstalar la app.
 */

/** Si el grupo tiene foto propia y desde cuándo (`null`: la de Renaser, la tarjeta que trae la app). */
export interface FotoDelGrupo {
  cellId: string;
  photoChangedAt: string | null;
}

function rutaDeLaFoto(grupoId: string): string {
  return `/api/v1/admin/cells/${encodeURIComponent(grupoId)}/photo`;
}

/** La parte `foto` en Android/iOS: el archivo con nombre y tipo, y cómo leer sus bytes. */
export interface ParteNativaDeLaFoto {
  uri: string;
  name: string;
  type: string;
  bytes: () => Promise<Uint8Array>;
}

/**
 * Lo que va en la parte `foto` del multipart en Android/iOS. En web va el `Blob` (ver
 * `formularioConLaFoto`).
 *
 * > **Corregido 2026-09-28 (E-401 del backend).** Era solo `{ uri, name, type }`, la parte propia de
 * > React Native. Pero desde Expo 57 el `fetch` global de la app es el de Expo (`expo/fetch`, lo instala
 * > `expo/src/winter/runtime.native.ts`), y ese no lee la `uri`: arma el multipart con
 * > `convertFormDataAsync`, que solo acepta texto, un `Blob` o algo con `bytes()`. Con la `uri` sola
 * > tiraba `Error: Unsupported FormDataPart implementation` antes de mandar nada, `apiFetch` lo
 * > convertía en «No se pudo conectar con el servidor» y la foto del grupo no se guardaba nunca (el
 * > pedido ni llegaba al servidor). Ahora la parte trae además `bytes()`, que lee el archivo con el
 * > mismo `fetch` (lee `file://`). La `uri` queda para el `fetch` de React Native, por si un día se
 * > vuelve a él (`EXPO_PUBLIC_USE_RN_FETCH`).
 */
export function parteNativaDeLaFoto(foto: FotoDePerfil): ParteNativaDeLaFoto {
  return {
    uri: foto.uri,
    name: 'foto-del-grupo.jpg',
    type: foto.mimeType,
    bytes: async () => new Uint8Array(await (await fetch(foto.uri)).arrayBuffer()),
  };
}

async function formularioConLaFoto(foto: FotoDePerfil): Promise<FormData> {
  const formulario = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(foto.uri)).blob();
    formulario.append('foto', blob, 'foto-del-grupo.jpg');
  } else {
    // El tipo de `FormData.append` es el del navegador; el nativo acepta este objeto.
    formulario.append('foto', parteNativaDeLaFoto(foto) as unknown as Blob);
  }
  return formulario;
}

export async function subirFotoDelGrupo(grupoId: string, foto: FotoDePerfil): Promise<FotoDelGrupo> {
  const respuesta = await apiFetch<unknown>(rutaDeLaFoto(grupoId), {
    method: 'PUT',
    body: await formularioConLaFoto(foto),
  });
  return validarRespuesta<FotoDelGrupo>(fotoDelGrupoSchema, respuesta, 'PUT /api/v1/admin/cells/{id}/photo');
}

/** El grupo vuelve a la foto de Renaser. Sin foto propia, no cambia nada. */
export async function volverALaFotoDeRenaser(grupoId: string): Promise<void> {
  await apiFetch<void>(rutaDeLaFoto(grupoId), { method: 'DELETE' });
}

export async function obtenerFotoDelGrupo(grupoId: string): Promise<FotoDelGrupo> {
  const respuesta = await apiFetch<unknown>(rutaDeLaFoto(grupoId));
  return validarRespuesta<FotoDelGrupo>(fotoDelGrupoSchema, respuesta, 'GET /api/v1/admin/cells/{id}/photo');
}
