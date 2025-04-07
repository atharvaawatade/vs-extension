import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * A utility for debugging issues with file edits
 */
export class DebugUtils {
    /**
     * Log debugging information to a file
     */
    static async logDebug(message: string, data?: any): Promise<void> {
        const logPath = path.join(__dirname, '..', 'debug.log');
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}`;
        
        try {
            fs.appendFileSync(logPath, logMessage);
        } catch (error) {
            console.error('Failed to write debug log:', error);
        }
    }

    /**
     * Test file editing functionality
     */
    static async testFileEdit(workspaceRoot: string, filePath: string): Promise<boolean> {
        try {
            const fullPath = path.join(workspaceRoot, filePath);
            const uri = vscode.Uri.file(fullPath);
            
            // Log action
            this.logDebug(`Testing file edit on: ${fullPath}`);
            
            // Try to open the document
            const doc = await vscode.workspace.openTextDocument(uri);
            this.logDebug(`Document opened, line count: ${doc.lineCount}`);
            
            // Create a simple edit
            const edit = new vscode.WorkspaceEdit();
            const lastLine = doc.lineCount - 1;
            const position = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
            
            // Add a test comment
            edit.insert(uri, position, '\n// Test edit ' + new Date().toISOString());
            
            // Apply the edit
            const success = await vscode.workspace.applyEdit(edit);
            this.logDebug(`Edit applied: ${success}`);
            
            if (success) {
                // Save the document
                const updatedDoc = await vscode.workspace.openTextDocument(uri);
                await updatedDoc.save();
                this.logDebug('Document saved successfully');
            }
            
            return success;
        } catch (error) {
            this.logDebug('Error in testFileEdit:', error);
            return false;
        }
    }
}
