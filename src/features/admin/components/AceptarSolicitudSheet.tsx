import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { OpcionDeRol } from '../api/adminApi';
import type { OpcionesDeAceptacionApi } from '../api/adminSchemas';
import {
  alElegirDuracion,
  alElegirFicha,
  alElegirRol,
  alMarcarFormacion,
  borradorInicial,
  duracionesParaElegir,
  etiquetaDeLaDuracion,
  frase,
  laUltimaEleccion,
  loQueFalta,
  modoDeFormacionDelRol,
  type BorradorDeAceptacion,
  type PersonaPorAceptar,
} from '../utils/aceptarSolicitud';
import { etiquetaDeLaOpcion, queImplicaLaOpcion } from '../utils/rolesAsignables';
import { BloqueDeAceptacion } from './BloqueDeAceptacion';
import { ChipDeOpcion } from './ChipDeOpcion';

type Bloque = 'formacion' | 'rol' | 'ficha';

/**
 * «Aceptar» una solicitud (o varias) eligiendo, en orden, **formación → duración → rol → ficha**, con una frase de resumen que se confirma
 * (spec 025, backend D-302). Viene marcado lo que casi siempre se elige —Escuela, Aprendiz y sin diagnóstico (025-4 B)—, así que aceptar a un
 * aprendiz de la Escuela son dos toques: «Aceptar» en la solicitud y «Aceptar» en la hoja.
 *
 * - Sin las opciones del servidor (`opciones === null`, un backend anterior) la hoja pide solo el rol y NO manda formaciones: el servidor
 *   viejo las ignoraría y la persona entraría a la Escuela sin que quien la acepta lo sepa.
 * - La hoja no acepta por sí sola: devuelve lo elegido con `alConfirmar` y quien la abre hace el pedido (una o varias solicitudes).
 */
