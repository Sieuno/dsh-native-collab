import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
const root = join(import.meta.dirname, '..')

test('normal installation explains one management entry, field autosave, and restart without offline migration', async () => {
  for (const file of ['README.md', 'docs/INSTALL.md']) {
    const text = await readFile(join(root, file), 'utf8')
    assert.match(text, /只插入一个管理入口/, file)
    assert.match(text, /自动保存/, file)
    assert.doesNotMatch(text, /分别保存/, file)
    assert.match(text, /关闭.*重启/, file)
    assert.doesNotMatch(text, /cordis\.patch\.yml:\s*\[\]/, file)
    assert.doesNotMatch(text, /^\s*\[\]\s*$/m, file)
    assert.match(text, /未知自定义 provider/, file)
  }
})

test('mis-uninstall recovery is FAQ-only, stops the host first, and preserves unrelated data', async () => {
  const faq = await readFile(join(root, 'docs/FAQ.md'), 'utf8')
  const start = faq.indexOf('## 误卸载')
  assert.ok(start >= 0)
  const normal = faq.slice(0, start)
  assert.match(normal, /普通保存不需要离线迁移/)
  assert.doesNotMatch(normal, /手动修复/)
  const recovery = faq.slice(start, faq.indexOf('\n## ', start + 1))
  let previous = -1
  for (const marker of ['停止 DSH 服务', '手动修复实际 Profile', '不要清空整个 patch']) {
    const index = recovery.indexOf(marker)
    assert.ok(index > previous, `FAQ missing or misordered: ${marker}`)
    previous = index
  }
  assert.match(recovery, /不要删除会话或用量记录/)
  assert.match(recovery, /四个根层工具仍应保持禁用/)
  for (const file of ['README.md', 'docs/INSTALL.md']) {
    const text = await readFile(join(root, file), 'utf8')
    assert.match(text, /FAQ/, file)
    assert.doesNotMatch(text, /## 误卸载.*如何修复/, file)
  }
})

test('docs describe in-memory automatic wake limits and human-input resets rather than persistent request budgets', async () => {
  for (const file of ['README.md', 'docs/INSTALL.md', 'docs/FAQ.md']) {
    const text = await readFile(join(root, file), 'utf8')
    assert.match(text, /自动.*唤醒/, file)
    assert.match(text, /人类输入|用户输入/, file)
    assert.match(text, /清零/, file)
    assert.match(text, /内存/, file)
    assert.doesNotMatch(text, /旧 Team 继续使用原上限与已用次数|重启、保存或重装不会补充额度/, file)
  }
  const faq = await readFile(join(root, 'docs/FAQ.md'), 'utf8')
  assert.match(faq, /不会取消任何 Agent/)
  assert.match(faq, /不要上传整套配置或会话记录/)
})

test('english docs mirror the chinese contracts and are reachable from the english README', async () => {
  const read = (file) => readFile(join(root, file), 'utf8')
  for (const file of ['docs/INSTALL.en.md', 'docs/FAQ.en.md']) {
    const text = await read(file)
    assert.doesNotMatch(text, /[\u4e00-\u9fff]/, `${file} should not contain CJK text`)
  }
  const enReadme = await read('README.en.md')
  for (const target of ['docs/INSTALL.en.md', 'docs/FAQ.en.md']) {
    assert.ok(enReadme.includes(target), `README.en.md missing link: ${target}`)
  }
  const pkg = JSON.parse(await read('package.json'))
  for (const file of ['README.md', 'README.en.md']) {
    const text = await read(file)
    assert.ok(text.includes(pkg.engines.dsh), `${file} missing exact host range`)
    assert.ok(text.includes('0.3.1'), `${file} missing first adapted package version`)
    assert.ok(text.includes('22.19.0') && text.includes('24.9.0'), `${file} missing separate Node requirements`)
  }
  for (const file of ['docs/INSTALL.md', 'docs/FAQ.md', 'docs/INSTALL.en.md', 'docs/FAQ.en.md']) {
    assert.ok(pkg.files.includes(file), `package files missing: ${file}`)
  }
  const install = await read('docs/INSTALL.en.md')
  assert.match(install, /management entry/)
  assert.match(install, /save automatically/)
  const faq = await read('docs/FAQ.en.md')
  assert.match(faq, /32/)
  assert.match(faq, /automatic wake/i)
})
