import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { TituloDeSeccion } from '../../../components/Legible';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { avisar } from '../utils/dialogo';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useDisponibilidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';

/**
 * Lo institucional que se usa de vez en cuando.
 *
 * Acá está lo que HOY se puede hacer desde el teléfono y, con la misma claridad, lo que no. Los
 * paneles de catálogo, alta manual y soporte existen en el backend pero su edición es un
 * formulario largo, pensado para pantalla grande: prometer una entrada que lleva a una pantalla a
 * medias es peor que decir dónde está. El acceso a cursos no se duplica: sigue en Comunidad, que
 * es donde ya vive (ARF-14).
 */
export function MasOpcionesScreen({
  onVolver,
  onAbrirStaff,
  onAbrirGuias,
  onAbrirBienvenida,
  onAbrirImagenesDeFases,
  onAbrirHabitosDelPrograma,
  onAbrirFichas,
  onAbrirPublicacionesOcultas,
}: {
  onVolver: () => void;
  onAbrirStaff: () => void;
  onAbrirGuias: () => void;
  onAbrirBienvenida: () => void;
  onAbrirImagenesDeFases: () => void;
  onAbrirHabitosDelPrograma: () => void;
  onAbrirFichas: () => void;
  onAbrirPublicacionesOcultas: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  /* Spec 002, fase 2: lo que esta cuenta todavía no tiene (despliegue, rol personalizado) no se dibuja. */
  const esDisponible = useDisponibilidad();
  const enLaApp: Array<{ titulo: string; detalle: string; onPress: () => void; clave?: string }> = [
    /* La portada de la tarjeta y los tres mensajes de bienvenida (pedido del dueño del 27/09,
       backend D-210). Vive acá y no en la raíz: se cambia de vez en cuando (A-3). */
    {
      titulo: 'Bienvenida',
      detalle: 'La tarjeta y los mensajes que recibe quien entra al programa',
      onPress: onAbrirBienvenida,
      clave: CLAVES.adminBienvenida,
    },
    /* El animal de cada fase de Yo, con vista previa (pedido del dueño del 06/10, backend D-258). */
    {
      titulo: 'Imágenes de las fases',
      detalle: 'El animal que ve cada aprendiz en Yo, con vista previa',
      onPress: onAbrirImagenesDeFases,
      clave: CLAVES.adminFases,
    },
    /* El catálogo global y a qué roles llega cada hábito (pedido del dueño del 12/10, backend D-264, spec
       001-habitos-por-rol). Los horarios, guías y audioterapias siguen en la web (fila de abajo). */
    {
      titulo: 'Hábitos del programa',
      detalle: 'Crear y editar los hábitos de todos, y elegir a qué roles llega cada uno',
      onPress: onAbrirHabitosDelPrograma,
      clave: CLAVES.adminHabitos,
    },
    /* Las fichas de ingreso: el diagnóstico (armarlo, publicarlo y asignarlo) y la estándar, que solo se nombra (spec 026). Sigue la
       disponibilidad de las personas: asignar una ficha es decidir cómo entra alguien. */
    {
      titulo: 'Fichas',
      detalle: 'El diagnóstico inicial: armarlo, publicarlo y asignarlo a las personas',
      onPress: onAbrirFichas,
      clave: CLAVES.adminPersonas,
    },
    /* Lo que se ocultó del Muro, para devolverlo o eliminarlo para siempre (pedido del dueño del 31/10). Sigue al Muro:
       si el Muro no le toca a esta cuenta, la fila tampoco. */
    {
      titulo: 'Publicaciones ocultas',
      detalle: 'Devolver al Muro lo que se ocultó, o eliminarlo para siempre',
      onPress: onAbrirPublicacionesOcultas,
      clave: CLAVES.muro,
    },
    {
      titulo: 'Equipo y roles',
      detalle: 'Cambiar el rol de una cuenta: aprendiz, guía de aprendiz, mentor, líder, administrador o alquimista',
      onPress: onAbrirStaff,
      clave: CLAVES.adminEquipo,
    },
    /* El guía no es un rol (pedido del dueño del 01/10, backend D-242): va al lado de «Equipo y
       roles» para que se encuentre donde se lo busca. */
    {
      titulo: 'Guías del grupo inicial',
      detalle: 'Quién acompaña los primeros 7 días',
      onPress: onAbrirGuias,
    },
    {
      titulo: 'Cursos y comunidad',
      detalle: 'El catálogo vive en Comunidad, con el reproductor y el muro',
      onPress: () => {
        if (!irAPestana('Comunidad')) {
          avisar('Comunidad', 'Abre la pestaña Comunidad desde la barra de abajo.');
        }
      },
    },
  ];

  /**
   * Lo que NO se abre desde acá.
   *
   * Cada fila lleva su propio `motivo`: la explicación general de arriba se lee una vez y
   * después el ojo salta a las filas, así que el motivo tiene que viajar con la fila. Antes
   * estas cuatro se veían igual que las dos de arriba —misma tarjeta, mismo borde, solo
   * `opacity: 0.85`— y se tocaban esperando que abrieran algo.
   */
  const enLaWeb = [
    {
      titulo: 'Horarios, guías y audioterapias',
      detalle: 'Lo que acompaña a cada hábito del programa',
      motivo: 'Son tramos por día del programa, textos largos y audios por subir.',
    },
    {
      titulo: 'Invitar y editar cuentas',
      detalle: 'Dar de alta a mano y editar los datos de una persona',
      motivo: 'Necesita el alta completa con contraseña temporal y envío de correo.',
    },
    {
      titulo: 'Soporte y tickets',
      detalle: 'Bandeja de soporte y tickets de mentoría',
      motivo: 'Es una bandeja de trabajo con respuestas largas: pide teclado y pantalla.',
    },
    {
      titulo: 'Categorías del muro y conocimiento',
      detalle: 'Las categorías del Muro y la base de conocimiento',
      motivo: 'Son catálogos con textos largos y adjuntos: piden teclado y pantalla grande.',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Más opciones" onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        <View style={{ gap: 10 }}>
          <TituloDeSeccion>Desde acá</TituloDeSeccion>
          {enLaApp.filter(item => esDisponible(item.clave)).map(item => (
            <Pressable
              key={item.titulo}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.titulo}
              style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontWeight: '500' }]}>
                  {item.titulo}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                  {item.detalle}
                </Text>
              </View>
              {/* La flecha es la mitad visual del contraste: lo que se abre la tiene, lo que no
                  se abre lleva un candado. Sin ella la única diferencia sería el borde. */}
              <Icon name="chevron" size={18} color={c.chevron} />
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <TituloDeSeccion>Desde el panel web</TituloDeSeccion>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
            Estas son operaciones con formularios largos. Existen y funcionan, pero desde una
            pantalla grande: acá se listan para que sepas dónde están, no para abrirlas a medias.
          </Text>
          {enLaWeb.map(item => (
            <View
              key={item.titulo}
              accessible
              accessibilityLabel={`${item.titulo}. No se abre desde el teléfono. ${item.motivo}`}
              /* Sin fondo de tarjeta y con el borde punteado: la diferencia se ve de lejos y sin
                 depender del color, que es lo que pedía AGENTS.md §4. `opacity: 0.85` no era una
                 diferencia, era la misma fila un poco más pálida. */
              style={[estilos.fila, estilos.filaInerte, { borderColor: c.border }]}
            >
              <View style={{ paddingTop: 3 }}>
                <Icon name="lock" size={16} color={c.chevron} />
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{item.titulo}</Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                  {item.detalle}
                </Text>
                {/* `c.chevron` y no `c.micro`: el dorado de `micro` es el acento de lo que se
                    puede tocar, y acá diría justo lo contrario de lo que la fila significa. */}
                <Text style={[t.body, { color: c.chevron, fontSize: 16, marginTop: 6, lineHeight: 23 }]}>
                  No se abre desde el teléfono. {item.motivo}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  /** Lo que no se abre: sin fondo de tarjeta, borde punteado y alineado arriba (lleva tres
      líneas de texto, así que centrar dejaba el candado flotando en el medio). */
  filaInerte: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    alignItems: 'flex-start',
  },
});
