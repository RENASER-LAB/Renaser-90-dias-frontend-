import { useCallback, useEffect, useRef, useState } from 'react';

import { listarCategoriasAdmin } from '../../habits/categorias/api/categoriasApi';
import type { CategoriaAdmin } from '../../habits/categorias/types/categorias.types';
import { FORMACION_POR_DEFECTO } from '../../formaciones/types/formaciones.types';
import { esDeRed, esProhibido } from '../../mentor/api/mentorApi';
import { leerHabitosDelPrograma, leerRolesElegibles, TODAS_LAS_FORMACIONES } from '../api/habitosProgramaApi';
import type { HabitoDelProgramaApi, RolElegibleApi } from '../api/habitosProgramaSchemas';

export type FalloDeHabitos = 'sin_permiso' | 'sin_red' | 'error';

/**
 * El catálogo de UNA formación (o de las tres, solo para leer), los roles elegibles y las categorías, en paralelo (spec 023).
 * `reemplazar` y `quitar` ponen en su lugar lo que devuelve cada cambio, sin volver a pedir la lista entera.
 *
 * La formación elegida vive aquí y no en la pantalla: Administración monta el hook siempre y la elección tiene que sobrevivir al abrir un
 * hábito o las categorías. Al cambiarla, lo de la anterior desaparece en el acto: nunca se ve un hábito de una formación bajo el nombre
 * de otra.
 *
 * Los roles y las categorías fallan aparte a propósito: un backend anterior a D-264 no tiene `GET /roles` (404) y uno anterior a la spec
 * 023 no tiene las categorías, y la lista igual se muestra —todo «Para todos», con las cuatro dimensiones de siempre—.
 */
export function useHabitosProgramaAdmin(activo = true) {
  const [formacion, setFormacion] = useState<string>(FORMACION_POR_DEFECTO);
  const [habitos, setHabitos] = useState<HabitoDelProgramaApi[] | null>(null);
  const [roles, setRoles] = useState<RolElegibleApi[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  /** `false` = el servidor no tiene las categorías (backend anterior): el formulario ofrece las cuatro de siempre. */
  const [categoriasDelServidor, setCategoriasDelServidor] = useState(false);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloDeHabitos | null>(null);
  /** Numera las lecturas: una respuesta de la formación anterior no pisa a la nueva. */
  const turno = useRef(0);

  const cargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setFallo(null);
    const [catalogo, elegibles, deCategorias] = await Promise.allSettled([
      leerHabitosDelPrograma(null, formacion),
      leerRolesElegibles(),
      listarCategoriasAdmin(),
    ]);
    if (mio !== turno.current) return;
    if (catalogo.status === 'fulfilled') {
      setHabitos(catalogo.value);
    } else {
      const e = catalogo.reason;
      setFallo(esProhibido(e) ? 'sin_permiso' : esDeRed(e) ? 'sin_red' : 'error');
    }
    if (elegibles.status === 'fulfilled') setRoles(elegibles.value);
    if (deCategorias.status === 'fulfilled') {
      setCategorias(deCategorias.value);
      setCategoriasDelServidor(true);
    } else {
      setCategorias([]);
      setCategoriasDelServidor(false);
    }
    setCargando(false);
  }, [formacion]);

  /* Solo cuando la pantalla se abre (o cambia la formación): Administración monta el hook siempre. */
  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar]);

  /** Cambia de formación: lo de la anterior se va en el acto y se pide lo de la nueva. */
  const elegirFormacion = useCallback((codigo: string) => {
    turno.current += 1;
    setHabitos(null);
    setFallo(null);
    setCargando(true);
    setFormacion(codigo);
  }, []);

  const reemplazar = useCallback((habito: HabitoDelProgramaApi) => {
    setHabitos(actuales => {
      if (!actuales) return [habito];
      return actuales.some(h => h.id === habito.id)
        ? actuales.map(h => (h.id === habito.id ? habito : h))
        : [...actuales, habito];
    });
  }, []);

  const quitar = useCallback((id: string) => {
    setHabitos(actuales => (actuales ? actuales.filter(h => h.id !== id) : actuales));
  }, []);

  /** Las categorías de la formación indicada, en su orden (las de Administración incluyen las desactivadas). */
  const categoriasDe = useCallback(
    (codigo: string) => categorias.filter(c => c.formation === codigo).sort((a, b) => a.order - b.order),
    [categorias],
  );

  const reemplazarCategoria = useCallback((categoria: CategoriaAdmin) => {
    setCategorias(actuales =>
      actuales.some(c => c.key === categoria.key) ? actuales.map(c => (c.key === categoria.key ? categoria : c)) : [...actuales, categoria],
    );
  }, []);

  const quitarCategoria = useCallback((clave: string) => {
    setCategorias(actuales => actuales.filter(c => c.key !== clave));
  }, []);

  /** Pone en su lugar las categorías de UNA formación (lo que responde «ordenar»). */
  const reemplazarCategoriasDe = useCallback((codigo: string, lista: CategoriaAdmin[]) => {
    setCategorias(actuales => [...actuales.filter(c => c.formation !== codigo), ...lista]);
  }, []);

  return {
    formacion,
    elegirFormacion,
    habitos,
    roles,
    categorias,
    categoriasDelServidor,
    categoriasDe,
    cargando,
    fallo,
    recargar: cargar,
    reemplazar,
    quitar,
    reemplazarCategoria,
    quitarCategoria,
    reemplazarCategoriasDe,
  };
}

export { TODAS_LAS_FORMACIONES };
