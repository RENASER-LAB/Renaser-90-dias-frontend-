#!/usr/bin/env node
/**
 * Arregla `react-native-screens` 4.26.x: la app se cerraba sola al arrancar en frío (Android).
 *
 * EL SÍNTOMA (2026-09-29), 3 de 8 arranques en e2e y 4 de 20 en un bucle de arranques en frío,
 * siempre entre 6 y 23 s de vida del proceso, antes o alrededor del login:
 *   Fatal signal 11 (SIGSEGV), code 2 (SEGV_ACCERR), fault addr 0x74ab374687e8 in tid 31668 (mqt_v_js)
 *   #00 pc 00000000000247e8  [anon:scudo:primary]
 *   #01 ... libreactnative.so (facebook::react::MountingCoordinator::pullTransaction(bool) const+713)
 *   #02 ... (facebook::react::FabricUIManagerBinding::schedulerDidFinishTransaction(...)+95)
 *
 * LA CAUSA. `pullTransaction+713` es la llamada virtual
 * `mountingOverrideDelegate->shouldOverridePullTransaction()` (visto con objdump sobre el .so):
 * el delegado ya estaba liberado y su vtable apuntaba al heap. El delegado liberado es el
 * `RNSScreenRemovalListener` de react-native-screens. `ScreensModule.initialize()` registra un
 * LifecycleEventListener y luego llama a `setupFabric()`; como la actividad ya está en resume,
 * RN despacha `onHostResume()` -> `setupFabric()` en el hilo de UI al mismo tiempo. Los dos hilos
 * entran a `NativeProxy::nativeAddMutationsListener`, los dos ven `screenRemovalListener_` nulo
 * y los dos asignan el `shared_ptr` sin candado: queda el puntero de un hilo con el bloque de
 * control del otro. El listener apuntado se libera, pero el `weak_ptr` que guardó el
 * MountingCoordinator sigue "vivo" y el siguiente commit salta a memoria reciclada.
 * Upstream: software-mansion/react-native-screens#4413 (issue #4654), publicado en 4.28.0.
 *
 * EL ARREGLO. Porta #4413 a 4.26.x (Expo 57 fija `~4.26.0`): el listener pasa a ser un
 * singleton de proceso (static local, inicialización thread-safe), el callback se instala con
 * candado y captura la referencia global de Java por valor (nunca `this`), e
 * `invalidateNative()` lo desarma con un token. Es idempotente (deja una marca) y no toca nada
 * si la versión instalada ya trae el arreglo (>= 4.28.0) o si no es 4.26.x.
 */
const fs = require('fs');
const path = require('path');

const MARCA = '// [renaser] listener singleton, backport de react-native-screens#4413 (scripts/arreglar-screens-removal-listener.js)';

const LISTENER_H = `${MARCA}
#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>

#include <cstdint>
#include <functional>
#include <mutex>

using namespace facebook::react;

struct RNSScreenRemovalListener : public MountingOverrideDelegate {
  RNSScreenRemovalListener() = default;

  // RN no tiene removeMountingOverrideDelegate: la instancia vive todo el
  // proceso y solo se cambia su callback. El token evita que el teardown de un
  // proxy viejo desarme el callback de uno nuevo.
  uint64_t setListener(std::function<void(int)> &&listenerFunction);
  void clearListener(uint64_t token);

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;

 private:
  mutable std::mutex listenerMutex_;
  std::function<void(int)> listenerFunction_;
  uint64_t currentToken_{0};
};
`;