export function AceptarSolicitudSheet({
  visible,
  personas,
  opciones,
  roles,
  enCurso,
  error,
  alCerrar,
  alConfirmar,
}: {
  visible: boolean;
  personas: PersonaPorAceptar[];
  opciones: OpcionesDeAceptacionApi | null;
  roles: OpcionDeRol[];
  /** Se está haciendo el pedido: un texto como «Aceptando 2 de 5…» o `null`. */
  enCurso: string | null;
  /** Lo que salió mal en el último intento (el servidor lo dice con sus palabras). */
  error: string | null;
  alCerrar: () => void;
  alConfirmar: (borrador: BorradorDeAceptacion, rol: OpcionDeRol) => void;
}) {
  const { c, t } = useTheme();
  const [borrador, setBorrador] = useState<BorradorDeAceptacion>(() => borradorInicial(opciones));
  const [abierto, setAbierto] = useState<Bloque | null>(null);

  /* Cada vez que se abre, parte de lo marcado por defecto y con todo cerrado: lo que se eligió para otra persona no se arrastra. */
  useEffect(() => {
    if (visible) {
      setBorrador(borradorInicial(opciones));
      setAbierto(null);
    }
  }, [visible, opciones]);

  const rol = roles.find(r => r.clave === borrador.rolClave) ?? roles[0];
  const modo = modoDeFormacionDelRol(rol?.rolBase ?? 'TRAINEE');
  const falta = rol ? loQueFalta(borrador, modo, opciones) : 'Elige el rol.';
  const quien = personas.length === 1 ? personas[0].nombre : `Las ${personas.length} personas`;
  const resumen = rol ? frase(quien, personas.length > 1, borrador, rol, opciones) : '';
  const laUltima = useMemo(() => (visible ? laUltimaEleccion() : null), [visible]);
  const bloqueado = enCurso !== null;

  const alternar = (bloque: Bloque) => setAbierto(actual => (actual === bloque ? null : bloque));
  const formacionElegida = opciones?.formations.find(f => borrador.formaciones.includes(f.code));
  const duraciones = duracionesParaElegir(borrador, modo, opciones);

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={bloqueado ? () => undefined : alCerrar}
      titulo={personas.length === 1 ? 'Aceptar solicitud' : `Aceptar ${personas.length} solicitudes`}
      subtitulo={personas.length === 1 ? personas[0].nombre : undefined}
      tamano="grande"
      etiquetaCerrar="Cerrar sin aceptar"
      pie={
        <View style={estilos.pie}>
          {falta ? <Text style={[t.small, estilos.aviso, { color: c.textSoft }]}>{falta}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" style={[t.small, estilos.aviso, { color: c.danger }]}>
              {error}
            </Text>
          ) : null}
          <BotonPrincipal
            etiqueta={enCurso ?? (personas.length === 1 ? 'Aceptar' : `Aceptar a ${personas.length} personas`)}
            onPress={() => rol && alConfirmar(borrador, rol)}
            cargando={bloqueado}
            deshabilitado={falta !== null || !rol}
          />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <View style={[estilos.resumen, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
          <Text accessibilityRole="summary" style={[t.body, { color: c.textStrong, fontSize: 17, lineHeight: 24 }]}>
            {resumen}
          </Text>
        </View>

        {laUltima ? (
          <Pressable
            onPress={() => {
              tacto.seleccion();
              setBorrador(laUltima);
            }}
            disabled={bloqueado}
            accessibilityRole="button"
            accessibilityLabel="Usar la misma elección que la última persona aceptada"
            style={[estilos.laMisma, { borderColor: c.border }]}
          >
            <Icon name="rotateCcw" size={16} color={c.goldInk} />
            <Text style={[t.body, { color: c.goldInk, fontSize: 16, flex: 1 }]}>La misma que la última</Text>
          </Pressable>
        ) : null}

        {opciones ? (
          <BloqueDeAceptacion
            numero={1}
            titulo="Formación"
            valor={valorDeLaFormacion(borrador, modo, opciones)}
            abierto={abierto === 'formacion'}
            onAlternar={() => alternar('formacion')}
            deshabilitado={bloqueado}
          >
            {modo === 'ninguna' ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Administración y Alquimista ven las tres formaciones: no hace falta elegir.</Text>
            ) : (
              <>
                <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
                  {modo === 'una' ? 'Un aprendiz entra a una sola formación.' : 'Puedes marcar una o varias.'}
                </Text>
                {opciones.formations.map(formacion => {
                  const marcada = borrador.formaciones.includes(formacion.code);
                  /* Spec 027: una formación sin términos publicados no recibe personas nuevas (nadie podría aceptarlos): se ve, apagada y con el porqué. */
                  const sinTerminos = formacion.termsPublished === false;
                  return (
                    <Pressable
                      key={formacion.code}
                      onPress={() => {
                        tacto.seleccion();
                        setBorrador(b => alMarcarFormacion(b, modo, formacion.code, opciones));
                      }}
                      disabled={bloqueado || sinTerminos}
                      accessibilityRole={modo === 'una' ? 'radio' : 'checkbox'}
                      accessibilityState={{ selected: marcada, checked: marcada, disabled: sinTerminos }}
                      accessibilityLabel={sinTerminos ? `${formacion.name}. Todavía no tiene términos publicados.` : formacion.name}
                      style={[
                        estilos.fila,
                        { borderColor: marcada ? c.gold : c.border, backgroundColor: marcada ? c.goldWash : c.cardBgAlt, opacity: sinTerminos ? 0.6 : 1 },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{formacion.name}</Text>
                        {sinTerminos ? (
                          <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>Todavía no tiene términos publicados.</Text>
                        ) : null}
                      </View>
                      {marcada ? <Icon name="check" size={20} color={c.goldInk} /> : null}
                    </Pressable>
                  );
                })}
                {duraciones.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>¿Cuánto dura su programa?</Text>
                    <View accessibilityRole="radiogroup" accessibilityLabel="Duración del programa" style={estilos.chips}>
                      {duraciones.map(dias => (
                        <ChipDeOpcion
                          key={dias}
                          etiqueta={etiquetaDeLaDuracion(formacionElegida, dias)}
                          activo={borrador.duracionDias === dias}
                          deshabilitado={bloqueado}
                          onPress={() => setBorrador(b => alElegirDuracion(b, dias))}
                        />
                      ))}
                    </View>
                  </View>
                ) : formacionElegida && modo === 'una' && borrador.duracionDias !== null ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                    {`Dura ${etiquetaDeLaDuracion(formacionElegida, borrador.duracionDias)}.`}
                  </Text>
                ) : null}
              </>
            )}
          </BloqueDeAceptacion>
        ) : null}

        <BloqueDeAceptacion
          numero={opciones ? 2 : 1}
          titulo="Rol"
          valor={rol ? rol.nombre : '—'}
          abierto={abierto === 'rol' || (!opciones && abierto === null)}
          onAlternar={() => alternar('rol')}
          deshabilitado={bloqueado}
        >
          <View accessibilityRole="radiogroup" accessibilityLabel="Rol con el que entra" style={estilos.chips}>
            {roles.map(opcion => (
              <ChipDeOpcion
                key={opcion.clave}
                etiqueta={etiquetaDeLaOpcion(opcion)}
                activo={borrador.rolClave === opcion.clave}
                deshabilitado={bloqueado}
                onPress={() => setBorrador(b => alElegirRol(b, opcion, opciones))}
              />
            ))}
          </View>
          {rol ? <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>{queImplicaLaOpcion(rol)}</Text> : null}
        </BloqueDeAceptacion>

        {opciones ? (
          <BloqueDeAceptacion
            numero={3}
            titulo="Ficha de entrada"
            valor={borrador.conDiagnostico ? 'Con diagnóstico' : 'Sin diagnóstico'}
            abierto={abierto === 'ficha'}
            onAlternar={() => alternar('ficha')}
            deshabilitado={bloqueado}
          >
            <OpcionDeFicha
              etiqueta="Sin diagnóstico"
              ayuda="Ve la ficha inicial de siempre."
              marcada={!borrador.conDiagnostico}
              deshabilitada={bloqueado}
              onElegir={() => setBorrador(b => alElegirFicha(b, false))}
            />
            <OpcionDeFicha
              etiqueta="Con diagnóstico"
              ayuda={
                opciones.diagnosisAvailable
                  ? 'Ve el diagnóstico en lugar de la ficha inicial.'
                  : 'Todavía no hay un diagnóstico publicado.'
              }
              marcada={borrador.conDiagnostico}
              deshabilitada={bloqueado || !opciones.diagnosisAvailable}
              onElegir={() => setBorrador(b => alElegirFicha(b, true))}
            />
          </BloqueDeAceptacion>
        ) : null}
      </View>
    </HojaDesdeAbajo>
  );
}

