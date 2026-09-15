import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dos cosas sobre el renombre de bebidas que hoy SOLO puede saber este teléfono.
 *
 * ## 1. Si ya se le ofreció el cambio de nombre (`respondidoEn`)
 *
 * El pedido es que el acompañante lo pregunte **una sola vez**: haya dicho que sí, que no, o haya
 * cerrado el aviso sin tocar nada, no se vuelve a preguntar nunca.
 *
 * **Se buscó una vía en el servidor y no existe.** `POST /api/v1/onboarding/milestones` sería el
 * lugar natural, pero su enum `HitoOnboarding` tiene exactamente cuatro valores —`TERMINOS`,
 * `PACTO`, `PACTO_FIRMADO`, `ROCAS_SYNC`— y cada uno escribe SU columna en `estado_onboarding`
 * (ver `EstadoOnboarding.aceptar`, backend). Agregar un quinto es una migración del backend, que
 * está fuera del alcance de este cambio.
 *
 * **Consecuencia honesta de guardarlo acá, que hay que saber antes de reportar un bug:**
 * reinstalar la app, borrar sus datos o entrar desde otro teléfono **hace que se pregunte una vez
 * más**. No se pierde nada —el renombre real vive en la base del servidor—, solo se repite el
 * ofrecimiento. Con la ventana del backend cerrada al día 0, la repetición solo puede ocurrirle a
 * alguien que reinstala antes de empezar su programa.
 *
 * ## 2. Qué nombre propio le puso a cada hábito (`titulos`)
 *
 * Esto es un **espejo**, no la fuente de verdad. La fuente es la tabla `renombres_habito` del
 * backend. Existe porque **ninguna respuesta que consuma el aprendiz devuelve `personalTitle`**:
 * `GET /api/v1/habits`, `/habit-preferences` y `/habit-tracks/today` devuelven el título del
 * CATÁLOGO. El único endpoint que expone `personalTitle` es el del panel
 * (`GET /api/v1/admin/trainees/{id}/habits` y su gemelo de mentor), que un aprendiz no puede
 * llamar sobre sí mismo. Sin este espejo, renombrar "funcionaría" y la pantalla seguiría diciendo
 * JUGO VERDE — que es la forma más cara de que algo parezca roto.
 *
 * **Consecuencia:** al reinstalar, el nombre propio deja de verse aunque siga guardado en el
 * servidor. Se cierra el día que una lectura del aprendiz devuelva `personalTitle`; ahí este mapa
 * pasa a ser caché y se puede borrar.
 *
 * ## Clave por usuario, nunca una bandera global
 *
 * En un mismo teléfono pasan varias cuentas (pasa en este proyecto durante las pruebas). Una
 * bandera global haría que la segunda cuenta nunca reciba el ofrecimiento porque la primera ya lo
 * respondió, y que vea como suyo el nombre que puso otra persona. Mismo criterio que
 * `almacenamientoLocal`, `borradorEspiritu` y `rangosDelDia`.
 *
 * AsyncStorage y no `almacenamientoSeguro` (SecureStore): es una preferencia de pantalla, no una
 * credencial.
 */

export interface EstadoRenombreDeHabito {
  /** ISO del instante en que respondió al ofrecimiento —sí o no—. `null` = nunca se le preguntó. */
  respondidoEn: string | null;
  /** Espejo de `tituloPersonal` por `habitId`. Vacío = no renombró ninguno (o se reinstaló). */
  titulos: Record<string, string>;
}

const ESTADO_VACIO: EstadoRenombreDeHabito = { respondidoEn: null, titulos: {} };

const PREFIJO_CLAVE = 'renaser.habitos.renombre.';