const LISTENER_CPP = `${MARCA}
#include "RNSScreenRemovalListener.h"
#include <react/renderer/mounting/ShadowViewMutation.h>
#include <utility>
using namespace facebook::react;

uint64_t RNSScreenRemovalListener::setListener(
    std::function<void(int)> &&listenerFunction) {
  std::lock_guard<std::mutex> lock(listenerMutex_);
  listenerFunction_ = std::move(listenerFunction);
  return ++currentToken_;
}

void RNSScreenRemovalListener::clearListener(uint64_t token) {
  std::lock_guard<std::mutex> lock(listenerMutex_);
  if (token == currentToken_) {
    listenerFunction_ = nullptr;
  }
}

std::optional<MountingTransaction> RNSScreenRemovalListener::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
  std::function<void(int)> listener;
  {
    std::lock_guard<std::mutex> lock(listenerMutex_);
    listener = listenerFunction_;
  }

  if (listener) {
    for (const ShadowViewMutation &mutation : mutations) {
      if (mutation.type == ShadowViewMutation::Type::Remove &&
          mutation.oldChildShadowView.componentName != nullptr &&
          std::strcmp(mutation.oldChildShadowView.componentName, "RNSScreen") ==
              0) {
        listener(mutation.oldChildShadowView.tag);
      }
    }
  }

  return MountingTransaction{
      surfaceId, transactionNumber, std::move(mutations), telemetry};
}

bool RNSScreenRemovalListener::shouldOverridePullTransaction() const {
  return true;
}
`;

const PROXY_H = `${MARCA}
#pragma once

#include <fbjni/fbjni.h>
#include <react/fabric/JFabricUIManager.h>
#include "RNSScreenRemovalListener.h"

#include <cstdint>
#include <mutex>
#include <string>

namespace rnscreens {
using namespace facebook;
using namespace facebook::jni;

class NativeProxy : public jni::HybridClass<NativeProxy> {
 public:
  std::vector<std::weak_ptr<const facebook::react::MountingCoordinator>>
      coordinatorsWithMountingOverrides_;
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/rnscreens/NativeProxy;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

 private:
  friend HybridBase;
  jni::global_ref<NativeProxy::javaobject> javaPart_;

  std::mutex coordinatorsMutex_;

  // Serializa la instalación del callback con invalidateNative.
  std::mutex installMutex_;
  uint64_t removalListenerToken_{0};

  explicit NativeProxy(jni::alias_ref<NativeProxy::javaobject> jThis);

  void nativeAddMutationsListener(
      jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
          fabricUIManager);

  void invalidateNative();

  void cleanupExpiredMountingCoordinators();
  void addMountingCoordinatorIfNeeded(
      const std::shared_ptr<const facebook::react::MountingCoordinator>
          &coordinator);
};

} // namespace rnscreens
`;

