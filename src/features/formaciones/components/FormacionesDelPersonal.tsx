import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { asignarFormaciones } from '../api/formacionesApi';
import { useFormacionDeUnaPersona } from '../hooks/useFormacionDeUnaPersona';
import { CODIGOS_DE_FORMACION } from '../types/formaciones.types';
import {
  alternarFormacion,
  errorDeLaSeleccion,
  haCambiado,
  seleccionInicial,
  type SeleccionDelPersonal,
} from '../utils/formacionesDelPersonal';
import { nombreLargoDeFormacion } from '../utils/nombreDeFormacion';

/**
 * «Formaciones en las que trabaja» (Equipo y roles, spec 022): Administración marca una o más para un mentor, una guía o un líder y
 * elige cuál queda activa. Rige en el siguiente movimiento de la persona. Si el servidor no la ofrece (un backend anterior), la
 * sección no se dibuja. Si la persona lidera un grupo en una formación que se le quita, el servidor lo impide y dice cuál grupo.
 */
export function FormacionesDelPersonal({ personaId, nombre }: { personaId: string; nombre: string }) {
  const { c, t } = useTheme();
  const { datos, disponible, recargar } = useFormacionDeUnaPersona(personaId);
  const [inicial, setInicial] = useState<SeleccionDelPersonal | null>(null);
  const [seleccion, setSeleccion] = useState<SeleccionDelPersonal | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!datos) return;
    const leida = seleccionInicial(datos.formacionesDelPersonal);
    setInicial(leida);
    setSeleccion(leida);
  }, [datos]);

  if (!disponible || !seleccion || !inicial) return null;
  const falta = errorDeLaSeleccion(seleccion);
  const cambio = haCambiado(inicial, seleccion);

  const guardar = async () => {
    if (falta || !cambio || guardando) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await asignarFormaciones(personaId, seleccion.marcadas, seleccion.activa);
      tacto.logro();
      setMensaje({ texto: 'Listo: rige en el próximo movimiento de la persona.', error: false });
      await recargar();
    } catch (e) {
      tacto.error();
      setMensaje({ texto: mensajeDeError(e, 'No pudimos guardar las formaciones. Inténtalo de nuevo.'), error: true });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={[estilos.caja, { borderColor: c.border }]}>
      <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Formaciones en las que trabaja {nombre}</Text>
      {CODIGOS_DE_FORMACION.map(codigo => {
        const marcada = seleccion.marcadas.includes(codigo);
        const activa = seleccion.activa === codigo;
        return (
          <View key={codigo} style={estilos.fila}>
            <Pressable
              onPress={() => {
                tacto.seleccion();
                setSeleccion(s => (s ? alternarFormacion(s, codigo) : s));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcada }}
              accessibilityLabel={nombreLargoDeFormacion(codigo)}
              style={[estilos.opcion, { borderColor: marcada ? c.goldInk : c.border, backgroundColor: marcada ? c.goldWash : 'transparent' }]}
            >
              <Text style={[t.body, { color: marcada ? c.goldInk : c.textSoft, fontSize: 16, fontFamily: marcada ? fuentes.negrita : fuentes.regular }]}>
                {marcada ? '✓ ' : ''}
                {nombreLargoDeFormacion(codigo)}
              </Text>
            </Pressable>
            {marcada && seleccion.marcadas.length > 1 ? (
              <Pressable
                onPress={() => {
                  tacto.seleccion();
                  setSeleccion(s => (s ? { ...s, activa: codigo } : s));
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={activa ? `${nombreLargoDeFormacion(codigo)} es la activa` : `Dejar ${nombreLargoDeFormacion(codigo)} como activa`}
                style={estilos.activa}
              >
                <Text style={[t.small, { color: activa ? c.goldInk : c.textSoft, fontSize: 14, fontFamily: activa ? fuentes.negrita : fuentes.regular }]}>
                  {activa ? 'Activa' : 'Dejar activa'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {falta ? <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>{falta}</Text> : null}
      {mensaje ? (
        <Text accessibilityRole={mensaje.error ? 'alert' : undefined} style={[t.small, { color: mensaje.error ? c.danger : c.textSoft, fontSize: 15 }]}>
          {mensaje.texto}
        </Text>
      ) : null}
      <BotonSecundario etiqueta="Guardar formaciones" onPress={() => void guardar()} cargando={guardando} deshabilitado={falta !== null || !cambio} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: 8, borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  rotulo: { fontSize: 13, fontFamily: fuentes.negrita },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  opcion: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexGrow: 1, flexShrink: 1 },
  activa: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 8 },
});
