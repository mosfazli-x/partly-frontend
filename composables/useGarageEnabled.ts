// Switch for the 3D vehicle garage. The garage and its model assets remain in
// the project; only its surface link is hidden while the archive is incomplete.
// Enable with NUXT_PUBLIC_ENABLE_3D_GARAGE=true (a rebuild/restart is required).
export function useGarageEnabled() {
  const { enable3dGarage } = useAppConfig()
  return computed(() => enable3dGarage === true)
}
