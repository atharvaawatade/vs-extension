"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FileSystemManager {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.symbolCache = new Map();
        this.diagnosticsCache = new Map();
    }
    // Add a protected getter for workspaceRoot
    getWorkspaceRoot() {
        return this.workspaceRoot;
    }
    async getFilesInDirectory(directory) {
        try {
            const searchPath = directory || this.workspaceRoot;
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(searchPath, '**/*'), '**/node_modules/**');
            return files.map(file => vscode.workspace.asRelativePath(file));
        }
        catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }
    async getFileContent(filePath) {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const document = await vscode.workspace.openTextDocument(uri);
            return document.getText();
        }
        catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }
    async searchFiles(query) {
        try {
            const files = await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**');
            return files.map(file => vscode.workspace.asRelativePath(file));
        }
        catch (error) {
            console.error('Error searching files:', error);
            return [];
        }
    }
    async editFile(filePath, content) {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const edit = new vscode.WorkspaceEdit();
            try {
                // Try to open existing file
                const doc = await vscode.workspace.openTextDocument(uri);
                edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), content);
            }
            catch (error) {
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
        }
        catch (error) {
            console.error('Error editing file:', error);
            return false;
        }
    }
    async getFileTree(directory = '') {
        const rootPath = path.join(this.workspaceRoot, directory);
        return this._buildFileTree(rootPath, path.basename(rootPath) || path.basename(this.workspaceRoot));
    }
    async _buildFileTree(dirPath, name) {
        const stats = await fs.promises.stat(dirPath);
        if (!stats.isDirectory()) {
            return {
                name: name,
                type: 'file',
                path: vscode.workspace.asRelativePath(dirPath)
            };
        }
        const entries = await fs.promises.readdir(dirPath);
        const children = [];
        for (const entry of entries) {
            if (entry === 'node_modules' || entry === '.git') {
                continue;
            }
            try {
                const childPath = path.join(dirPath, entry);
                const child = await this._buildFileTree(childPath, entry);
                children.push(child);
            }
            catch (error) {
                console.error(`Error processing ${entry}:`, error);
            }
        }
        return {
            name: name,
            type: 'directory',
            path: vscode.workspace.asRelativePath(dirPath),
            children: children.sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type === 'directory' ? -1 : 1;
            })
        };
    }
    formatFileTree(node, level = 0) {
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
    async createDiff(filePath, originalContent, modifiedContent) {
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
            }
            else {
                diff += `  ${originalLine}\n`;
            }
        }
        return diff;
    }
    async createNewFile(filePath, content) {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(uri, { overwrite: false, contents: Buffer.from(content) });
            return await vscode.workspace.applyEdit(edit);
        }
        catch (error) {
            console.error('Error creating file:', error);
            return false;
        }
    }
    async calculateImportGraph(filePath) {
        // Creates a dependency graph of imports
        const importGraph = new Map();
        const visited = new Set();
        await this._buildImportGraph(filePath, importGraph, visited);
        return importGraph;
    }
    async _buildImportGraph(filePath, graph, visited) {
        if (visited.has(filePath)) {
            return;
        }
        visited.add(filePath);
        const content = await this.getFileContent(filePath);
        if (!content) {
            return;
        }
        const imports = [];
        const ext = path.extname(filePath).slice(1);
        // Extract imports based on file type
        if (ext === 'ts' || ext === 'js') {
            const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }
        else if (ext === 'py') {
            const importRegex = /import\s+(\w+)|from\s+(\w+)\s+import/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1] || match[2]);
            }
        }
        else if (ext === 'go') {
            const importRegex = /"([^"]+)"/g;
            let match;
            // Find import blocks
            const importBlock = content.match(/import\s*\(\s*([\s\S]*?)\s*\)/);
            if (importBlock) {
                const importContent = importBlock[1];
                while ((match = importRegex.exec(importContent)) !== null) {
                    imports.push(match[1]);
                }
            }
            else {
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
    async readFiles(filePaths) {
        const fileContents = new Map();
        for (const filePath of filePaths) {
            const content = await this.getFileContent(filePath);
            if (content !== null) {
                fileContents.set(filePath, content);
            }
        }
        return fileContents;
    }
    generateEditPrompt(files, instruction) {
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
            }
            else {
                prompt += `\nGenerate appropriate content for this ${ext} file.`;
            }
        }
        return prompt;
    }
    parseFileEdits(response) {
        const edits = [];
        const codeBlockRegex = /```[\w-]*\n([\s\S]*?)```/g;
        const fileHeaderRegex = /(?:\/\/|#|<!--)\s*filepath:\s*(.+?)\s*(?:-->|\n|$)/i;
        let match;
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const blockContent = match[1].trim();
            const lines = blockContent.split('\n');
            // Look for filepath comment in the first two lines
            const filePathLine = lines.slice(0, 2).find(line => fileHeaderRegex.test(line));
            if (filePathLine) {
                const filePath = fileHeaderRegex.exec(filePathLine)[1].trim();
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
    async applyEdits(edits, statusCallback) {
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
            }
            catch (error) {
                edit.success = false;
                edit.error = error instanceof Error ? error.message : 'Unknown error';
                success = false;
            }
        }
        return success;
    }
    async scanWorkspace() {
        // Find all text files in the workspace
        const files = await vscode.workspace.findFiles('**/*.{ts,js,jsx,tsx,py,java,cpp,c,h,hpp,go,rs,php}', '**/node_modules/**');
        // Process each file in batches
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            await Promise.all(batch.map(async (file) => {
                try {
                    const doc = await vscode.workspace.openTextDocument(file);
                    await this.analyzeFile(doc);
                }
                catch (error) {
                    console.error(`Error processing file ${file.fsPath}:`, error);
                }
            }));
        }
    }
    async analyzeFile(document) {
        // Get document symbols using VS Code's API
        const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);
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
    processSymbols(uri, symbols) {
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
    processDiagnostics(uri, diagnostics) {
        // Process and store diagnostics for quality analysis
        this.diagnosticsCache.set(uri.fsPath, diagnostics.map(d => ({
            severity: d.severity,
            message: d.message,
            range: d.range
        })));
    }
    async exists(filePath) {
        try {
            const fullPath = path.join(this.workspaceRoot, filePath);
            await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.FileSystemManager = FileSystemManager;
//# sourceMappingURL=fileManager.js.map