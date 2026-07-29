import { createXRStore } from '@react-three/xr'

export const xrStore = createXRStore({
  emulate: import.meta.env.DEV ? true : false,
})

if (import.meta.env.DEV) {
  const unsubscribe = xrStore.subscribe((state) => {
    if (state.emulator === undefined) return
    state.emulator.installRuntime({ forceInstall: true })
    unsubscribe()
  })
}
