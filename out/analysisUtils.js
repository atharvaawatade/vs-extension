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
exports.CodeAnalyzer = void 0;
const path = __importStar(require("path"));
class CodeAnalyzer {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    analyzeCode(filePath, content) {
        const insights = [];
        const ext = path.extname(filePath).slice(1).toLowerCase();
        // General analysis for all file types
        insights.push(...this.analyzeLineLength(content));
        insights.push(...this.analyzeCommentDensity(content));
        // Language-specific analysis
        switch (ext) {
            case 'js':
            case 'ts':
                insights.push(...this.analyzeJavaScript(content, ext === 'ts'));
                break;
            case 'py':
                insights.push(...this.analyzePython(content));
                break;
            case 'go':
                insights.push(...this.analyzeGo(content));
                break;
            case 'json':
                insights.push(...this.analyzeJson(content));
                break;
        }
        return insights;
    }
    analyzeLineLength(content) {
        const insights = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.length > 100) {
                insights.push({
                    type: 'warning',
                    message: `Line ${index + 1} exceeds 100 characters (${line.length})`,
                    line: index + 1,
                    severity: 'low',
                    fix: 'Consider breaking this line into multiple lines'
                });
            }
        });
        return insights;
    }
    analyzeCommentDensity(content) {
        const insights = [];
        const lines = content.split('\n');
        const totalLines = lines.length;
        const commentLines = lines.filter(line => line.trim().startsWith('//') ||
            line.trim().startsWith('#') ||
            line.trim().startsWith('/*') ||
            line.trim().startsWith('*')).length;
        const commentRatio = commentLines / totalLines;
        if (totalLines > 30 && commentRatio < 0.1) {
            insights.push({
                type: 'suggestion',
                message: `Low comment density (${Math.round(commentRatio * 100)}%). Consider adding more documentation.`,
                severity: 'medium'
            });
        }
        return insights;
    }
    analyzeJavaScript(content, isTypeScript) {
        const insights = [];
        // Check for var usage in TypeScript
        if (isTypeScript && content.match(/\bvar\s+/g)) {
            insights.push({
                type: 'warning',
                message: 'Using "var" in TypeScript code. Consider using "const" or "let" instead.',
                severity: 'medium',
                fix: 'Replace "var" with "const" for constants or "let" for variables that need to be reassigned'
            });
        }
        // Check for error handling
        if (content.includes('try') && !content.includes('catch')) {
            insights.push({
                type: 'error',
                message: 'Try block without catch. Errors will be uncaught.',
                severity: 'high',
                fix: 'Add a catch block to handle potential errors'
            });
        }
        // Check for console.log in production code
        const consoleLogCount = (content.match(/console\.log/g) || []).length;
        if (consoleLogCount > 3) {
            insights.push({
                type: 'warning',
                message: `${consoleLogCount} console.log statements found. Consider removing before production.`,
                severity: 'medium',
                fix: 'Replace with proper logging or remove console.log statements'
            });
        }
        return insights;
    }
    analyzePython(content) {
        const insights = [];
        // Check for proper indentation
        const mixedIndentation = content.split('\n').some(line => line.startsWith('  ') && content.split('\n').some(l => l.startsWith('\t')));
        if (mixedIndentation) {
            insights.push({
                type: 'warning',
                message: 'Mixed indentation (spaces and tabs). Consider using consistent indentation.',
                severity: 'medium',
                fix: 'Convert all indentation to either spaces (PEP 8) or tabs'
            });
        }
        // Check for main guard
        if (content.includes('def main') && !content.includes('if __name__ == "__main__"')) {
            insights.push({
                type: 'suggestion',
                message: 'Main function defined without __name__ guard',
                severity: 'medium',
                fix: 'Add `if __name__ == "__main__": main()` at the end of the file'
            });
        }
        return insights;
    }
    analyzeGo(content) {
        const insights = [];
        // Check for error handling pattern
        const functionCalls = content.match(/\w+\s*:=\s*\w+\(.*?\)/g) || [];
        functionCalls.forEach(call => {
            if (call.includes('err :=') && !content.includes('if err != nil')) {
                insights.push({
                    type: 'error',
                    message: 'Error variable assigned but not checked',
                    severity: 'high',
                    fix: 'Add error checking: `if err != nil { return err }`'
                });
            }
        });
        return insights;
    }
    analyzeJson(content) {
        const insights = [];
        try {
            JSON.parse(content);
        }
        catch (e) {
            if (e instanceof Error) {
                insights.push({
                    type: 'error',
                    message: `Invalid JSON: ${e.message}`,
                    severity: 'high'
                });
            }
        }
        return insights;
    }
}
exports.CodeAnalyzer = CodeAnalyzer;
//# sourceMappingURL=analysisUtils.js.map