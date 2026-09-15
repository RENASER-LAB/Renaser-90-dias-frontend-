import React, { useCallback, useState } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { useOfrecimientoDeRenombre, useRenombreLocal } from '../hooks/useRenombreDeHabito';
import type { HabitoRenombrable } from '../utils/renombreDeHabito';
import { AvisoRenombrarHabito } from './AvisoRenombrarHabito';
import { RenombrarHabitoModal } from './RenombrarHabitoModal';

/**
 * El ofrecimiento de cambiarle el nombre a una bebida, por ENCIMA del navegador.
 *
 * Vive en `App.tsx` junto a `RenasiaLauncher`, `SparkieOverlay` y `CodigoRenaserOverlay`, por los
 * mismos dos motivos que ellos: `AGENTS.md` §1 prohíbe alterar las cinco pantallas principales, y
 * el aviso tiene que poder aparecer sobre cualquiera de ellas. Se quita borrando su línea en
 * `App.tsx` y ninguna pantalla se entera.
 *
 * Trae su propio modal de renombre en vez de mandar a Plan. Es deliberado: durante el día 0 —la
 * única ventana en que el backend acepta el cambio— la lista de hábitos de Plan puede estar
 * oculta (D-84 la esconde mientras el programa no arrancó), así que llevar ahí sería llevar a una
 * pantalla vacía.
 *
 * ## Por qué el buscador del ofrecimiento es un componente aparte
 *
 * Este componente solo lee el almacenamiento local, que no cuesta red. Recién cuando ahí consta
 * que **nunca se respondió** monta `BuscadorDeOfrecimiento`, que es el que consulta
 * `GET /api/v1/home` y `GET /api/v1/habits`. Si estuviera todo junto, cada arranque de la app —de
 * cada persona, para siempre— pagaría dos llamadas de red para dibujar algo que ya no va a ver.
 *
 * ## Por qué el modal se monta acá arriba y no dentro del buscador
 *
 * Porque aceptar marca "ya respondió" en el mismo gesto, y eso desmonta al buscador. Si el modal
 * viviera adentro, se cerraría solo en la cara de la persona justo después de abrirlo. El hábito
 * elegido queda en el estado de este componente, que sobrevive a que el ofrecimiento termine.
 */
export function RenombrarHabitoOverlay() {
  const { user, isAuthenticated, isOnboardingCompleted } = useAuth();
  const local = useRenombreLocal(user?.id ?? null);
  /** El hábito cuyo formulario está abierto. `null` = no hay modal. */
  const [habitoEnModal, setHabitoEnModal] = useState<HabitoRenombrable | null>(null);

  /** Las tres salidas del aviso son una respuesta: no se vuelve a preguntar nunca. */
  const responder = useCallback(() => {
    void local.marcarRespondido();
  }, [local]);

  const aceptar = useCallback(
    (habito: HabitoRenombrable) => {
      // Se marca respondido al ABRIR el formulario, no al guardar: quien lo abrió y se arrepintió
      // ya tomó su decisión, y volver a ofrecérselo mañana sería no haber escuchado.
      responder();
      setHabitoEnModal(habito);
    },
    [responder],
  );

  const guardar = useCallback(
    async (tituloPersonal: string, motivo: string) => {
      if (!habitoEnModal) return;
      await local.renombrar(habitoEnModal.id, tituloPersonal, motivo);
    },
    [habitoEnModal, local],
  );

  // Mismo criterio que `SparkieOverlay`: durante el login y el onboarding la persona ya está
  // siendo guiada por esas pantallas, y un aviso superpuesto ahí es ruido. `listo` es la primera
  // lectura del almacenamiento — sin él se montaría el buscador con `respondidoEn` todavía en su
  // valor por defecto y se dispararían las llamadas de red de quien ya respondió hace meses.
  const habilitado = isAuthenticated && isOnboardingCompleted && Boolean(user?.id);
  if (!habilitado || !local.listo) return null;

  return (
    <>
      {local.respondidoEn === null && (
        <BuscadorDeOfrecimiento
          titulos={local.titulos}
          rol={user?.role ?? null}
          onAceptar={aceptar}
          onDescartar={responder}
        />
      )}

      {habitoEnModal !== null && (
        <RenombrarHabitoModal
          visible
          tituloCatalogo={habitoEnModal.title}
          tituloActual={local.titulos[habitoEnModal.id] ?? null}
          onGuardar={guardar}
          onCerrar={() => setHabitoEnModal(null)}
        />
      )}
    </>
  );
}

/**
 * Averigua si corresponde ofrecer el cambio y, si corresponde, dibuja el aviso.
 *
 * Solo se monta con el ofrecimiento sin responder, así que sus dos llamadas de red se pagan una
 * vez en la vida de la cuenta (o ninguna, si la persona ya está en el día 1 o más).
 */
function BuscadorDeOfrecimiento({
  titulos,
  rol,
  onAceptar,
  onDescartar,
}: {
  titulos: Readonly<Record<string, string>>;
  /** `role` de la sesion: el aviso es solo para aprendices (ver `habitoAOfrecerParaRenombrar`). */
  rol: string | null;
  onAceptar: (habito: HabitoRenombrable) => void;
  onDescartar: () => void;
}) {
  const { habito } = useOfrecimientoDeRenombre(true, null, titulos, rol);
  if (!habito) return null;

  return (
    <AvisoRenombrarHabito
      tituloHabito={habito.title}
      onAceptar={() => onAceptar(habito)}
      onAhoraNo={onDescartar}
      onCerrar={onDescartar}
    />
  );
}
