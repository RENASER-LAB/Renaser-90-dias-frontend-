import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { puedeIrALaAnterior, puedeIrALaSiguiente, semanaAnterior, semanaSiguiente } from '../../huecos/utils/semanasDeHuecos';
import type { CargarCierres, CierresDeLaSemana } from '../types/cierre.types';

/**
 * Por qué no se pudo leer una semana: `no_disponible` (404: backend sin la ruta), `sin_permiso` (403: otro rol, cuenta
 * suspendida o ya no la acompaña), `sin_red` o cualquier otra cosa.
 */
export type FalloDeCierres = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

function clasificar(e: unknown): FalloDeCierres {
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
 * Lo leído de UNA persona mientras su ficha está abierta: cada semana pedida una sola vez (la política de
 * `useHuecosDeLaSemana`, spec 015).
 *
 * - **Una lectura por semana**: ir y volver, volver a dibujar o volver a montar la sección no pide nada de nuevo. Dos
 *   pedidos de la misma semana a la vez comparten el vuelo.
 * - **Un fallo no se guarda como dato**: se recuerda para no reintentar solo, y «Reintentar» lo olvida.
 * - **Un 403 o un 404 apagan la sección entera** para esa persona.
 */
class AlmacenDeCierres {
  private readonly semanas = new Map<string, CierresDeLaSemana>();
  private readonly fallos = new Map<string, FalloDeCierres>();
  private readonly enVuelo = new Map<string, Promise<void>>();
  semanaEnCurso: string | null = null;
  primeraSemana: string | null = null;
  oculto = false;

  constructor(private readonly cargar: CargarCierres) {}

  datosDe(clave: string): CierresDeLaSemana | null {
    return this.semanas.get(clave) ?? null;
  }

  falloDe(clave: string): FalloDeCierres | null {
    return this.fallos.get(clave) ?? null;
  }

  /** Pide la semana si hace falta. La promesa nunca se rechaza; `null` si no hay nada que esperar. */
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

  olvidarFallo(clave: string): void {
    this.fallos.delete(clave);
  }
}

/** Un almacén por `cargar`: la función es de una persona (estable), y se va con ella cuando la ficha se cierra. */
const ALMACENES = new WeakMap<CargarCierres, AlmacenDeCierres>();

function almacenDe(cargar: CargarCierres): AlmacenDeCierres {
  let almacen = ALMACENES.get(cargar);
  if (!almacen) {
    almacen = new AlmacenDeCierres(cargar);
    ALMACENES.set(cargar, almacen);
  }
  return almacen;
}

/**
 * Los cierres del día de una persona, semana por semana (spec 017). La sección no sabe de rutas ni de roles:
 * `cargar(semana)` es de cada ficha y **tiene que ser estable** (un `useMemo` por persona); `null` = no hay a quién
 * preguntarle (la persona no tiene grupo). Sin enfoque, sin sondeo y sin lectura al volver a dibujar.
 */
export function useCierresDeLaSemana(cargar: CargarCierres | null) {
  const almacen = useMemo(() => (cargar ? almacenDe(cargar) : null), [cargar]);
  const [eleccion, setEleccion] = useState<{ para: CargarCierres | null; semana: string | null }>({ para: cargar, semana: null });
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
  const semana = semanaElegida ?? datos?.semana ?? null;
  const puedeAnterior = !!almacen && puedeIrALaAnterior(semana, almacen.primeraSemana);
  const puedeSiguiente = !!almacen && puedeIrALaSiguiente(semana, almacen.semanaEnCurso);

  const irA = useCallback((lunes: string) => setEleccion({ para: cargar, semana: lunes }), [cargar]);
  const anterior = useCallback(() => {
    if (semana && puedeAnterior) irA(semanaAnterior(semana));
  }, [semana, puedeAnterior, irA]);
  const siguiente = useCallback(() => {
    if (semana && puedeSiguiente) irA(semanaSiguiente(semana));
  }, [semana, puedeSiguiente, irA]);

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
    cargando: !!almacen && !datos && !fallo,
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
