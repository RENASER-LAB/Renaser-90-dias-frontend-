import { apiFetch } from '../../services/http/apiClient';
import { cargarNotificaciones, HAY_RECORDATORIOS_LOCALES } from '../habits/notificaciones/recordatoriosDeHabito';
import { esperarTokenPush } from '../mentor/notificaciones/pushNativo';
import { estadoDeAlarmaExacta, type EstadoDeAlarmaExacta } from './alarmaExactaNativa';

/**
 * Le avisa al servidor que las alarmas locales de este teléfono están vivas (D-217, 2026-09-28).
 *
 * `POST /api/v1/push-tokens/alarmas-locales` con el token push de este teléfono. El servidor guarda la
 * hora (`tokens_push.alarmas_confirmadas_en`) y, mientras tenga menos de 26 h, el aviso de inicio de un
 * hábito con recordatorio va solo al navegador: el teléfono ya lo avisa con su alarma. Sin confirmación
 * reciente —el APK viejo, que no confirma nunca; un teléfono que no se abrió en más de un día— el push
 * también va al teléfono, como respaldo.
 *
 * Se confirma DESPUÉS de poner al día las alarmas (`ponerAlDiaLasAlarmas`), y solo si de verdad van a
 * sonar a tiempo:
 * - con permiso de avisos (sin él no se muestra ninguna);
 * - con alarmas exactas (sin «Alarmas y recordatorios» pueden llegar ~40 min tarde, E-314: mejor que el
 *   push llegue a la hora, aunque después suene también la alarma).
 */
export type ResultadoDeConfirmacion =
  | 'confirmado'
  | 'no_aplica'
  | 'sin_token'
  | 'sin_permiso'
  | 'inexactas'
  | 'fallo';

export interface DependenciasDeConfirmacion {
  token: () => Promise<string | null>;
  permisoDeAvisos: () => Promise<boolean>;
  alarmaExacta: () => EstadoDeAlarmaExacta;
  enviar: (token: string) => Promise<void>;
}

/** Por qué no se confirmaría, o `null` si corresponde confirmar. Pura. */
export function motivoParaNoConfirmar(estado: {
  token: string | null;
  permisoDeAvisos: boolean;
  alarmaExacta: EstadoDeAlarmaExacta;
}): Exclude<ResultadoDeConfirmacion, 'confirmado' | 'fallo' | 'no_aplica'> | null {
  if (!estado.token) return 'sin_token';
  if (!estado.permisoDeAvisos) return 'sin_permiso';
  if (estado.alarmaExacta === 'denegado') return 'inexactas';
  return null;
}

const porDefecto: DependenciasDeConfirmacion = {
  token: () => esperarTokenPush(),
  permisoDeAvisos: async () => {
    const N = cargarNotificaciones();
    if (!N) return false;
    try {
      return (await N.getPermissionsAsync()).granted;
    } catch {
      return false;
    }
  },
  alarmaExacta: () => estadoDeAlarmaExacta(),
  enviar: async token => {
    await apiFetch('/api/v1/push-tokens/alarmas-locales', { method: 'POST', body: { token } });
  },
};

/** No lanza nunca: un 404 (backend anterior a D-217, o token todavía sin registrar) es `fallo`. */
export async function confirmarAlarmasAlServidor(
  deps: DependenciasDeConfirmacion = porDefecto,
): Promise<ResultadoDeConfirmacion> {
  if (!HAY_RECORDATORIOS_LOCALES) return 'no_aplica';
  const token = await deps.token().catch(() => null);
  const motivo = motivoParaNoConfirmar({
    token,
    permisoDeAvisos: token ? await deps.permisoDeAvisos() : false,
    alarmaExacta: deps.alarmaExacta(),
  });
  if (motivo) return motivo;
  try {
    await deps.enviar(token as string);
    return 'confirmado';
  } catch {
    return 'fallo';
  }
}
