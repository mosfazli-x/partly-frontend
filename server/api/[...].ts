export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const target = String(config.apiTarget).replace(/\/$/, '')
  // Keep the destination server-controlled; clients supply only the API path and query.
  return proxyRequest(event, `${target}${event.path.slice('/api'.length)}`)
})
