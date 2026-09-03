import { useState, useEffect, useCallback } from 'react';
import { obtenerTicketsMentor, abrirTicketMentor } from '../api/ticketsApi';
import type { AbrirTicketMentorPayload, WireTicketMentor } from '../types/tickets.types';
import { mensajeDeError } from '../../../services/http/apiClient';

export function useTicketsMentor(habilitado: boolean = true) {
  const [tickets, setTickets] = useState<WireTicketMentor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState<boolean>(false);

  const cargar = useCallback(async () => {
    if (!habilitado) return;
    setLoading(true);
    setError(null);
    try {
      const page = await obtenerTicketsMentor();
      setTickets(page.tickets);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudieron cargar tus tickets.'));
    } finally {
      setLoading(false);
    }
  }, [habilitado]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearTicket = useCallback(async (payload: AbrirTicketMentorPayload): Promise<WireTicketMentor> => {
    setCreando(true);
    try {
      const nuevo = await abrirTicketMentor(payload);
      setTickets(prev => [nuevo, ...prev]);
      return nuevo;
    } finally {
      setCreando(false);
    }
  }, []);

  return {
    tickets,
    loading,
    error,
    creando,
    crearTicket,
    recargar: cargar,
  };
}
