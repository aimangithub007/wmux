import { useCallback, Suspense } from "react";
import { usePaneStore } from "@/store/paneStore";
import { useAppRegistry } from "@/hooks/useAppRegistry";
import { useNotificationStore } from "@/store/notificationStore";
import { TabBar } from "@/components/ui/TabBar";
import { PaneToolbar } from "@/components/ui/PaneToolbar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TerminalPane, disposeTerminal } from "@/components/panes/TerminalPane";
import { BrowserPane } from "@/components/panes/BrowserPane";
import { EditorPane, disposeEditor } from "@/components/panes/EditorPane";
import { PluginRegistry } from "@/lib/pluginRegistry";
import type { Tab, AppEntry } from "@/types";

// Load plugin registrations on startup
import "@/plugins/ImageViewerPane";
import "@/plugins/MarkdownPreviewPane";

interface PaneContainerProps {
  paneId: string;
}

export function PaneContainer({ paneId }: PaneContainerProps) {
  const { panes, activePaneId, setActivePane } = usePaneStore();
  const { apps } = useAppRegistry();
  const emitNotif = useNotificationStore((s) => s.emit);
  const pane = panes[paneId];

  if (!pane) return null;

  const isActivePaneFocused = activePaneId === paneId;

  const getAppEntry = useCallback(
    (appId: string): AppEntry =>
      apps.find((a) => a.id === appId) ?? {
        id: appId,
        name: appId,
        type: "terminal",
        icon: "ti-terminal-2",
      },
    [apps]
  );

  return (
    <div
      onClick={() => setActivePane(paneId)}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: isActivePaneFocused
          ? "1px solid #3d4450"
          : "1px solid #1e2329",
        borderRadius: 2,
        overflow: "hidden",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
      }}
    >
      {/* Header: TabBar + PaneToolbar */}
      <div style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <TabBar paneId={paneId} pane={pane} />
        </div>
        <PaneToolbar paneId={paneId} />
      </div>

      {/* Tab contents */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {pane.tabs.map((tab: Tab) => {
          const appEntry = getAppEntry(tab.appId);
          const isActive = tab.id === pane.activeTabId;
          const notify = (level: any, message: string, opts?: any) =>
            emitNotif(tab.id, level, message, opts);

          return (
            <div
              key={tab.id}
              style={{
                position: "absolute",
                inset: 0,
                display: isActive ? "block" : "none",
              }}
            >
              <ErrorBoundary tabId={tab.id}>
                <TabContent
                  tab={tab}
                  appEntry={appEntry}
                  isActive={isActive}
                  notify={notify}
                  paneId={paneId}
                />
              </ErrorBoundary>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabContent({
  tab,
  appEntry,
  isActive,
  notify,
  paneId,
}: {
  tab: Tab;
  appEntry: AppEntry;
  isActive: boolean;
  notify: (level: any, message: string, opts?: any) => void;
  paneId: string;
}) {
  const updateTabProps = usePaneStore((s) => s.updateTabProps);
  const paneProps = { tabId: tab.id, appEntry, notify };

  if (appEntry.type === "terminal") {
    return <TerminalPane {...paneProps} isActive={isActive} />;
  }
  if (appEntry.type === "browser") {
    return (
      <BrowserPane
        {...paneProps}
        isActive={isActive}
        initialUrl={tab.props?.lastUrl as string | undefined}
      />
    );
  }
  if (appEntry.type === "editor") {
    return (
      <EditorPane
        {...paneProps}
        isActive={isActive}
        initialPath={tab.props?.filePath as string | undefined}
        onPathChange={(path) => updateTabProps(paneId, tab.id, { filePath: path })}
      />
    );
  }

  // Plugin dispatch
  const plugin =
    PluginRegistry.getPlugin(appEntry.id) ??
    PluginRegistry.getPlugin(appEntry.type);
  if (plugin) {
    if (!isActive) return null;
    const PluginComponent = plugin.component;
    return (
      <Suspense
        fallback={
          <div style={{ padding: 20, color: "#8b949e", fontSize: 13 }}>
            Loading plugin…
          </div>
        }
      >
        <PluginComponent {...paneProps} />
      </Suspense>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#484f58",
        fontSize: 13,
      }}
    >
      Unknown app type: {appEntry.type}
    </div>
  );
}
