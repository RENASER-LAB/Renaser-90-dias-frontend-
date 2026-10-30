import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import type { CargarHuecos, HuecosDeLaSemana } from '../types/huecos.types';
import {
  puedeIrALaAnterior,
  puedeIrALaSiguiente,
  semanaAnterior,
  semanaSiguiente,
} from '../utils/semanasDeHuecos';

/**
 * Por qué no se pudo leer una semana: `no_disponible` (404: backend sin la ruta, o esa persona no se muestra),
 * `sin_permiso` (403: otro rol, cuenta suspendida o ya no la acompaña), `sin_red` o cualquier otra cosa.
 */
export type FalloDeHuecos = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

function clasificar(e: unknown): FalloDeHuecos {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'no_disponible';
    if (e.status === 403) return 'sin_permiso';
    if (e.status === 0) return 'sin_red';
  }
  return 'error';
}

/** La clave de «la semana en curso»: se pide sin `semana` y el servidor dice cuál es (en la zona de la persona). */
const SEMANA_EN_CURSO = 'en-curso';

/**
 * Lo leído de UNA persona mientras su ficha está abierta: cada semana pedida una sola vez.
 *
 * - **Una lectura por semana**: ir y volver entre las mismas semanas, o que la sección se vuelva a montar (la ficha pasa
 *   a «Avisar a su mentor» y regresa), no pide nada de nuevo. Dos pedidos de la misma semana al mismo tiempo comparten
 *   el mismo vuelo.
 * - **Un fallo no se guarda como dato**: se recuerda para no reintentar solo en cada dibujo, y «Reintentar» lo olvida.
 * - **Un 403 o un 404 apagan la sección entera** para esa persona.
 */
class AlmacenDeHuecos {
  private readonly semanas = new Map<string, HuecosDeLaSemana>();
  private readonly fallos = new Map<string, FalloDeHuecos>();
  private readonly enVuelo = new Map<string, Promise<void>>();
  /** El lunes de la semana en curso, conocido tras la primera lectura. Tope de ›. */
  semanaEnCurso: string | null = null;
  /** El lunes de la primera semana de su programa. Tope de ‹. */
  primeraSemana: string | null = null;
  oculto = false;

  constructor(private readonly cargar: CargarHuecos) {}

  datosDe(clave: string): HuecosDeLaSemana | null {
    return this.semanas.get(clave) ?? null;
  }

  falloDe(clave: string): FalloDeHuecos | null {
    return this.fallos.get(clave) ?? null;
  }

  /**
   * Pide la semana si hace falta. Devuelve la promesa del vuelo (para avisar cuando llegue) o `null` si no hay nada que
   * esperar: ya está leída, ya falló (se reintenta a pedido) o la sección está apagada. La promesa nunca se rechaza.
   */
  pedir(clave: string): Promise<void> | null {
    if (this.oculto || this.semanas.has(clave) || this.fallos.has(clave)) return null;
    const vuelo = this.enVuelo.get(clave);
    if (vuelo) return vuelo;

    const nuevo = this.cargar(clave === SEMANA_EN_CURSO ? null : clave)
      .then(datos => {
        this.semanas.set(clave, datos);
        this.semanas.set(datos.semana, datos);
        if (clave === SEMANA_EN_CURSO) this.semanaEnCurso = datos.semana;
        if (datos.primeraSemana) this.primeraSemana = datos.primeraSemana;
      })
      .catch((e: unknown) => {
        const fallo = clasificar(e);
        if (fallo === 'no_disponible' || fallo === 'sin_permiso') this.oculto = true;
        this.fallos.set(clave, fallo);
      })
      .finally(() => {
        this.enVuelo.delete(clave);
      });
    this.enVuelo.set(clave, nuevo);
    return nuevo;
  }

  /** Olvida el fallo de una semana para volver a pedirla. */
  olvidarFallo(clave: string): void {
    this.fallos.delete(clave);
  }
}

