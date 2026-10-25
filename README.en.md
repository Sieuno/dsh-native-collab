# DSH Native Collab

**Flexible Agent Teams and model selection for DSH, with enhanced communication between parent and child conversations.**

[中文](README.md)

An unofficial community plugin derived from DeepSeek Harness native collaboration modules. It is not an official DeepSeek release and is not a centralized task-management dashboard.

## What it adds

- More flexible Team collaboration and model selection, within the host's allowed model roster.
- Enhanced parent–child communication: guidance while a child is running and continuation after completion, subject to existing ownership, permission and session rules.
- A review-and-confirm switch for selecting derived collaboration components at the next startup.
- A persistent per-Team request limit as a supporting feature. The default is 32 requests; this is not a token or monetary budget.

## Compatibility

Expected compatibility: `>=0.2.1-rc.1 <0.2.2-0` (DSH 0.2.1 series, starting at rc.1). The tested environment is recorded separately; a Profile name is not a compatibility restriction.

DSH 0.2.1-rc.2 has full isolated acceptance evidence. rc.1 and rc.3 have related source reviews and isolated installation/startup/switch/restart/uninstall checks. The release smoke checks use Node 26.12.1; the original full acceptance run used Node 22.23.4. No real or paid model calls are claimed. Other admitted versions are expected compatibility, not individually acceptance-tested releases.

## Install

Read the [installation guide (Chinese)](docs/INSTALL.md) first: back up your Profile, ensure the matching official experimental Agent Team profile is present, and disable HMR before using this plugin's master switch.

```sh
dsh plugin --profile web add https://github.com/Sieuno/dsh-native-collab/releases/download/v0.2.0/dsh-native-collab-derived-0.2.0.tgz
```

Replace `web` with your Profile name. Installation only registers the management entry. Review and confirm the plugin's own master switch, stop the relevant Host/Agents, and fully restart the same Profile. Refreshing a browser tab is not a Host restart. Two ordinary-tool placeholder rows intentionally stay disabled; those tools operate inside presets.

## Before switching off or uninstalling

- Switch-off is a fixed native baseline, **not a restoration of the pre-install state**: five native root components become enabled, including ones previously disabled.
- Complete copied presets remain in the Profile and can pin future upstream defaults. Existing Team ledgers retain their limit and usage; changing the limit affects new Teams.
- Switch off and confirm success first, then stop the Host/Agents, then remove the bundle and restart. Official Remove does not perform the switch-off for you.

```sh
dsh plugin --profile web remove @dsh-native-collab/derived
```

Known cosmetic issue: long change labels may require horizontal scrolling at narrow widths or high zoom. Confirmation and cancellation controls remain reachable.

## Evidence and license

See the [testing scope](TESTING.md), [release verification](RELEASE-VERIFICATION.json) and [upstream attribution](UPSTREAM.md). MIT licensed; upstream DeepSeek copyright and package NOTICE files are retained. This release is distributed through GitHub, not npm.
