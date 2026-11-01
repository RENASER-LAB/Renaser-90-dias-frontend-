import React, { useState } from 'react';

import type { InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import type { PersonaDeFicha } from '../types/admin.types';
import { AVISO_SI_NO_SE_ABREN_SUS_DIAS, NOMBRE_DEL_GRUPO_SIN_DATO, fichaOfreceSusDias } from '../utils/susDiasYEvidencias';
import { PersonaDelLiderScreen } from '../../lider-mentores/screens/PersonaDelLiderScreen';
import { CajaContenidoScreen } from '../../caja/screens/CajaContenidoScreen';
import { CajaDetalleScreen } from '../../caja/screens/CajaDetalleScreen';
import { CajaListaScreen } from '../../caja/screens/CajaListaScreen';
import { FichasAdminScreen } from '../../diagnostico-admin/screens/FichasAdminScreen';
import { FormacionDetalleAdminScreen } from '../../formaciones/screens/FormacionDetalleAdminScreen';
import { FormacionesAdminScreen } from '../../formaciones/screens/FormacionesAdminScreen';
import { AdminInicioScreen } from './AdminInicioScreen';
import { AnimalDeFaseDetalleScreen } from './AnimalDeFaseDetalleScreen';
import { AnimalesDeFaseAdminScreen } from './AnimalesDeFaseAdminScreen';
import { BienvenidaAdminScreen } from './BienvenidaAdminScreen';
import { useHabitosProgramaAdmin } from '../hooks/useHabitosProgramaAdmin';
import { HabitosProgramaAdminScreen } from './HabitosProgramaAdminScreen';
import { CategoriasDeHabitoAdminScreen } from './CategoriasDeHabitoAdminScreen';
import { HabitoProgramaFormScreen } from './HabitoProgramaFormScreen';
import { useAnimalesDeFaseAdmin } from '../hooks/useAnimalesDeFaseAdmin';
import { FichaAprendizScreen } from './FichaAprendizScreen';
import { GrupoDetalleScreen } from './GrupoDetalleScreen';
import { GrupoFormScreen } from './GrupoFormScreen';
import { GruposAdminScreen } from './GruposAdminScreen';
import { GuiasRecepcionScreen } from './GuiasRecepcionScreen';
import { MasOpcionesScreen } from './MasOpcionesScreen';
import { PersonasAdminScreen } from './PersonasAdminScreen';
import { CodigoRenaserEnFichasAdminScreen } from './CodigoRenaserEnFichasAdminScreen';
import { TerminosAdminScreen } from '../../onboarding/terminos/screens/TerminosAdminScreen';
import { TerminosDeUnaFormacionScreen } from '../../onboarding/terminos/screens/TerminosDeUnaFormacionScreen';
import { EditorDeTerminosScreen } from '../../onboarding/terminos/screens/EditorDeTerminosScreen';
import { PublicacionesOcultasScreen } from './PublicacionesOcultasScreen';
import { SemaforoAdminScreen } from './SemaforoAdminScreen';
import { SemaforoGrupoAdminScreen } from './SemaforoGrupoAdminScreen';
import { SolicitudesAdminScreen } from './SolicitudesAdminScreen';
import { StaffRolesScreen } from './StaffRolesScreen';

/**
 * Administración entera, como una pila de vistas dentro de Hoy.
 *
 * **No es un sexto tab ni un navegador nuevo.** Los cinco tabs no se tocan (AGENTS.md §1), y el
 * rol Mentor ya resolvió esto mismo así: sus pantallas son estado de `HoyScreen`. Repetir ese
 * patrón deja una sola forma de entrar y salir en toda la app.
 *
 * La pila se lleva en una variable y no con un router: son una decena de vistas con un solo
 * camino de ida y vuelta. Cada una registra su `useSystemBackHandler`, así que el gesto lateral sube un nivel —
 * ficha → personas → inicio → Mi programa— en vez de cerrar la app (AGENTS.md §6).
 */
type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'grupos'; formacion?: string | null }
  | { nombre: 'formaciones' }
  | { nombre: 'formacion'; codigo: string }
  | { nombre: 'grupo'; grupoId: string }
  | { nombre: 'grupo-form'; grupoId: string | null }
  | { nombre: 'personas'; soloSinGrupo: boolean; formacion?: string | null }
  | { nombre: 'ficha'; aprendiz: PersonaDeFicha }
  | { nombre: 'solicitudes' }
  | { nombre: 'semaforo' }
  | { nombre: 'semaforo-grupo'; grupoId: string; grupoNombre: string | null; inicio: InicioSemanal; puedeAbrirse: boolean }
  /* Los días y evidencias de una persona (la vista del líder). Desde el semáforo trae la ventana que se miraba; desde
     la ficha, no (abre en la vigente) y `grupoNombre` es null. */
  | {
      nombre: 'persona-semaforo';
      grupoId: string;
      grupoNombre: string | null;
      aprendiz: PersonaDeFicha;
      avatarUrl: string | null;
      inicio?: InicioSemanal;
      /** Se llegó desde el semáforo: ahí «Ver su ficha» es el camino a la ficha. Desde la ficha ya está debajo. */
      conBotonDeFicha: boolean;
    }
  | { nombre: 'staff' }
  | { nombre: 'guias' }
  | { nombre: 'bienvenida' }
  | { nombre: 'animales-fases' }
  | { nombre: 'animal-fase'; numero: number }
  | { nombre: 'habitos-programa' }
  | { nombre: 'habito-programa'; id: string | null }
  | { nombre: 'categorias-habito' }
  | { nombre: 'publicaciones-ocultas' }
  | { nombre: 'codigo-renaser-en-fichas' }
  | { nombre: 'fichas' }
  | { nombre: 'mas' }
  /* Los términos y condiciones editables, uno por formación (spec 027): la lista, los de una formación y su editor. */
  | { nombre: 'terminos' }
  | { nombre: 'terminos-formacion'; codigo: string }
  | { nombre: 'terminos-editor'; codigo: string }
  | { nombre: 'caja' }
  | { nombre: 'caja-detalle'; aprendizId: string }
  | { nombre: 'caja-contenido' };