function valorDeLaFormacion(borrador: BorradorDeAceptacion, modo: ReturnType<typeof modoDeFormacionDelRol>, opciones: OpcionesDeAceptacionApi): string {
  if (modo === 'ninguna') return 'Ve las tres';
  if (borrador.formaciones.length === 0) return 'Sin elegir';
  const nombres = borrador.formaciones.map(codigo => opciones.formations.find(f => f.code === codigo)?.name ?? codigo).join(' y ');
  const unica = opciones.formations.find(f => f.code === borrador.formaciones[0]);
  const duracion = modo === 'una' && borrador.duracionDias !== null && unica && unica.durationsDays.length > 1 ? ` · ${etiquetaDeLaDuracion(unica, borrador.duracionDias)}` : '';
  return `${nombres}${duracion}`;
}

function OpcionDeFicha({
  etiqueta,
  ayuda,
  marcada,
  deshabilitada,
  onElegir,
}: {
  etiqueta: string;
  ayuda: string;
  marcada: boolean;
  deshabilitada: boolean;
  onElegir: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tacto.seleccion();
        onElegir();
      }}
      disabled={deshabilitada}
      accessibilityRole="radio"
      accessibilityState={{ selected: marcada, disabled: deshabilitada }}
      accessibilityLabel={`${etiqueta}. ${ayuda}`}
      style={[estilos.fila, { borderColor: marcada ? c.gold : c.border, backgroundColor: marcada ? c.goldWash : c.cardBgAlt, opacity: deshabilitada && !marcada ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{etiqueta}</Text>
        <Text style={[t.small, { color: c.textSoft, fontSize: 15, fontFamily: fuentes.regular }]}>{ayuda}</Text>
      </View>
      {marcada ? <Icon name="check" size={20} color={c.goldInk} /> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  aviso: { fontSize: 15, lineHeight: 21 },
  resumen: { borderWidth: 1, borderRadius: 14, padding: 14 },
  laMisma: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderRadius: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
