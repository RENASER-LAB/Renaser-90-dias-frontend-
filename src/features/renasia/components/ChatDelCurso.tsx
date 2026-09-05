import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { NOMBRE_TUTOR_CURSOS } from '../data/agentes';
import { RenasiaPanel } from '../screens/RenasiaPanel';
import { marcarChatMontado } from '../state/chatEnPantalla';

/**
 * SPARKIE, el tutor de cursos, DENTRO de un curso de "Recursos Exclusivos" (D-99, D-102): un
 * botón al pie de la vista del curso o de la lección, que abre el panel de Sparkie
 * (`agent: 'COURSE_TUTOR'`) acotado a lo que la persona está viendo. Preguntas sobre el curso,
 * sobre la lección del día, o sobre cómo aplicarla — y si la pregunta se sale del contenido, que
 * oriente con lo más cercano en vez de negarse: esa regla vive en el prompt de sistema de Sparkie
 * en el backend (`sparkie-cursos.st`).
 *
 * Es OTRO asistente que el del botón flotante (el acompañante de los 90 días): historial propio,
 * prompt propio, nombre propio. El dueño lo pidió así, textual: "No los juntes en un mismo."
 *
 * El acotamiento viaja al backend como `scope` (D-100) y termina en el prompt de sistema; la
 * pregunta se guarda limpia. `cursoId` acota además el contexto que el backend recupera a las
 * lecciones visibles de ese curso. En el panel se ve como etiqueta, para que la persona sepa
 * sobre qué está hablando.
 */
interface ChatDelCursoProps {
  /** Id del curso (`selectedCourse.id`). Sin él, Sparkie responde con todo lo visible. */
  cursoId?: string | null;
  cursoTitulo: string;
  leccionTitulo?: string | null;
  /** Dia de programa del aprendiz, si la pantalla lo conoce; sirve para "la leccion de hoy". */
  diaPrograma?: number | null;
}

export function ChatDelCurso({ cursoId, cursoTitulo, leccionTitulo, diaPrograma }: ChatDelCursoProps) {
  const { c, t } = useTheme();
  const [visible, setVisible] = useState(false);

  // D-101: mientras este boton exista en pantalla, el flotante del acompanante se esconde. Dos
  // entradas a dos asistentes en la misma vista confunden, y dentro de un curso la correcta es esta.
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
        accessibilityLabel={`Preguntarle a ${NOMBRE_TUTOR_CURSOS} sobre este curso`}
        style={[styles.boton, { borderColor: c.gold, backgroundColor: c.cardBg }]}
      >
        <View style={[styles.icono, { backgroundColor: c.gold }]}>
          <Icon name="chat" size={16} color="#1E1B18" />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>
            Preguntale a {NOMBRE_TUTOR_CURSOS}
          </Text>
          <Text style={[t.small, { color: c.textSoft, fontSize: 12.5 }]} numberOfLines={2}>
            Sobre {leccionTitulo ? 'esta leccion' : 'este curso'} y como aplicarlo hoy
          </Text>
        </View>
      </Pressable>

      <RenasiaPanel
        agent="COURSE_TUTOR"
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
