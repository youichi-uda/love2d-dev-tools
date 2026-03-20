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
  findFiles: async (_include: unknown, _exclude?: unknown, _maxResults?: number) => [] as Uri[],
  openTextDocument: async (uri: unknown) => ({
    uri,
    getText: () => '',
    positionAt: (_offset: number) => new Position(0, 0),
    lineAt: (_line: number) => ({ text: '', range: new Range(new Position(0, 0), new Position(0, 0)), rangeIncludingLineBreak: new Range(new Position(0, 0), new Position(0, 0)) }),
    languageId: 'lua',
  }),
  textDocuments: [] as unknown[],
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidOpenTextDocument: () => ({ dispose: () => {} }),
  onDidCloseTextDocument: () => ({ dispose: () => {} }),
  onDidSaveTextDocument: () => ({ dispose: () => {} }),
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
  createTreeView: (_viewId: string, _options: unknown) => ({
    onDidChangeSelection: () => ({ dispose: () => {} }),
    onDidChangeVisibility: () => ({ dispose: () => {} }),
    dispose: () => {},
  }),
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
  registerColorProvider: () => ({ dispose: () => {} }),
  registerDefinitionProvider: () => ({ dispose: () => {} }),
  registerReferenceProvider: () => ({ dispose: () => {} }),
  registerDocumentSymbolProvider: () => ({ dispose: () => {} }),
  registerInlayHintsProvider: () => ({ dispose: () => {} }),
  registerCodeActionsProvider: () => ({ dispose: () => {} }),
  createDiagnosticCollection: (_name: string) => ({
    set: (_uri: unknown, _diagnostics: unknown[]) => {},
    delete: (_uri: unknown) => {},
    clear: () => {},
    dispose: () => {},
  }),
  getDiagnostics: () => [] as [Uri, Diagnostic[]][],
};

export const env = {
  language: 'en',
  openExternal: async (_uri: unknown) => true,
  clipboard: {
    readText: async () => '',
    writeText: async (_value: string) => {},
  },
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

export class Color {
  constructor(
    public readonly red: number,
    public readonly green: number,
    public readonly blue: number,
    public readonly alpha: number,
  ) {}
}

export class ColorInformation {
  constructor(
    public readonly range: Range,
    public readonly color: Color,
  ) {}
}

export class ColorPresentation {
  textEdit?: TextEdit;
  constructor(public readonly label: string) {}
}

export class TextEdit {
  constructor(
    public readonly range: Range,
    public readonly newText: string,
  ) {}
}

export class Location {
  constructor(
    public readonly uri: Uri,
    public readonly range: Range | Position,
  ) {}
}

export class DocumentSymbol {
  children: DocumentSymbol[] = [];
  constructor(
    public readonly name: string,
    public readonly detail: string,
    public readonly kind: number,
    public readonly range: Range,
    public readonly selectionRange: Range,
  ) {}
}

export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export class InlayHint {
  paddingRight?: boolean;
  paddingLeft?: boolean;
  constructor(
    public readonly position: Position,
    public readonly label: string,
    public readonly kind?: number,
  ) {}
}

export enum InlayHintKind {
  Type = 1,
  Parameter = 2,
}

export class CodeAction {
  diagnostics?: Diagnostic[];
  edit?: WorkspaceEdit;
  command?: { title: string; command: string; arguments?: unknown[] };
  isPreferred?: boolean;
  constructor(
    public readonly title: string,
    public readonly kind?: CodeActionKind,
  ) {}
}

export class CodeActionKind {
  static readonly QuickFix = new CodeActionKind('quickfix');
  static readonly Refactor = new CodeActionKind('refactor');
  constructor(public readonly value: string) {}
}

export class WorkspaceEdit {
  private _edits: Array<{ uri: Uri; edit: TextEdit | { range: Range } }> = [];
  insert(uri: Uri, position: Position, newText: string): void {
    this._edits.push({ uri, edit: new TextEdit(new Range(position, position), newText) });
  }
  delete(uri: Uri, range: Range): void {
    this._edits.push({ uri, edit: { range } });
  }
  replace(uri: Uri, range: Range, newText: string): void {
    this._edits.push({ uri, edit: new TextEdit(range, newText) });
  }
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}

export class TreeItem {
  description?: string;
  tooltip?: string;
  contextValue?: string;
  iconPath?: unknown;
  command?: unknown;
  resourceUri?: Uri;
  constructor(
    public label: string,
    public collapsibleState?: number,
  ) {}
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class ThemeIcon {
  constructor(public readonly id: string) {}
}