const PROXY_CPP = `${MARCA}
#include <fbjni/fbjni.h>
#include <react/fabric/Binding.h>
#include <react/renderer/scheduler/Scheduler.h>

#include <memory>
#include <string>

#include "NativeProxy.h"

using namespace facebook;
using namespace react;

namespace rnscreens {

namespace {
// Singleton de proceso: nativeAddMutationsListener entra desde dos hilos a la
// vez en el arranque en frío (initialize() y onHostResume()). Un static local
// se inicializa de forma thread-safe y la lista de delegados del
// MountingCoordinator es solo-agregar, así que nunca puede quedar colgando.
const std::shared_ptr<RNSScreenRemovalListener> &removalListener() {
  static const std::shared_ptr<RNSScreenRemovalListener> instance =
      std::make_shared<RNSScreenRemovalListener>();
  return instance;
}
} // namespace

NativeProxy::NativeProxy(jni::alias_ref<NativeProxy::javaobject> jThis)
    : javaPart_(jni::make_global(jThis)) {}

void NativeProxy::registerNatives() {
  registerHybrid(
      {makeNativeMethod("initHybrid", NativeProxy::initHybrid),
       makeNativeMethod(
           "nativeAddMutationsListener",
           NativeProxy::nativeAddMutationsListener),
       makeNativeMethod(
           "cleanupExpiredMountingCoordinators",
           NativeProxy::cleanupExpiredMountingCoordinators),
       makeNativeMethod("invalidateNative", NativeProxy::invalidateNative)});
}

void NativeProxy::nativeAddMutationsListener(
    jni::alias_ref<facebook::react::JFabricUIManager::javaobject>
        fabricUIManager) {
  auto uiManager =
      fabricUIManager->getBinding()->getScheduler()->getUIManager();

  {
    // Copia de la referencia global, nunca \`this\`: el listener sobrevive a
    // este NativeProxy.
    std::lock_guard<std::mutex> lock(installMutex_);
    removalListenerToken_ =
        removalListener()->setListener([javaPart = javaPart_](int tag) {
          static const auto method =
              javaPart->getClass()->getMethod<void(jint)>(
                  "notifyScreenRemoved");
          method(javaPart, tag);
        });
  }

  cleanupExpiredMountingCoordinators();

  uiManager->getShadowTreeRegistry().enumerate(
      [this](const facebook::react::ShadowTree &shadowTree, bool &stop) {
        if (auto coordinator = shadowTree.getMountingCoordinator()) {
          addMountingCoordinatorIfNeeded(coordinator);
        }
      });
}

void NativeProxy::cleanupExpiredMountingCoordinators() {
  std::lock_guard<std::mutex> lock(coordinatorsMutex_);

  coordinatorsWithMountingOverrides_.erase(
      std::remove_if(
          coordinatorsWithMountingOverrides_.begin(),
          coordinatorsWithMountingOverrides_.end(),
          [](const std::weak_ptr<const facebook::react::MountingCoordinator>
                 &weakPtr) { return weakPtr.expired(); }),
      coordinatorsWithMountingOverrides_.end());
}

void NativeProxy::addMountingCoordinatorIfNeeded(
    const std::shared_ptr<const facebook::react::MountingCoordinator>
        &coordinator) {
  std::lock_guard<std::mutex> lock(coordinatorsMutex_);

  bool wasRegistered = std::ranges::any_of(
      coordinatorsWithMountingOverrides_,
      [&coordinator](
          const std::weak_ptr<const facebook::react::MountingCoordinator>
              &weakPtr) {
        auto existing = weakPtr.lock();
        return existing && existing.get() == coordinator.get();
      });

  if (!wasRegistered) {
    coordinator->setMountingOverrideDelegate(removalListener());
    coordinatorsWithMountingOverrides_.push_back(coordinator);
  }
}

jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
    jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

void NativeProxy::invalidateNative() {
  std::lock_guard<std::mutex> lock(installMutex_);
  removalListener()->clearListener(removalListenerToken_);
  javaPart_ = nullptr;
}

} // namespace rnscreens
`;

const ARCHIVOS = {
  'cpp/RNSScreenRemovalListener.h': LISTENER_H,
  'cpp/RNSScreenRemovalListener.cpp': LISTENER_CPP,
  'android/src/main/cpp/NativeProxy.h': PROXY_H,
  'android/src/main/cpp/NativeProxy.cpp': PROXY_CPP,
};

/** Devuelve lo que hizo: 'sin-paquete' | 'otra-version' | 'ya-aplicado' | 'aplicado'. */
function aplicar(raiz) {
  const pkg = path.join(raiz, 'package.json');
  if (!fs.existsSync(pkg)) return 'sin-paquete';
  const version = JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
  if (!/^4\.26\./.test(version)) return 'otra-version';
  const proxy = path.join(raiz, 'android/src/main/cpp/NativeProxy.cpp');
  if (fs.readFileSync(proxy, 'utf8').includes(MARCA)) return 'ya-aplicado';
  for (const [relativo, contenido] of Object.entries(ARCHIVOS)) {
    fs.writeFileSync(path.join(raiz, relativo), contenido);
  }
  return 'aplicado';
}

module.exports = { aplicar, MARCA };

if (require.main === module) {
  const raiz = path.join(__dirname, '..', 'node_modules', 'react-native-screens');
  const resultado = aplicar(raiz);
  if (resultado === 'aplicado') {
    console.log('[renaser] react-native-screens: RNSScreenRemovalListener pasado a singleton (#4413)');
  } else if (resultado === 'otra-version') {
    console.log('[renaser] react-native-screens no es 4.26.x: revisa si ya trae #4413 (>= 4.28.0) y quita este script');
  }
}
