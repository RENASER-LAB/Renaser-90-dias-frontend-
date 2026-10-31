import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useDisponibilidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { useAprendicesDisponibles } from '../../lider-mentores/hooks/useAprendicesDisponibles';
import { useCelulaQueAcompano } from '../../mentor/hooks/useCelulaQueAcompano';
import { useEsMentor } from '../../mentor/hooks/useEsMentor';
import { esLiderDeMentores } from '../../mentor/utils/entradaAlGrupo';
import { useResumenPorGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import {
  PARAMETROS_DE_AVISO_DE_ROL,
  pendienteDeLosParametros,
  resolverAvisoDeGrupo,
  resolverAvisoDelResumenGeneral,
  type PendienteDeAviso,
} from '../utils/avisosDeLosPaneles';
import { filasDeRolEnYo } from '../utils/filasDeRol';
import { SIN_VISTA, vistaDeRegreso, type VistaDelPanel } from '../utils/vistasDeLosPaneles';

/**
 * Los paneles de rol de Yo (2026-10-31, pedido del dueño): «Mi grupo» (el mentor o la guía que acompaña un grupo) y «Mis mentores»
 * (el líder), como filas de la lista de Yo junto a «Administración». Hoy ya no los tiene: es solo el programa propio.
 *
 * Reúne lo que antes repartía `HoyScreen` y los guarda en un solo lugar: UNA lectura de su grupo (`useCelulaQueAcompano`), UNA del
 * resumen por grupos del líder, la pregunta de si el servidor ofrece «Todos los aprendices», la vista abierta y el aviso que
 * espera. Quien lo monta (`YoScreen`) dibuja `PantallaDelPanelDeRol` mientras `abierto`, y la lista de Yo si no.
 *
 * Solo pide lo que le toca a la cuenta: el aprendiz no hace ninguna de estas lecturas.
 *
 * ## Avisos
 * Un aviso del teléfono que abría estas vistas desde Hoy ahora trae a Yo con un parámetro (ver `abrirAviso.ts`). El hook lo toma
 * (`params`), lo deja pendiente y lo resuelve cuando tiene lo que le falta (el padrón del grupo, o saber si la cuenta administra).
 * Los avisos de Administración (`abrirCajaAprendizId`, `abrirFichaAprendiz`) los atiende `YoScreen`, que es dueña de esa pantalla.
 */
export function usePanelesDeRol({
  params,
  limpiarParametros,
  administrar,
  cargandoCapacidades,
  abrirElSemaforoDeAdministracion,
}: {
  /** `route.params` de la pestaña Yo. */
  params: unknown;
  /** Quita estos parámetros de la ruta (se consumen una sola vez). */
  limpiarParametros: (claves: readonly string[]) => void;
  /** La cuenta administra (lo dice el servidor): el resumen general del sábado le abre el semáforo de Administración. */
  administrar: boolean;
  cargandoCapacidades: boolean;
  abrirElSemaforoDeAdministracion: () => void;
}) {
  const { user } = useAuth();
  const esDisponible = useDisponibilidad();
  const esMentor = useEsMentor();
  const esLider = esLiderDeMentores(user?.role);

  /* Sus lecturas: solo quien las necesita pide algo. */
  const celula = useCelulaQueAcompano(esMentor);
  const { elegirGrupo } = celula;
  const semaforoGrupos = useResumenPorGrupos(esLider);
  const aprendicesDisponibles = useAprendicesDisponibles(esLider && esDisponible(CLAVES.lider));

  const filas = filasDeRolEnYo({
    esMentor,
    rol: user?.role,
    fallo: celula.fallo,
    hayVista: celula.vista !== null,
    miGrupoDisponible: esDisponible(CLAVES.mentorMiGrupo),
    liderDisponible: esDisponible(CLAVES.lider),
    ticketsDisponible: esDisponible(CLAVES.tickets),
    semaforoDisponible: esDisponible(CLAVES.semaforo),
  });

  const [vista, setVista] = useState<VistaDelPanel>(SIN_VISTA);
  const volver = useCallback(() => setVista(actual => vistaDeRegreso(actual)), []);
  const cerrarTodo = useCallback(() => setVista(SIN_VISTA), []);

  /* Los paneles que dejan de corresponderle a la cuenta (cambió de cuenta, un interruptor se apagó) no quedan abiertos. */
  useEffect(() => {
    setVista(actual => {
      const delGrupo = actual.tipo === 'miGrupo' || actual.tipo === 'alumno';
      if (delGrupo && !esMentor) return SIN_VISTA;
      const delLider = ['misMentores', 'consultas', 'mentores', 'todos', 'cumplimiento'].includes(actual.tipo);
      if (delLider && !esLider) return SIN_VISTA;
      return actual;
    });
  }, [esMentor, esLider]);

  /* El aviso que espera. Se toma de los parámetros una sola vez y se limpia la ruta: volver atrás no debe reabrirlo. */
  const [pendiente, setPendiente] = useState<PendienteDeAviso | null>(null);
  useEffect(() => {
    const nuevo = pendienteDeLosParametros(params);
    const traeAlgo = PARAMETROS_DE_AVISO_DE_ROL.some(clave => (params as Record<string, unknown> | undefined)?.[clave] !== undefined);
    if (!traeAlgo) return;
    limpiarParametros(PARAMETROS_DE_AVISO_DE_ROL);
    if (nuevo) setPendiente(nuevo);
  }, [params, limpiarParametros]);

  useEffect(() => {
    if (!pendiente) return;

    if (pendiente.tipo === 'semaforoGrupos') {
      const que = resolverAvisoDelResumenGeneral({ esLider, administrar, cargandoCapacidades });
      if (que.hacer === 'esperar') return;
      setPendiente(null);
      if (que.hacer === 'abrir') setVista(que.vista);
      if (que.hacer === 'abrirAdministracion') abrirElSemaforoDeAdministracion();
      return;
    }

    const que = resolverAvisoDeGrupo(pendiente, { esMentor, vista: celula.vista, huboFallo: celula.fallo !== null });
    if (que.hacer === 'esperar') return;
    setPendiente(null);
    switch (que.hacer) {
      case 'descartar':
        return;
      case 'abrirAlumno':
        setVista({ tipo: 'alumno', alumno: que.alumno });
        return;
      case 'abrirGrupo':
        setVista({ tipo: 'miGrupo', enfocarSemaforo: false });
        return;
      case 'cambiarDeGrupoYAbrirAlumno':
        /* Alumno de OTRO de sus grupos (D-141): se pasa a ese grupo y se abre la ficha con su padrón. */
        setVista({ tipo: 'miGrupo', enfocarSemaforo: false });
        void elegirGrupo(que.grupoId).then(nueva => {
          const alumno = nueva?.todos.find(a => a.participanteId === que.alumnoId);
          if (alumno) setVista({ tipo: 'alumno', alumno });
        });
        return;
      case 'abrirSemaforoDelGrupo':
        /* Aviso de otro de sus grupos (D-141): se abre ESE grupo, no el que se estaba mirando. */
        if (que.cambiarAlGrupo) void elegirGrupo(que.cambiarAlGrupo);
        setVista({ tipo: 'miGrupo', enfocarSemaforo: que.enfocar });
        return;
    }
  }, [pendiente, esMentor, esLider, celula.vista, celula.fallo, elegirGrupo, administrar, cargandoCapacidades, abrirElSemaforoDeAdministracion]);

  return useMemo(
    () => ({
      filas,
      vista,
      abierto: vista.tipo !== 'ninguna',
      ir: setVista,
      volver,
      cerrarTodo,
      celula,
      semaforoGrupos,
      aprendicesDisponibles,
      esDisponible,
    }),
    [filas, vista, volver, cerrarTodo, celula, semaforoGrupos, aprendicesDisponibles, esDisponible],
  );
}

export type PanelesDeRol = ReturnType<typeof usePanelesDeRol>;