/** Ninguna operación de almacenamiento puede tumbar la app — degrada a "no sé nada". */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/**
 * Oyentes de "el renombre cambió".
 *
 * Existe por lo mismo que `events/avisoPostDiarioCerrado.ts`: hay DOS lugares que muestran el
 * nombre de un hábito renombrable —el aviso del acompañante y la lista de Plan— y cada uno lee el
 * almacenamiento por su cuenta. Sin este aviso, renombrar desde el aviso dejaba a Plan mostrando
 * el título viejo hasta recargar la pantalla. Es un `Set` de 10 líneas y no un contexto global
 * porque hay exactamente un emisor (este archivo) y dos oyentes.
 */
type Oyente = () => void;
const oyentes = new Set<Oyente>();

function avisarCambio(): void {
  oyentes.forEach(oyente => {
    try {
      oyente();
    } catch (error) {
      // Un oyente roto no puede tumbar el guardado: lo importante acá es que el renombre quede.
      console.warn('Un oyente de "renombre de hábito" falló:', error);
    }
  });
}

function leerCrudo(userId: string): Promise<EstadoRenombreDeHabito> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(PREFIJO_CLAVE + userId);
    if (!crudo) return ESTADO_VACIO;
    try {
      const leido = JSON.parse(crudo) as Partial<EstadoRenombreDeHabito>;
      // Una versión anterior de la app pudo escribir otra forma en esta misma clave. Se normaliza
      // en vez de confiar: un `titulos` que no sea objeto rompería `tituloVisible` en cada fila.
      return {
        respondidoEn: typeof leido.respondidoEn === 'string' ? leido.respondidoEn : null,
        titulos:
          leido.titulos && typeof leido.titulos === 'object' && !Array.isArray(leido.titulos)
            ? (leido.titulos as Record<string, string>)
            : {},
      };
    } catch {
      return ESTADO_VACIO;
    }
  }, ESTADO_VACIO);
}

function guardarCrudo(userId: string, estado: EstadoRenombreDeHabito): Promise<void> {
  return sinRomper(async () => {
    await AsyncStorage.setItem(PREFIJO_CLAVE + userId, JSON.stringify(estado));
    avisarCambio();
  }, undefined);
}

export const renombreDeHabitoLocal = {
  leer: leerCrudo,

  /**
   * "Ya respondió." Lo llaman las TRES salidas del aviso —aceptar, "ahora no" y cerrarlo—, porque
   * las tres son una respuesta: la única forma de volver a ver el ofrecimiento es no haberlo visto.
   *
   * Idempotente: si ya estaba respondido conserva la fecha original, para que el dato siga
   * diciendo cuándo se le preguntó de verdad.
   */
  marcarRespondido: async (userId: string): Promise<void> => {
    const estado = await leerCrudo(userId);
    if (estado.respondidoEn !== null) return;
    await guardarCrudo(userId, { ...estado, respondidoEn: new Date().toISOString() });
  },

  /**
   * Guarda el nombre propio que el backend YA confirmó. Se llama después del `PUT`, nunca antes:
   * un espejo que se adelanta al servidor muestra un nombre que no existe en ninguna parte.
   *
   * Renombrar también cuenta como haber respondido: quien puso su nombre no necesita que le
   * vuelvan a ofrecer ponerlo.
   */
  guardarTitulo: async (userId: string, habitId: string, tituloPersonal: string): Promise<void> => {
    const estado = await leerCrudo(userId);
    await guardarCrudo(userId, {
      respondidoEn: estado.respondidoEn ?? new Date().toISOString(),
      titulos: { ...estado.titulos, [habitId]: tituloPersonal },
    });
  },

  /** Vuelve al título del catálogo. Se llama después del `DELETE` confirmado, por el mismo motivo. */
  borrarTitulo: async (userId: string, habitId: string): Promise<void> => {
    const estado = await leerCrudo(userId);
    const titulos = { ...estado.titulos };
    delete titulos[habitId];
    await guardarCrudo(userId, {
      respondidoEn: estado.respondidoEn ?? new Date().toISOString(),
      titulos,
    });
  },

  /** Devuelve la función para darse de baja — pensado para el `return` de un `useEffect`. */
  suscribir: (oyente: Oyente): (() => void) => {
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  },
};
