import { registerHooks, createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const root = resolve(process.env.DSH_NATIVE_SDK ?? '.github/sdk/native')
const require = createRequire(resolve(root, 'package.json'))
let resolving = false
registerHooks({
  resolve(specifier, context, next) {
    if (!resolving && specifier.startsWith('@deepseek-ai/')) {
      resolving = true
      try { return { url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true } }
      catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error }
      finally { resolving = false }
    }
    return next(specifier, context)
  },
})
