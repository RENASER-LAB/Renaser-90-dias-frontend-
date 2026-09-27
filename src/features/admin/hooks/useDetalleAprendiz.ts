import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { esDeRed, esNoDisponible, esProhibido } from '../../mentor/api/mentorApi';
import { listarStaff, obtenerDetalleAprendiz } from '../api/adminApi';
import type { DetalleAprendizApi } from '../api/adminSchemas';
import { leerUltimoAjuste, nombreDeQuienAjusto, type UltimoAjusteDia } from '../utils/diaDelPrograma';

export type FalloDetalle = 'no_inscrito' | 'sin_permiso' | 'sin_red' | 'error';

/**
 * El detalle administrativo de una persona: su día del programa AHORA y el último ajuste manual.
 *
 * De este detalle depende que se muestre «Cambiar día del programa»: si el servidor lo entrega, la
 * cuenta tiene `MANAGE_TRAINEES` (el mismo permiso que el PUT) y la persona está inscrita. Con 403
 * o 404 el botón no aparece. Como en toda Administración, esto decide qué se MUESTRA: el PUT vuelve
 * a autorizar.
 *
 * `adjustedBy` es un id. Quién es se resuelve aparte y sin bloquear: «ti» si fue esta cuenta, o el
 * nombre en el padrón de ADMIN y ALQUIMISTA (los únicos que pueden mover el día). Si esa lectura
 * falla, la línea dice «alguien del equipo».
 */
export function useDetalleAprendiz(aprendizId: string) {
  const { user } = useAuth();
  const miId = user?.id ?? null;
  const [detalle, setDetalle] = useState<DetalleAprendizApi | null>(null);
  const [ultimoAjuste, setUltimoAjuste] = useState<UltimoAjusteDia | null>(null);
  const [quienAjusto, setQuienAjusto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDetalle | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const leido = await obtenerDetalleAprendiz(aprendizId);
      const ajuste = leerUltimoAjuste(leido.lastDayAdjustment);
      setDetalle(leido);
      setUltimoAjuste(ajuste);
      setQuienAjusto(nombreDeQuienAjusto(ajuste?.ajustadoPor ?? null, miId, new Map()));
      if (ajuste?.ajustadoPor && ajuste.ajustadoPor !== miId) {
        void resolverNombre(ajuste.ajustadoPor).then(nombre => {
          if (nombre) setQuienAjusto(nombre);
        });
      }
    } catch (e) {
      setDetalle(null);
      setUltimoAjuste(null);
      setFallo(
        esNoDisponible(e) ? 'no_inscrito'
        : esProhibido(e) ? 'sin_permiso'
        : esDeRed(e) ? 'sin_red'
        : 'error',
      );
    } finally {
      setCargando(false);
    }
  }, [aprendizId, miId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { detalle, ultimoAjuste, quienAjusto, cargando, fallo, recargar: cargar };
}

async function resolverNombre(usuarioId: string): Promise<string | null> {
  try {
    const paginas = await Promise.all([
      listarStaff({ rol: 'ADMIN', tamano: 100 }),
      listarStaff({ rol: 'ALCHEMIST', tamano: 100 }),
    ]);
    const nombres = new Map<string, string>();
    for (const pagina of paginas) {
      for (const u of pagina.content) if (u.fullName?.trim()) nombres.set(u.id, u.fullName.trim());
    }
    return nombreDeQuienAjusto(usuarioId, null, nombres);
  } catch {
    return null;
  }
}
