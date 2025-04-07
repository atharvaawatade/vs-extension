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
exports.VerificationAgent = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class VerificationAgent {
    constructor(workspaceRoot, fileManager) {
        this.workspaceRoot = workspaceRoot;
        this.fileManager = fileManager;
        this.verificationBuffer = new Map();
        this.BUFFER_TIMEOUT = 5000; // 5 seconds buffer
    }
    async verifyFiles(files) {
        // Check buffer first
        const bufferedResults = this.getBufferedResults(files);
        if (bufferedResults) {
            return bufferedResults;
        }
        const result = await this.performVerification(files);
        // Store in buffer
        const key = this.getBufferKey(files);
        this.verificationBuffer.set(key, {
            timestamp: Date.now(),
            result: result
        });
        return result;
    }
    getBufferKey(files) {
        return files.map(f => `${f.filePath}:${f.content?.length || 0}`).join('|');
    }
    getBufferedResults(files) {
        const key = this.getBufferKey(files);
        const cached = this.verificationBuffer.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.BUFFER_TIMEOUT) {
            return cached.result;
        }
        // Clean old entries
        this.cleanBuffer();
        return null;
    }
    cleanBuffer() {
        const now = Date.now();
        for (const [key, value] of this.verificationBuffer.entries()) {
            if (now - value.timestamp > this.BUFFER_TIMEOUT) {
                this.verificationBuffer.delete(key);
            }
        }
    }
    async performVerification(files) {
        // Add real-time syntax checking using TypeScript/JavaScript services
        const errors = [];
        const warnings = [];
        const suggestions = [];
        const messages = [];
        for (const file of files) {
            const ext = path.extname(file.filePath).slice(1);
            // Add VSCode diagnostic support
            const uri = vscode.Uri.file(path.join(this.workspaceRoot, file.filePath));
            const diagnostics = await vscode.languages.getDiagnostics(uri);
            for (const diagnostic of diagnostics) {
                const issue = {
                    type: 'vscode_diagnostic',
                    message: diagnostic.message,
                    line: diagnostic.range.start.line + 1,
                    filePath: file.filePath,
                    severity: diagnostic.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
                    fix: diagnostic.relatedInformation?.[0]?.message
                };
                if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                    errors.push(issue);
                }
                else {
                    warnings.push(issue);
                }
            }
            // Add GitHub Copilot-like suggestions
            const suggestions = await this.generateIntelligentSuggestions(file.filePath, file.content);
            messages.push(...suggestions.map(s => `💡 ${s.message}`));
        }
        // Format and return results
        this.formatVerificationMessages(errors, warnings, suggestions, messages);
        return {
            isValid: errors.length === 0,
            messages,
            details: { errors, warnings, suggestions }
        };
    }
    async generateIntelligentSuggestions(filePath, content) {
        if (!content) {
            return [];
        }
        const suggestions = [];
        const ext = path.extname(filePath).slice(1);
        switch (ext) {
            case 'html':
                suggestions.push(...this.generateHtmlSuggestions(content, filePath));
                break;
            case 'css':
                suggestions.push(...this.generateCssSuggestions(content, filePath));
                break;
            case 'ts':
            case 'js':
                suggestions.push(...await this.generateTypescriptSuggestions(content, filePath));
                break;
        }
        return suggestions;
    }
    generateHtmlSuggestions(content, filePath) {
        const suggestions = [];
        if (!content.includes('srcset') && content.includes('<img')) {
            suggestions.push({
                type: 'modern_html',
                message: 'Consider using srcset for responsive images',
                filePath,
                severity: 'suggestion',
                fix: 'Add srcset attribute to img tags for better responsive behavior'
            });
        }
        if (!content.includes('<meta name="description"')) {
            suggestions.push({
                type: 'seo',
                message: 'Add meta description for better SEO',
                filePath,
                severity: 'suggestion',
                fix: 'Add <meta name="description" content="Your description here">'
            });
        }
        return suggestions;
    }
    generateCssSuggestions(content, filePath) {
        const suggestions = [];
        if (!content.includes('clamp(') && content.includes('font-size')) {
            suggestions.push({
                type: 'modern_css',
                message: 'Consider using clamp() for responsive typography',
                filePath,
                severity: 'suggestion',
                fix: 'Replace fixed font-size with clamp(min, preferred, max)'
            });
        }
        if (content.includes('box-shadow') && !content.includes('will-change')) {
            suggestions.push({
                type: 'performance',
                message: 'Add will-change for better animation performance',
                filePath,
                severity: 'suggestion',
                fix: 'Add will-change: transform to elements with transitions'
            });
        }
        return suggestions;
    }
    async generateTypescriptSuggestions(content, filePath) {
        const suggestions = [];
        if (content.includes('any')) {
            suggestions.push({
                type: 'typescript',
                message: 'Consider replacing "any" with more specific types',
                filePath,
                severity: 'suggestion',
                fix: 'Replace "any" with appropriate interface or type'
            });
        }
        if (content.includes('forEach') && content.includes('async')) {
            suggestions.push({
                type: 'performance',
                message: 'Consider using Promise.all with map for parallel async operations',
                filePath,
                severity: 'suggestion',
                fix: 'Replace forEach with Promise.all(items.map(async item => ...))'
            });
        }
        return suggestions;
    }
    async verifyHtml(filePath, content, errors, warnings, suggestions) {
        // Basic structure checks
        if (!content.includes('<!DOCTYPE html>')) {
            warnings.push({
                type: 'doctype_missing',
                message: 'Missing DOCTYPE declaration',
                filePath,
                severity: 'warning',
                fix: 'Add <!DOCTYPE html> at the start of the file'
            });
        }
        // Check meta tags
        if (!content.includes('<meta charset=')) {
            warnings.push({
                type: 'charset_missing',
                message: 'Missing charset meta tag',
                filePath,
                severity: 'warning',
                fix: 'Add <meta charset="UTF-8"> in the head section'
            });
        }
        // Check for unclosed tags
        const openTags = this.extractOpenTags(content);
        const unclosedTags = this.findUnclosedTags(openTags);
        if (unclosedTags.length > 0) {
            errors.push({
                type: 'unclosed_tags',
                message: `Unclosed tags found: ${unclosedTags.join(', ')}`,
                filePath,
                severity: 'error',
                fix: 'Add closing tags for: ' + unclosedTags.join(', ')
            });
        }
        // Accessibility checks
        this.checkAccessibility(content, filePath, warnings, suggestions);
    }
    async verifyCss(filePath, content, errors, warnings, suggestions) {
        // Check for syntax errors
        const syntaxErrors = this.findCssSyntaxErrors(content);
        errors.push(...syntaxErrors.map(error => ({
            type: 'css_syntax',
            message: error.message,
            line: error.line,
            filePath,
            severity: 'error',
            fix: error.fix
        })));
        // Find unused selectors
        const unusedSelectors = await this.findUnusedSelectors(filePath, content);
        if (unusedSelectors.length > 0) {
            warnings.push({
                type: 'unused_selectors',
                message: `Unused selectors found: ${unusedSelectors.join(', ')}`,
                filePath,
                severity: 'warning',
                fix: 'Remove or use these selectors: ' + unusedSelectors.join(', ')
            });
        }
        // Check for best practices
        this.checkCssBestPractices(content, filePath, warnings, suggestions);
    }
    async verifyFileRelationships(files, errors, warnings, suggestions) {
        const htmlFiles = files.filter(f => f.filePath.endsWith('.html'));
        const cssFiles = files.filter(f => f.filePath.endsWith('.css'));
        // Check CSS references in HTML files
        for (const htmlFile of htmlFiles) {
            if (!htmlFile.content) {
                continue;
            }
            const linkedCssFiles = this.extractCssLinks(htmlFile.content);
            for (const cssPath of linkedCssFiles) {
                const cssExists = cssFiles.some(f => f.filePath.endsWith(cssPath));
                if (!cssExists) {
                    errors.push({
                        type: 'missing_css',
                        message: `Referenced CSS file "${cssPath}" not found`,
                        filePath: htmlFile.filePath,
                        severity: 'error',
                        fix: `Update or add the CSS file: ${cssPath}`
                    });
                }
            }
        }
    }
    extractOpenTags(content) {
        const tagRegex = /<([a-zA-Z0-9]+)(?:\s[^>]*)?>/g;
        const matches = [...content.matchAll(tagRegex)];
        return matches.map(match => match[1]);
    }
    findUnclosedTags(openTags) {
        const tagStack = [];
        const unclosed = [];
        for (const tag of openTags) {
            if (this.isSelfClosingTag(tag)) {
                continue;
            }
            if (this.isClosingTag(tag)) {
                if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tag) {
                    unclosed.push(tag);
                }
                else {
                    tagStack.pop();
                }
            }
            else {
                tagStack.push(tag);
            }
        }
        return [...unclosed, ...tagStack];
    }
    isSelfClosingTag(tag) {
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        return selfClosingTags.includes(tag.toLowerCase());
    }
    isClosingTag(tag) {
        return tag.startsWith('/');
    }
    findCssSyntaxErrors(content) {
        const errors = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            // Check for missing semicolons
            if (line.trim().length > 0 && !line.includes('{') && !line.includes('}') && !line.trim().endsWith(';')) {
                errors.push({
                    message: 'Missing semicolon',
                    line: index + 1,
                    fix: `Add semicolon at the end: ${line.trim()};`
                });
            }
            // Check for invalid properties
            if (line.includes(':')) {
                const [prop] = line.split(':');
                if (!this.isValidCssProperty(prop.trim())) {
                    errors.push({
                        message: `Invalid CSS property: ${prop.trim()}`,
                        line: index + 1,
                        fix: `Check property name: ${prop.trim()}`
                    });
                }
            }
        });
        return errors;
    }
    async findUnusedSelectors(filePath, content) {
        const selectors = this.extractCssSelectors(content);
        const unusedSelectors = [];
        // Get all HTML files in workspace
        const htmlFiles = await vscode.workspace.findFiles('**/*.html');
        for (const selector of selectors) {
            let used = false;
            for (const htmlFile of htmlFiles) {
                const htmlContent = await this.fileManager.getFileContent(htmlFile.fsPath);
                if (htmlContent?.includes(selector)) {
                    used = true;
                    break;
                }
            }
            if (!used) {
                unusedSelectors.push(selector);
            }
        }
        return unusedSelectors;
    }
    extractCssSelectors(content) {
        const selectorRegex = /([.#][a-zA-Z0-9_-]+)[^{]*/g;
        const matches = [...content.matchAll(selectorRegex)];
        return matches.map(m => m[1].trim());
    }
    extractCssLinks(content) {
        const linkRegex = /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/g;
        const matches = [...content.matchAll(linkRegex)];
        return matches.map(m => m[1]);
    }
    isValidCssProperty(prop) {
        // Add more properties as needed
        const validProperties = [
            'color', 'background', 'margin', 'padding', 'border',
            'font-size', 'font-family', 'width', 'height', 'display',
            'position', 'top', 'right', 'bottom', 'left', 'z-index',
            'flex', 'grid', 'gap', 'transition', 'transform'
        ];
        return validProperties.includes(prop.toLowerCase());
    }
    checkAccessibility(content, filePath, warnings, suggestions) {
        // Check for alt attributes on images
        if (content.includes('<img') && !content.includes('alt=')) {
            warnings.push({
                type: 'accessibility',
                message: 'Images should have alt attributes',
                filePath,
                severity: 'warning',
                fix: 'Add alt attributes to <img> tags'
            });
        }
        // Check for ARIA labels
        if (content.includes('role=') && !content.includes('aria-label')) {
            suggestions.push({
                type: 'accessibility',
                message: 'Elements with roles should have ARIA labels',
                filePath,
                severity: 'suggestion',
                fix: 'Add aria-label attributes to elements with roles'
            });
        }
    }
    checkCssBestPractices(content, filePath, warnings, suggestions) {
        // Check for !important usage
        if (content.includes('!important')) {
            warnings.push({
                type: 'css_practice',
                message: 'Avoid using !important',
                filePath,
                severity: 'warning',
                fix: 'Refactor CSS to avoid !important by using more specific selectors'
            });
        }
        // Check for vendor prefixes
        if (content.includes('-webkit-') || content.includes('-moz-') || content.includes('-ms-')) {
            suggestions.push({
                type: 'css_practice',
                message: 'Consider using a CSS preprocessor or autoprefixer',
                filePath,
                severity: 'suggestion',
                fix: 'Use a build tool with autoprefixer to handle vendor prefixes'
            });
        }
    }
    formatVerificationMessages(errors, warnings, suggestions, messages) {
        if (errors.length > 0) {
            messages.push('\n❌ Errors:');
            errors.forEach(error => {
                messages.push(`- ${error.message}${error.fix ? `\n  Fix: ${error.fix}` : ''}`);
            });
        }
        if (warnings.length > 0) {
            messages.push('\n⚠️ Warnings:');
            warnings.forEach(warning => {
                messages.push(`- ${warning.message}${warning.fix ? `\n  Fix: ${warning.fix}` : ''}`);
            });
        }
        if (suggestions.length > 0) {
            messages.push('\n💡 Suggestions:');
            suggestions.forEach(suggestion => {
                messages.push(`- ${suggestion.message}${suggestion.fix ? `\n  Fix: ${suggestion.fix}` : ''}`);
            });
        }
    }
}
exports.VerificationAgent = VerificationAgent;
//# sourceMappingURL=verificationAgent.js.map