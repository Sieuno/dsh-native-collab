# DSH Native Collab

**Flexible Agent Teams and model selection for DSH, with enhanced communication between parent and child conversations.**

[中文](README.md)

An unofficial community plugin derived from DeepSeek Harness native collaboration modules. It is not an official DeepSeek release.

## Startup overrides and switching back

**This plugin uses startup configuration overrides to switch selected official collaboration components and tools within Agent presets to this project's enhanced implementations.** It does not modify the official DSH installation files. Installation alone does not switch components: review and confirm the plugin's own master switch, then fully restart.

**To return to the official native collaboration components, turn off this plugin's own master switch, confirm the save, and fully restart.** Disabling an individual row in DSH's plugin manager or directly removing the package is not this restore procedure.

This returns to a fixed native baseline, not the complete pre-install configuration. Five native root components are enabled, including any previously disabled ones; copied presets and existing Team usage records remain. See the uninstall notes below.

## What it adds

- More flexible Team collaboration and model selection, within the host's allowed model roster.
- Enhanced parent–child communication: guidance while a child is running and continuation after completion, subject to existing ownership, permission and session rules.
- A review-and-confirm switch for selecting derived collaboration components at the next startup.
- A persistent per-Team request limit as a supporting feature. The default is 32 requests; this is not a token or monetary budget.

**No parallel toolset.** The plugin provides compatible replacements for the original collaboration tools, preserving their existing collaboration capabilities while adding enhancements. It also updates model-facing tool descriptions and usage instructions, aiming to minimize extra context overhead from duplicate tool definitions and instructions.

## Compatibility

Expected compatibility: `>=0.2.1-rc.1 <0.2.2-0` (DSH 0.2.1 series, starting at rc.1). The tested environment is recorded separately; a Profile name is not a compatibility restriction.

Node >=22.19.0 is required.

## Install

Read the [installation guide (Chinese)](docs/INSTALL.md) first: back up your Profile, ensure the matching official experimental Agent Team profile is present, and disable HMR before using this plugin's master switch.

```sh
dsh plugin --profile web add @sieuno/dsh-native-collab
```

Upgrading from 0.2.0? The previous package was `@dsh-native-collab/derived`. Use its own master switch to return to native components, confirm, stop the Host/Agents, then remove the old package before installing the new one. Do not install both package identities together. Future versions under the new name can update normally.

Replace `web` with your Profile name. Installation only registers the management entry. Review and confirm the plugin's own master switch, stop the relevant Host/Agents, and fully restart the same Profile. Refreshing a browser tab is not a Host restart. Two ordinary-tool placeholder rows intentionally stay disabled; those tools operate inside presets.

## Before switching off or uninstalling

- Switch-off is a fixed native baseline, **not a restoration of the pre-install state**: five native root components become enabled, including ones previously disabled.
- Complete copied presets remain in the Profile and can pin future upstream defaults. Existing Team ledgers retain their limit and usage; changing the limit affects new Teams.
- Switch off and confirm success first, then stop the Host/Agents, then remove the bundle and restart. Official Remove does not perform the switch-off for you.

```sh
dsh plugin --profile web remove @sieuno/dsh-native-collab
```

Known cosmetic issue: long change labels may require horizontal scrolling at narrow widths or high zoom. Confirmation and cancellation controls remain reachable.

## Development and license

See the [contributing guide](https://github.com/Sieuno/dsh-native-collab/blob/main/CONTRIBUTING.md) and [upstream attribution](UPSTREAM.md). MIT licensed; upstream DeepSeek copyright and package NOTICE files are retained. The npm package is `@sieuno/dsh-native-collab`. The GitHub Release TGZ contains the same package and is also accepted by DSH on Windows; no separate installation ZIP is required.
