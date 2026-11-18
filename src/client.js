/* Uses the Host's module table, settings document, and shared form controls. */
window.__ModuleLoader__.load({
  id: '@sieuno/dsh-native-collab',
  factory(require) {
    const { createElement: h } = require('react')
    const { SettingsFormModel, SettingsForm, SettingsValueField, Switch } = require('@deepseek-ai/dsh-client-ui-primitives')
    const namespace = 'dsh-native-collab-ui'
    const locale = 'nativeCollab.settings'
    const fields = ['modelSource', 'teamRequestLimit', 'disableWaitAgent']
    const legacyModelFields = ['modelEnhancement', 'nativeModelSelectionCompatibility']
    const dictionaries = {
      zh: {
        description: '配置子 Agent 模型来源、共享自动消息额度与等待工具控制。',
        modelSource: 'Subagent 模型来源', modelSourceHint: '默认沿用官方会话模型授权。另可选择每次读取当前子模型设置，或使用所有已注册提供方。仅影响新建子 Agent，分叉沿用官方继承规则。',
        conversation: '官方默认策略', settings: '当前子模型设置', all: '所有已注册模型提供方',
        teamRequestLimit: '自动唤醒消息上限', teamRequestLimitHint: '默认 32 次，整棵协作树共享。用户输入时重置；发送失败退还，官方完成通知与直属父级结果汇报不计入。',
        disableWaitAgent: '禁用 Agent 等待工具', disableWaitAgentHint: '开启后，禁止 Agent 使用 wait_agent 阻塞轮询，派发任务后将正常结束当前轮次，静待官方完成通知自动唤醒。',
        reset: '恢复默认', overridden: '已覆盖', invalidNumber: '请输入大于或等于 1 的安全整数。',
        unavailable: '插件未运行，暂时无法配置。', readOnly: '当前设置为只读。',
        save: '保存', saving: '保存中…', saveFailed: '保存未成功，已保留修改。请检查设置是否已被其他页面更新。',
      },
      en: {
        description: 'Configure subagent model sources, shared automatic message allowance, and wait-tool behavior.',
        modelSource: 'Subagent model source', modelSourceHint: 'Defaults to official session authorization. Alternatively, read current child-model settings on each call or use all registered providers. Applies to new subagents; forks retain official inheritance.',
        conversation: 'Official default policy', settings: 'Current child-model settings', all: 'All registered model providers',
        teamRequestLimit: 'Automatic wake message limit', teamRequestLimitHint: 'Default: 32, shared across the tree. User input resets it; failed sends are refunded. Official completion notices and direct-parent result reports are exempt.',
        disableWaitAgent: 'Disable the agent wait tool', disableWaitAgentHint: 'Prevents agents from using wait_agent to block the turn; encourages ending the turn so official completion notices wake them automatically.',
        reset: 'Reset to default', overridden: 'Overridden', invalidNumber: 'Enter a safe integer of at least 1.',
        unavailable: 'The plugin is not running and cannot be configured.', readOnly: 'These settings are read-only.',
        save: 'Save', saving: 'Saving…', saveFailed: 'The changes were not saved and have been retained. Check whether another page updated these settings.',
      },
    }
    const specs = [...fields, ...legacyModelFields].map(field => ({
      field,
      format: value => value === undefined ? '' : String(value),
      parse(text) {
        if (text === '') return { kind: 'clear' }
        if (field === 'modelSource') return ['conversation', 'settings', 'all'].includes(text) ? { kind: 'set', value: text } : undefined
        if (field === 'teamRequestLimit') {
          const value = Number(text)
          return Number.isSafeInteger(value) && value >= 1 ? { kind: 'set', value } : undefined
        }
        return text === 'true' || text === 'false' ? { kind: 'set', value: text === 'true' } : undefined
      },
    }))
    const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }
    const hintStyle = { margin: '6px 0 0', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }
    function SettingsPage(props) {
      const { t } = props
      const state = props.useNativeCollabForm(value => value)
      if (props.view === 'summary') return t('description')
      const disabled = !state.writable || state.saving
      const reset = field => state[field].overridden ? h('button', {
        type: 'button', disabled, onClick: () => props.resetField(field),
        style: { border: 0, background: 'transparent', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer', padding: 0 },
        'aria-label': `${t('reset')}: ${t(field)}`,
      }, t('reset')) : null
      const controls = fields.map(field => {
        const id = `native-collab-${field}`
        if (field === 'teamRequestLimit') return h(SettingsValueField, {
          key: field, id, label: t(field), hint: t(`${field}Hint`), numeric: true,
          disabled, ...state[field], overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'),
          onEdit: text => props.edit(field, text), onReset: () => props.resetField(field),
        })
        if (field === 'disableWaitAgent') return h('div', { key: field },
          h('div', { style: rowStyle },
            h('span', { style: { fontSize: 13, fontWeight: 500 } }, t(field)),
            h(Switch, { label: t(field), checked: state[field].text === 'true', disabled,
              onChange: checked => props.edit(field, String(checked)) })),
          h('p', { style: hintStyle }, t(`${field}Hint`)), reset(field))
        return h('div', { key: field },
          h('div', { style: rowStyle },
            h('label', { htmlFor: id, style: { fontSize: 13, fontWeight: 500 } }, t(field)),
            h('select', {
              id, value: state[field].text, disabled, onChange: event => props.edit(field, event.target.value),
              style: { padding: '6px 8px', borderRadius: 6, maxWidth: '65%', font: 'inherit', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l4)' },
            }, ...['conversation', 'settings', 'all'].map(value => h('option', { key: value, value }, t(value))))),
          h('p', { style: hintStyle }, t(`${field}Hint`)), reset(field))
      })
      return h(SettingsForm, {
        state, labels: Object.fromEntries(['unavailable', 'readOnly', 'saveFailed', 'save', 'saving'].map(key => [key, t(key)])),
        onSave: props.save, onDiscard: props.discard,
      }, h('div', { style: { display: 'grid', gap: 24 } }, ...controls))
    }
    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(locale, dictionaries))
        const form = new SettingsFormModel(ctx.configForms.get(namespace), specs)
        const store = form.bind(() => {
          const source = form.field('modelSource')
          const enabled = form.field('modelEnhancement')
          const compatibility = form.field('nativeModelSelectionCompatibility')
          return { ...form.shell(), teamRequestLimit: form.field('teamRequestLimit'), disableWaitAgent: form.field('disableWaitAgent'), modelSource: {
            ...source,
            text: enabled.text === 'false' ? 'conversation' : source.text || (compatibility.text === 'false' ? 'settings' : 'conversation'),
            overridden: source.overridden || enabled.overridden || compatibility.overridden,
          } }
        })
        const original = form.actions()
        const actions = {
          ...original,
          edit(field, text) {
            original.edit(field, text)
            // Saving a chosen mode supersedes the old master switch and fallback.
            if (field === 'modelSource') for (const legacy of legacyModelFields) original.edit(legacy, 'true')
          },
          resetField(field) {
            original.resetField(field)
            if (field === 'modelSource') for (const legacy of legacyModelFields) original.resetField(legacy)
          },
        }
        ctx.effect(() => () => form.dispose())
        ctx.effect(() => ctx.configForms.whileServed([namespace], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
          name: 'plugins.bundle.config', key: '@sieuno/dsh-native-collab', locale,
          inject: () => ({ hooks: { nativeCollabForm: store }, ...actions }),
        }, SettingsPage))))
      },
    }
  },
})
