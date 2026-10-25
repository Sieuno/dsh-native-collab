import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
const root = join(import.meta.dirname, '..')

test('user docs require confirmed switch-off and disclose fixed native targets', async () => {
  for (const file of ['README.md', 'docs/INSTALL.md']) {
    const text = await readFile(join(root, file), 'utf8')
    assert.match(text, /总开关/, file)
    assert.match(text, /不恢复安装前|不恢复原先|不是历史|不恢复历史|原先状态不恢复|不记录、不恢复/, file)
    assert.match(text, /重启/, file)
    assert.doesNotMatch(text, /cordis\.patch\.yml:\s*\[\]/, file)
    assert.doesNotMatch(text, /^\s*\[\]\s*$/m, file)
  }
  const readme = await readFile(join(root, 'README.md'), 'utf8')
  const flow = readme.slice(readme.indexOf('## 卸载流程'))
  let previous = -1
  for (const marker of ['先关闭总开关', '确认写入成功', '停止相关 Host/Agent', '再卸载']) {
    const index = flow.indexOf(marker)
    assert.ok(index > previous, `README missing or misordered: ${marker}`)
    previous = index
  }
  assert.match(readme, /不会拦截官方 Remove/)
  assert.match(readme, /不清空整份 patch/)
  assert.match(readme, /即使它们安装前原本禁用/)
  assert.match(readme, /已有会话和 Team 用量记录不会被本插件删除/)
  assert.match(readme, /旧 Team 继续使用原上限与已用次数/)
})
