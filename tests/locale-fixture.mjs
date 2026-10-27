/** Flat dictionary contract double. It is not the official Host LocaleRuntime.
 * Set DSH_SOURCE_ROOT to run the same UI tests with the unchanged official runtime.
 */
class FlatLocale {
  constructor(language) { this.language = language; this.tables = new Map() }
  register(namespace, dictionaries) {
    this.tables.set(namespace, dictionaries)
    return () => this.tables.delete(namespace)
  }
  bind(namespace) {
    return key => {
      const tables = this.tables.get(namespace)
      const value = tables?.[this.language]?.[key] ?? tables?.en?.[key]
      return typeof value === 'string' ? value : key
    }
  }
}
const official = process.env.DSH_SOURCE_ROOT ? await import('./official-locale-fixture.mjs') : null
export const localeSourceEvidence = official?.localeSourceEvidence ?? { kind: 'flat-dictionary-contract-double', hostIntegration: false }
export function createLocale(language) { return official ? official.actualLocale(language) : new FlatLocale(language) }
