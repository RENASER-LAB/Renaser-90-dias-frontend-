import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { NOMBRE_ACOMPANANTE } from '../data/agentes';
import { FenixDeSerQuieto } from '../../fenix/components/FenixDeSerQuieto';
import { RenasiaPanel } from '../screens/RenasiaPanel';
import { marcarChatMontado } from '../state/chatEnPantalla';

/**
 * SER DENTRO de un curso de Classroom: un botón al pie de la vista del curso o de la lección que
 * abre el chat de SER sabiendo qué está mirando la persona.
 *
 * D-255 (2026-10-06): este botón abría a Sparkie, el tutor de cursos (`COURSE_TUTOR`, D-99/D-102).
 * El dueño lo retiró, textual: «Me dijeron que quites a Sparkie, porque los usuarios se confunden,
 * y que SER haga lo mismo». Ahora abre a SER (`COMPANION`) con el mismo contexto que tenía Sparkie:
 * `cursoId` acota el material que el backend recupera a las lecciones visibles de ese curso, y
 * `ambito` ("el curso X, la lección Y") va al prompt de sistema, nunca dentro de la pregunta. Es la
 * misma conversación que la del orbe y el botón flotante: un solo asistente, un solo historial.
 */
interface ChatDelCursoProps {
  /** Id del curso (`selectedCourse.id`). Sin él, SER busca en todo lo visible. */
  cursoId?: string | null;
  cursoTitulo: string;
  leccionTitulo?: string | null;
  /** Dia de programa del aprendiz, si la pantalla lo conoce; sirve para "la leccion de hoy". */
  diaPrograma?: number | null;
}

export function ChatDelCurso({ cursoId, cursoTitulo, leccionTitulo, diaPrograma }: ChatDelCursoProps) {
  const { c, t } = useTheme();
  const [visible, setVisible] = useState(false);

  // D-101: mientras este botón exista en pantalla, el flotante de SER se esconde. Dos entradas en
  // la misma vista confunden, y dentro de un curso la correcta es esta: lleva el curso de contexto.
  useEffect(() => marcarChatMontado(), []);

  // D-100: solo el QUE (curso, leccion, dia). El COMO responder vive en el prompt de sistema del
  // backend, que es donde el ambito termina — no se manda como parte de la pregunta.
  const contexto = useMemo(() => {
    const partes = [`el curso "${cursoTitulo}"`];
    if (leccionTitulo) partes.push(`la leccion "${leccionTitulo}"`);
    if (diaPrograma && diaPrograma > 0) partes.push(`dia ${diaPrograma} del programa`);
    const etiqueta = leccionTitulo ? `${cursoTitulo} · ${leccionTitulo}` : cursoTitulo;
    return { etiqueta, ambito: partes.join(', '), cursoId: cursoId ?? null };
  }, [cursoId, cursoTitulo, leccionTitulo, diaPrograma]);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Preguntarle a ${NOMBRE_ACOMPANANTE} sobre este curso`}
        style={[styles.boton, { borderColor: c.gold, backgroundColor: c.cardBg }]}
      >
        {/* El fénix de SER en el ánimo del semáforo, el mismo del botón flotante y del panel (2026-10-06; era el orbe
            de SER, `OrbeQuieto` de 36, y antes el globo `chat` de Sparkie). Desborda un poco la caja de 36: el dibujo
            deja aire alrededor. */}
        <View style={styles.icono}>
          <FenixDeSerQuieto size={44} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>
            Pregúntale a {NOMBRE_ACOMPANANTE}
          </Text>
          <Text style={[t.small, { color: c.textSoft, fontSize: 12.5 }]} numberOfLines={2}>
            Sobre {leccionTitulo ? 'esta lección' : 'este curso'} y cómo aplicarlo hoy
          </Text>
        </View>
      </Pressable>

      <RenasiaPanel
        agent="COMPANION"
        visible={visible}
        onClose={() => setVisible(false)}
        contexto={contexto}
      />
    </>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  icono: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
