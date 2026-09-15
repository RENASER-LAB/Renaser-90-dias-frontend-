import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from './habitsSchemas';

/**
 * `HabitRenameController` del backend — el hábito que la persona no puede hacer, con OTRO nombre.
 *
 * Vive en su propio archivo y no dentro de `habitsApi.ts` por el mismo criterio con que el backend
 * lo puso en su propio paquete `rest/renombre/`: es una operación con reglas propias (dos hábitos,
 * una ventana de tiempo) y meterla entre los horarios haría que se leyera como una preferencia más.
 *
 * ## El contrato, tal como está hoy
 *
 * - `PUT    /api/v1/habits/{habitId}/rename` → `{ habitId, customTitle, reason }`
 * - `DELETE /api/v1/habits/{habitId}/rename` → `204`, vuelve al título del catálogo.
 *
 * Los dos piden `Permission.USE_APP` y actúan sobre el hábito **del actor autenticado**: no viaja
 * ningún id de participante, así que no hay forma de renombrarle el hábito a otra persona. Y el
 * renombre es de uno solo — nadie más ve el cambio.
 *
 * ## Los dos rechazos que hay que esperar
 *
 * Los dos llegan como `ApiError` con el mensaje del servidor listo para mostrar
 * (`GlobalExceptionHandler` responde siempre `ApiErrorResponse.message`):
 *
 *  - **400 `"Este habito no se puede reemplazar"`** — el hábito no es ninguna de las dos bebidas.
 *    La app no debería llegar acá: filtra por `systemKey` antes (`utils/renombreDeHabito.ts`).
 *  - **400 `"Solo puedes reemplazarlo antes de que empiece tu formacion (hasta el dia 0)"`** — la
 *    ventana se cerró. Aplica igual al `DELETE`: pasado el día 0 tampoco se puede QUITAR.
 *
 * ## Lo que este endpoint NO hace, y conviene tener presente
 *
 * No existe un `GET`. Y ninguna lectura del aprendiz devuelve `personalTitle` (lo devuelve solo el
 * panel de staff), así que **la app no puede preguntarle al servidor qué nombre puso**: lo que
 * escribe acá lo espeja en el teléfono (`storage/renombreDeHabito.ts`).
 */

/** Espejo de `HabitRenameResponse` (backend, SOLO LECTURA). */
export interface RenombreHabitoApi {
  habitId: string;
  customTitle: string;
  reason: string;
}

const renombreHabitoSchema = z
  .object({
    habitId: z.string(),
    customTitle: z.string(),
    reason: z.string(),
  })
  .passthrough();

/**
 * `PUT /api/v1/habits/{habitId}/rename` — le pone `tituloPersonal` a ESTE hábito, para quien llama.
 *
 * Los dos campos son obligatorios para el backend (`@NotBlank`) y se recortan acá igual que allá
 * (`RenombreHabito.requireTitulo`/`requireMotivo` hacen `trim()`), para que lo que se guarda en el
 * espejo local sea exactamente lo que quedó en la base y no una versión con espacios de más.
 *
 * Llamarlo dos veces sobre el mismo hábito ACTUALIZA, no duplica (`RenombreHabitoService.renombrar`
 * carga el existente y lo actualiza), así que reintentar tras un fallo de red es seguro.
 */
export async function renombrarHabito(
  habitId: string,
  tituloPersonal: string,
  motivo: string,
): Promise<RenombreHabitoApi> {
  const r = await apiFetch<unknown>(`/api/v1/habits/${habitId}/rename`, {
    method: 'PUT',
    body: { customTitle: tituloPersonal.trim(), reason: motivo.trim() },
  });
  return validarRespuesta<RenombreHabitoApi>(
    renombreHabitoSchema,
    r,
    `PUT /api/v1/habits/${habitId}/rename`,
  );
}

/**
 * `DELETE /api/v1/habits/{habitId}/rename` — vuelve al título del catálogo.
 *
 * Idempotente del lado del servidor (`savePort.borrar` sobre algo que no existe no falla), así que
 * no hace falta comprobar antes si había un renombre.
 */
export async function quitarRenombreHabito(habitId: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habits/${habitId}/rename`, { method: 'DELETE' });
}
