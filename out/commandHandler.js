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
exports.CommandHandler = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fileManager_1 = require("./fileManager");
const sarpachAgent_1 = require("./agents/sarpachAgent");
class CommandHandler {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._apiKey = 'AIzaSyBSu-Z0y_h1vSIoZEW6o8loDxp9V8Ylarg';
        this._modelName = 'gemini-2.0-flash';
        this.fileManager = new fileManager_1.FileSystemManager(workspaceRoot);
        this.sarpachAgent = new sarpachAgent_1.SarpachAgent(workspaceRoot);
    }
    async handleCommand(input) {
        try {
            // Direct command handling (starting with # or @)
            if (input.startsWith('#') || input.startsWith('@')) {
                return await this.handleDirectCommand(input);
            }
            // Natural language processing through Sarpach
            const result = await this.sarpachAgent.processUserInput(input);
            // Format the response nicely
            let message = result.thinking + '\n\n';
            // Add file content in a code block if present
            if (result.fileContent) {
                message += '### Current Content\n';
                message += `\`\`\`${result.fileExtension || ''}\n${result.fileContent}\n\`\`\`\n\n`;
            }
            // Add command that will be executed
            if (result.command) {
                message += `### Executing Command\n\`${result.command}\`\n\n`;
            }
            // Add the result
            message += `### Result\n${result.result}`;
            return {
                status: 'done',
                message
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                status: 'error',
                message: `Error processing command: ${errorMessage}`
            };
        }
    }
    async handleDirectCommand(command) {
        // Documentation command handling - prioritize this check
        if (command === '#documentation') {
            return {
                status: 'thinking',
                message: '📝 Starting documentation generation process...'
            };
        }
        // Handle documentation command
        if (command === '#documentation') {
            return {
                status: 'thinking',
                message: 'Preparing to generate documentation...'
            };
        }
        // Handle # commands
        if (command.startsWith('#')) {
            return await this.handleHashCommand(command);
        }
        if (command === '@tree') {
            return await this.handleTreeCommand();
        }
        if (command.startsWith('@open ')) {
            const filePath = command.replace('@open ', '').trim();
            return await this.handleOpenFile(filePath);
        }
        if (command.startsWith('@')) {
            const match = command.slice(1).match(/^(\S+)\s*(.*)/);
            if (!match) {
                return 'Invalid command format. Use @filename instruction';
            }
            const [filePath, instruction] = match.slice(1);
            return await this.handleModifyFile([filePath], instruction);
        }
        return 'Available commands:\n@tree - Show file structure\n@open <file> - View file\n@<file> <instruction> - Modify file';
    }
    isCommandResponse(response) {
        return typeof response !== 'string' && 'status' in response;
    }
    async handleHashCommand(command) {
        const [cmd, ...args] = command.slice(1).split(' ');
        if (cmd === 'edit' || cmd === 'create') {
            const filePatterns = [];
            const instructionParts = [];
            let parsingFiles = true;
            for (const arg of args) {
                if (arg.startsWith('@') && parsingFiles) {
                    filePatterns.push(arg.slice(1));
                }
                else {
                    parsingFiles = false;
                    instructionParts.push(arg);
                }
            }
            if (filePatterns.length === 0) {
                return {
                    status: 'error',
                    message: 'No files specified'
                };
            }
            // Add file validation and suggestion
            const { validFiles, suggestions } = await this.validateFilePaths(filePatterns);
            if (validFiles.length === 0) {
                let errorMessage = 'No valid files found.\n';
                if (suggestions.length > 0) {
                    errorMessage += '\nDid you mean:\n' + suggestions.map(s => `- ${s}`).join('\n');
                }
                return {
                    status: 'error',
                    message: errorMessage
                };
            }
            const instruction = instructionParts.join(' ');
            if (!instruction) {
                return {
                    status: 'error',
                    message: 'No instruction provided'
                };
            }
            if (cmd === 'edit') {
                return await this.handleEditCommand(validFiles, instruction);
            }
            else {
                return await this.handleCreateCommand(validFiles, instruction);
            }
        }
        // First check if we need a file and if it exists
        if (cmd !== 'create' && args[0]) {
            const filePath = args[0]?.startsWith('@') ? args[0].slice(1) : args[0];
            const fullPath = path.join(this.workspaceRoot, filePath);
            if (!fs.existsSync(fullPath)) {
                return {
                    status: 'error',
                    message: `File "${filePath}" not found`
                };
            }
        }
        switch (cmd.toLowerCase()) {
            case 'edit':
                return await this.handleEditCommand(args, args.slice(1).join(' '));
            case 'create':
                return await this.handleCreateCommand([args[0]], args.slice(1).join(' '));
            case 'open':
                return {
                    status: 'done',
                    message: "We are developing it."
                };
            case 'explain':
                return await this.handleExplainCommand(args[0]);
            default:
                return {
                    status: 'error',
                    message: `Unknown command: ${cmd}`
                };
        }
    }
    async validateFilePaths(patterns) {
        const validFiles = [];
        const suggestions = [];
        const existingFiles = await this.getExistingFiles();
        for (const pattern of patterns) {
            // Check for exact match
            if (existingFiles.includes(pattern)) {
                validFiles.push(pattern);
                continue;
            }
            // Check for case-insensitive match
            const lowerPattern = pattern.toLowerCase();
            const match = existingFiles.find(f => f.toLowerCase() === lowerPattern);
            if (match) {
                validFiles.push(match);
                suggestions.push(match);
                continue;
            }
            // Find similar files for suggestions
            const similarFiles = existingFiles.filter(f => f.toLowerCase().includes(lowerPattern) ||
                this.calculateLevenshteinDistance(f.toLowerCase(), lowerPattern) <= 2);
            if (similarFiles.length > 0) {
                suggestions.push(...similarFiles);
            }
            // If it's a new file with valid extension, allow it
            if (pattern.includes('.')) {
                validFiles.push(pattern);
            }
        }
        return { validFiles, suggestions: [...new Set(suggestions)] };
    }
    async getExistingFiles() {
        const files = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**');
        return files.map(f => vscode.workspace.asRelativePath(f));
    }
    calculateLevenshteinDistance(a, b) {
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= b.length; j++) {
            matrix[j][0] = j;
        }
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const substitute = matrix[j - 1][i - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0);
                matrix[j][i] = Math.min(matrix[j - 1][i] + 1, matrix[j][i - 1] + 1, substitute);
            }
        }
        return matrix[b.length][a.length];
    }
    async resolveFilePatterns(patterns) {
        const workspaceFiles = new Set();
        const nonExistingFiles = new Set();
        for (const pattern of patterns) {
            try {
                // First try to find existing files
                const files = await vscode.workspace.findFiles(`**/${pattern}`, '**/node_modules/**');
                if (files.length > 0) {
                    files.forEach(file => {
                        workspaceFiles.add(vscode.workspace.asRelativePath(file));
                    });
                }
                else {
                    // If no files found, treat as a new file path
                    const fullPath = path.join(this.workspaceRoot, pattern);
                    const relativePath = vscode.workspace.asRelativePath(fullPath);
                    nonExistingFiles.add(relativePath);
                }
            }
            catch (error) {
                console.error(`Error resolving pattern ${pattern}:`, error);
            }
        }
        // Combine existing and non-existing files
        return [...Array.from(workspaceFiles), ...Array.from(nonExistingFiles)];
    }
    async handleEditCommand(filePaths, instruction) {
        try {
            for (const filePath of filePaths) {
                const cleanPath = filePath.startsWith('@') ? filePath.slice(1) : filePath;
                const fullPath = path.join(this.workspaceRoot, cleanPath);
                let content = '';
                let isNewFile = false;
                // Check if file exists
                try {
                    content = await fs.promises.readFile(fullPath, 'utf8');
                }
                catch {
                    isNewFile = true;
                }
                // Generate new content
                const newContent = await this.getLLMSuggestion(cleanPath, content, `${isNewFile ? 'Create new file with' : 'Modify existing code to'}: ${instruction}`);
                // Ensure directory exists
                await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                // Write the file
                await fs.promises.writeFile(fullPath, newContent);
            }
            return {
                status: 'done',
                message: `Successfully ${filePaths.length > 1 ? 'modified files' : 'modified file'}`
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: `Edit operation failed: ${error}`
            };
        }
    }
    async handleCreateCommand(filePaths, instruction) {
        try {
            const response = {
                status: 'thinking',
                message: 'Processing request...'
            };
            // Check if any files already exist
            const existingFiles = filePaths.filter(fp => fs.existsSync(path.join(this.workspaceRoot, fp)));
            if (existingFiles.length > 0) {
                return {
                    status: 'error',
                    message: `Files already exist: ${existingFiles.join(', ')}`
                };
            }
            response.status = 'generating';
            response.message = 'Generating content...';
            // Generate content for each file
            const fileContents = new Map();
            for (const filePath of filePaths) {
                const content = await this.getLLMSuggestion(filePath, '', instruction);
                fileContents.set(filePath, content);
            }
            response.status = 'applying';
            response.message = 'Creating files...';
            // Create all files
            for (const [filePath, content] of fileContents) {
                const uri = vscode.Uri.file(path.join(this.workspaceRoot, filePath));
                // Create directory if needed
                const dir = path.dirname(uri.fsPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                // Write file
                await fs.promises.writeFile(uri.fsPath, content, 'utf8');
            }
            // Format success message
            let resultMessage = `✅ Created ${fileContents.size} files:\n\n`;
            for (const [filePath, content] of fileContents) {
                resultMessage += `### ${filePath}\n`;
                resultMessage += '```' + path.extname(filePath).slice(1) + '\n';
                resultMessage += content + '\n```\n\n';
            }
            return {
                status: 'done',
                message: resultMessage
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: `Error: ${error}`
            };
        }
    }
    async handleExplainCommand(filePath) {
        try {
            // Clean up file path
            const cleanPath = filePath.startsWith('@') ? filePath.slice(1) : filePath;
            const fullPath = path.join(this.workspaceRoot, cleanPath);
            // Check if file exists
            if (!fs.existsSync(fullPath)) {
                return {
                    status: 'error',
                    message: `File not found: ${cleanPath}`
                };
            }
            const content = await fs.promises.readFile(fullPath, 'utf8');
            const analysis = await this.getLLMSuggestion(cleanPath, content, 'Analyze this code and explain its functionality');
            return {
                status: 'done',
                message: `## Analysis Report for ${cleanPath}\n\n${analysis}`
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: `Analysis failed: ${error}`
            };
        }
    }
    async getLLMExplanation(filePath, content) {
        const prompt = `Explain the following code in detail:\n\nFile: ${filePath}\n\n${content}`;
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
                path: `/v1beta/models/${this._modelName}:generateContent?key=${this._apiKey}`,
                method: 'POST',
                headers: {
                    contentType: 'application/json',
                    contentLength: Buffer.byteLength(requestData)
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.candidates && response.candidates.length > 0) {
                            resolve(response.candidates[0].content.parts[0].text);
                        }
                        else {
                            reject('No response generated');
                        }
                    }
                    catch (e) {
                        reject(`Error parsing response: ${e}`);
                    }
                });
            });
            req.on('error', e => reject(`API request failed: ${e.message}`));
            req.write(requestData);
            req.end();
        });
    }
    async getSuggestions(text) {
        const suggestions = [];
        // Enhanced documentation suggestions
        if (text.toLowerCase().includes('doc') || text.toLowerCase().includes('document')) {
            suggestions.push({
                command: 'create documentation',
                description: 'Generate comprehensive project documentation'
            }, {
                command: 'document project',
                description: 'Create technical documentation'
            }, {
                command: 'generate docs',
                description: 'Create project documentation'
            });
        }
        // Basic command suggestions
        suggestions.push({
            command: '@tree',
            description: 'Show workspace file structure'
        });
        // If user is typing a file path
        if (text.length > 1) {
            try {
                // Find files that match the input
                const files = await vscode.workspace.findFiles(`**/*${text.slice(1)}*`, '**/node_modules/**');
                // Add suggestions for each matching file
                for (const file of files) {
                    const relativePath = vscode.workspace.asRelativePath(file);
                    suggestions.push({
                        command: `@${relativePath}`,
                        description: 'Edit this file'
                    }, {
                        command: `@${relativePath} add error handling`,
                        description: 'Add error handling'
                    }, {
                        command: `@${relativePath} optimize`,
                        description: 'Optimize code'
                    }, {
                        command: `@${relativePath} add comments`,
                        description: 'Add documentation'
                    });
                }
            }
            catch (error) {
                console.error('Error getting file suggestions:', error);
            }
        }
        // Filter suggestions based on input
        return suggestions.filter(s => s.command.toLowerCase().includes(text.toLowerCase()));
    }
    async handleModifyFile(filePaths, instruction) {
        try {
            const results = [];
            const fileContents = new Map();
            // Process all files in parallel
            await Promise.all(filePaths.map(async (filePath) => {
                const fullPath = path.join(this.workspaceRoot, filePath);
                try {
                    const content = await this.fileManager.getFileContent(filePath) || '';
                    fileContents.set(filePath, content);
                    results.push(`✓ Found ${filePath}`);
                }
                catch (error) {
                    results.push(`⚠️ ${filePath} will be created`);
                }
            }));
            // Generate content for all files in one LLM call
            const prompt = this.fileManager.generateEditPrompt(fileContents, instruction);
            const newContents = await this.getLLMSuggestion('', '', prompt);
            const edits = this.fileManager.parseFileEdits(newContents);
            // Apply all edits
            const editResults = await this.fileManager.applyEdits(edits, status => {
                results.push(status);
            });
            return {
                status: 'done',
                message: results.join('\n')
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: `Operation failed: ${error}`
            };
        }
    }
    async getLLMSuggestion(filePath, content, instruction) {
        const prompt = `
You are a coding assistant. You need to modify the following code based on the instruction.
Only return the complete modified code without any explanations or markdown.

File: ${filePath}
Instruction: ${instruction}

Original Code:
${content}

Modified Code:`;
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
                path: `/v1beta/models/${this._modelName}:generateContent?key=${this._apiKey}`,
                method: 'POST',
                headers: {
                    contentType: 'application/json',
                    contentLength: Buffer.byteLength(requestData)
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.candidates && response.candidates.length > 0) {
                            resolve(response.candidates[0].content.parts[0].text);
                        }
                        else {
                            reject('No response generated');
                        }
                    }
                    catch (e) {
                        reject(`Error parsing response: ${e}`);
                    }
                });
            });
            req.on('error', e => reject(`API request failed: ${e.message}`));
            req.write(requestData);
            req.end();
        });
    }
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
                path: `/v1beta/models/${this._modelName}:generateContent?key=${this._apiKey}`,
                method: 'POST',
                headers: {
                    'contentType': 'application/json',
                    'contentLength': Buffer.byteLength(requestData)
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.candidates && response.candidates.length > 0) {
                            resolve(response.candidates[0].content.parts[0].text);
                        }
                        else {
                            reject('No response generated');
                        }
                    }
                    catch (e) {
                        reject(`Error parsing response: ${e}`);
                    }
                });
            });
            req.on('error', e => reject(`API request failed: ${e.message}`));
            req.write(requestData);
            req.end();
        });
    }
    async handleTreeCommand() {
        const tree = await this.generateFileTree(this.workspaceRoot);
        return '```\n' + this.formatTree(tree) + '\n```';
    }
    formatTree(tree) {
        // Implement the logic to format the tree string if needed
        return tree;
    }
    async generateFileTree(dir, indent = '') {
        let result = '';
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
            if (file === 'node_modules' || file === '.git') {
                continue;
            }
            const filePath = path.join(dir, file);
            const stats = await fs.promises.stat(filePath);
            if (stats.isDirectory()) {
                result += `${indent}📂 ${file}\n`;
                result += await this.generateFileTree(filePath, indent + '  ');
            }
            else {
                result += `${indent}📄 ${file}\n`;
            }
        }
        return result;
    }
    async handleOpenFile(filePath) {
        const fullPath = path.join(this.workspaceRoot, filePath);
        try {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            const ext = path.extname(filePath).slice(1);
            return `Content of ${filePath}:\n\`\`\`${ext}\n${content}\n\`\`\``;
        }
        catch (error) {
            return `File "${filePath}" not found`;
        }
    }
}
exports.CommandHandler = CommandHandler;
//# sourceMappingURL=commandHandler.js.map