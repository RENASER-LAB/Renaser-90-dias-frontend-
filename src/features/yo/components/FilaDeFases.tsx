import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Icon } from '../../../components/Icon';
import { EmblemaDeFase } from './EmblemaDeFase';
import { type FaseConAnimal } from '../utils/estadoDeLasFases';

const DICHO: Record<FaseConAnimal['estado'], string> = {
  lograda: 'superada',
  actual: 'tu fase actual',
  futura: 'todavía no llegas',
};

/**
 * Los cuatro animales en fila, uno por fase: los de las fases pasadas a color y con una marca de
 * superada, el de la actual con aro dorado, y los que vienen como silueta tenue. Es un mapa del
 * camino, no un control: no se toca.
 */
export function FilaDeFases({ fases }: { fases: FaseConAnimal[] }) {
  const { c, t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {fases.map(fase => (
        <View
          key={fase.clave}
          accessible
          accessibilityLabel={`Fase ${fase.numero}, ${fase.animal.nombre}, ${DICHO[fase.estado]}`}
          style={{ flex: 1, alignItems: 'center', gap: 6 }}
        >
          <View>
            <EmblemaDeFase animal={fase.animal} estado={fase.estado} tamano={52} />
            {fase.estado === 'lograda' ? (
              <View
                style={{
                  position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9,
                  backgroundColor: c.success, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="check" size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <Text style={[t.small, { color: fase.estado === 'futura' ? c.micro : c.textStrong, opacity: fase.estado === 'futura' ? 0.7 : 1 }]}>
            {fase.animal.nombre}
          </Text>
          <Text style={[t.small, { color: c.micro, fontSize: 11 }]}>Fase {fase.numero}</Text>
        </View>
      ))}
    </View>
  );
}
