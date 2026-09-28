import { useEffect } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { DIAS_A_LA_VISTA, listarProximos } from '../api/eventosApi';
import { sincronizarAlAbrir } from '../notificaciones/alarmasDeEventos';
import { asegurarCanal, HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { canalDeAlarma } from '../../alarmas/sonidoDeAlarma';

/**
 * Pone al día, al entrar, las alarmas de eventos de este teléfono (solo si tiene alguna): así se quita
 * la de un evento cancelado aunque la persona no vuelva a abrir Eventos. Y crea los canales de Android
 * por tipo (E-9).
 *
 * > **Cambiado 2026-09-28 (D-218).** Además abría el detalle del evento al tocar su aviso (E-5). Esa
 * > parte pasó a `features/alarmas/components/AbridorDeAvisos.tsx`, que abre también el recordatorio de
 * > un hábito y el de una acción, y espera a que se cierren el Código Renaser, el arranque guiado o el
 * > Pacto. El nombre del componente se deja para no mover `App.tsx` de más.
 */
export function AbridorDeEventos(): null {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;

  /* E-9: los canales de Android por tipo existen desde que se entra, no recién con la primera alarma:
     así aparecen en los ajustes del teléfono para silenciarlos por separado, y un push del servidor
     que algún día nombre `recordatorios-eventos` encuentra su canal. */
  useEffect(() => {
    if (!isAuthenticated || !HAY_RECORDATORIOS_LOCALES) return;
    void asegurarCanal(canalDeAlarma('habitos', 'sistema')).catch(() => {});
    void asegurarCanal(canalDeAlarma('eventos', 'sistema')).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    void sincronizarAlAbrir(userId, ahora => listarProximos(ahora), DIAS_A_LA_VISTA).catch(() => {});
  }, [isAuthenticated, userId]);

  return null;
}
