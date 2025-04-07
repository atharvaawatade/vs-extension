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
exports.SarpachAgent = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fileManager_1 = require("../fileManager");
const documentationAgent_1 = require("./pluginAgents/documentationAgent");
class SarpachAgent {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.apiKey = 'AIzaSyBSu-Z0y_h1vSIoZEW6o8loDxp9V8Ylarg';
        this.modelName = 'gemini-2.0-flash'; // Ensure consistent model usage
        this.fileManager = new fileManager_1.FileSystemManager(workspaceRoot);
        this.documentationAgent = new documentationAgent_1.DocumentationAgent(workspaceRoot, this.fileManager, this.apiKey, this.modelName);
    }
    async getLLMSuggestion(filePath, content, instruction) {
        const ext = path.extname(filePath).slice(1);
        const prompt = `You are an expert ${ext} developer. Modify or create code based on:

CONTEXT:
File: ${filePath}
Language: ${ext}
Task: ${instruction}

REQUIREMENTS:
1. Return ONLY valid ${ext} code without any markdown or comments
2. Follow ${ext} best practices and conventions
3. Ensure code is complete, formatted, and importable
4. Preserve existing functionality unless explicitly asked to change
5. Use idiomatic patterns for ${ext}

${content ? `CURRENT CODE:\n${content}\n` : ''}
MODIFIED CODE:`;
        const response = await this.callLLM(prompt);
        return this.cleanResponse(response, ext);
    }
    cleanResponse(response, fileType) {
        // Remove markdown code fences
        let cleanedResponse = response
            .replace(/^```[a-z]*\n/, '') // Remove markdown code block start
            .replace(/```$/, '') // Remove markdown code block end
            .trim();
        // Additional cleaning based on file type if needed
        if (fileType === 'go') {
            cleanedResponse = cleanedResponse.replace(/package main\n/, '');
        }
        return cleanedResponse;
    }
    async processUserInput(input) {
        // Check if user is requesting file content first
        if (input.startsWith('show') || input.includes('content of')) {
            return await this.handleFileContentRequest(input);
        }
        // Handle file modification requests
        if (input.includes('@')) {
            return await this.handleFileModification(input);
        }
        // First, analyze intent
        const intentAnalysis = await this.analyzeIntent(input);
        let thinking = `🤔 Understanding request...\n`;
        thinking += `Intent: ${intentAnalysis.type} (${Math.round(intentAnalysis.confidence * 100)}% confident)\n`;
        if (intentAnalysis.files.length > 0) {
            // Verify file existence and get content
            const fileStatuses = await Promise.all(intentAnalysis.files.map(async (file) => {
                const exists = await this.fileManager.exists(file);
                const content = exists ? await this.fileManager.getFileContent(file) : null;
                return { file, exists, content };
            }));
            thinking += `Files found:\n${fileStatuses.map(f => `${f.exists ? '✓' : '✗'} ${f.file}`).join('\n')}\n`;
        }
        // Generate and execute command
        let command;
        let result = '';
        if (intentAnalysis.type !== 'unknown') {
            command = this.generateCommand(intentAnalysis);
            thinking += `Converting to command: ${command}\n`;
            result = await this.executeCommand(command);
        }
        else {
            result = await this.getDirectResponse(input);
        }
        return { thinking, command, result };
    }
    async handleFileContentRequest(input) {
        const fileMatch = input.match(/@([^\s]+)/);
        if (!fileMatch) {
            return {
                thinking: '🔍 Searching for file reference...',
                result: 'Please specify a file using @ symbol (e.g., @filename.js)'
            };
        }
        const filePath = fileMatch[1];
        const content = await this.fileManager.getFileContent(filePath);
        if (!content) {
            return {
                thinking: `🔍 Looking for ${filePath}...`,
                result: `File ${filePath} not found.`
            };
        }
        return {
            thinking: `📂 Reading ${filePath}...`,
            fileContent: content,
            result: `Content of ${filePath}:`
        };
    }
    async handleFileModification(input) {
        // Extract all file references using regex
        const fileMatches = Array.from(input.matchAll(/@([^\s]+)/g));
        if (!fileMatches.length) {
            return {
                thinking: '🔍 Analyzing request...',
                result: 'No valid file references found'
            };
        }
        const filePaths = fileMatches.map(match => match[1]);
        const instruction = input.replace(/@\S+/g, '').trim();
        // Get status for all files
        const fileStatuses = await Promise.all(filePaths.map(async (filePath) => {
            const exists = await this.fileManager.exists(filePath);
            const content = exists ? await this.fileManager.getFileContent(filePath) : null;
            const ext = path.extname(filePath).slice(1);
            return { filePath, exists, content, ext };
        }));
        let thinking = '🔎 Processing files:\n';
        thinking += fileStatuses.map(f => `${f.exists ? '📄' : '🆕'} ${f.filePath}`).join('\n');
        // Generate batch command for multiple files
        const command = fileStatuses.some(f => !f.exists)
            ? `#create ${filePaths.map(f => '@' + f).join(' ')} ${instruction}`
            : `#edit ${filePaths.map(f => '@' + f).join(' ')} ${instruction}`;
        // Execute command
        const result = await this.executeCommand(command);
        // Basic post-change validation
        const postCheckResults = await this.basicFileCheck(filePaths);
        return {
            thinking: thinking + '\n' + postCheckResults.details,
            command,
            result: postCheckResults.success ? result : '❌ Changes require review'
        };
    }
    async analyzeIntent(input) {
        // Update documentation patterns to be more flexible
        const docPatterns = [
            /^(create|generate|make)\s+(a\s+)?docum?e?n?t?(ation)?/i,
            /^document(ation)?\s+(the\s+)?(project|code|files)/i,
            /^create\s+(project\s+)?docs?/i,
            /^document(\s+this)?$/i
        ];
        if (docPatterns.some(pattern => pattern.test(input))) {
            return {
                type: 'document',
                files: [],
                instruction: input,
                confidence: 0.95
            };
        }
        // If input is too ambiguous, ask for clarification
        if (input.toLowerCase().includes('document') || input.toLowerCase().includes('doc')) {
            const prompt = `Analyze if this is a documentation request: "${input}"
            Respond with confidence score (0-1) and whether this is a documentation request.
            Format: { "isDocRequest": boolean, "confidence": number }`;
            try {
                const response = await this.callLLM(prompt);
                const result = JSON.parse(response);
                if (result.isDocRequest && result.confidence > 0.7) {
                    return {
                        type: 'document',
                        files: [],
                        instruction: input,
                        confidence: result.confidence
                    };
                }
            }
            catch (error) {
                console.error('Error analyzing doc request:', error);
            }
        }
        const prompt = `
        You are Sarpach, an AI agent specializing in code operations. Analyze this user input:
        "${input}"
        
        Determine the user's intent and respond in JSON format:
        {
            "type": "edit|create|tree|analyze|unknown",
            "files": ["list", "of", "files"],
            "instruction": "clear instruction",
            "confidence": 0.0-1.0
        }
        
        Rules:
        - If input mentions existing files with @, they go in files array
        - For file operations, extract clear instruction
        - High confidence (>0.8) for clear intents
        - Low confidence (<0.5) for ambiguous requests
        Only respond with the JSON, no other text.`;
        const response = await this.callLLM(prompt);
        try {
            return JSON.parse(response);
        }
        catch (error) {
            return {
                type: 'unknown',
                files: [],
                instruction: input,
                confidence: 0.3
            };
        }
    }
    generateCommand(intent) {
        switch (intent.type) {
            case 'edit':
                return `#edit ${intent.files.map(f => '@' + f).join(' ')} ${intent.instruction}`;
            case 'create':
                return `#create ${intent.files.map(f => '@' + f).join(' ')} ${intent.instruction}`;
            case 'tree':
                return '@tree';
            case 'analyze':
                return `#explain ${intent.files.map(f => '@' + f).join(' ')}`;
            case 'document':
                return '#documentation'; // Make sure this matches the command handler
            default:
                return '';
        }
    }
    async getDirectResponse(input) {
        const prompt = `You are Sarpach, a coding assistant. Provide a helpful response to: "${input}"
        Be concise but informative. Include code examples if relevant.`;
        return await this.callLLM(prompt);
    }
    // File Management Methods
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
    // ... more file management methods from FileManager
    // (Include all the methods from FileManager.ts here)
    async callLLM(prompt) {
        const requestData = JSON.stringify({
            contents: [{
                    parts: [{ text: prompt }]
                }],
            generationConfig: {
                temperature: 0.2,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192
            }
        });
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                            resolve(response.candidates[0].content.parts[0].text);
                        }
                        else {
                            reject('No valid response from LLM');
                        }
                    }
                    catch (e) {
                        reject(`Error parsing LLM response: ${e}`);
                    }
                });
            });
            req.on('error', e => reject(`API request failed: ${e.message}`));
            req.write(requestData);
            req.end();
        });
    }
    async executeCommand(command) {
        try {
            // Documentation command handling
            if (command === '#documentation') {
                return await this.handleDocumentationCommand();
            }
            if (command.startsWith('#create') || command.startsWith('#edit')) {
                const { files, content, instruction } = this.parseCommand(command);
                const results = [];
                for (const file of files) {
                    const exists = await this.fileManager.exists(file);
                    if (command.startsWith('#create') && exists) {
                        results.push(`⚠️ File ${file} already exists, skipping`);
                        continue;
                    }
                    if (command.startsWith('#edit') && !exists) {
                        results.push(`⚠️ File ${file} does not exist, creating new`);
                    }
                    // Get file-specific content from LLM
                    const fileContent = await this.getLLMSuggestion(file, exists ? (await this.fileManager.getFileContent(file)) || '' : '', instruction);
                    // Apply changes
                    const success = await this.fileManager.editFile(file, fileContent);
                    results.push(`${success ? '✅' : '❌'} ${file}`);
                }
                return `Operation results:\n${results.join('\n')}`;
            }
            return `Executing: ${command}`;
        }
        catch (error) {
            return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    async handleDocumentationCommand() {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "📝 Generating Documentation",
            cancellable: true
        }, async (progress, token) => {
            try {
                const steps = [
                    { message: "🔍 Analyzing project structure...", increment: 20 },
                    { message: "📊 Processing files...", increment: 40 },
                    { message: "🤖 Generating documentation...", increment: 30 },
                    { message: "💾 Saving documentation...", increment: 10 }
                ];
                // Process with delays to show progress
                for (const step of steps) {
                    if (token.isCancellationRequested) {
                        return '❌ Documentation generation cancelled';
                    }
                    progress.report({
                        message: step.message,
                        increment: step.increment
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                const projectName = path.basename(this.workspaceRoot);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const outputDir = path.join(this.workspaceRoot, 'documentation');
                await fs.promises.mkdir(outputDir, { recursive: true });
                const outputPath = path.join(outputDir, `${projectName}_docs_${timestamp}.txt`);
                const result = await this.documentationAgent.generateDocumentation({
                    outputPath,
                    includeTests: false,
                    includeComments: true
                });
                return `✅ Documentation generated successfully!\n\n` +
                    `📂 Location: ${result}\n\n` +
                    `The documentation has been saved as a text file with comprehensive analysis of your project.`;
            }
            catch (error) {
                console.error('Documentation generation error:', error);
                return `❌ Failed to generate documentation: ${error instanceof Error ? error.message : String(error)}`;
            }
        });
    }
    parseCommand(command) {
        const parts = command.split(' ');
        const files = parts.filter(p => p.startsWith('@')).map(p => p.slice(1));
        const instruction = parts.slice(files.length + 1).join(' ');
        return { files, content: '', instruction };
    }
    async getSuggestions(text) {
        const suggestions = [];
        // Dynamic command suggestions based on context
        if (text.startsWith('#')) {
            suggestions.push({
                command: '#create',
                description: 'Create new files'
            }, {
                command: '#edit',
                description: 'Edit existing files'
            }, {
                command: '#explain',
                description: 'Analyze and explain code'
            });
        }
        else if (text.startsWith('@')) {
            // Get matching files
            const files = await this.fileManager.searchFiles(text.slice(1));
            for (const file of files) {
                const ext = path.extname(file);
                const actions = this.getFileTypeActions(ext);
                suggestions.push({
                    command: `@${file}`,
                    description: 'Show file content'
                }, ...actions.map(action => ({
                    command: `@${file} ${action.command}`,
                    description: action.description
                })));
            }
        }
        return suggestions.filter(s => s.command.toLowerCase().includes(text.toLowerCase()));
    }
    getFileTypeActions(ext) {
        const commonActions = [
            { command: 'optimize', description: 'Optimize code' },
            { command: 'add comments', description: 'Add documentation' }
        ];
        switch (ext) {
            case '.ts':
            case '.js':
                return [
                    { command: 'add types', description: 'Add TypeScript types' },
                    { command: 'add error handling', description: 'Add try-catch blocks' },
                    ...commonActions
                ];
            case '.html':
                return [
                    { command: 'add responsive', description: 'Make responsive' },
                    { command: 'add accessibility', description: 'Improve accessibility' },
                    ...commonActions
                ];
            case '.css':
                return [
                    { command: 'add dark theme', description: 'Add dark theme support' },
                    { command: 'add animations', description: 'Add animations' },
                    ...commonActions
                ];
            default:
                return commonActions;
        }
    }
    async applyFileEdit(filePath, newContent) {
        try {
            // Log the edit operation
            const exists = await this.fileManager.exists(filePath);
            const operation = exists ? 'Modifying' : 'Creating';
            console.log(`${operation} file: ${filePath}`);
            // Apply the edit
            return await this.fileManager.editFile(filePath, await newContent);
        }
        catch (error) {
            console.error('Error applying file edit:', error);
            return false;
        }
    }
    async basicFileCheck(filePaths) {
        const details = [];
        let success = true;
        for (const filePath of filePaths) {
            const content = await this.fileManager.getFileContent(filePath);
            if (!content) {
                success = false;
                details.push(`❌ Unable to verify ${filePath}: File not found or empty`);
                continue;
            }
            details.push(`✓ ${filePath} updated successfully`);
        }
        return {
            success,
            details: details.join('\n')
        };
    }
}
exports.SarpachAgent = SarpachAgent;
//# sourceMappingURL=sarpachAgent.js.map