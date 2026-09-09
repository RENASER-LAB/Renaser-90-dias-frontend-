import React, { useEffect, useState } from 'react';
import { Alert as AlertNativo, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Reemplazo de `Alert` de React Native que TAMBIEN funciona en la web.
 *
 * POR QUE EXISTE (E-144)
 *
 * `Alert` de `react-native-web` no esta implementado. No es que se vea distinto ni que le falten
 * opciones: la clase entera es esto, textual, en `react-native-web/dist/exports/Alert/index.js`:
 *
 *     class Alert { static alert() {} }
 *
 * Un metodo vacio. No dibuja nada, no lanza ningun error, y —lo que de verdad rompe— **nunca
 * ejecuta los `onPress` de los botones**. Cualquier accion que el codigo pusiera detras de una
 * confirmacion quedaba muerta en el build web, en silencio absoluto: sin dialogo, sin error en la
 * consola, sin nada que mirar. El sintoma que lo destapo fue el interruptor de pausar un habito en
 * el Plan: se tocaba y no pasaba nada, ni siquiera se movia.
 *
 * COMO SE COMPORTA
 *
 * - **En movil no cambia absolutamente nada**: delega en el `Alert` nativo, tal cual, con los
 *   mismos argumentos. Los dialogos siguen siendo los del sistema operativo.
 * - **En web** dibuja un dialogo propio con los mismos botones y ejecuta sus `onPress`.
 *
 * La firma es la misma que la de React Native a proposito, para que migrar un archivo sea cambiar
 * el `import` y nada mas. No se renombro a algo como `mostrarAlerta` justamente para que las ~99
 * llamadas que ya existen no haya que reescribirlas una por una.
 *
 * COMO SE USA
 *
 *     // antes:  import { Alert } from 'react-native';
 *     import { Alert } from '../components/Alerta';
 *
 * Y `<AnfitrionAlerta />` tiene que estar montado una vez cerca de la raiz (ver `App.tsx`). Si no
 * lo esta, las alertas de web no se pierden: quedan en cola y se muestran apenas se monte.
 */

export type BotonAlerta = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type Pedido = {
  titulo: string;
  mensaje?: string;
  botones: BotonAlerta[];
};

/**
 * El anfitrion se registra aca al montarse. Mientras no exista, los pedidos se acumulan en
 * `pendientes` en vez de perderse — importante porque una alerta puede dispararse durante el
 * arranque, antes de que el arbol de React termine de montar.
 */
let publicar: ((pedido: Pedido) => void) | null = null;
const pendientes: Pedido[] = [];

function encolar(pedido: Pedido) {
  if (publicar) publicar(pedido);
  else pendientes.push(pedido);
}

export const Alert = {
  alert(titulo: string, mensaje?: string, botones?: BotonAlerta[]): void {
    if (Platform.OS !== 'web') {
      AlertNativo.alert(titulo, mensaje, botones);
      return;
    }
    // Sin botones, React Native muestra un unico "OK". Se replica para que el dialogo de web
    // nunca quede sin forma de cerrarse.
    encolar({ titulo, mensaje, botones: botones && botones.length > 0 ? botones : [{ text: 'OK' }] });
  },
};

/**
 * Dibuja la alerta de web. Va montado una sola vez, cerca de la raiz.
 *
 * En movil devuelve `null`: ahi las alertas las dibuja el sistema operativo y este componente no
 * pinta nada.
 */
export function AnfitrionAlerta() {
  const { c, t } = useTheme();
  const [cola, setCola] = useState<Pedido[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    publicar = pedido => setCola(previa => [...previa, pedido]);
    if (pendientes.length > 0) {
      setCola(previa => [...previa, ...pendientes.splice(0)]);
    }
    return () => {
      publicar = null;
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  const actual = cola[0];
  if (!actual) return null;

  const cerrar = () => setCola(previa => previa.slice(1));

  const pulsar = (boton: BotonAlerta) => {
    // Se cierra ANTES de ejecutar la accion: si el `onPress` abre otra alerta (pasa, por ejemplo
    // al confirmar algo y avisar el resultado), la segunda tiene que quedar detras de esta en la
    // cola y no competir con ella por la misma posicion.
    cerrar();
    boton.onPress?.();
  };

  /**
   * Cerrar con Escape o tocando fuera equivale a elegir "cancelar", que es lo que hace el dialogo
   * nativo. Si no hay un boton marcado como `cancel`, se cierra sin ejecutar nada — nunca se
   * dispara una accion que la persona no eligio.
   */
  const descartar = () => {
    const cancelar = actual.botones.find(b => b.style === 'cancel');
    cerrar();
    cancelar?.onPress?.();
  };

  // Dos botones entran comodos en una fila; de tres para arriba se apilan, si no el texto de cada
  // uno queda ilegible. Es el mismo criterio que usan los dialogos del sistema.
  const enColumna = actual.botones.length > 2;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={descartar}>
      <Pressable style={styles.fondo} onPress={descartar}>
        {/* Este Pressable interior come el toque para que tocar DENTRO del cuadro no lo cierre. */}
        {/* El fondo va con `c.bg`, que es OPACO en los dos temas, y no con `c.cardBgAlt`: en
            oscuro ese token es `rgba(255,255,255,0.07)` y dejaba ver la pantalla de atras a
            traves del dialogo, con los textos encimados y el cuadro ilegible. Una tarjeta dentro
            de la pantalla puede ser translucida; un dialogo que tapa a la pantalla, no. */}
        <Pressable
          style={[styles.cuadro, { backgroundColor: c.bg, borderColor: c.borderStrong }]}
          onPress={() => {}}
        >
          <Text style={[t.cardTitle, { color: c.textStrong }]}>{actual.titulo}</Text>

          {!!actual.mensaje && (
            <Text style={[t.small, { color: c.textSoft, lineHeight: 19, marginTop: 8 }]}>
              {actual.mensaje}
            </Text>
          )}

          <View style={[styles.botones, enColumna ? styles.botonesColumna : styles.botonesFila]}>
            {actual.botones.map((boton, i) => {
              const esCancelar = boton.style === 'cancel';
              const esDestructivo = boton.style === 'destructive';
              return (
                <Pressable
                  key={`${boton.text ?? 'boton'}-${i}`}
                  onPress={() => pulsar(boton)}
                  style={[
                    styles.boton,
                    enColumna ? styles.botonAncho : styles.botonFlexible,
                    {
                      borderColor: esCancelar ? c.border : c.borderStrong,
                      backgroundColor: esCancelar ? 'transparent' : c.cardBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      t.sectionTitle,
                      { color: esDestructivo ? c.danger : esCancelar ? c.textSoft : c.micro },
                    ]}
                    numberOfLines={1}
                  >
                    {(boton.text ?? 'OK').toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cuadro: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  botones: { marginTop: 18, gap: 8 },
  botonesFila: { flexDirection: 'row', justifyContent: 'flex-end' },
  botonesColumna: { flexDirection: 'column' },
  boton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonFlexible: { minWidth: 96 },
  botonAncho: { width: '100%' },
});
