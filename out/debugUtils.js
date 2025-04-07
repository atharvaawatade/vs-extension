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
exports.DebugUtils = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * A utility for debugging issues with file edits
 */
class DebugUtils {
    /**
     * Log debugging information to a file
     */
    static async logDebug(message, data) {
        const logPath = path.join(__dirname, '..', 'debug.log');
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}`;
        try {
            fs.appendFileSync(logPath, logMessage);
        }
        catch (error) {
            console.error('Failed to write debug log:', error);
        }
    }
    /**
     * Test file editing functionality
     */
    static async testFileEdit(workspaceRoot, filePath) {
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
        }
        catch (error) {
            this.logDebug('Error in testFileEdit:', error);
            return false;
        }
    }
}
exports.DebugUtils = DebugUtils;
//# sourceMappingURL=debugUtils.js.map