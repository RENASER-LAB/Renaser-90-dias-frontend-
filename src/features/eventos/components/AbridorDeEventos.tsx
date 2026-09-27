import { useEffect } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { alAbrirAviso, consumirRutaPendiente } from '../../mentor/notificaciones/rutaDeAviso';
import { irAPestana, navegacionRef, pestanaDisponible } from '../../../navigation/navegacionRef';
import { DIAS_A_LA_VISTA, listarProximos } from '../api/eventosApi';
import { sincronizarAlAbrir } from '../notificaciones/alarmasDeEventos';
import { asegurarCanal, HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { canalDeAlarma } from '../../alarmas/sonidoDeAlarma';

/**
 * Tocar el aviso de un evento abre su detalle (E-5): Comunidad → Eventos, con ese evento.
 *
 * Vive por encima del navegador, igual que el acompañante y el arranque guiado (`App.tsx`), y no
 * dentro de una pestaña: Comunidad no está montada hasta que alguien la abre, así que su propia
 * escucha no se enteraría de un toque con la app cerrada. Acá se consume solo la ruta `evento`; las
 * del mentor y del semáforo las siguen atendiendo sus pantallas.
 *
 * Si la ruta llega antes de que existan las pestañas (login, onboarding, Mapa del Día 7) queda
 * esperando y se abre cuando aparecen.
 *
 * Además, al entrar pone al día las alarmas de eventos de este teléfono (solo si tiene alguna): así
 * se quita la de un evento cancelado aunque la persona no vuelva a abrir Eventos.
 */
export function AbridorDeEventos(): null {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated) return;
    const intentar = () => {
      if (!pestanaDisponible('Comunidad')) return;
      const ruta = consumirRutaPendiente('evento');
      if (!ruta) return;
      irAPestana('Comunidad', { abrirEventoId: ruta.eventoId });
    };
    intentar();
    const dejarDeEscuchar = alAbrirAviso(intentar);
    const dejarDeMirarNavegacion = navegacionRef.addListener('state', intentar);
    return () => {
      dejarDeEscuchar();
      dejarDeMirarNavegacion();
    };
  }, [isAuthenticated]);

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
