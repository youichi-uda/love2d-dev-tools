import * as vscode from 'vscode';
import { BridgeClient } from '../bridge/client';

/**
 * Game State Inspector: TreeDataProvider that displays live game state
 * by inspecting Lua tables via the bridge `inspect` command.
 */

export interface InspectorNode {
  label: string;
  path: string;
  value: string;
  type: string;
  hasChildren: boolean;
}

export class GameStateInspector implements vscode.TreeDataProvider<InspectorNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<InspectorNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private autoRefresh = true;

  constructor(private bridge: BridgeClient) {
    // Auto-refresh ON by default
    this.refreshTimer = setInterval(() => this.refresh(), 1000);
  }

  getTreeItem(element: InspectorNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    item.description = element.value;
    item.tooltip = `${element.path} (${element.type}) = ${element.value}`;
    item.contextValue = element.hasChildren ? 'table' : 'value';

    if (!element.hasChildren) {
      item.command = {
        title: 'Edit Value',
        command: 'love2d-tools.inspectorEdit',
        arguments: [element],
      };
    }

    return item;
  }

  async getChildren(element?: InspectorNode): Promise<InspectorNode[]> {
    if (!this.bridge.connected) {
      return [];
    }

    const path = element ? element.path : '';

    try {
      const response = await this.bridge.send({ cmd: 'inspect', path });
      if (response.success && Array.isArray(response.data)) {
        return (response.data as Array<{
          key: string;
          value: string;
          type: string;
          hasChildren: boolean;
        }>).map((entry) => ({
          label: entry.key,
          path: path ? `${path}.${entry.key}` : entry.key,
          value: entry.value,
          type: entry.type,
          hasChildren: entry.hasChildren,
        }));
      }
    } catch {
      // Bridge not available
    }

    return [];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  toggleAutoRefresh(): boolean {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.refreshTimer = setInterval(() => this.refresh(), 1000);
    } else {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
    return this.autoRefresh;
  }

  async editValue(node: InspectorNode): Promise<void> {
    const newValue = await vscode.window.showInputBox({
      prompt: `Edit ${node.path}`,
      value: node.value,
    });
    if (newValue === undefined) return;

    try {
      // Determine if the value should be quoted
      const luaValue = this.toLuaLiteral(newValue, node.type);
      await this.bridge.eval(`${node.path} = ${luaValue}`);
      this.refresh();
    } catch {
      vscode.window.showErrorMessage(`Failed to set ${node.path}`);
    }
  }

  private toLuaLiteral(value: string, currentType: string): string {
    if (value === 'true' || value === 'false') return value;
    if (value === 'nil') return value;
    if (!isNaN(Number(value))) return value;
    if (currentType === 'string') return `"${value.replace(/"/g, '\\"')}"`;
    return value;
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this._onDidChangeTreeData.dispose();
  }
}
