# Plugin Development Guide

Tiled Workspace supports custom pane types via the Plugin Registry system.

## Quick Start

1. Create a file `src/plugins/MyPane.tsx`
2. Implement a React component accepting `PaneProps`
3. Register it with `PluginRegistry.register(...)`
4. Import the plugin file once (in `PaneContainer.tsx` or `main.tsx`)

```tsx
// src/plugins/MyPane.tsx
import { PluginRegistry } from "@/lib/pluginRegistry";
import type { PaneProps } from "@/types";

function MyPane({ tabId, appEntry, notify }: PaneProps) {
  return (
    <div style={{ padding: 20, color: "#e6edf3" }}>
      <h2>Hello from {appEntry.name}!</h2>
      <button onClick={() => notify("success", "It works!")}>
        Send notification
      </button>
    </div>
  );
}

PluginRegistry.register({
  id: "my-pane",           // unique ID — must match AppEntry.id
  name: "My Pane",         // display name in launcher
  icon: "ti-puzzle",       // Tabler icon class
  description: "My custom pane",
  component: MyPane,
});

export default MyPane;
```

3. Add an entry to `apps.json` (or use the Settings → Apps panel):

```json
{
  "id": "my-pane",
  "name": "My Pane",
  "type": "plugin",
  "icon": "ti-puzzle"
}
```

## PaneProps API

| Prop | Type | Description |
|------|------|-------------|
| `tabId` | `string` | Unique ID for this tab instance |
| `appEntry` | `AppEntry` | The app registry entry for this plugin |
| `notify` | `function` | Send a notification from this tab |

### `notify(level, message, opts?)`

| Level | Visual | When to use |
|-------|--------|-------------|
| `"info"` | Grey dot | Routine status update |
| `"success"` | Green dot | Operation completed |
| `"warning"` | Yellow dot + glow | Something needs attention |
| `"error"` | Red dot + glow | Operation failed |
| `"attention"` | Blue pulsing glow | Process done, needs user input |

```ts
// Examples
notify("success", "File saved successfully");
notify("error", "Build failed — check output");
notify("attention", "Process finished — press Enter to continue");
notify("info", "Page loaded", { autoDismiss: 2000 });
```

## Accessing Tauri APIs

Plugins can use all Tauri APIs:

```ts
import { readFile, writeFile } from "@/lib/tauri-bridge";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile as fsReadFile } from "@tauri-apps/plugin-fs";
```

## Built-in Plugin Examples

- `src/plugins/ImageViewerPane.tsx` — Image viewer with zoom
- `src/plugins/MarkdownPreviewPane.tsx` — Markdown renderer with source/preview toggle

## Lazy Loading

Plugins are not automatically tree-shaken since they self-register on import.
For large plugins, use dynamic import:

```ts
// In PaneContainer.tsx (or wherever you bootstrap plugins)
import(/* webpackChunkName: "plugin-my-pane" */ "@/plugins/MyPane");
```
