import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { BotonPeligro, BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { mensajeDeError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { avisar, confirmar } from '../../admin/utils/dialogo';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { agregarCuota, asignarPagos, editarCuota, marcarCuota, quitarCuota } from '../api/pagosApi';
import type { CuotaDePago, PagosDeLaPersona as Pagos, PagosEnLaFicha } from '../api/pagosSchemas';
import { usePagosDeLaPersona } from '../hooks/usePagosDeLaPersona';
import { borradorDeUnCronograma, pagoInicial, type PagoParaElPedido } from '../utils/borradorDelCronograma';
import { diaDeUnInstante, hoyDelTelefono } from '../utils/fechasDePago';
import { cuotaVisible, textoDeLaConfirmacion } from '../utils/vistaDeMiIngreso';
import { HojaDeUnaCuota } from './HojaDeUnaCuota';
import { HojaDelCronograma } from './HojaDelCronograma';

type Hoja = { tipo: 'cronograma' } | { tipo: 'cuota'; cuota: CuotaDePago | null } | null;

/**
 * La sección «Pagos» de la ficha de una persona (spec 032, decisión del dueño del 2026-11-01): solo Administración y Alquimista (el servidor responde 403 a
 * cualquier otro rol y entonces no se dibuja). Ver su cronograma, marcar cada cuota «Pagado» o devolverla a «Pendiente» —queda quién y cuándo—, agregar,
 * editar y quitar cuotas pendientes, y asignar un cronograma (o «Sin cronograma») a quien ya estaba dentro sin ninguno. **Nada se recalcula solo.**
 *
 * - Una cuota pagada no se edita ni se quita (el servidor lo hace cumplir con 409): la ficha no ofrece esos botones; para corregirla, «Volver a pendiente».
 * - Con cuotas pagadas tampoco se ofrece reemplazar el cronograma entero ni pasar a «sin cronograma» (409 en el servidor).
 * - Marcar es de un toque, sin confirmación (se deshace con otro toque); lo que borra —una cuota, el cronograma— sí pregunta.
 * - Cada escritura devuelve el pago entero y la sección queda al día sin releer. Un doble toque manda un solo pedido (`ocupado`).
 * - Sin animaciones: es una ficha de trabajo; los toques se hunden con `Presionable` y el resultado se dice en una línea.
 */
export function PagosDeLaPersona({
  personaId,
  nombre,
  alCambiar,
}: {
  personaId: string;
  nombre: string;
  /** Dice en una línea lo que se hizo («Listo: cuota marcada como pagada.»). */
  alCambiar?: (texto: string) => void;
}) {
  const { c, t } = useTheme();
  const funcion = useFuncionalidad(CLAVES.pagos);
  const { lectura, recargar, aplicar } = usePagosDeLaPersona(personaId);
  const [hoja, setHoja] = useState<Hoja>(null);
  const [ocupado, setOcupado] = useState(false);
  /* Un doble toque en el mismo cuadro ve el mismo `ocupado`: la guarda es una referencia, que cambia al instante. */
  const enCurso = useRef(false);
  const hoy = useMemo(() => hoyDelTelefono(), []);

  if (!funcion.disponible || lectura.estado === 'cargando' || lectura.estado === 'oculta') return null;

  if (lectura.estado === 'error') {
    return (
      <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <Titulo />
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>{lectura.mensaje}</Text>
        <BotonSecundario etiqueta="Reintentar" icono="rotateCcw" onPress={() => void recargar()} />
      </View>
    );
  }

  const { pagos } = lectura.datos;
  const conPagadas = pagos?.modo === 'CON_CRONOGRAMA' && pagos.cuotas.some(cuota => cuota.pagada);

  /** Hace un pedido que devuelve el pago entero; un error se dice con las palabras del servidor. */
  const hacer = async (pedido: () => Promise<PagosEnLaFicha>, hecho: string) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    try {
      aplicar(await pedido());
      tacto.logro();
      alCambiar?.(hecho);
    } catch (e) {
      tacto.error();
      avisar('No se pudo', mensajeDeError(e, 'Inténtalo de nuevo.'));
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  };

  const guardarCronograma = async (pago: PagoParaElPedido) => {
    aplicar(await asignarPagos(personaId, pago));
    setHoja(null);
    tacto.logro();
    alCambiar?.(pago.mode === 'NONE' ? `Listo: ${nombre} quedó sin cronograma.` : `Listo: guardaste el cronograma de ${nombre}.`);
  };

  const marcarSinCronograma = async () => {
    if (!(await confirmar(`¿Marcar a ${nombre} sin cronograma?`, 'Quedará como que pagó completo y verá «Tu pago fue cancelado» en Yo.', { ok: 'Marcar' }))) return;
    await hacer(() => asignarPagos(personaId, { mode: 'NONE' }), `Listo: ${nombre} quedó sin cronograma.`);
  };

  const quitar = async (cuota: CuotaDePago, fecha: string) => {
    if (!(await confirmar(`¿Quitar la cuota del ${fecha}?`, 'No se puede deshacer. La persona tendrá que confirmar su cronograma de nuevo.', { ok: 'Quitar', destructivo: true }))) return;
    await hacer(() => quitarCuota(personaId, cuota.id), 'Listo: quitaste la cuota.');
  };

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <Titulo />

      {!pagos ? (
        <>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Todavía no tiene su pago anotado.</Text>
          <BotonPrincipal etiqueta="Asignar un cronograma" icono="calendar" onPress={() => setHoja({ tipo: 'cronograma' })} deshabilitado={ocupado} />
          <BotonSecundario etiqueta="Marcar sin cronograma (pagó completo)" onPress={() => void marcarSinCronograma()} deshabilitado={ocupado} />
        </>
      ) : null}

      {pagos?.modo === 'SIN_CRONOGRAMA' ? (
        <>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>Sin cronograma: pagó completo. Ve «Tu pago fue cancelado» en Yo.</Text>
          <BotonSecundario etiqueta="Armar un cronograma" icono="calendar" onPress={() => setHoja({ tipo: 'cronograma' })} deshabilitado={ocupado} />
        </>
      ) : null}

      {pagos?.modo === 'CON_CRONOGRAMA' ? (
        <>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{lineaDeLaConfirmacion(pagos)}</Text>
          <View style={{ gap: 10 }}>
            {pagos.cuotas.map(cuota => {
              const visible = cuotaVisible(cuota, pagos.moneda, hoy);
              return (
                <View key={cuota.id} style={[estilos.cuota, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <View accessible accessibilityLabel={visible.etiqueta} style={estilos.cuotaFila}>
                    <Icon name="calendar" size={20} color={c.textSoft} />
                    <Text style={[t.body, { color: c.textStrong, fontSize: 17, fontFamily: fuentes.negrita, minWidth: 70 }]}>{visible.fecha}</Text>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 17, flex: 1 }]}>
                      {visible.monto}
                    </Text>
                    <View style={[estilos.pildora, { backgroundColor: cuota.pagada ? c.successWash : c.goldWash }]}>
                      <Icon name={cuota.pagada ? 'check' : 'clock'} size={16} color={cuota.pagada ? c.success : c.goldInk} />
                      <Text style={[t.body, { color: cuota.pagada ? c.success : c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>{visible.estado}</Text>
                    </View>
                  </View>
                  {cuota.marcadaPor || cuota.marcadaEn ? (
                    <Text style={[t.small, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{quienYCuando(cuota)}</Text>
                  ) : null}
                  <View style={estilos.acciones}>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <BotonSecundario
                        etiqueta={cuota.pagada ? 'Volver a pendiente' : 'Marcar pagado'}
                        icono={cuota.pagada ? 'rotateCcw' : 'check'}
                        deshabilitado={ocupado}
                        onPress={() =>
                          void hacer(
                            () => marcarCuota(personaId, cuota.id, !cuota.pagada),
                            cuota.pagada ? 'Listo: la cuota volvió a pendiente.' : 'Listo: cuota marcada como pagada.',
                          )
                        }
                      />
                    </View>
                    {!cuota.pagada ? (
                      <>
                        <Presionable
                          onPress={() => setHoja({ tipo: 'cuota', cuota })}
                          disabled={ocupado}
                          accessibilityRole="button"
                          accessibilityLabel={`Editar la cuota del ${visible.fecha}`}
                          style={[estilos.icono, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
                        >
                          <Icon name="pencil" size={20} color={c.textStrong} />
                        </Presionable>
                        <Presionable
                          onPress={() => void quitar(cuota, visible.fecha)}
                          disabled={ocupado}
                          accessibilityRole="button"
                          accessibilityLabel={`Quitar la cuota del ${visible.fecha}`}
                          style={[estilos.icono, { borderColor: c.danger, backgroundColor: c.cardBg }]}
                        >
                          <Icon name="trash" size={20} color={c.danger} />
                        </Presionable>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
          <BotonSecundario etiqueta="Agregar una cuota" icono="plus" onPress={() => setHoja({ tipo: 'cuota', cuota: null })} deshabilitado={ocupado} />
          {!conPagadas ? (
            <>
              <BotonSecundario etiqueta="Reemplazar el cronograma" icono="calendar" onPress={() => setHoja({ tipo: 'cronograma' })} deshabilitado={ocupado} />
              <BotonPeligro etiqueta="Marcar sin cronograma" onPress={() => void marcarSinCronograma()} deshabilitado={ocupado} />
            </>
          ) : (
            <Text style={[t.small, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
              Con cuotas pagadas no se reemplaza el cronograma entero: edita las pendientes o devuelve una a «Pendiente».
            </Text>
          )}
        </>
      ) : null}

      <HojaDelCronograma
        visible={hoja?.tipo === 'cronograma'}
        nombre={nombre}
        inicial={pagos?.modo === 'CON_CRONOGRAMA' ? borradorDeUnCronograma(pagos.moneda, pagos.cuotas) : { ...pagoInicial(true), modo: 'con' }}
        alCerrar={() => setHoja(null)}
        alGuardar={guardarCronograma}
      />
      <HojaDeUnaCuota
        visible={hoja?.tipo === 'cuota'}
        moneda={pagos?.modo === 'CON_CRONOGRAMA' ? pagos.moneda : null}
        inicial={hoja?.tipo === 'cuota' && hoja.cuota ? { venceEl: hoja.cuota.venceEl, monto: hoja.cuota.monto } : null}
        alCerrar={() => setHoja(null)}
        alGuardar={async cuota => {
          const editada = hoja?.tipo === 'cuota' ? hoja.cuota : null;
          aplicar(editada ? await editarCuota(personaId, editada.id, cuota) : await agregarCuota(personaId, cuota));
          setHoja(null);
          tacto.logro();
          alCambiar?.(editada ? 'Listo: cambiaste la cuota.' : 'Listo: agregaste una cuota.');
        }}
      />
    </View>
  );
}

function Titulo() {
  const { c, t } = useTheme();
  return (
    <Text accessibilityRole="header" style={[t.small, { color: c.textSoft, fontSize: 13 }]}>
      Pagos
    </Text>
  );
}

/** «Con cronograma en dólares (US$). Confirmó el 3 de noviembre.» / «Todavía no confirmó.» / «Confirmó antes, pero el cronograma cambió.» */
function lineaDeLaConfirmacion(pagos: Extract<Pagos, { modo: 'CON_CRONOGRAMA' }>): string {
  const moneda = pagos.moneda === 'USD' ? 'dólares (US$)' : pagos.moneda === 'PEN' ? 'soles (S/)' : null;
  const inicio = moneda ? `Con cronograma en ${moneda}. ` : 'Con cronograma. ';
  const { confirmacion } = pagos;
  if (confirmacion.estado === 'CONFIRMADA') return `${inicio}${textoDeLaConfirmacion(confirmacion.confirmadaEn, confirmacion.nombre).replace('Confirmaste tu', 'Confirmó su')}`;
  if (confirmacion.estado === 'DESACTUALIZADA') return `${inicio}Confirmó antes, pero el cronograma cambió: tiene que confirmarlo de nuevo.`;
  return `${inicio}Todavía no lo confirmó.`;
}

/** «Marcó Ana el 3 de noviembre.» */
function quienYCuando(cuota: CuotaDePago): string {
  const dia = diaDeUnInstante(cuota.marcadaEn);
  const quien = cuota.marcadaPor ? ` ${cuota.marcadaPor}` : '';
  const cuando = dia ? ` el ${dia}` : '';
  return `${cuota.pagada ? 'Marcó pagada:' : 'La devolvió a pendiente:'}${quien}${cuando}.`;
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, width: '100%' },
  cuota: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  cuotaFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: 18 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  icono: { width: 52, height: 52, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
