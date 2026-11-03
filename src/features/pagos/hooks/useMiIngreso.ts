import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { confirmarMiCronograma, leerMiIngresoDelServidor } from '../api/pagosApi';
import type { MiIngreso } from '../api/pagosSchemas';
import { ponerAlDiaLosRecordatoriosDePago } from '../notificaciones/alarmasDePagos';
import { hayAlgoQueMostrar } from '../utils/vistaDeMiIngreso';

/**
 * Yo → «Mi ingreso» (spec 032): `GET /api/v1/me/ingreso`. Se relee cada vez que Yo vuelve a estar a la vista (Administración marca los pagos desde otro
 * teléfono) y, con lo que llega, se ponen al día las alarmas de pago de este teléfono: una cuota que ya figura pagada deja de recordarse.
 *
 * `visible` es `false` mientras no hay nada que mostrar: nada anotado, un servidor anterior (404), una función apagada (503) o una cuenta que no
 * corresponde (403). Un fallo de red conserva lo último que se leyó (no se esconde una fila por un mal momento de la conexión).
 */
export function useMiIngreso(userId: string | null) {
  const [ingreso, setIngreso] = useState<MiIngreso | null>(null);
  const [cargando, setCargando] = useState(true);
  const pedido = useRef(0);
  const usuario = useRef(userId);
  usuario.current = userId;

  const ponerAlDia = useCallback((leido: MiIngreso | null) => {
    if (usuario.current) void ponerAlDiaLosRecordatoriosDePago(usuario.current, leido?.pagos ?? null).catch(() => undefined);
  }, []);

  const cargar = useCallback(async () => {
    const este = ++pedido.current;
    setCargando(true);
    try {
      const leido = await leerMiIngresoDelServidor();
      if (este !== pedido.current) return;
      setIngreso(leido);
      ponerAlDia(leido);
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (este === pedido.current && (status === 404 || status === 403)) setIngreso(null);
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [ponerAlDia]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  /* Al cambiar de cuenta no queda a la vista lo de la anterior, y la lectura en vuelo de la otra no escribe. No corre al montar: ahí ya hay una lectura. */
  const cuentaAnterior = useRef(userId);
  useEffect(() => {
    if (cuentaAnterior.current === userId) return;
    cuentaAnterior.current = userId;
    pedido.current += 1;
    setIngreso(null);
    setCargando(true);
    void cargar();
  }, [userId, cargar]);

  /** Confirma el cronograma. Devuelve `true` si quedó confirmado; si falla, lanza el error del servidor para que la pantalla lo diga. */
  const confirmar = useCallback(
    async (nombre: string): Promise<boolean> => {
      const nuevo = await confirmarMiCronograma({ nombre, revisado: true });
      if (!nuevo) return false;
      setIngreso(nuevo);
      ponerAlDia(nuevo);
      return true;
    },
    [ponerAlDia],
  );

  return { ingreso, visible: hayAlgoQueMostrar(ingreso), cargando, recargar: cargar, confirmar };
}
