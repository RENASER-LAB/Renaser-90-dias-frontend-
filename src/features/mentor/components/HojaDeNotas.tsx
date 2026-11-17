import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../../components/FormField';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { LARGO_MAXIMO_DE_LA_NOTA, type NotaDelMentor } from '../api/mentorApi';
import { fechaDeLaNota, validarNota } from '../utils/validarNota';

/** La aclaración de quién ve las notas (FR-027): la del mentor que escribe y la de quien solo lee. */
export const ACLARACION_DEL_MENTOR = 'Solo la ven tú, tu líder y Administración';
export const ACLARACION_DE_LECTURA = 'Solo las ven el mentor, su líder y Administración';

/**
 * La hoja de notas privadas sobre un aprendiz (spec 055 FR-023 a FR-027): el título «Nota sobre <nombre>», la aclaración de quién la
 * ve, el campo, el botón «Guardar nota» y, debajo, las notas anteriores de la más nueva a la más vieja con su fecha y su autor.
 *
 * - El mentor que acompaña hoy escribe; el líder y Administración (`soloLectura`) solo leen: sin campo ni botón.
 * - Una nota propia de hoy se corrige (`puedeCorregir` lo dice el servidor); las demás, solo se leen. Ninguna se borra.
 * - Vacía o de más de 2000 caracteres no se guarda y dice qué falta. Un toque, un pedido (`guardando` apaga el botón). Si no se
 *   pudo guardar, el texto queda en el campo y se dice por qué.
 * - Se cierra deslizando, con el atrás del sistema o con la ✕ (`HojaDesdeAbajo`).
 */
export function HojaDeNotas({
  visible,
  alCerrar,
  nombre,
  soloLectura,
  notas,
  cargando,
  fallo,
  guardando,
  falloAlGuardar,
  onGuardar,
  onCorregir,
}: {
  visible: boolean;
  alCerrar: () => void;
  nombre: string;
  soloLectura: boolean;
  notas: NotaDelMentor[];
  cargando: boolean;
  fallo: string | null;
  guardando: boolean;
  falloAlGuardar: string | null;
  onGuardar: (texto: string) => Promise<boolean>;
  onCorregir: (notaId: string, texto: string) => Promise<boolean>;
}) {
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={`Nota sobre ${nombre}`}
      subtitulo={soloLectura ? ACLARACION_DE_LECTURA : ACLARACION_DEL_MENTOR}
      tamano="grande"
      etiquetaCerrar="Cerrar las notas"
    >
      <Cuerpo
        nombre={nombre}
        soloLectura={soloLectura}
        notas={notas}
        cargando={cargando}
        fallo={fallo}
        guardando={guardando}
        falloAlGuardar={falloAlGuardar}
        onGuardar={onGuardar}
        onCorregir={onCorregir}
      />
    </HojaDesdeAbajo>
  );
}

function Cuerpo({
  nombre,
  soloLectura,
  notas,
  cargando,
  fallo,
  guardando,
  falloAlGuardar,
  onGuardar,
  onCorregir,
}: Omit<Parameters<typeof HojaDeNotas>[0], 'visible' | 'alCerrar'>) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [falta, setFalta] = useState<string | null>(null);

  const guardar = async () => {
    if (guardando) return;
    const error = validarNota(texto);
    setFalta(error);
    if (error) return;
    const salio = corrigiendo ? await onCorregir(corrigiendo, texto) : await onGuardar(texto);
    if (salio) {
      setTexto('');
      setCorrigiendo(null);
    }
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 16, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {soloLectura ? null : (
        <View style={{ gap: 10 }}>
          <FormField
            label={corrigiendo ? 'Corregir nota' : 'Nota'}
            value={texto}
            onChangeText={valor => {
              setTexto(valor);
              if (falta) setFalta(validarNota(valor));
            }}
            placeholder={`Qué hablaste con ${nombre}, qué acordaron…`}
            multiline
            numberOfLines={4}
            error={falta}
            mensajeDeErrorAparte
            accessibilityLabel={`Nota sobre ${nombre}`}
          />
          {falta ? <Text style={[t.body, { color: c.danger, fontSize: 15 /* metadato */}]}>{falta}</Text> : null}
          {falloAlGuardar ? <Text style={[t.body, { color: c.danger, fontSize: 15 /* metadato */}]}>{falloAlGuardar}</Text> : null}
          <Text style={[t.body, { color: c.textSoft, fontSize: 14 /* metadato */, textAlign: 'right', fontVariant: ['tabular-nums'] }]}>
            {texto.trim().length} / {LARGO_MAXIMO_DE_LA_NOTA}
          </Text>
          <BotonPrincipal etiqueta={corrigiendo ? 'Guardar corrección' : 'Guardar nota'} onPress={() => void guardar()} cargando={guardando} deshabilitado={guardando} />
          {corrigiendo ? (
            <Presionable
              onPress={() => {
                setCorrigiendo(null);
                setTexto('');
                setFalta(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar la corrección"
              style={estilos.cancelar}
            >
              <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>Cancelar la corrección</Text>
            </Presionable>
          ) : null}
        </View>
      )}

      {cargando && notas.length === 0 ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */}]}>Cargando las notas…</Text> : null}
      {fallo && notas.length === 0 ? <Text style={[t.body, { color: c.danger, fontSize: 15 /* metadato */}]}>{fallo}</Text> : null}
      {!cargando && !fallo && notas.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */}]}>
          {soloLectura ? `Todavía no hay notas sobre ${nombre}.` : `Todavía no escribiste notas sobre ${nombre}.`}
        </Text>
      ) : null}

      {notas.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={[t.body, { color: c.textStrong, fontFamily: fuentes.negrita, fontSize: 15 /* metadato */}]}>
            Notas anteriores
          </Text>
          {notas.map((n, i) => (
            <View key={n.id} style={[estilos.nota, i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null]}>
              <Text style={[t.body, { color: c.textSoft, fontSize: 14 /* metadato */}]}>
                {fechaDeLaNota(n.creadoEn)} · {n.autor.nombre ?? 'Mentor'}
                {n.corregidoEn ? ' · corregida' : ''}
              </Text>
              <Text selectable style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22 }]}>
                {n.texto}
              </Text>
              {n.puedeCorregir && !soloLectura ? (
                <Presionable
                  onPress={() => {
                    setCorrigiendo(n.id);
                    setTexto(n.texto);
                    setFalta(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Corregir la nota del ${fechaDeLaNota(n.creadoEn)}`}
                  style={estilos.corregir}
                >
                  <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 15 /* metadato */}]}>Corregir</Text>
                </Presionable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  nota: { paddingVertical: 10, gap: 2 },
  corregir: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  cancelar: { minHeight: 48, justifyContent: 'center', alignSelf: 'center' },
});
