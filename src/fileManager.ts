import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface FileTreeNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
    children?: FileTreeNode[];
}

export interface FileEdit {
    filePath: string;
    newContent: string;
    success?: boolean;
    error?: string;
}

export class FileSystemManager {
    private symbolCache = new Map<string, { name: string, kind: vscode.SymbolKind, range: vscode.Range, detail?: string }>();
    private diagnosticsCache = new Map<string, { severity: vscode.DiagnosticSeverity, message: string, range: vscode.Range }[]>();

    constructor(private readonly workspaceRoot: string) {}

    // Add a protected getter for workspaceRoot
    protected getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }

    async getFilesInDirectory(directory: string): Promise<string[]> {
        try {
            const searchPath = directory || this.workspaceRoot;
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(searchPath, '**/*'),
                '**/node_modules/**'
            );
            return files.map(file => vscode.workspace.asRelativePath(file));
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }

    async getFileContent(filePath: string): Promise<string | null> {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const document = await vscode.workspace.openTextDocument(uri);
            return document.getText();
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }

    async searchFiles(query: string): Promise<string[]> {
        try {
            const files = await vscode.workspace.findFiles(
                `**/*${query}*`,
                '**/node_modules/**'
            );
            return files.map(file => vscode.workspace.asRelativePath(file));
        } catch (error) {
            console.error('Error searching files:', error);
            return [];
        }
    }

    async editFile(filePath: string, content: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const edit = new vscode.WorkspaceEdit();
            
            try {
                // Try to open existing file
                const doc = await vscode.workspace.openTextDocument(uri);
                edit.replace(
                    uri,
                    new vscode.Range(0, 0, doc.lineCount, 0),
                    content
                );
            } catch (error) {
                // File doesn't exist, create it
                edit.createFile(uri, { ignoreIfExists: true });
                edit.insert(uri, new vscode.Position(0, 0), content);
            }
            
            // Apply the edit
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                // Make sure to save the file
                const doc = await vscode.workspace.openTextDocument(uri);
                await doc.save();
            }
            return success;
        } catch (error) {
            console.error('Error editing file:', error);
            return false;
        }
    }

    async getFileTree(directory: string = ''): Promise<FileTreeNode> {
        const rootPath = path.join(this.workspaceRoot, directory);
        return this._buildFileTree(rootPath, path.basename(rootPath) || path.basename(this.workspaceRoot));
    }

    private async _buildFileTree(dirPath: string, name: string): Promise<FileTreeNode> {
        const stats = await fs.promises.stat(dirPath);
        
        if (!stats.isDirectory()) {
            return {
                name: name,
                type: 'file',
                path: vscode.workspace.asRelativePath(dirPath)
            };
        }

        const entries = await fs.promises.readdir(dirPath);
        const children: FileTreeNode[] = [];

        for (const entry of entries) {
            if (entry === 'node_modules' || entry === '.git') {continue;}
            try {
                const childPath = path.join(dirPath, entry);
                const child = await this._buildFileTree(childPath, entry);
                children.push(child);
            } catch (error) {
                console.error(`Error processing ${entry}:`, error);
            }
        }

        return {
            name: name,
            type: 'directory',
            path: vscode.workspace.asRelativePath(dirPath),
            children: children.sort((a, b) => {
                if (a.type === b.type) {return a.name.localeCompare(b.name);}
                return a.type === 'directory' ? -1 : 1;
            })
        };
    }

    formatFileTree(node: FileTreeNode, level: number = 0): string {
        const indent = '  '.repeat(level);
        const prefix = node.type === 'directory' ? '📂 ' : '📄 ';
        let result = `${indent}${prefix}${node.name}\n`;
        
        if (node.children) {
            for (const child of node.children) {
                result += this.formatFileTree(child, level + 1);
            }
        }
        return result;
    }

    async createDiff(filePath: string, originalContent: string, modifiedContent: string): Promise<string> {
        // Simple line-by-line diff
        const original = originalContent.split('\n');
        const modified = modifiedContent.split('\n');
        let diff = '';
        
        const maxLines = Math.max(original.length, modified.length);
        for (let i = 0; i < maxLines; i++) {
            const originalLine = original[i] || '';
            const modifiedLine = modified[i] || '';
            
            if (originalLine !== modifiedLine) {
                if (i < original.length) {
                    diff += `- ${originalLine}\n`;
                }
                if (i < modified.length) {
                    diff += `+ ${modifiedLine}\n`;
                }
            } else {
                diff += `  ${originalLine}\n`;
            }
        }
        
        return diff;
    }

    async createNewFile(filePath: string, content: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(uri, { overwrite: false, contents: Buffer.from(content) });
            return await vscode.workspace.applyEdit(edit);
        } catch (error) {
            console.error('Error creating file:', error);
            return false;
        }
    }

    async calculateImportGraph(filePath: string): Promise<Map<string, string[]>> {
        // Creates a dependency graph of imports
        const importGraph = new Map<string, string[]>();
        const visited = new Set<string>();
        await this._buildImportGraph(filePath, importGraph, visited);
        return importGraph;
    }

    private async _buildImportGraph(filePath: string, graph: Map<string, string[]>, visited: Set<string>): Promise<void> {
        if (visited.has(filePath)) {
            return;
        }

        visited.add(filePath);
        const content = await this.getFileContent(filePath);
        if (!content) {
            return;
        }

        const imports: string[] = [];
        const ext = path.extname(filePath).slice(1);
        
        // Extract imports based on file type
        if (ext === 'ts' || ext === 'js') {
            const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1]);
            }
        } else if (ext === 'py') {
            const importRegex = /import\s+(\w+)|from\s+(\w+)\s+import/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1] || match[2]);
            }
        } else if (ext === 'go') {
            const importRegex = /"([^"]+)"/g;
            let match;
            // Find import blocks
            const importBlock = content.match(/import\s*\(\s*([\s\S]*?)\s*\)/);
            if (importBlock) {
                const importContent = importBlock[1];
                while ((match = importRegex.exec(importContent)) !== null) {
                    imports.push(match[1]);
                }
            } else {
                // Find single-line imports
                const singleImportRegex = /import\s+"([^"]+)"/g;
                while ((match = singleImportRegex.exec(content)) !== null) {
                    imports.push(match[1]);
                }
            }
        }
        
        graph.set(filePath, imports);
        
        // Process each import recursively
        for (const importPath of imports) {
            // Convert import path to file path (simplified)
            const importedFilePath = `${importPath}.${ext}`;
            await this._buildImportGraph(importedFilePath, graph, visited);
        }
    }

    async readFiles(filePaths: string[]): Promise<Map<string, string>> {
        const fileContents = new Map<string, string>();
        
        for (const filePath of filePaths) {
            const content = await this.getFileContent(filePath);
            if (content !== null) {
                fileContents.set(filePath, content);
            }
        }
        
        return fileContents;
    }

    generateEditPrompt(files: Map<string, string>, instruction: string): string {
        let prompt = `You are a coding assistant. Generate or modify the following files based on the instruction.
Instruction: ${instruction}

IMPORTANT: For each file, you must:
1. Start with a comment containing "filepath: <path>"
2. Use markdown code blocks with language
3. Include complete file content
4. Follow common conventions for the file type

Example format:
\`\`\`html
// filepath: src/index.html
<html>...</html>
\`\`\`

Files to process:`;

        for (const [filePath, content] of files.entries()) {
            const status = content ? 'existing' : 'new';
            const ext = path.extname(filePath).slice(1);
            prompt += `\n\nFile: ${filePath} (${status}, ${ext})`;
            if (content) {
                prompt += `\nCurrent content:\n${content}`;
            } else {
                prompt += `\nGenerate appropriate content for this ${ext} file.`;
            }
        }
        
        return prompt;
    }

    parseFileEdits(response: string): FileEdit[] {
        const edits: FileEdit[] = [];
        const codeBlockRegex = /```[\w-]*\n([\s\S]*?)```/g;
        const fileHeaderRegex = /(?:\/\/|#|<!--)\s*filepath:\s*(.+?)\s*(?:-->|\n|$)/i;
        
        let match;
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const blockContent = match[1].trim();
            const lines = blockContent.split('\n');
            
            // Look for filepath comment in the first two lines
            const filePathLine = lines.slice(0, 2).find(line => fileHeaderRegex.test(line));
            if (filePathLine) {
                const filePath = fileHeaderRegex.exec(filePathLine)![1].trim();
                // Remove the filepath line and get content
                const content = lines
                    .filter(line => !fileHeaderRegex.test(line))
                    .join('\n')
                    .trim();
                
                edits.push({
                    filePath,
                    newContent: content
                });
            }
        }
        
        return edits;
    }

    async applyEdits(edits: FileEdit[], statusCallback?: (status: string) => void): Promise<boolean> {
        let success = true;
        
        for (const edit of edits) {
            try {
                if (statusCallback) {
                    statusCallback(`Applying changes to ${edit.filePath}...`);
                }
                
                // Normalize file path and make it relative to workspace
                const normalizedPath = path.normalize(edit.filePath);
                const relativePath = path.isAbsolute(normalizedPath) ?
                    path.relative(this.workspaceRoot, normalizedPath) : normalizedPath;
                
                const fullPath = path.join(this.workspaceRoot, relativePath);
                
                // Create directory if needed
                const dir = path.dirname(fullPath);
                await fs.promises.mkdir(dir, { recursive: true });
                
                // Apply edit using relative path
                const result = await this.editFile(relativePath, edit.newContent);
                edit.success = result;
                if (!result) {
                    edit.error = 'Failed to apply changes';
                    success = false;
                }
            } catch (error) {
                edit.success = false;
                edit.error = error instanceof Error ? error.message : 'Unknown error';
                success = false;
            }
        }
        
        return success;
    }

    async scanWorkspace(): Promise<void> {
        // Find all text files in the workspace
        const files = await vscode.workspace.findFiles(
            '**/*.{ts,js,jsx,tsx,py,java,cpp,c,h,hpp,go,rs,php}',
            '**/node_modules/**'
        );

        // Process each file in batches
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            await Promise.all(batch.map(async file => {
                try {
                    const doc = await vscode.workspace.openTextDocument(file);
                    await this.analyzeFile(doc);
                } catch (error) {
                    console.error(`Error processing file ${file.fsPath}:`, error);
                }
            }));
        }
    }

    private async analyzeFile(document: vscode.TextDocument): Promise<void> {
        // Get document symbols using VS Code's API
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (symbols) {
            // Process symbols (functions, classes, etc.)
            this.processSymbols(document.uri, symbols);
        }

        // Get diagnostics
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        if (diagnostics.length > 0) {
            // Process any issues found
            this.processDiagnostics(document.uri, diagnostics);
        }
    }

    private processSymbols(uri: vscode.Uri, symbols: vscode.DocumentSymbol[]): void {
        // Index symbols for quick lookup and code navigation
        for (const symbol of symbols) {
            // Store symbol information for later use
            // This could be used for code completion, navigation, etc.
            this.symbolCache.set(`${uri.fsPath}#${symbol.name}`, {
                name: symbol.name,
                kind: symbol.kind,
                range: symbol.range,
                detail: symbol.detail
            });
        }
    }

    private processDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void {
        // Process and store diagnostics for quality analysis
        this.diagnosticsCache.set(uri.fsPath, diagnostics.map(d => ({
            severity: d.severity,
            message: d.message,
            range: d.range
        })));
    }

    async exists(filePath: string): Promise<boolean> {
        try {
            const fullPath = path.join(this.workspaceRoot, filePath);
            await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
            return true;
        } catch {
            return false;
        }
    }
}
