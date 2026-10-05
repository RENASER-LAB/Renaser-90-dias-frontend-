import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAltoMaximoDelCuerpo } from '../../../components/hojaDesdeAbajo/altoDelCuerpo';
import { useTheme } from '../../../theme/ThemeContext';
import { RESUMEN_MAX_LENGTH, RESUMEN_MIN_LENGTH } from '../api/claseDiariaApi';
import type { ClaseDiariaApi } from '../types/academy.types';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';

/**
 * Cierre de la Clase Diaria: la persona escribe qué entendió de la clase de hoy y recién con eso
 * el hábito queda completado.
 *
 * Las tres reglas que gobiernan este componente, y por qué:
 *
 * 1. **Nada se marca hasta que el envío responde OK.** El estado "completado" NO se toca de forma
 *    optimista. Si la persona cierra el modal sin querer — el gesto lateral del sistema, el botón
 *    de atrás, la ✕ — el hábito sigue pendiente y puede volver a intentarlo desde Training. Esto
 *    no necesita ningún estado intermedio "completado sin resumen": el backend solo cierra el
 *    registro dentro del mismo POST que recibe el resumen.
 * 2. **Cerrar es siempre gratis.** Por eso el gesto de retroceso cierra el modal (lo cablea
 *    `useSystemBackHandler` en la pantalla que lo monta) y nunca la app.
 * 3. **Ya completado = solo lectura.** Si el registro ya vino `COMPLETADO`, no se vuelve a pedir
 *    el resumen: se muestra el que la persona ya escribió. El modal deja de ser un formulario.
 *
 * El largo del resumen lo valida el backend (400 si no cumple); acá se avisa ANTES de mandar para
 * que la persona no escriba y se lleve un error después.
 *
 * ## Hoja desde abajo (rediseño de Training, 2026-10-05)
 *
 * Era una ventana centrada con borde dorado, «CLASE DIARIA» en versalitas, una «›» de texto y
 * «ENVIAR Y COMPLETAR». Ahora es la `HojaDesdeAbajo` de la app, en tipo oración, con el botón fijo
 * abajo. Como una hoja se cierra con un gesto, lo escrito queda de borrador de ESA lección mientras
 * la app está abierta (regla 2: cerrar sigue siendo gratis, y ahora además no borra lo escrito).
 */

/** Lo escrito sin enviar, por lección, mientras la app está abierta. */
const borradores = new Map<string, string>();

/** El botón, en tipo oración y a tamaño de lectura. */
const TEXTO_DE_BOTON = { fontSize: 16, letterSpacing: 0 } as const;
const RESERVA_CABECERA_Y_PIE = 220;

interface ClaseDiariaModalProps {
  visible: boolean;
  /** Qué clase toca hoy. `null` mientras se está pidiendo. */
  clase: ClaseDiariaApi | null;
  cargando: boolean;
  /** Falla del GET de la clase del día — distinta de un error al enviar. */
  error: string | null;
  /**
   * Resumen ya guardado (`respuestaTexto` del track). Si viene, el hábito ya está cerrado y el
   * modal se abre en modo lectura.
   */
  resumenGuardado: string | null;
  enviando: boolean;
  errorEnvio: string | null;
  /** Solo se llama con un resumen que ya pasó la validación de largo. */
  onEnviar: (leccionId: string, resumen: string) => void;
  /** Llevar a la lección del día dentro de Cursos. */
  onIrALaLeccion: (clase: ClaseDiariaApi) => void;
  onCerrar: () => void;
}

