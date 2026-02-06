const canDebug = process.env.NODE_ENV !== 'production'
const params = new URLSearchParams(window.location.search)

/** True when the `?debug` URL flag is present in a non-production build. */
export const isDebug: boolean = canDebug && params.has('debug')
