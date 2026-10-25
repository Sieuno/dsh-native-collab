import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require=createRequire(import.meta.url)
const protocol=pathToFileURL(require.resolve('@deepseek-ai/dsh-typert-protocol')).href
// Legacy status unit tests isolate the Service and decorator only. Preserve the
// real public RemoteError class so input failures test its cross-realm contract.
export function isolatedCollabService(source) {
 return source.replace("import { Context } from '@deepseek-ai/cordis'\n",'')
  .replace("import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'\n",`import { RemoteError } from ${JSON.stringify(protocol)}\nconst Remote=method=>method\nclass TypertRemoteService { constructor(ctx) { this.ctx=ctx } }\n`)
}
