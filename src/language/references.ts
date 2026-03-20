import * as vscode from 'vscode';

/**
 * Find All References: ReferenceProvider for Lua files.
 * Searches for all occurrences of a symbol across Lua files in the workspace.
 */

export class Love2DReferenceProvider implements vscode.ReferenceProvider {
  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.ReferenceContext,
    _token: vscode.CancellationToken,
  ): Promise<vscode.Location[]> {
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_]\w*/);
    if (!wordRange) return [];

    const word = document.getText(wordRange);
    if (!word) return [];

    const locations: vscode.Location[] = [];

    // Search across all open Lua files and workspace Lua files
    const files = await vscode.workspace.findFiles('**/*.lua', '**/node_modules/**', 500);

    for (const fileUri of files) {
      try {
        const doc = await vscode.workspace.openTextDocument(fileUri);
        const text = doc.getText();

        // Find all occurrences of the word (whole word match)
        const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'g');
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const pos = doc.positionAt(match.index);
          locations.push(new vscode.Location(
            doc.uri,
            new vscode.Range(pos, doc.positionAt(match.index + word.length)),
          ));
        }
      } catch {
        // Skip files that can't be opened
      }
    }

    return locations;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
