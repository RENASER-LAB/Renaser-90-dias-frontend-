import type { FuncionalidadApagadaRecibida } from '../../../services/http/apiClient';
import type { LecturaDeFuncionalidades } from '../api/funcionalidadesApi';
import {
  listaDesdeMapa,
  mapaDeNoDisponibles,
  mapaDesdeLista,
  type MapaDeApagadas,
  type MapaDeNoDisponibles,
} from './evaluacion';
import type { LecturaGuardada } from './memoriaLocal';

/**
 * El estado de los interruptores de esta sesión (spec 002, contrato §8), fuera de React para poder probarlo sin
 * montar nada y para que `apiFetch` lo despierte cuando ve un 503 `FUNCIONALIDAD_APAGADA`.
 *
 * Reglas:
 * - **Sin datos, todo prendido.** Recién entrada una cuenta se usa lo último guardado de ESA cuenta; si no hay nada
 *   (o no hay red), todo prendido: el servidor igual bloquea lo apagado con su 503 y su aviso.
 * - **Lectura condicional.** Se manda el `ETag` de la última lectura; un 304 deja todo como está.
 * - **Un pedido a la vez.** Si llega otro pedido de lectura con uno en vuelo, se hace UNA lectura más al terminar.
 * - **Una cuenta no pisa a otra.** Una respuesta que llega después de cambiar de cuenta (o de cerrar sesión) se
 *   descarta.
 * - **Un 503 visto manda al instante.** La clave que el servidor dijo apagada se marca ya (con su aviso) y se relee
 *   sin `If-None-Match`, por si el apagado vino del circuito automático de la IA y la versión no cambió.
 * - **Lo no disponible se esconde** (fase 2, decisión P1 del dueño): `noDisponibles` de `/mias`; un 404
 *   `FUNCIONALIDAD_NO_DISPONIBLE` marca esa clave al instante y relee, igual que un 503.
 */
export type EstadoDeFuncionalidades = {
  cuenta: string | null;
  version: number | null;
  etag: string | null;
  apagadas: MapaDeApagadas;
  /** Lo que a esta sesión todavía no le toca (fase 2). Vacío sin datos: todo disponible. */
  noDisponibles: MapaDeNoDisponibles;
  /** De dónde salió lo que se ve: nada todavía (todo prendido), lo guardado en el teléfono o el servidor. */
  origen: 'nada' | 'guardado' | 'servidor';
};

export type DependenciasDelAlmacen = {
  leer: (etag: string | null) => Promise<LecturaDeFuncionalidades>;
  recuperar: (cuenta: string) => Promise<LecturaGuardada | null>;
  guardar: (cuenta: string, lectura: LecturaGuardada) => Promise<void>;
};

export type AlmacenDeFuncionalidades = {
  estado: () => EstadoDeFuncionalidades;
  releyendo: () => boolean;
  suscribir: (oyente: () => void) => () => void;
  /** Entra (o sale, con `null`) una cuenta: olvida lo anterior, carga lo guardado de la nueva y lee el servidor. */
  cambiarCuenta: (cuenta: string | null) => Promise<void>;
  /** Vuelve a leer. `sinCondicion` no manda `If-None-Match`. */
  releer: (opciones?: { sinCondicion?: boolean }) => Promise<void>;
  /** `apiFetch` vio un 503 `FUNCIONALIDAD_APAGADA`. */
  recibirApagada: (apagada: FuncionalidadApagadaRecibida) => void;
  /** `apiFetch` vio un 404 `FUNCIONALIDAD_NO_DISPONIBLE` (fase 2). */
  recibirNoDisponible: (clave: string | null) => void;
};

const NINGUNA_NO_DISPONIBLE: MapaDeNoDisponibles = Object.freeze({});

const SIN_CUENTA: EstadoDeFuncionalidades = Object.freeze({
  cuenta: null,
  version: null,
  etag: null,
  apagadas: Object.freeze({}),
  noDisponibles: NINGUNA_NO_DISPONIBLE,
  origen: 'nada',
});

function vacioPara(cuenta: string | null): EstadoDeFuncionalidades {
  return cuenta === null ? SIN_CUENTA : { ...SIN_CUENTA, cuenta, apagadas: {}, noDisponibles: NINGUNA_NO_DISPONIBLE };
}

/** Misma lista de claves (en cualquier orden): no se vuelve a dibujar nada si no cambió. */
function mismasClaves(a: MapaDeNoDisponibles, b: MapaDeNoDisponibles): boolean {
  const claves = Object.keys(a);
  return claves.length === Object.keys(b).length && claves.every(clave => Object.prototype.hasOwnProperty.call(b, clave));
}

