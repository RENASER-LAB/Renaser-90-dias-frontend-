import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import type { CargarOchentaVeinte, TipoDePeriodo, VistaDelPeriodo } from '../types/ochentaVeinte.types';

/**
 * Por qué no se pudo leer un periodo: `no_disponible` (404: backend sin la ruta, persona sin Día 1 o «Código Renaser en las fichas»
 * apagado), `sin_permiso` (403), `sin_red` o cualquier otra cosa.
 */
export type FalloDelOchentaVeinte = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

function clasificar(e: unknown): FalloDelOchentaVeinte {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'no_disponible';
    if (e.status === 403) return 'sin_permiso';
    if (e.status === 0) return 'sin_red';
  }
  return 'error';
}

/** La clave de «el periodo en curso»: se pide sin `inicio` y el servidor dice cuál es (en la zona de la persona). */
const EN_CURSO = 'en-curso';

function claveDe(tipo: TipoDePeriodo, inicio: string | null): string {
  return `${tipo}:${inicio ?? EN_CURSO}`;
}

/**
 * Lo leído de UNA persona mientras la hoja o la ficha está abierta: cada periodo pedido una sola vez (la política de
 * `useCierresDeLaSemana`). Un fallo no se guarda como dato: se recuerda para no reintentar solo, y «Reintentar» lo olvida. Un 403 o un
 * 404 apagan la sección entera para esa persona. Abrir un periodo cerrado muchas veces cuesta una lectura, y ninguna llama a la IA.
 */
export class AlmacenDelOchentaVeinte {
  private readonly periodos = new Map<string, VistaDelPeriodo>();
  private readonly fallos = new Map<string, FalloDelOchentaVeinte>();
  private readonly enVuelo = new Map<string, Promise<void>>();
  oculto = false;

  constructor(private readonly cargar: CargarOchentaVeinte) {}

  datosDe(tipo: TipoDePeriodo, inicio: string | null): VistaDelPeriodo | null {
    return this.periodos.get(claveDe(tipo, inicio)) ?? null;
  }

  falloDe(tipo: TipoDePeriodo, inicio: string | null): FalloDelOchentaVeinte | null {
    return this.fallos.get(claveDe(tipo, inicio)) ?? null;
  }

  /** Pide el periodo si hace falta. La promesa nunca se rechaza; `null` si no hay nada que esperar. */
  pedir(tipo: TipoDePeriodo, inicio: string | null): Promise<void> | null {
    const clave = claveDe(tipo, inicio);
    if (this.oculto || this.periodos.has(clave) || this.fallos.has(clave)) return null;
    const vuelo = this.enVuelo.get(clave);
    if (vuelo) return vuelo;

    const nuevo = this.cargar(tipo, inicio)
      .then(datos => {
        this.periodos.set(clave, datos);
        this.periodos.set(claveDe(tipo, datos.inicio), datos);
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

  olvidarFallo(tipo: TipoDePeriodo, inicio: string | null): void {
    this.fallos.delete(claveDe(tipo, inicio));
  }
}

/** Un almacén por `cargar`: la función es de una persona (estable), y se va con ella cuando la ficha o la hoja se cierra. */
const ALMACENES = new WeakMap<CargarOchentaVeinte, AlmacenDelOchentaVeinte>();

function almacenDe(cargar: CargarOchentaVeinte): AlmacenDelOchentaVeinte {
  let almacen = ALMACENES.get(cargar);
  if (!almacen) {
    almacen = new AlmacenDelOchentaVeinte(cargar);
    ALMACENES.set(cargar, almacen);
  }
  return almacen;
}

/**
 * El 80/20 y su análisis de una persona, periodo por periodo (spec 031). El componente no sabe de rutas ni de roles: `cargar` es de
 * cada pantalla y **tiene que ser estable** (un `useMemo` por persona); `null` = no hay a quién preguntarle. Sin enfoque, sin sondeo y
 * sin lectura al volver a dibujar. `activo` en `false` no pide nada (la hoja cerrada).
 */
export function useOchentaVeinte(cargar: CargarOchentaVeinte | null, tipo: TipoDePeriodo, activo = true) {
  const almacen = useMemo(() => (cargar ? almacenDe(cargar) : null), [cargar]);
  const [eleccion, setEleccion] = useState<{ para: CargarOchentaVeinte | null; tipo: TipoDePeriodo; inicio: string | null }>({
    para: cargar,
    tipo,
    inicio: null,
  });
  const [, setVersion] = useState(0);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  /* Cambiar de persona o de tipo vuelve al periodo en curso. */
  const inicioElegido = eleccion.para === cargar && eleccion.tipo === tipo ? eleccion.inicio : null;

  const avisarCuandoLlegue = useCallback((vuelo: Promise<void> | null) => {
    void vuelo?.then(() => {
      if (montado.current) setVersion(v => v + 1);
    });
  }, []);

  useEffect(() => {
    if (!almacen || !activo) return;
    avisarCuandoLlegue(almacen.pedir(tipo, inicioElegido));
  }, [almacen, activo, tipo, inicioElegido, avisarCuandoLlegue]);

  const datos = almacen?.datosDe(tipo, inicioElegido) ?? null;
  const fallo = datos ? null : (almacen?.falloDe(tipo, inicioElegido) ?? null);

  const irA = useCallback((inicio: string) => setEleccion({ para: cargar, tipo, inicio }), [cargar, tipo]);
  const anterior = useCallback(() => {
    if (datos?.anterior) irA(datos.anterior);
  }, [datos, irA]);
  const siguiente = useCallback(() => {
    if (datos?.siguiente) irA(datos.siguiente);
  }, [datos, irA]);

  const reintentar = useCallback(() => {
    if (!almacen) return;
    almacen.olvidarFallo(tipo, inicioElegido);
    const vuelo = almacen.pedir(tipo, inicioElegido);
    setVersion(v => v + 1);
    avisarCuandoLlegue(vuelo);
  }, [almacen, tipo, inicioElegido, avisarCuandoLlegue]);

  return {
    datos,
    fallo,
    cargando: !!almacen && activo && !datos && !fallo,
    oculta: !almacen || almacen.oculto,
    puedeAnterior: !!datos?.anterior,
    puedeSiguiente: !!datos?.siguiente,
    anterior,
    siguiente,
    reintentar,
  };
}
