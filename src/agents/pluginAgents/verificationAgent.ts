import * as vscode from 'vscode';
import * as path from 'path';
import { FileSystemManager } from '../../fileManager';

interface VerificationResult {
    isValid: boolean;
    messages: string[];
    details?: {
        errors: VerificationError[];
        warnings: VerificationWarning[];
        suggestions: VerificationSuggestion[];
    };
}

interface VerificationError {
    type: string;
    message: string;
    line?: number;
    filePath: string;
    severity: 'error';
    fix?: string;
}

interface VerificationWarning {
    type: string;
    message: string;
    line?: number;
    filePath: string;
    severity: 'warning';
    fix?: string;
}

interface VerificationSuggestion {
    type: string;
    message: string;
    line?: number;
    filePath: string;
    severity: 'suggestion';
    fix?: string;
}

export class VerificationAgent {
    private verificationBuffer: Map<string, { timestamp: number, result: VerificationResult }> = new Map();
    private readonly BUFFER_TIMEOUT = 5000; // 5 seconds buffer

    constructor(
        private workspaceRoot: string,
        private fileManager: FileSystemManager
    ) {}

    async verifyFiles(files: Array<{ filePath: string; content: string | null }>): Promise<VerificationResult> {
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

    private getBufferKey(files: Array<{ filePath: string; content: string | null }>): string {
        return files.map(f => `${f.filePath}:${f.content?.length || 0}`).join('|');
    }

    private getBufferedResults(files: Array<{ filePath: string; content: string | null }>): VerificationResult | null {
        const key = this.getBufferKey(files);
        const cached = this.verificationBuffer.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < this.BUFFER_TIMEOUT) {
            return cached.result;
        }

        // Clean old entries
        this.cleanBuffer();
        return null;
    }

    private cleanBuffer(): void {
        const now = Date.now();
        for (const [key, value] of this.verificationBuffer.entries()) {
            if (now - value.timestamp > this.BUFFER_TIMEOUT) {
                this.verificationBuffer.delete(key);
            }
        }
    }

    private async performVerification(files: Array<{ filePath: string; content: string | null }>): Promise<VerificationResult> {
        // Add real-time syntax checking using TypeScript/JavaScript services
        const errors: VerificationError[] = [];
        const warnings: VerificationWarning[] = [];
        const suggestions: VerificationSuggestion[] = [];
        const messages: string[] = [];

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
                    severity: diagnostic.severity === vscode.DiagnosticSeverity.Error ? 'error' as const : 'warning' as const,
                    fix: diagnostic.relatedInformation?.[0]?.message
                };

                if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                    errors.push(issue as VerificationError);
                } else {
                    warnings.push(issue as VerificationWarning);
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

    private async generateIntelligentSuggestions(filePath: string, content: string | null): Promise<VerificationSuggestion[]> {
        if (!content) {return [];}

        const suggestions: VerificationSuggestion[] = [];
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

    private generateHtmlSuggestions(content: string, filePath: string): VerificationSuggestion[] {
        const suggestions: VerificationSuggestion[] = [];

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

    private generateCssSuggestions(content: string, filePath: string): VerificationSuggestion[] {
        const suggestions: VerificationSuggestion[] = [];

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

    private async generateTypescriptSuggestions(content: string, filePath: string): Promise<VerificationSuggestion[]> {
        const suggestions: VerificationSuggestion[] = [];

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

    private async verifyHtml(filePath: string, content: string, errors: VerificationError[], warnings: VerificationWarning[], suggestions: VerificationSuggestion[]) {
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

    private async verifyCss(filePath: string, content: string, errors: VerificationError[], warnings: VerificationWarning[], suggestions: VerificationSuggestion[]) {
        // Check for syntax errors
        const syntaxErrors = this.findCssSyntaxErrors(content);
        errors.push(...syntaxErrors.map(error => ({
            type: 'css_syntax',
            message: error.message,
            line: error.line,
            filePath,
            severity: 'error' as const,
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

    private async verifyFileRelationships(files: Array<{ filePath: string; content: string | null }>, errors: VerificationError[], warnings: VerificationWarning[], suggestions: VerificationSuggestion[]) {
        const htmlFiles = files.filter(f => f.filePath.endsWith('.html'));
        const cssFiles = files.filter(f => f.filePath.endsWith('.css'));

        // Check CSS references in HTML files
        for (const htmlFile of htmlFiles) {
            if (!htmlFile.content) {continue;}

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

    private extractOpenTags(content: string): string[] {
        const tagRegex = /<([a-zA-Z0-9]+)(?:\s[^>]*)?>/g;
        const matches = [...content.matchAll(tagRegex)];
        return matches.map(match => match[1]);
    }

    private findUnclosedTags(openTags: string[]): string[] {
        const tagStack: string[] = [];
        const unclosed: string[] = [];

        for (const tag of openTags) {
            if (this.isSelfClosingTag(tag)) {continue;}
            
            if (this.isClosingTag(tag)) {
                if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tag) {
                    unclosed.push(tag);
                } else {
                    tagStack.pop();
                }
            } else {
                tagStack.push(tag);
            }
        }

        return [...unclosed, ...tagStack];
    }

    private isSelfClosingTag(tag: string): boolean {
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        return selfClosingTags.includes(tag.toLowerCase());
    }

    private isClosingTag(tag: string): boolean {
        return tag.startsWith('/');
    }

    private findCssSyntaxErrors(content: string): Array<{ message: string; line: number; fix: string }> {
        const errors: Array<{ message: string; line: number; fix: string }> = [];
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

    private async findUnusedSelectors(filePath: string, content: string): Promise<string[]> {
        const selectors = this.extractCssSelectors(content);
        const unusedSelectors: string[] = [];

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

    private extractCssSelectors(content: string): string[] {
        const selectorRegex = /([.#][a-zA-Z0-9_-]+)[^{]*/g;
        const matches = [...content.matchAll(selectorRegex)];
        return matches.map(m => m[1].trim());
    }

    private extractCssLinks(content: string): string[] {
        const linkRegex = /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/g;
        const matches = [...content.matchAll(linkRegex)];
        return matches.map(m => m[1]);
    }

    private isValidCssProperty(prop: string): boolean {
        // Add more properties as needed
        const validProperties = [
            'color', 'background', 'margin', 'padding', 'border',
            'font-size', 'font-family', 'width', 'height', 'display',
            'position', 'top', 'right', 'bottom', 'left', 'z-index',
            'flex', 'grid', 'gap', 'transition', 'transform'
        ];
        return validProperties.includes(prop.toLowerCase());
    }

    private checkAccessibility(content: string, filePath: string, warnings: VerificationWarning[], suggestions: VerificationSuggestion[]) {
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

    private checkCssBestPractices(content: string, filePath: string, warnings: VerificationWarning[], suggestions: VerificationSuggestion[]) {
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

    private formatVerificationMessages(errors: VerificationError[], warnings: VerificationWarning[], suggestions: VerificationSuggestion[], messages: string[]) {
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