export function crearAlmacenDeFuncionalidades(deps: DependenciasDelAlmacen): AlmacenDeFuncionalidades {
  let estado: EstadoDeFuncionalidades = SIN_CUENTA;
  let releyendo = false;
  /** Sube con cada cambio de cuenta: lo que llega con una generación vieja se descarta. */
  let generacion = 0;
  let enVuelo: Promise<void> | null = null;
  let otraVuelta: { sinCondicion: boolean } | null = null;
  const oyentes = new Set<() => void>();

  const avisar = () => oyentes.forEach(oyente => oyente());
  const poner = (nuevo: EstadoDeFuncionalidades) => {
    estado = nuevo;
    avisar();
  };
  const ponerReleyendo = (valor: boolean) => {
    if (releyendo === valor) return;
    releyendo = valor;
    avisar();
  };

  async function unaLectura(sinCondicion: boolean): Promise<void> {
    const miGeneracion = generacion;
    const cuenta = estado.cuenta;
    if (cuenta === null) return;
    try {
      const lectura = await deps.leer(sinCondicion ? null : estado.etag);
      if (miGeneracion !== generacion) return;
      if (lectura.tipo === 'sin_cambios') {
        // Lo que se ve ya es lo del servidor; si venía de lo guardado, sigue siendo cierto.
        return;
      }
      const apagadas = mapaDesdeLista(lectura.apagadas);
      const leidas = mapaDeNoDisponibles(lectura.noDisponibles);
      const noDisponibles = mismasClaves(leidas, estado.noDisponibles) ? estado.noDisponibles : leidas;
      poner({ cuenta, version: lectura.version, etag: lectura.etag, apagadas, noDisponibles, origen: 'servidor' });
      await deps.guardar(cuenta, {
        version: lectura.version,
        etag: lectura.etag,
        apagadas: listaDesdeMapa(apagadas),
        noDisponibles: Object.keys(noDisponibles),
      });
    } catch {
      // Sin red o un cuerpo raro: se queda lo último que se sabía (guardado o del servidor), o todo prendido.
    }
  }

  function releer(opciones?: { sinCondicion?: boolean }): Promise<void> {
    const sinCondicion = opciones?.sinCondicion === true;
    if (estado.cuenta === null) return Promise.resolve();
    if (enVuelo) {
      otraVuelta = { sinCondicion: sinCondicion || (otraVuelta?.sinCondicion ?? false) };
      return enVuelo;
    }
    ponerReleyendo(true);
    const miGeneracion = generacion;
    enVuelo = (async () => {
      let pedido: { sinCondicion: boolean } | null = { sinCondicion };
      while (pedido && miGeneracion === generacion) {
        await unaLectura(pedido.sinCondicion);
        pedido = otraVuelta;
        otraVuelta = null;
      }
    })().finally(() => {
      if (miGeneracion === generacion) {
        enVuelo = null;
        ponerReleyendo(false);
      }
    });
    return enVuelo;
  }

  async function cambiarCuenta(cuenta: string | null): Promise<void> {
    if (cuenta === estado.cuenta && (cuenta === null || estado.origen !== 'nada')) return;
    generacion += 1;
    const miGeneracion = generacion;
    enVuelo = null;
    otraVuelta = null;
    releyendo = false;
    poner(vacioPara(cuenta));
    if (cuenta === null) return;
    const guardada = await deps.recuperar(cuenta);
    if (miGeneracion !== generacion) return;
    // Si mientras tanto un 503 ya marcó algo, lo guardado no lo borra: se suma debajo.
    if (guardada && estado.origen === 'nada') {
      poner({
        cuenta,
        version: guardada.version,
        etag: guardada.etag,
        apagadas: { ...mapaDesdeLista(guardada.apagadas), ...estado.apagadas },
        noDisponibles: Object.freeze({ ...mapaDeNoDisponibles(guardada.noDisponibles), ...estado.noDisponibles }),
        origen: 'guardado',
      });
    }
    await releer();
  }

  function recibirApagada(apagada: FuncionalidadApagadaRecibida): void {
    if (estado.cuenta === null) return;
    if (apagada.clave) {
      const ya = Object.prototype.hasOwnProperty.call(estado.apagadas, apagada.clave);
      if (!ya || (estado.apagadas[apagada.clave] ?? null) !== apagada.aviso) {
        poner({ ...estado, apagadas: { ...estado.apagadas, [apagada.clave]: apagada.aviso } });
      }
    }
    void releer({ sinCondicion: true });
  }

  function recibirNoDisponible(clave: string | null): void {
    if (estado.cuenta === null) return;
    if (clave && !Object.prototype.hasOwnProperty.call(estado.noDisponibles, clave)) {
      poner({ ...estado, noDisponibles: Object.freeze({ ...estado.noDisponibles, [clave]: true as const }) });
    }
    void releer({ sinCondicion: true });
  }

  return {
    estado: () => estado,
    releyendo: () => releyendo,
    suscribir: oyente => {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    cambiarCuenta,
    releer,
    recibirApagada,
    recibirNoDisponible,
  };
}