/** Por dónde entra Administración: la raíz, el semáforo (aviso del sábado) o una caja (aviso de la Caja). */
export type EntradaDeAdmin = 'inicio' | 'semaforo' | { caja: string } | { ficha: PersonaDeFicha };

/** La pila con la que abre: la raíz siempre debajo, para que volver suba y no salga de golpe. */
export function pilaInicial(abrirEn: EntradaDeAdmin): Vista[] {
  if (abrirEn === 'semaforo') return [{ nombre: 'inicio' }, { nombre: 'semaforo' }];
  if (typeof abrirEn === 'object' && 'ficha' in abrirEn) {
    // D-222: desde la info de un chat, «Ver ficha» de un aprendiz (Admin/Alquimista).
    return [{ nombre: 'inicio' }, { nombre: 'ficha', aprendiz: abrirEn.ficha }];
  }
  if (typeof abrirEn === 'object') {
    return [{ nombre: 'inicio' }, { nombre: 'caja' }, { nombre: 'caja-detalle', aprendizId: abrirEn.caja }];
  }
  return [{ nombre: 'inicio' }];
}

/**
 * Tras eliminar la cuenta de alguien desde su ficha (D-243): se vuelve a la lista de Personas. Si la
 * ficha se abrió desde Personas, se saca la ficha (Personas se vuelve a montar y relee el padrón);
 * si se abrió desde otro lado (semáforo, inicio, chat), la ficha se reemplaza por Personas.
 */
