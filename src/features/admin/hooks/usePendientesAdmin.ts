import { useCallback, useEffect, useState } from 'react';

import { listarAprendices, listarCohortes, listarGruposDeCohorte, listarSolicitudes } from '../api/adminApi';

/** Ventana del aviso por vencimiento: siete días contando hoy, la misma regla que el backend. */
const DIAS_DE_ANTELACION = 7;

/**
 * Las tres colas de la pantalla de inicio, cada una con su propio destino si falla.
 *
 * **Un panel que se cae no borra a los demás.** Cada consulta se resuelve por separado y guarda
 * su error aparte; con un `Promise.all` un 500 en solicitudes dejaría la pantalla entera en
 * blanco, y el administrador perdería también lo que sí se podía ver (ARF-02).
 *
 * **`null` no es cero.** Un contador que no se pudo leer se muestra como "—". Poner 0 afirmaría
 * que no hay nada pendiente, que es exactamente lo contrario de lo que se sabe.
 */
export function usePendientesAdmin() {
  const [gruposPorVencer, setGruposPorVencer] = useState<number | null>(null);
  const [personasSinGrupo, setPersonasSinGrupo] = useState<number | null>(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number | null>(null);
  const [falloGrupos, setFalloGrupos] = useState(false);
  const [falloPersonas, setFalloPersonas] = useState(false);
  const [falloSolicitudes, setFalloSolicitudes] = useState(false);

  const cargar = useCallback(async () => {
    void contarGruposPorVencer().then(
      n => {
        setGruposPorVencer(n);
        setFalloGrupos(false);
      },
      () => setFalloGrupos(true),
    );
    void listarAprendices({ pagina: 0, tamano: 1, soloSinGrupo: true }).then(
      pagina => {
        // El total viene del servidor CON el filtro aplicado: contar la página traería 1.
        setPersonasSinGrupo(pagina.total);
        setFalloPersonas(false);
      },
      () => setFalloPersonas(true),
    );
    void listarSolicitudes('PENDING', 0).then(
      pagina => {
        setSolicitudesPendientes(pagina.total);
        setFalloSolicitudes(false);
      },
      () => setFalloSolicitudes(true),
    );
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    gruposPorVencer,
    personasSinGrupo,
    solicitudesPendientes,
    falloGrupos,
    falloPersonas,
    falloSolicitudes,
    recargar: cargar,
  };
}

/**
 * No hay un endpoint que devuelva "los grupos por vencer": el aviso lo genera el backend y viaja
 * por notificaciones. Acá se cuenta recorriendo las cohortes, que son pocas y acotadas — no crece
 * con la cantidad de aprendices.
 *
 * El corte se calcula sobre `periodEnd`, que es una fecha del programa y no un instante: comparar
 * en la zona del teléfono movería el corte una vez al día para quien viaje. Se compara texto ISO
 * contra texto ISO, que para fechas sin hora es exacto y no depende de ninguna zona.
 */
async function contarGruposPorVencer(): Promise<number> {
  const cohortes = await listarCohortes();
  const hoy = new Date();
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + DIAS_DE_ANTELACION - 1);
  const hoyIso = aIso(hoy);
  const limiteIso = aIso(limite);

  let total = 0;
  for (const cohorte of cohortes) {
    const grupos = await listarGruposDeCohorte(cohorte.id);
    total += grupos.filter(
      g => g.status === 'VIGENTE' && g.periodEnd != null && g.periodEnd >= hoyIso && g.periodEnd <= limiteIso,
    ).length;
  }
  return total;
}

function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
