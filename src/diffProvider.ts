import * as vscode from 'vscode';
import * as path from 'path';
import { FileSystemManager } from './fileManager';

export interface FileDiff {
    filePath: string;
    originalContent: string;
    modifiedContent: string;
    diffHtml: string;
}

export class DiffProvider {
    private fileManager: FileSystemManager;
    
    constructor(private workspaceRoot: string) {
        this.fileManager = new FileSystemManager(workspaceRoot);
    }

    async showDiff(filePath: string, originalContent: string, modifiedContent: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, filePath);
        const uri = vscode.Uri.file(fullPath);
        
        // Create a temporary URI for the modified content
        const modifiedUri = uri.with({ 
            scheme: 'generated',
            path: uri.path + '.modified', 
            query: Date.now().toString() 
        });

        // Write the modified content to the temporary document
        const modifiedDocument = await vscode.workspace.openTextDocument(modifiedUri);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            modifiedUri,
            new vscode.Range(0, 0, modifiedDocument.lineCount, 0),
            modifiedContent
        );
        await vscode.workspace.applyEdit(edit);

        // Show the diff view
        await vscode.commands.executeCommand(
            'vscode.diff',
            uri,
            modifiedUri,
            `${path.basename(filePath)} (Changes)`,
            { preserveFocus: true }
        );
    }

    async applyChanges(filePath: string, newContent: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
            const document = await vscode.workspace.openTextDocument(uri);
            
            // Create the edit
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
                uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                newContent
            );
            
            // Apply the edit
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                // Show success notification
                vscode.window.showInformationMessage(`Changes applied to ${path.basename(filePath)}`);
                
                // Save the document
                const updatedDoc = await vscode.workspace.openTextDocument(uri);
                await updatedDoc.save();
            }
            
            return success;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply changes to ${filePath}: ${error}`);
            return false;
        }
    }

    generateDiffHtml(originalContent: string, modifiedContent: string): string {
        const originalLines = originalContent.split('\n');
        const modifiedLines = modifiedContent.split('\n');
        
        let addedCount = 0;
        let removedCount = 0;
        
        let diffHtml = '<div class="diff-viewer">';
        
        // Add file diff header with stats
        diffHtml += '<div class="diff-header">';
        diffHtml += '<div class="diff-title">Changes</div>';
        diffHtml += '<div class="diff-stats">';
        
        // Count changes while generating diff
        const changes = this.computeDiff(originalLines, modifiedLines);
        changes.forEach(change => {
            if (change.type === 'add') {addedCount++;}
            if (change.type === 'remove') {removedCount++;}
        });
        
        diffHtml += `<span class="stats-added">+${addedCount}</span>`;
        diffHtml += `<span class="stats-removed">-${removedCount}</span>`;
        diffHtml += '</div></div>';
        
        // Add line numbers and content
        diffHtml += '<div class="diff-content">';
        diffHtml += '<div class="diff-line-numbers">';
        
        let lineNo = 1;
        changes.forEach(change => {
            switch (change.type) {
                case 'same':
                    diffHtml += `<div class="diff-line">
                        <span class="line-number">${lineNo}</span>
                        <span class="diff-text">${this.escapeHtml(change.text)}</span>
                    </div>`;
                    lineNo++;
                    break;
                case 'add':
                    diffHtml += `<div class="diff-line added">
                        <span class="line-number">+${lineNo}</span>
                        <span class="diff-text">${this.escapeHtml(change.text)}</span>
                    </div>`;
                    lineNo++;
                    break;
                case 'remove':
                    diffHtml += `<div class="diff-line removed">
                        <span class="line-number">-${lineNo}</span>
                        <span class="diff-text">${this.escapeHtml(change.text)}</span>
                    </div>`;
                    lineNo++;
                    break;
            }
        });
        
        diffHtml += '</div></div>';
        return diffHtml;
    }

    private computeDiff(oldLines: string[], newLines: string[]): Array<{type: 'same' | 'add' | 'remove', text: string}> {
        const changes: Array<{type: 'same' | 'add' | 'remove', text: string}> = [];
        let i = 0, j = 0;
        
        while (i < oldLines.length || j < newLines.length) {
            if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
                changes.push({ type: 'same', text: oldLines[i] });
                i++; j++;
            } else if (j < newLines.length) {
                changes.push({ type: 'add', text: newLines[j] });
                j++;
            } else if (i < oldLines.length) {
                changes.push({ type: 'remove', text: oldLines[i] });
                i++;
            }
        }
        
        return changes;
    }
    
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
