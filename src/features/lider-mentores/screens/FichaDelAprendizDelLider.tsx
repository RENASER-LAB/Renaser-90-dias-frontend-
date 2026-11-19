import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { BotonSecundario } from '../../../components/Legible';
import { tacto } from '../../../utils/tacto';
import { FichaDePersona } from '../../mentor/components/FichaDePersona';
import type { OrigenDeLaFicha } from '../../mentor/utils/lecturasDeLaFicha';
import { BotonDescargarSemana } from '../components/BotonDescargarSemana';
import { HojaDeTexto } from '../components/HojaDeTexto';
import { useAvisarAlMentor } from '../hooks/useAvisarAlMentor';
import { personaParaLaFicha } from '../utils/personaParaLaFicha';

/** El mensaje sugerido de «Avisar a su mentor»: corto, en tuteo y editable. */
export function mensajeSugeridoParaElMentor(nombre: string): string {
  const quien = nombre.trim() || 'Esta persona';
  return `${quien} necesita tu apoyo esta semana. ¿Le escribes hoy?`;
}

/**
 * La ficha de un aprendiz para el líder (spec 056 historia 3, FR-014 a FR-020): **la misma de la 055** —`FichaDePersona` con origen líder: cabecera
 * con el color en el borde, notas de solo lectura, semana en círculos, mes, día por pilares, evidencia con el ojo, objetivos y el resto— más lo propio
 * del líder, al pie: «Descargar semana» y «Avisar a su mentor». Sin mentor, el botón de avisar no se dibuja.
 *
 * `grupoId` es el grupo desde el que se abrió o `null` (un aprendiz sin grupo, o desde «Todos los aprendices»): el líder ve a la persona desde su día 1,
 * con grupo o sin él. `mentorNombre` dice si hay a quién avisar. La persona de otra formación responde 404 y la ficha dice que no está disponible.
 */
export function FichaDelAprendizDelLider({
  personaId,
  nombre,
  grupoId,
  mentorNombre,
  rotuloDeVolver = 'Volver',
  onVolver,
}: {
  personaId: string;
  nombre: string;
  grupoId: string | null;
  /** El mentor de la persona; `null` = no tiene (o no se sabe): no se ofrece avisar. */
  mentorNombre: string | null;
  rotuloDeVolver?: string;
  onVolver: () => void;
}) {
  const origen = useMemo<OrigenDeLaFicha>(() => ({ quien: 'lider', grupoId }), [grupoId]);
  const alumno = useMemo(() => personaParaLaFicha(personaId, nombre), [personaId, nombre]);
  const [avisando, setAvisando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const { enviando, avisar } = useAvisarAlMentor(personaId);
  const sugerido = useMemo(() => mensajeSugeridoParaElMentor(nombre), [nombre]);

  const enviar = async (texto: string) => {
    const salio = await avisar(texto);
    if (salio) {
      setAvisando(false);
      setConfirmacion(`Le avisaste a ${mentorNombre?.trim() || 'su mentor'}.`);
      tacto.logro();
    }
    return salio;
  };

  return (
    <>
      <FichaDePersona
        origen={origen}
        alumno={alumno}
        onVolver={onVolver}
        rotuloDeVolver={rotuloDeVolver}
        onYaNoAcompana={motivo => {
          Alert.alert('No se puede ver esta ficha', motivo);
          onVolver();
        }}
        pie={({ semanaHasta }) => (
          <View style={estilos.botones}>
            {confirmacion ? <ConfirmacionEnLinea texto={confirmacion} onTerminar={() => setConfirmacion(null)} /> : null}
            <BotonDescargarSemana documento={{ tipo: 'APRENDIZ', personaId }} semanaHasta={semanaHasta} />
            {mentorNombre ? (
              <BotonSecundario etiqueta="Avisar a su mentor" icono="bell" onPress={() => setAvisando(true)} accessibilityLabel={`Avisar a su mentor sobre ${nombre}`} />
            ) : null}
          </View>
        )}
      />
      {mentorNombre ? (
        <HojaDeTexto
          visible={avisando}
          alCerrar={() => setAvisando(false)}
          titulo={`Avisar a ${mentorNombre.trim()}`}
          subtitulo={`Sobre ${nombre.trim() || 'esta persona'}`}
          textoInicial={sugerido}
          etiquetaDelCampo="Mensaje para su mentor"
          etiquetaDelBoton="Avisar"
          enviando={enviando}
          onEnviar={enviar}
        />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  botones: { gap: 12 },
});