/** Un almacén por `cargar`: la función es de una persona (estable), y se va con ella cuando la ficha se cierra. */
const ALMACENES = new WeakMap<CargarHuecos, AlmacenDeHuecos>();

function almacenDe(cargar: CargarHuecos): AlmacenDeHuecos {
  let almacen = ALMACENES.get(cargar);
  if (!almacen) {
    almacen = new AlmacenDeHuecos(cargar);
    ALMACENES.set(cargar, almacen);
  }
  return almacen;
}

/**
 * Los huecos de horario de una persona, semana por semana (spec 015). La sección no sabe de rutas ni de roles:
 * `cargar(semana)` es de cada ficha y **tiene que ser estable** (un `useMemo` por persona), porque es la llave de lo que
 * se guarda; `null` = no hay a quién preguntarle (la persona no tiene grupo).
 *
 * Sin enfoque, sin sondeo y sin lectura al volver a dibujar: la primera lectura es la semana en curso y cada semana
 * nueva a la que se va es un pedido más. El resto sale de lo guardado.
 */
export function useHuecosDeLaSemana(cargar: CargarHuecos | null) {
  const almacen = useMemo(() => (cargar ? almacenDe(cargar) : null), [cargar]);
  /* La semana elegida es de una persona: si la ficha pasa a otra, vuelve a la semana en curso sin un efecto de por medio. */
  const [eleccion, setEleccion] = useState<{ para: CargarHuecos | null; semana: string | null }>({
    para: cargar,
    semana: null,
  });
  const [, setVersion] = useState(0);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const semanaElegida = eleccion.para === cargar ? eleccion.semana : null;
  const clave = semanaElegida ?? SEMANA_EN_CURSO;

  const avisarCuandoLlegue = useCallback((vuelo: Promise<void> | null) => {
    void vuelo?.then(() => {
      if (montado.current) setVersion(v => v + 1);
    });
  }, []);

  useEffect(() => {
    if (!almacen) return;
    avisarCuandoLlegue(almacen.pedir(clave));
  }, [almacen, clave, avisarCuandoLlegue]);

  const datos = almacen?.datosDe(clave) ?? null;
  const fallo = datos ? null : (almacen?.falloDe(clave) ?? null);
  /** El lunes de la semana a la vista; mientras se lee la primera, nadie lo sabe. */
  const semana = semanaElegida ?? datos?.semana ?? null;
  const puedeAnterior = !!almacen && puedeIrALaAnterior(semana, almacen.primeraSemana);
  const puedeSiguiente = !!almacen && puedeIrALaSiguiente(semana, almacen.semanaEnCurso);

  const irA = useCallback(
    (lunes: string) => {
      setEleccion({ para: cargar, semana: lunes });
    },
    [cargar],
  );
  const anterior = useCallback(() => {
    if (semana && puedeAnterior) irA(semanaAnterior(semana));
  }, [semana, puedeAnterior, irA]);
  const siguiente = useCallback(() => {
    if (semana && puedeSiguiente) irA(semanaSiguiente(semana));
  }, [semana, puedeSiguiente, irA]);

  /** Vuelve a pedir la semana que falló. */
  const reintentar = useCallback(() => {
    if (!almacen) return;
    almacen.olvidarFallo(clave);
    const vuelo = almacen.pedir(clave);
    setVersion(v => v + 1);
    avisarCuandoLlegue(vuelo);
  }, [almacen, clave, avisarCuandoLlegue]);

  return {
    datos,
    fallo,
    /** `true` mientras no hay ni datos ni fallo de la semana a la vista. */
    cargando: !!almacen && !datos && !fallo,
    /** La sección no existe para esta persona: sin a quién preguntarle, o un 403 o 404. */
    oculta: !almacen || almacen.oculto,
    semana,
    semanaEnCurso: almacen?.semanaEnCurso ?? null,
    puedeAnterior,
    puedeSiguiente,
    anterior,
    siguiente,
    reintentar,
  };
}