export function pilaTrasEliminarCuenta(pila: Vista[]): Vista[] {
  const ultima = pila[pila.length - 1];
  const sinFicha = ultima?.nombre === 'ficha' ? pila.slice(0, -1) : pila;
  /* Si la ficha se abrió desde los días de esa misma persona, tampoco se vuelve a ellos: su cuenta ya no existe. */
  const debajo = sinFicha[sinFicha.length - 1];
  const sinSusDias =
    ultima?.nombre === 'ficha' && debajo?.nombre === 'persona-semaforo' && debajo.aprendiz.id === ultima.aprendiz.id
      ? sinFicha.slice(0, -1)
      : sinFicha;
  if (sinSusDias[sinSusDias.length - 1]?.nombre === 'personas') return sinSusDias;
  return [...sinSusDias, { nombre: 'personas', soloSinGrupo: false }];
}

/**
 * `abrirEn`: por dónde entra. El aviso del sábado (`/semaforo/grupos`) entra directo al semáforo,
 * con la raíz debajo: volver desde ahí sube a Administración, no sale de golpe a Mi programa. El de la
 * Caja Renaser (`/admin/caja/{aprendizId}`, D-219) entra a esa caja, con la lista y la raíz debajo.
 */
export function AdminScreen({ onSalir, abrirEn = 'inicio' }: { onSalir: () => void; abrirEn?: EntradaDeAdmin }) {
  const [pila, setPila] = useState<Vista[]>(() => pilaInicial(abrirEn));
  const vista = pila[pila.length - 1];
  const animalesDeFase = useAnimalesDeFaseAdmin(vista.nombre === 'animales-fases' || vista.nombre === 'animal-fase');
  const habitosDelPrograma = useHabitosProgramaAdmin(vista.nombre === 'habitos-programa');

  const entrar = (siguiente: Vista) => setPila(p => [...p, siguiente]);
  /* Volver desde la raíz sale a Mi programa. Sin este caso, el gesto en la primera pantalla no
     haría nada y el administrador quedaría encerrado en Administración. */
  const volver = () => setPila(p => (p.length > 1 ? p.slice(0, -1) : p));

  switch (vista.nombre) {
    case 'grupos':
      return (
        <GruposAdminScreen
          formacionAlEntrar={vista.formacion ?? null}
          onVolver={volver}
          onAbrirGrupo={grupoId => entrar({ nombre: 'grupo', grupoId })}
          onCrear={() => entrar({ nombre: 'grupo-form', grupoId: null })}
        />
      );
    case 'grupo':
      return (
        <GrupoDetalleScreen
          grupoId={vista.grupoId}
          onVolver={volver}
          onEditar={grupoId => entrar({ nombre: 'grupo-form', grupoId })}
        />
      );
    case 'grupo-form':
      return (
        <GrupoFormScreen
          grupoId={vista.grupoId}
          onVolver={volver}
          onGuardado={grupoId => {
            /* Después de guardar se REEMPLAZA el formulario por el detalle en vez de apilarlo:
               si no, volver desde el detalle traería otra vez el formulario ya enviado. */
            setPila(p => [...p.slice(0, -1), { nombre: 'grupo', grupoId }]);
          }}
        />
      );
    case 'personas':
      return (
        <PersonasAdminScreen
          onVolver={volver}
          soloSinGrupoAlEntrar={vista.soloSinGrupo}
          formacionAlEntrar={vista.formacion ?? null}
          onAbrirFicha={aprendiz => entrar({ nombre: 'ficha', aprendiz })}
        />
      );
    case 'formaciones':
      return <FormacionesAdminScreen onVolver={volver} onAbrir={codigo => entrar({ nombre: 'formacion', codigo })} />;
    case 'formacion':
      return (
        <FormacionDetalleAdminScreen
          codigo={vista.codigo}
          onVolver={volver}
          onVerPersonas={codigo => entrar({ nombre: 'personas', soloSinGrupo: false, formacion: codigo })}
          onVerGrupos={codigo => entrar({ nombre: 'grupos', formacion: codigo })}
          onVerTerminos={codigo => entrar({ nombre: 'terminos-formacion', codigo })}
        />
      );
    case 'ficha':
      return (
        <FichaAprendizScreen
          aprendiz={vista.aprendiz}
          onVolver={volver}
          onAbrirCaja={aprendizId => entrar({ nombre: 'caja-detalle', aprendizId })}
          onCuentaEliminada={() => setPila(pilaTrasEliminarCuenta)}
          onVerSusDias={
            fichaOfreceSusDias(vista.aprendiz, pila[pila.length - 2])
              ? grupoId =>
                  entrar({
                    nombre: 'persona-semaforo',
                    grupoId,
                    grupoNombre: null,
                    aprendiz: vista.aprendiz,
                    avatarUrl: null,
                    conBotonDeFicha: false,
                  })
              : undefined
          }
        />
      );
    case 'caja':
      return (
        <CajaListaScreen
          onVolver={volver}
          onAbrirCaja={aprendizId => entrar({ nombre: 'caja-detalle', aprendizId })}
          onEditarContenido={() => entrar({ nombre: 'caja-contenido' })}
        />
      );
    case 'caja-detalle':
      return <CajaDetalleScreen key={vista.aprendizId} aprendizId={vista.aprendizId} onVolver={volver} />;
    case 'caja-contenido':
      return <CajaContenidoScreen onVolver={volver} />;
    case 'solicitudes':
      return (
        <SolicitudesAdminScreen onVolver={volver} onIrAGrupos={() => entrar({ nombre: 'grupos' })} />
      );
    case 'semaforo':
      return (
        <SemaforoAdminScreen
          onVolver={volver}
          onAbrirGrupo={(grupo, inicio) =>
            entrar({
              nombre: 'semaforo-grupo',
              grupoId: grupo.grupoId,
              grupoNombre: grupo.grupoNombre,
              inicio,
              puedeAbrirse: grupo.puedeAbrirse,
            })
          }
        />
      );
    case 'semaforo-grupo':
      return (
        <SemaforoGrupoAdminScreen
          grupoId={vista.grupoId}
          grupoNombre={vista.grupoNombre}
          inicio={vista.inicio}
          puedeAbrirse={vista.puedeAbrirse}
          onVolver={volver}
          onAbrirAprendiz={aprendiz => entrar({ nombre: 'ficha', aprendiz })}
          onAbrirDiasYEvidencias={({ persona, avatarUrl, inicio }) =>
            entrar({
              nombre: 'persona-semaforo',
              grupoId: vista.grupoId,
              grupoNombre: vista.grupoNombre,
              aprendiz: persona,
              avatarUrl,
              inicio,
              conBotonDeFicha: true,
            })
          }
        />
      );
    case 'persona-semaforo':
      return (
        <PersonaDelLiderScreen
          /* Otra persona es otra cosa que mirar: su lectura y su día abierto desde cero. */
          key={`${vista.grupoId}|${vista.aprendiz.id}`}
          grupoId={vista.grupoId}
          grupoNombre={vista.grupoNombre?.trim() || NOMBRE_DEL_GRUPO_SIN_DATO}
          personaId={vista.aprendiz.id}
          nombre={vista.aprendiz.fullName?.trim() || 'Persona sin nombre'}
          avatarUrl={vista.avatarUrl}
          inicio={vista.inicio}
          onVolver={volver}
          avisoSiNoSeAbre={AVISO_SI_NO_SE_ABREN_SUS_DIAS}
          alAbrirFicha={vista.conBotonDeFicha ? () => entrar({ nombre: 'ficha', aprendiz: vista.aprendiz }) : undefined}
        />
      );
    case 'staff':
      return <StaffRolesScreen onVolver={volver} onAbrirGuias={() => entrar({ nombre: 'guias' })} />;
    case 'guias':
      return <GuiasRecepcionScreen onVolver={volver} />;
    case 'bienvenida':
      return <BienvenidaAdminScreen onVolver={volver} />;
    case 'animales-fases':
      return (
        <AnimalesDeFaseAdminScreen
          estado={animalesDeFase}
          onAbrirFase={numero => entrar({ nombre: 'animal-fase', numero })}
          onVolver={volver}
        />
      );
    case 'animal-fase':
      return <AnimalDeFaseDetalleScreen numero={vista.numero} estado={animalesDeFase} onVolver={volver} />;
    case 'habitos-programa':
      return (
        <HabitosProgramaAdminScreen
          estado={habitosDelPrograma}
          onAbrir={id => entrar({ nombre: 'habito-programa', id })}
          onNuevo={() => entrar({ nombre: 'habito-programa', id: null })}
          onCategorias={() => entrar({ nombre: 'categorias-habito' })}
          onVolver={volver}
        />
      );
    case 'categorias-habito':
      return <CategoriasDeHabitoAdminScreen estado={habitosDelPrograma} onVolver={volver} />;
    case 'habito-programa':
      return <HabitoProgramaFormScreen id={vista.id} estado={habitosDelPrograma} onVolver={volver} />;
    case 'publicaciones-ocultas':
      return <PublicacionesOcultasScreen onVolver={volver} />;
    case 'codigo-renaser-en-fichas':
      return <CodigoRenaserEnFichasAdminScreen onVolver={volver} />;
    case 'terminos':
      return <TerminosAdminScreen onVolver={volver} onAbrir={codigo => entrar({ nombre: 'terminos-formacion', codigo })} />;
    case 'terminos-formacion':
      return (
        <TerminosDeUnaFormacionScreen
          key={vista.codigo}
          formacion={vista.codigo}
          onVolver={volver}
          onEditar={codigo => entrar({ nombre: 'terminos-editor', codigo })}
        />
      );
    case 'terminos-editor':
      return <EditorDeTerminosScreen key={vista.codigo} formacion={vista.codigo} onVolver={volver} />;
    case 'fichas':
      return <FichasAdminScreen onBack={volver} />;
    case 'mas':
      return (
        <MasOpcionesScreen
          onVolver={volver}
          onAbrirStaff={() => entrar({ nombre: 'staff' })}
          onAbrirGuias={() => entrar({ nombre: 'guias' })}
          onAbrirBienvenida={() => entrar({ nombre: 'bienvenida' })}
          onAbrirImagenesDeFases={() => entrar({ nombre: 'animales-fases' })}
          onAbrirHabitosDelPrograma={() => entrar({ nombre: 'habitos-programa' })}
          onAbrirFichas={() => entrar({ nombre: 'fichas' })}
          onAbrirPublicacionesOcultas={() => entrar({ nombre: 'publicaciones-ocultas' })}
          onAbrirCodigoRenaserEnFichas={() => entrar({ nombre: 'codigo-renaser-en-fichas' })}
          onAbrirTerminos={() => entrar({ nombre: 'terminos' })}
        />
      );
    default:
      return (
        <AdminInicioScreen
          onSalir={onSalir}
          onAbrirFicha={aprendiz => entrar({ nombre: 'ficha', aprendiz })}
          onAbrir={seccion => {
            if (seccion === 'grupos') entrar({ nombre: 'grupos' });
            else if (seccion === 'personas') entrar({ nombre: 'personas', soloSinGrupo: false });
            else if (seccion === 'solicitudes') entrar({ nombre: 'solicitudes' });
            else if (seccion === 'semaforo') entrar({ nombre: 'semaforo' });
            else if (seccion === 'formaciones') entrar({ nombre: 'formaciones' });
            else if (seccion === 'mas') entrar({ nombre: 'mas' });
            else if (seccion === 'caja') entrar({ nombre: 'caja' });
          }}
        />
      );
  }
}