export function ClaseDiariaModal({
  visible,
  clase,
  cargando,
  error,
  resumenGuardado,
  enviando,
  errorEnvio,
  onEnviar,
  onIrALaLeccion,
  onCerrar,
}: ClaseDiariaModalProps) {
  const { c, t } = useTheme();
  const altoMaximo = useAltoMaximoDelCuerpo(RESERVA_CABECERA_Y_PIE);
  const [resumen, setResumen] = useState('');
  // Solo se pinta el borde de error DESPUÉS de un intento de envío: marcar en rojo un campo que
  // todavía está vacío porque recién se abrió el modal es hostil, no informativo.
  const [intentoDeEnvio, setIntentoDeEnvio] = useState(false);

  const yaCompletada = Boolean(resumenGuardado && resumenGuardado.trim().length > 0);

  // Se reinicia en cada apertura: el borrador de ayer no debe reaparecer sobre la clase de hoy. El
  // borrador es por LECCIÓN, así que el de otra clase no aparece; el de esta, sí.
  const leccionId = clase?.leccionId ?? null;
  useEffect(() => {
    if (!visible) return;
    setResumen(resumenGuardado ?? (leccionId ? borradores.get(leccionId) : undefined) ?? '');
    setIntentoDeEnvio(false);
  }, [visible, resumenGuardado, leccionId]);

  const cerrar = () => {
    if (leccionId && !resumenGuardado) {
      if (resumen.trim()) borradores.set(leccionId, resumen);
      else borradores.delete(leccionId);
    }
    onCerrar();
  };

  const limpio = resumen.trim();
  const largo = limpio.length;
  const muyCorto = largo < RESUMEN_MIN_LENGTH;
  const puedeEnviar = !muyCorto && largo <= RESUMEN_MAX_LENGTH && !enviando;
  const disponible = clase?.status === 'available' && Boolean(clase.leccionId);

  const handleEnviar = () => {
    setIntentoDeEnvio(true);
    if (!puedeEnviar || !clase?.leccionId) return;
    // Lo enviado ya no es borrador: si el envío falla, la hoja sigue abierta con el texto.
    borradores.delete(clase.leccionId);
    onEnviar(clase.leccionId, limpio);
  };

  const mostrarErrorDeLargo = intentoDeEnvio && muyCorto;

  const pidiendoResumen = !cargando && !error && disponible && Boolean(clase) && !yaCompletada;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={cerrar}
      titulo={clase?.leccionTitulo ?? 'Tu clase de hoy'}
      subtitulo={yaCompletada ? 'Tu resumen de hoy' : 'Clase diaria'}
      etiquetaCerrar="Cerrar la clase diaria"
      pie={
        pidiendoResumen ? (
          <GoldButton
            label="Enviar y completar"
            onPress={handleEnviar}
            loading={enviando}
            disabled={enviando}
            textStyle={TEXTO_DE_BOTON}
            style={{ width: '100%' }}
          />
        ) : undefined
      }
    >
      {/* UN solo contenedor de scroll, con tope de alto: el teclado no tapa el botón. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: altoMaximo }}
        contentContainerStyle={styles.cuerpo}
      >
        {cargando && (
          <View style={styles.centrado}>
            <ActivityIndicator color={c.goldInk} />
            <Text style={[t.body, { color: c.textSoft, marginTop: 10 }]}>
              Buscando tu clase de hoy…
            </Text>
          </View>
        )}

        {!cargando && error && (
          <View style={styles.centrado}>
            <Text style={[t.body, { color: c.text, textAlign: 'center' }]}>{error}</Text>
          </View>
        )}

        {!cargando && !error && clase?.status === 'not_started' && (
          <View style={styles.centrado}>
            <Text style={[t.body, { color: c.text, textAlign: 'center' }]}>
              Todavía no arrancaste tus 90 días, así que aún no hay clase asignada. Cuando
              empiece tu programa, tu clase del día aparece acá.
            </Text>
          </View>
        )}

        {!cargando && !error && clase?.status === 'coming_soon' && (
          <View style={styles.centrado}>
            <Text style={[t.body, { color: c.text, textAlign: 'center' }]}>
              Hoy (día {clase.programDay}) no hay clase publicada. Vuelve mañana.
            </Text>
          </View>
        )}

        {!cargando && !error && disponible && clase && (
          <>
            {/* La clase ya se vio: al tocar el habito sin verla, TrainingScreen navega
                directo a la leccion y este modal no llega a abrirse (ver `abrirClaseDiaria`).
                Este enlace queda como acceso para repasarla, no como el paso previo.
                2026-10-05: el libro de Cursos y un chevron de ícono (era una «›» de texto). */}
            <Presionable
              onPress={() => onIrALaLeccion(clase)}
              accessibilityRole="button"
              accessibilityLabel={`Volver a ver la clase: ${clase.leccionTitulo}`}
              style={[
                styles.enlaceLeccion,
                { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt },
              ]}
            >
              <Icon name="bookOpen" size={TAMANO_ICONO.normal} color={c.goldInk} />
              <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                <Text style={[t.small, { color: c.textSoft }]}>
                  Día {clase.programDay} · {clase.cursoTitulo ?? 'Tu curso'}
                </Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
                  Volver a ver la clase
                </Text>
              </View>
              <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.goldInk} />
            </Presionable>

            {yaCompletada ? (
              /* Paso 2, ya hecho: se muestra lo que escribió, sin volver a pedirlo. */
              <View style={{ marginTop: 16, gap: 8 }}>
                <View style={styles.filaHecho}>
                  <Icon name="checkCircle" size={TAMANO_ICONO.chico} color={c.success} />
                  <Text style={[t.body, styles.rotulo, { color: c.success }]}>Clase completada</Text>
                </View>
                <View
                  style={[
                    styles.resumenLeido,
                    { borderColor: c.border, backgroundColor: c.cardBgAlt },
                  ]}
                >
                  <Text style={[t.body, { color: c.text }]}>{resumenGuardado}</Text>
                </View>
              </View>
            ) : (
              /* Paso 2: contar qué entendió. Sin esto, el hábito NO se cierra. */
              <View style={{ marginTop: 16, gap: 8 }}>
                <Text style={[t.body, styles.rotulo, { color: c.textStrong }]}>
                  ¿Qué entendiste de la clase?
                </Text>
                <Text style={[t.small, { color: c.textSoft }]}>
                  Con tus palabras, lo que te llevas de hoy. Mínimo {RESUMEN_MIN_LENGTH} letras.
                </Text>
                <TextInput
                  value={resumen}
                  onChangeText={setResumen}
                  multiline
                  // El corte duro acá evita que la persona escriba 2500 letras y las pierda
                  // al recibir un 400 del backend.
                  maxLength={RESUMEN_MAX_LENGTH}
                  editable={!enviando}
                  textAlignVertical="top"
                  placeholder="Hoy entendí que…"
                  placeholderTextColor={c.textSoft}
                  accessibilityLabel="Qué entendiste de la clase"
                  style={[
                    styles.input,
                    {
                      borderColor: mostrarErrorDeLargo ? c.danger : c.border,
                      backgroundColor: c.cardBgAlt,
                      color: c.text,
                    },
                  ]}
                />
                <View style={styles.contadorFila}>
                  <Text
                    style={[
                      t.small,
                      {
                        color: mostrarErrorDeLargo ? c.danger : c.textSoft,
                        flexShrink: 1,
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    {mostrarErrorDeLargo
                      ? `Te faltan ${RESUMEN_MIN_LENGTH - largo} letras`
                      : `${largo} / ${RESUMEN_MAX_LENGTH}`}
                  </Text>
                </View>

                {errorEnvio && (
                  <Text style={[t.body, { color: c.danger }]}>
                    {errorEnvio}
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const styles = StyleSheet.create({
  cuerpo: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  rotulo: {
    fontSize: 16,
    fontFamily: 'Jost_500Medium',
  },
  centrado: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  enlaceLeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  filaHecho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Jost_400Regular',
    minHeight: 132,
    width: '100%',
  },
  resumenLeido: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  contadorFila: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
});
