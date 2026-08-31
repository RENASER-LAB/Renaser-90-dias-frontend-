import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

// Tipos para Recursos Exclusivos & Cursos
export type ResourceType = 'video' | 'doc' | 'link' | 'text';

export interface LessonResource {
  id: string;
  type: ResourceType;
  title: string;
  meta: string;
  desc: string;
  content?: string;
  completed: boolean;
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: LessonResource[];
}

export interface CourseItem {
  id: string;
  title: string;
  category: string;
  instructor: string;
  summary: string;
  progressPercent: number;
  totalModules: number;
  totalResources: number;
  sections: CourseSection[];
}

const COURSES_DATA: CourseItem[] = [
  {
    id: 'c1',
    title: 'Mentalidad Inquebrantable & Coherencia Somática',
    category: 'PROGRAMA COMPLETO · INCLUIDO',
    instructor: 'Sebastián Arango',
    summary: 'Aprende a disociar el hecho objetivo de la reacción emocional y hackear el cortisol matutino.',
    progressPercent: 65,
    totalModules: 3,
    totalResources: 7,
    sections: [
      {
        id: 's1',
        title: 'SECCIÓN 1: LA FUNDACIÓN SOMÁTICA',
        lessons: [
          {
            id: 'l1',
            type: 'video',
            title: '1.1 El Observador Consciente y la Verdad',
            meta: '🎥 Video Masterclass HD · 14 min',
            desc: 'Cómo desarticular la narrativa mental automática y responder desde la calma.',
            completed: true,
          },
          {
            id: 'l2',
            type: 'doc',
            title: '1.2 Manual de Tensión Isométrica y Fascia',
            meta: '📄 Documento PDF · 2.4 MB · 18 págs',
            desc: 'Guía ilustrada con posturas de tensión isométrica para regular el sistema nervioso.',
            completed: true,
          },
          {
            id: 'l3',
            type: 'text',
            title: '1.3 El Código del No Juicio en Alto Rendimiento',
            meta: '✍️ Escrito Formativo · 5 min de lectura',
            desc: 'Ensayo de Sebastián Arango sobre la diferencia entre dolor biológico y sufrimiento mental.',
            content:
              'La mayoría de las personas viven atrapadas en su narrativa mental, confundiendo lo que realmente sucedió con la historia que se contaron acerca de lo que sucedió.\n\nEl dolor es un hecho biológico. El sufrimiento es la historia que agregas en tu mente.\n\nEn el protocolo RENASER, tu primera victoria es callar la interpretación y volver al dato puro: ¿Qué pasó realmente? Solo eso. Nada más.',
            completed: true,
          },
        ],
      },
      {
        id: 's2',
        title: 'SECCIÓN 2: ALTA EJECUCIÓN & HERRAMIENTAS',
        lessons: [
          {
            id: 'l4',
            type: 'video',
            title: '2.1 Bloques de Poder Deep Work 90 min',
            meta: '🎥 Video Masterclass · 22 min',
            desc: 'Cómo blindar tu agenda matutina sin distracciones ni celular para avanzar tu Roca #1.',
            completed: false,
          },
          {
            id: 'l5',
            type: 'link',
            title: '2.2 Plantilla de Auditoría 80/20 (Notion / Sheets)',
            meta: '🔗 Enlace a Herramienta Externa',
            desc: 'Hoja interactiva para auditar tus fugas de tiempo y prioridades de alto apalancamiento.',
            completed: false,
          },
          {
            id: 'l6',
            type: 'doc',
            title: '2.3 Checklist Imprimible de Cierre del Día',
            meta: '📄 Documento PDF · 1 pág',
            desc: 'Plantilla para colocar en tu escritorio con los 5 puntos de validación.',
            completed: false,
          },
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Arquitectura Financiera & Alto Apalancamiento',
    category: 'MASTERCLASS ESTRATÉGICA',
    instructor: 'Sebastián Arango',
    summary: 'Sistemas de flujo de caja, ofertas de alto valor y apalancamiento estratégico de tiempo.',
    progressPercent: 20,
    totalModules: 2,
    totalResources: 4,
    sections: [
      {
        id: 's2_1',
        title: 'SECCIÓN 1: AUDITORÍA DE INGRESOS Y GASTOS',
        lessons: [
          {
            id: 'l2_1',
            type: 'video',
            title: '1.1 Flujo de Caja y Desconexión Emocional del Dinero',
            meta: '🎥 Video Masterclass · 28 min',
            desc: 'Principios para tratar el dinero como energía circulante y métrica de servicio.',
            completed: true,
          },
          {
            id: 'l2_2',
            type: 'link',
            title: '1.2 Simulador de Proyecciones Financieras',
            meta: '🔗 Hoja de Cálculo Interactiva',
            desc: 'Herramienta de proyección de escenarios financieros a 12 meses.',
            completed: false,
          },
        ],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Protocolo 05:00 AM · Bioquímica Matutina',
    category: 'WORKSHOP SOMÁTICO',
    instructor: 'Sebastián Arango',
    summary: 'Rutina de activación biológica, luz solar, hidratación y anclaje de enfoque.',
    progressPercent: 0,
    totalModules: 1,
    totalResources: 2,
    sections: [
      {
        id: 's3_1',
        title: 'SECCIÓN 1: EL RITUAL DE PODER',
        lessons: [
          {
            id: 'l3_1',
            type: 'video',
            title: '1.1 Hackeo del Cortisol Matutino',
            meta: '🎥 Video Masterclass · 16 min',
            desc: 'Cómo evitar los picos de estrés y sincronizar el ritmo circadiano.',
            completed: false,
          },
        ],
      },
    ],
  },
];

const SOPORTE: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: 'Eventos &\nExperiencias' },
  { icon: 'stack', label: 'Recursos\nExclusivos' },
  { icon: 'user', label: 'Atención\nPersonalizada' },
];

const METRICAS = [
  { n: '12', label: 'Conversaciones\nesta semana' },
  { n: '3', label: 'Eventos\npróximos' },
  { n: '2', label: 'Mentorías\nprogramadas' },
];

export default function ComunidadScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding } = useResponsive();
  const mentorPhoto = rs(50);
  const avatarSize = rs(42);
  const medallionSize = rs(40);

  // Navegación interna dentro de Comunidad
  const [inExclusiveResources, setInExclusiveResources] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [fullScreenLesson, setFullScreenLesson] = useState<LessonResource | null>(null);

  // Interceptar gestos táctiles de retroceso (Xiaomi / Android / iOS Edge Swipe)
  useSystemBackHandler(() => {
    if (fullScreenLesson !== null) {
      setFullScreenLesson(null);
      return true;
    }
    if (selectedCourse !== null) {
      setSelectedCourse(null);
      return true;
    }
    if (inExclusiveResources) {
      setInExclusiveResources(false);
      return true;
    }
    return false;
  }, inExclusiveResources || selectedCourse !== null || fullScreenLesson !== null);

  const handleSoportePress = (label: string) => {
    if (label.includes('Recursos')) {
      setInExclusiveResources(true);
    } else if (label.includes('Eventos')) {
      Alert.alert('Eventos & Experiencias', 'Próxima llamada de mentoría grupal: Jueves 07:00 PM con Sebastián Arango.');
    } else {
      Alert.alert('Atención Personalizada', 'Abriendo canal de soporte prioritario 1 a 1.');
    }
  };

  const handleCompleteLesson = () => {
    if (fullScreenLesson) {
      fullScreenLesson.completed = true;
      Alert.alert('¡Sesión Completada! 🦅', `Has completado "${fullScreenLesson.title}". Tu avance ha sido actualizado.`);
      setFullScreenLesson(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="COMUNIDAD" right="info" />

      {/* ========================================================================= */}
      {/* VISTA 1: PANTALLA PRINCIPAL DE COMUNIDAD (DISEÑO ORIGINAL LIMPIO)         */}
      {/* ========================================================================= */}
      {!inExclusiveResources && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={[t.sectionTitle, { color: c.text, lineHeight: 21, textAlign: 'center' }]}>
              TU TRIBU. TU SOPORTE.{"\n"}TU LEGADO.
            </Text>
          </View>

          <View style={{ paddingTop: 16 }}>
            <MicroLabel>MENTOR</MicroLabel>
            <View style={[styles.mentor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Placeholder label="FOTO" style={{ width: mentorPhoto, height: mentorPhoto, borderRadius: mentorPhoto / 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>Sebastián Arango</Text>
                <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>Mentor de Alto Rendimiento</Text>
                <Text style={[t.small, { color: c.textSoft, marginTop: 6, fontStyle: 'italic', lineHeight: 18 }]}>
                  “Revisión de tu plan de esta semana.{"\n"}¿Agendamos tu llamada?”
                </Text>
              </View>
              <Icon name="chevron" size={12} color={c.chevron} />
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>TRIBU PRIVADA</MicroLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <Placeholder key={i} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
              ))}
              <View style={[styles.more, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.small, { color: c.textSoft }]}>+12</Text>
              </View>
            </View>
          </View>

          {/* Sección TU SOPORTE (Los 3 Círculos Originales) */}
          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>TU SOPORTE</MicroLabel>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              {SOPORTE.map(s => (
                <Pressable
                  key={s.label}
                  onPress={() => handleSoportePress(s.label)}
                  style={{ flex: 1, alignItems: 'center', gap: 8 }}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.medallion,
                      {
                        width: medallionSize,
                        height: medallionSize,
                        borderRadius: medallionSize / 2,
                        borderColor: s.label.includes('Recursos') ? c.gold : c.border,
                        backgroundColor: s.label.includes('Recursos') ? c.cardBgAlt : c.cardBg,
                      },
                    ]}
                  >
                    <Icon name={s.icon} size={rs(19)} color={c.gold} strokeWidth={1.05} />
                  </View>
                  <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', letterSpacing: 0, fontSize: 9, lineHeight: 13 }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: c.divider, flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }]}>
            <MicroLabel>INTERACCIONES CLAVE</MicroLabel>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {METRICAS.map(m => (
                <View key={m.n} style={[styles.metric, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  <Text style={[t.metric, { color: c.textStrong, fontSize: 22 }]}>{m.n}</Text>
                  <Text style={[t.micro, { color: c.micro, letterSpacing: 0, fontSize: 9, textAlign: 'center', marginTop: 4, lineHeight: 13 }]}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: CATÁLOGO DE RECURSOS EXCLUSIVOS & CURSOS (DENTRO DE TU SOPORTE)  */}
      {/* ========================================================================= */}
      {inExclusiveResources && selectedCourse === null && fullScreenLesson === null && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar para volver a Comunidad */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setInExclusiveResources(false)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A COMUNIDAD
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                RECURSOS EXCLUSIVOS
              </Text>
            </View>
          </View>

          <View style={{ paddingTop: 10, gap: 4 }}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18 }]}>
              CURSOS & PROGRAMAS
            </Text>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
              Masterclasses y recursos avanzados ofrecidos por Sebastián Arango.
            </Text>
          </View>

          {/* Lista de Cursos con Portadas de Imagen */}
          <View style={{ gap: 14, paddingTop: 12, paddingBottom: 24 }}>
            {COURSES_DATA.map(course => (
              <Pressable
                key={course.id}
                onPress={() => setSelectedCourse(course)}
                style={[styles.courseCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                {/* Portada Visual de Imagen */}
                <View style={[styles.courseCoverHeader, { backgroundColor: c.cardBgAlt }]}>
                  <View style={[styles.courseCategoryBadge, { backgroundColor: 'rgba(0,0,0,0.7)', borderColor: c.gold }]}>
                    <Text style={[t.micro, { color: c.gold, fontSize: 9, fontWeight: '800' }]}>
                      {course.category}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 14, marginTop: 14 }]}>
                    {course.title}
                  </Text>
                </View>

                {/* Detalles y Progreso */}
                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 11.5, lineHeight: 16 }]}>
                    {course.summary}
                  </Text>

                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Tu progreso</Text>
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                        {course.progressPercent}%
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: c.gold, width: `${course.progressPercent}%` }]} />
                    </View>
                  </View>

                  <View style={[styles.exploreBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                      EXPLORAR SECCIONES Y RECURSOS ›
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: DENTRO DEL CURSO — SECCIONES CON VIDEOS, PDFS, ENLACES Y ESCRITOS */}
      {/* ========================================================================= */}
      {inExclusiveResources && selectedCourse !== null && fullScreenLesson === null && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar Volver al Catálogo de Cursos */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setSelectedCourse(null)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A CURSOS
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                CONTENIDO DEL CURSO
              </Text>
            </View>
          </View>

          {/* Cabecera del Curso */}
          <View style={[styles.courseHeaderBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
              {selectedCourse.title}
            </Text>
            <Text style={[t.micro, { color: c.micro, marginTop: 2 }]}>
              Por {selectedCourse.instructor} · {selectedCourse.totalModules} Secciones
            </Text>
          </View>

          {/* Secciones y Lecciones del Curso */}
          <View style={{ gap: 14, paddingTop: 10, paddingBottom: 24 }}>
            {selectedCourse.sections.map(section => (
              <View
                key={section.id}
                style={[styles.sectionCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5, borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 6 }]}>
                  {section.title}
                </Text>

                <View style={{ gap: 8, marginTop: 6 }}>
                  {section.lessons.map(lesson => (
                    <Pressable
                      key={lesson.id}
                      onPress={() => setFullScreenLesson(lesson)}
                      style={[
                        styles.lessonItemRow,
                        {
                          borderColor: lesson.completed ? '#4E9F76' : c.border,
                          backgroundColor: lesson.completed ? c.cardBgAlt : c.bg,
                        },
                      ]}
                    >
                      <View style={[styles.resourceTypeIcon, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                        <Icon
                          name={lesson.type === 'video' ? 'play' : lesson.type === 'doc' ? 'doc' : lesson.type === 'link' ? 'spark' : 'doc'}
                          size={14}
                          color={c.gold}
                        />
                      </View>

                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={[t.body, { color: c.textStrong, fontSize: 12.5, fontWeight: '600' }]}>
                          {lesson.title}
                        </Text>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                          {lesson.meta}
                        </Text>
                      </View>

                      <Text style={[t.micro, { color: lesson.completed ? '#4E9F76' : c.gold, fontWeight: '700', fontSize: 10 }]}>
                        {lesson.completed ? '✓ Visto' : 'Abrir ›'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4: SESIÓN A PANTALLA COMPLETA INMERSIVA                              */}
      {/* ========================================================================= */}
      {inExclusiveResources && fullScreenLesson !== null && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar Volver al Curso */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable
              onPress={() => setFullScreenLesson(null)}
              style={styles.backBtnRow}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                SALIR AL CURSO
              </Text>
            </Pressable>

            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 9.5 }]}>
                {fullScreenLesson.type === 'video' ? '🎥 VIDEO MASTERCLASS' : fullScreenLesson.type === 'doc' ? '📄 DOCUMENTO PDF' : fullScreenLesson.type === 'link' ? '🔗 HERRAMIENTA' : '✍️ ESCRITO'}
              </Text>
            </View>
          </View>

          {/* ============================================================= */}
          {/* FORMATO 1: VIDEO MASTERCLASS A PANTALLA COMPLETA              */}
          {/* ============================================================= */}
          {fullScreenLesson.type === 'video' && (
            <View style={{ gap: 14, paddingTop: 10 }}>
              <View style={[styles.videoPlayerBox, { borderColor: c.gold, backgroundColor: '#11100D' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
                  <Text style={[t.micro, { color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}>
                    1080p HD
                  </Text>
                  <Icon name="spark" size={16} color={c.gold} />
                </View>

                <Pressable
                  onPress={() => Alert.alert('Reproductor de Video', `Reproduciendo: ${fullScreenLesson.title}`)}
                  style={[styles.bigPlayBtn, { backgroundColor: c.gold }]}
                >
                  <Icon name="play" size={20} color="#1E1B18" />
                </Pressable>

                <View style={{ padding: 10, gap: 4 }}>
                  <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: c.gold, width: '45%' }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[t.micro, { color: '#C5BEB3', fontSize: 9 }]}>06:18</Text>
                    <Text style={[t.micro, { color: '#C5BEB3', fontSize: 9 }]}>14:00</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.lessonInfoCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16 }]}>
                  {fullScreenLesson.title}
                </Text>
                <Text style={[t.micro, { color: c.gold, marginTop: 2 }]}>
                  {fullScreenLesson.meta}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18, marginTop: 8 }]}>
                  {fullScreenLesson.desc}
                </Text>
              </View>
            </View>
          )}

          {/* ============================================================= */}
          {/* FORMATO 2: ESCRITO FORMATIVO (LECTURA INMERSIVA)              */}
          {/* ============================================================= */}
          {fullScreenLesson.type === 'text' && (
            <View style={{ gap: 14, paddingTop: 10 }}>
              <View style={[styles.readerBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                  LECTURA FORMATIVA
                </Text>
                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 17, marginTop: 4 }]}>
                  {fullScreenLesson.title}
                </Text>
                <Text style={[t.micro, { color: c.micro, marginTop: 2, borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }]}>
                  Por Sebastián Arango · Tiempo estimado: 5 min
                </Text>

                <Text style={[t.body, { color: c.text, fontSize: 13.5, lineHeight: 22, marginTop: 10 }]}>
                  {fullScreenLesson.content || fullScreenLesson.desc}
                </Text>
              </View>
            </View>
          )}

          {/* ============================================================= */}
          {/* FORMATO 3: DOCUMENTO / PDF                                    */}
          {/* ============================================================= */}
          {fullScreenLesson.type === 'doc' && (
            <View style={{ gap: 14, paddingTop: 10 }}>
              <View style={[styles.docPreviewCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <View style={[styles.docLargeMedallion, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="doc" size={32} color={c.gold} />
                </View>

                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, textAlign: 'center', marginTop: 8 }]}>
                  {fullScreenLesson.title}
                </Text>
                <Text style={[t.micro, { color: c.gold, textAlign: 'center' }]}>
                  {fullScreenLesson.meta}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, textAlign: 'center', lineHeight: 18, marginTop: 4 }]}>
                  {fullScreenLesson.desc}
                </Text>

                <GoldButton
                  label="⬇ DESCARGAR DOCUMENTO PDF"
                  onPress={() => Alert.alert('Descargando PDF', `Guardando "${fullScreenLesson.title}" en tu dispositivo.`)}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </View>
            </View>
          )}

          {/* ============================================================= */}
          {/* FORMATO 4: ENLACE / HERRAMIENTA EXTERNA                       */}
          {/* ============================================================= */}
          {fullScreenLesson.type === 'link' && (
            <View style={{ gap: 14, paddingTop: 10 }}>
              <View style={[styles.docPreviewCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <View style={[styles.docLargeMedallion, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="spark" size={32} color={c.gold} />
                </View>

                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, textAlign: 'center', marginTop: 8 }]}>
                  {fullScreenLesson.title}
                </Text>
                <Text style={[t.micro, { color: '#70d2a0', textAlign: 'center' }]}>
                  Acceso a Herramienta Interactiva
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, textAlign: 'center', lineHeight: 18, marginTop: 4 }]}>
                  {fullScreenLesson.desc}
                </Text>

                <GoldButton
                  label="↗ ABRIR ENLACE EN NAVEGADOR"
                  onPress={() => Alert.alert('Abriendo Enlace', `Redirigiendo a: ${fullScreenLesson.title}`)}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </View>
            </View>
          )}

          {/* Acciones de Conclusión */}
          <View style={{ paddingTop: 16, paddingBottom: 24, gap: 10 }}>
            <GoldButton
              label="✓ MARCAR SESIÓN COMO COMPLETADA"
              onPress={handleCompleteLesson}
            />

            <Pressable
              onPress={() => setFullScreenLesson(null)}
              style={[styles.closeSessionBtn, { borderColor: c.border }]}
            >
              <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11, textAlign: 'center' }]}>
                SALIR AL CURSO
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  mentor: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  section: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 14,
  },
  more: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPillBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  courseCard: {
    borderWidth: 1.2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  courseCoverHeader: {
    height: 100,
    padding: 12,
    justifyContent: 'space-between',
  },
  courseCategoryBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  exploreBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  courseHeaderBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  lessonItemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resourceTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayerBox: {
    height: 180,
    borderRadius: 18,
    borderWidth: 1.2,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bigPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  readerBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  docPreviewCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  docLargeMedallion: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSessionBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
});