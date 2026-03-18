/**
 * VS Code API mock for unit testing.
 */

export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T) => defaultValue,
    update: async () => {},
  }),
  workspaceFolders: undefined as { uri: { fsPath: string }; name: string }[] | undefined,
  createFileSystemWatcher: () => ({
    onDidChange: (_cb: unknown) => ({ dispose: () => {} }),
    onDidCreate: (_cb: unknown) => ({ dispose: () => {} }),
    onDidDelete: (_cb: unknown) => ({ dispose: () => {} }),
    dispose: () => {},
  }),
  textDocuments: [] as unknown[],
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidOpenTextDocument: () => ({ dispose: () => {} }),
  onDidCloseTextDocument: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const window = {
  showInformationMessage: async (..._args: unknown[]) => undefined as string | undefined,
  showWarningMessage: async (..._args: unknown[]) => undefined as string | undefined,
  showErrorMessage: async (..._args: unknown[]) => undefined as string | undefined,
  showInputBox: async (_options?: unknown) => undefined as string | undefined,
  showQuickPick: async (_items: unknown[], _options?: unknown) => undefined,
  showOpenDialog: async (_options?: unknown) => undefined as { fsPath: string }[] | undefined,
  withProgress: async (_options: unknown, task: (progress: unknown) => Promise<unknown>) => task({}),
  createOutputChannel: (_name: string) => ({
    append: (_value: string) => {},
    appendLine: (_value: string) => {},
    clear: () => {},
    show: (_preserveFocus?: boolean) => {},
    dispose: () => {},
    name: _name,
  }),
  createStatusBarItem: (_alignment?: number, _priority?: number) => ({
    text: '',
    tooltip: '' as string | undefined,
    command: undefined as string | undefined,
    backgroundColor: undefined as unknown,
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  registerWebviewViewProvider: () => ({ dispose: () => {} }),
  showWorkspaceFolderPick: async () => undefined,
  createWebviewPanel: (_viewType: string, _title: string, _showOptions: unknown, _options?: unknown) => ({
    webview: {
      html: '',
      options: {},
      postMessage: async (_message: unknown) => true,
      onDidReceiveMessage: (_cb: unknown) => ({ dispose: () => {} }),
    },
    reveal: () => {},
    onDidDispose: (_cb: () => void) => ({ dispose: () => {} }),
    dispose: () => {},
  }),
};

export const commands = {
  registerCommand: (_command: string, _callback: (...args: unknown[]) => unknown) => ({
    dispose: () => {},
  }),
  executeCommand: async (..._args: unknown[]) => {},
};

export const extensions = {
  getExtension: (_id: string) => undefined as { extensionPath: string } | undefined,
};

export const languages = {
  registerCompletionItemProvider: () => ({ dispose: () => {} }),
  registerHoverProvider: () => ({ dispose: () => {} }),
  createDiagnosticCollection: (_name: string) => ({
    set: (_uri: unknown, _diagnostics: unknown[]) => {},
    delete: (_uri: unknown) => {},
    clear: () => {},
    dispose: () => {},
  }),
};

export const env = {
  language: 'en',
  openExternal: async (_uri: unknown) => true,
};

export const l10n = {
  t: (message: string, ...args: unknown[]) => {
    let result = message;
    for (let i = 0; i < args.length; i++) {
      result = result.replace(`{${i}}`, String(args[i]));
    }
    return result;
  },
};

export const debug = {
  registerDebugConfigurationProvider: () => ({ dispose: () => {} }),
  registerDebugAdapterDescriptorFactory: () => ({ dispose: () => {} }),
};

export class EventEmitter<T> {
  private listeners: ((e: T) => unknown)[] = [];
  event = (listener: (e: T) => unknown) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
  };
  fire(data: T): void {
    for (const listener of this.listeners) listener(data);
  }
  dispose(): void {
    this.listeners = [];
  }
}

export class Uri {
  static file(p: string): Uri { return new Uri(p); }
  static parse(value: string): Uri { return new Uri(value); }
  constructor(public readonly fsPath: string) {}
}

export class RelativePattern {
  constructor(public readonly base: string, public readonly pattern: string) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Diagnostic {
  source?: string;
  code?: string | number;
  constructor(
    public readonly range: Range,
    public readonly message: string,
    public readonly severity?: number,
  ) {}
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ViewColumn {
  Beside = -2,
}

export enum ProgressLocation {
  Notification = 15,
}
