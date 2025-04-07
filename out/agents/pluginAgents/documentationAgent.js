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
exports.DocumentationAgent = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
class DocumentationAgent {
    constructor(workspaceRoot, fileManager, apiKey, modelName) {
        this.workspaceRoot = workspaceRoot;
        this.fileManager = fileManager;
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.excludedDirs = ['node_modules', '.git', 'dist', 'build'];
        this.supportedExtensions = ['.ts', '.js', '.tsx', '.jsx', '.go', '.py', '.java', '.cpp', '.cs'];
        this.maxTokenSize = 4000;
        this.maxFileSizeKB = 100; // 100KB limit per file
    }
    async generateDocumentation(config) {
        try {
            // Create documentation directory with error handling
            const docsDir = path.join(this.workspaceRoot, 'documentation');
            await this.ensureDirectoryExists(docsDir);
            // Generate unique filename with timestamp and project name
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const projectName = path.basename(this.workspaceRoot).replace(/[^a-zA-Z0-9-_]/g, '_');
            const outputPath = config.outputPath || path.join(docsDir, `${projectName}_documentation_${timestamp}.txt`);
            // Start the documentation process with retry mechanism
            const doc = [];
            doc.push(await this.generateEnhancedHeader());
            // Get project structure with advanced analysis
            console.log('🔍 Analyzing project architecture...');
            const tree = await this.fileManager.getFileTree();
            doc.push(await this.generateProjectOverview(tree));
            // Process files with advanced analysis
            console.log('📊 Processing files with deep analysis...');
            const files = await this.extractProjectFiles();
            const fileAnalysis = await this.generateEnhancedFileDocumentation(files);
            doc.push(fileAnalysis);
            // Add code metrics and quality analysis
            doc.push(await this.generateCodeMetrics(files));
            // Save documentation with retry mechanism
            let savedPath = '';
            for (let i = 0; i < 3; i++) {
                try {
                    await this.saveDocumentationWithBackup(outputPath, doc.join('\n\n'));
                    savedPath = outputPath;
                    break;
                }
                catch (error) {
                    console.error(`Save attempt ${i + 1} failed:`, error);
                    if (i === 2) {
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            return savedPath;
        }
        catch (error) {
            console.error('Documentation generation failed:', error);
            throw new Error(`Failed to generate documentation: ${error}`);
        }
    }
    async ensureDirectoryExists(dir) {
        try {
            await fs.promises.access(dir);
        }
        catch {
            await fs.promises.mkdir(dir, { recursive: true });
        }
    }
    async saveDocumentationWithBackup(outputPath, content) {
        try {
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            await fs.promises.mkdir(dir, { recursive: true });
            // Create backup if file exists
            if (await this.fileExists(outputPath)) {
                const backupPath = `${outputPath}.backup`;
                await fs.promises.copyFile(outputPath, backupPath);
            }
            // Write content to temporary file
            const tempPath = `${outputPath}.tmp`;
            await fs.promises.writeFile(tempPath, content, 'utf8');
            // Atomically rename temp file to target file
            await fs.promises.rename(tempPath, outputPath);
        }
        catch (error) {
            console.error('Error saving documentation:', error);
            throw new Error(`Failed to save documentation: ${error}`);
        }
    }
    async generateEnhancedHeader() {
        const projectName = path.basename(this.workspaceRoot);
        const gitInfo = await this.getGitInfo();
        return `
===========================================
${projectName.toUpperCase()} - Technical Documentation
===========================================
Generated: ${new Date().toLocaleString()}
Version: ${gitInfo.version || '1.0.0'}
Branch: ${gitInfo.branch || 'N/A'}
Last Commit: ${gitInfo.lastCommit || 'N/A'}

Project Structure:
----------------
${await this.generateFileStructureOverview()}

Table of Contents:
1. Project Overview
2. Architecture & Design Patterns
3. Directory Structure
4. File Analysis
5. APIs and Components
6. Dependencies
7. Code Metrics & Quality Analysis
8. Integration Points
9. Development Guidelines
`;
    }
    async generateFileStructureOverview() {
        try {
            const structure = await this.buildStructureOverview();
            return structure.join('\n');
        }
        catch (error) {
            console.error('Error generating file structure:', error);
            return '[Error generating file structure]';
        }
    }
    async buildStructureOverview() {
        const structure = [];
        const rootDirs = await fs.promises.readdir(this.workspaceRoot);
        // Filter and sort directories
        const dirs = (await Promise.all(rootDirs.map(async (name) => {
            const fullPath = path.join(this.workspaceRoot, name);
            const stat = await fs.promises.stat(fullPath);
            return { name, isDirectory: stat.isDirectory() };
        }))).filter(d => d.isDirectory &&
            !this.excludedDirs.includes(d.name) &&
            !d.name.startsWith('.'));
        // Add main directories
        structure.push('📦 Root');
        for (const dir of dirs) {
            const dirContent = await this.getDirectoryContent(dir.name, 1);
            structure.push(...dirContent);
        }
        // Add key files at root level
        const rootFiles = rootDirs
            .filter(name => {
            const ext = path.extname(name);
            return !name.startsWith('.') &&
                this.supportedExtensions.includes(ext) &&
                !this.excludedDirs.includes(name);
        })
            .sort();
        if (rootFiles.length > 0) {
            rootFiles.forEach(file => {
                structure.push(`  📄 ${file}`);
            });
        }
        return structure;
    }
    async getDirectoryContent(dirPath, level) {
        const content = [];
        const indent = '  '.repeat(level);
        const fullPath = path.join(this.workspaceRoot, dirPath);
        try {
            const entries = await fs.promises.readdir(fullPath);
            const sortedEntries = entries.sort();
            // Add directory header
            content.push(`${indent}📂 ${path.basename(dirPath)}/`);
            // Process important files first
            const significantFiles = sortedEntries.filter(entry => this.isSignificantFile(entry));
            for (const file of significantFiles) {
                content.push(`${indent}  📄 ${file}`);
            }
            // Add subdirectories (limited depth)
            if (level < 3) {
                const subdirs = (await Promise.all(entries.map(async (entry) => {
                    const entryPath = path.join(fullPath, entry);
                    const stat = await fs.promises.stat(entryPath);
                    return { entry, isDirectory: stat.isDirectory() };
                }))).filter(e => e.isDirectory &&
                    !this.excludedDirs.includes(e.entry) &&
                    !e.entry.startsWith('.'));
                for (const subdir of subdirs) {
                    const subdirContent = await this.getDirectoryContent(path.join(dirPath, subdir.entry), level + 1);
                    content.push(...subdirContent);
                }
            }
        }
        catch (error) {
            console.error(`Error processing directory ${dirPath}:`, error);
        }
        return content;
    }
    isSignificantFile(fileName) {
        const significantPatterns = [
            /^index\.[jt]sx?$/,
            /^main\.[jt]sx?$/,
            /^app\.[jt]sx?$/,
            /^types?\.[jt]s$/,
            /^config\.[jt]s$/,
            /^package\.json$/,
            /^tsconfig\.json$/,
            /^README\.md$/
        ];
        return significantPatterns.some(pattern => pattern.test(fileName));
    }
    async generateProjectOverview(tree) {
        const overview = `
Project Overview
---------------
${await this.analyzeDirectoryStructure(tree)}

Key Files:
${this.generateKeyFilesOverview(tree)}`;
        return overview;
    }
    formatDirectoryTree(node, indent) {
        let result = `${indent}${node.type === 'directory' ? '📂' : '📄'} ${node.name}\n`;
        if (node.children) {
            for (const child of node.children) {
                result += this.formatDirectoryTree(child, indent + '  ');
            }
        }
        return result;
    }
    async generateEnhancedFileDocumentation(files) {
        const sections = [];
        const metadata = new Map();
        for (const file of files) {
            console.log(`📝 Analyzing ${file.filePath}...`);
            const [analysis, fileMetadata] = await this.analyzeFileWithMetadata(file);
            sections.push(this.formatFileAnalysis(analysis, fileMetadata));
            metadata.set(file.filePath, fileMetadata);
        }
        // Add cross-reference analysis
        sections.push(await this.generateCrossReferenceAnalysis(metadata));
        return sections.join('\n\n' + '='.repeat(50) + '\n\n');
    }
    generateCrossReferenceAnalysis(metadata) {
        // Only show significant relationships
        const significantDeps = new Map();
        for (const [file, meta] of metadata.entries()) {
            const deps = meta.dependencies.filter(dep => Array.from(metadata.keys()).some(f => f.includes(dep)));
            if (deps.length > 0) {
                significantDeps.set(file, deps);
            }
        }
        if (significantDeps.size === 0) {
            return '';
        }
        let analysis = '\nKey Dependencies\n---------------\n';
        for (const [file, deps] of significantDeps) {
            analysis += `${path.basename(file)} → ${deps.map(d => path.basename(d)).join(', ')}\n`;
        }
        return analysis;
    }
    formatFileAnalysis(analysis, fileMetadata) {
        // More concise format focusing on essential information
        return `
${analysis}
---
Quality: ${this.getQualityRating(fileMetadata.codeQuality)}
Main Dependencies: ${fileMetadata.dependencies.slice(0, 3).join(', ')}
`;
    }
    async analyzeFileWithMetadata(file) {
        const analysis = await this.analyzeFile(file);
        const metadata = await this.calculateFileMetadata(file);
        return [analysis, metadata];
    }
    async calculateFileMetadata(file) {
        // Calculate code complexity and quality metrics
        const complexity = this.calculateComplexity(file.content);
        const dependencies = await this.extractDependencies(file.content);
        const codeQuality = this.assessCodeQuality(file.content);
        return {
            complexity,
            dependencies,
            codeQuality
        };
    }
    calculateComplexity(content) {
        // Implement cyclomatic complexity calculation
        const lines = content.split('\n');
        let complexity = 1;
        const complexityPatterns = [
            /if\s*\(/g,
            /else\s*{/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /catch\s*\(/g,
            /case\s+/g,
            /\|\||&&/g
        ];
        for (const line of lines) {
            for (const pattern of complexityPatterns) {
                const matches = line.match(pattern);
                if (matches) {
                    complexity += matches.length;
                }
            }
        }
        return complexity;
    }
    assessCodeQuality(content) {
        // Implement code quality metrics
        const lines = content.split('\n');
        // Calculate maintainability
        const maintainability = this.calculateMaintainability(lines);
        // Calculate testability
        const testability = this.calculateTestability(lines);
        // Calculate reusability
        const reusability = this.calculateReusability(lines);
        return {
            maintainability,
            testability,
            reusability
        };
    }
    async generateCodeMetrics(files) {
        // Only include metrics for key files
        const keyFiles = files.filter(file => {
            const isMainFile = /index\.|app\.|main\./.test(file.filePath);
            const isSourceFile = /src\/.*\.(ts|js|tsx|jsx)$/.test(file.filePath);
            return isMainFile || isSourceFile;
        });
        let metrics = '\nKey Metrics\n-----------\n';
        for (const file of keyFiles) {
            const metadata = await this.calculateFileMetadata(file);
            metrics += `\n${path.basename(file.filePath)}:\n`;
            metrics += `  Quality: ${this.getQualityRating(metadata.codeQuality)}\n`;
            if (metadata.dependencies.length > 0) {
                metrics += `  Main Dependencies: ${metadata.dependencies.slice(0, 3).join(', ')}\n`;
            }
        }
        return metrics;
    }
    getQualityRating(quality) {
        const average = (quality.maintainability + quality.testability + quality.reusability) / 3;
        if (average >= 80) {
            return '⭐⭐⭐ High';
        }
        if (average >= 60) {
            return '⭐⭐ Medium';
        }
        return '⭐ Needs Improvement';
    }
    async getGitInfo() {
        try {
            const execPromise = require('util').promisify(require('child_process').exec);
            const { stdout: branch } = await execPromise('git rev-parse --abbrev-ref HEAD');
            const { stdout: lastCommit } = await execPromise('git log -1 --format=%H');
            const { stdout: version } = await execPromise('git describe --tags --abbrev=0');
            return {
                version: version.trim(),
                branch: branch.trim(),
                lastCommit: lastCommit.trim()
            };
        }
        catch {
            return {};
        }
    }
    async generateFileDocumentation(files) {
        const sections = [];
        for (const file of files) {
            console.log(`📝 Analyzing ${file.filePath}...`);
            const analysis = await this.analyzeFile(file);
            sections.push(analysis);
        }
        return sections.join('\n\n' + '='.repeat(50) + '\n\n');
    }
    async analyzeFile(file) {
        // Split large files into chunks
        if (file.content.length > this.maxTokenSize) {
            return await this.analyzeFileInChunks(file);
        }
        const prompt = `Analyze this code file concisely. Focus on key points only:

File: ${file.filePath}
Type: ${file.extension}
Size: ${(file.content.length / 1024).toFixed(2)}KB

Provide:
1. Main purpose (1 sentence)
2. Key exports/classes (bullet list)
3. Important methods (names only)
4. External dependencies
5. Critical features

Keep it very brief and focused.`;
        try {
            const analysis = await this.callLLM(prompt);
            return `
File: ${file.filePath}
${'-'.repeat(file.filePath.length + 6)}
${analysis}`;
        }
        catch (error) {
            console.error(`Failed to analyze ${file.filePath}:`, error);
            return `
File: ${file.filePath}
${'-'.repeat(file.filePath.length + 6)}
[Analysis failed - skipping file]`;
        }
    }
    async analyzeFileInChunks(file) {
        const chunks = this.splitIntoChunks(file.content, this.maxTokenSize);
        const analyses = [];
        for (let i = 0; i < chunks.length; i++) {
            const prompt = `Analyze this section (${i + 1}/${chunks.length}) of ${file.filePath} concisely:

${chunks[i]}

Focus on:
1. Key components in this section
2. Main functionality
3. Important patterns

Keep it very brief.`;
            try {
                const analysis = await this.callLLM(prompt);
                analyses.push(analysis);
            }
            catch (error) {
                console.error(`Failed to analyze chunk ${i + 1} of ${file.filePath}:`, error);
            }
        }
        // Combine analyses
        return `
File: ${file.filePath}
${'-'.repeat(file.filePath.length + 6)}
${analyses.join('\n\nContinued...\n\n')}`;
    }
    splitIntoChunks(content, maxSize) {
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = '';
        for (const line of lines) {
            if ((currentChunk + line).length > maxSize) {
                chunks.push(currentChunk);
                currentChunk = line;
            }
            else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        return chunks;
    }
    async extractProjectFiles() {
        const files = [];
        const projectFiles = await this.fileManager.getFilesInDirectory('');
        // Get main package files first
        const packageInfo = await this.getPackageInfo();
        const mainFiles = packageInfo.mainFiles || [];
        // Sort files by importance
        const sortedFiles = this.sortFilesByImportance(projectFiles, mainFiles);
        // Process files
        for (const filePath of sortedFiles) {
            // Skip files that shouldn't be included
            if (!this.shouldIncludeFile(filePath)) {
                console.log(`Skipping excluded file: ${filePath}`);
                continue;
            }
            try {
                const fullPath = path.join(this.workspaceRoot, filePath);
                const stats = await fs.promises.stat(fullPath);
                // Skip large files
                if (stats.size > this.maxFileSizeKB * 1024) {
                    console.log(`Skipping large file: ${filePath}`);
                    continue;
                }
                const content = await this.fileManager.getFileContent(filePath);
                if (content) {
                    files.push({
                        filePath,
                        content,
                        extension: path.extname(filePath)
                    });
                }
            }
            catch (error) {
                console.error(`Error processing file ${filePath}:`, error);
            }
        }
        return files;
    }
    async getPackageInfo() {
        try {
            const packagePath = path.join(this.workspaceRoot, 'package.json');
            const content = await fs.promises.readFile(packagePath, 'utf8');
            const pkg = JSON.parse(content);
            const mainFiles = [
                pkg.main,
                pkg.module,
                pkg.types,
                ...(pkg.bin ? Object.values(pkg.bin) : []),
                'src/index.ts',
                'src/main.ts',
                'src/app.ts'
            ].filter(Boolean);
            return { mainFiles };
        }
        catch {
            return { mainFiles: [] };
        }
    }
    sortFilesByImportance(files, mainFiles) {
        return files.sort((a, b) => {
            // Main files first
            const aIsMain = mainFiles.some(main => a.includes(main));
            const bIsMain = mainFiles.some(main => b.includes(main));
            if (aIsMain && !bIsMain) {
                return -1;
            }
            if (!aIsMain && bIsMain) {
                return 1;
            }
            // Then source files
            const aIsSrc = a.startsWith('src/');
            const bIsSrc = b.startsWith('src/');
            if (aIsSrc && !bIsSrc) {
                return -1;
            }
            if (!aIsSrc && bIsSrc) {
                return 1;
            }
            return 0;
        });
    }
    async callLLM(prompt) {
        // Add retry mechanism
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const requestData = JSON.stringify({
                    contents: [{
                            parts: [{ text: prompt }]
                        }],
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 4096 // Reduced for reliability
                    }
                });
                return await new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'generativelanguage.googleapis.com',
                        path: `/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
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
            catch (error) {
                if (attempt === 3) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        throw new Error('All retry attempts failed');
    }
    async fileExists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    calculateMaintainability(lines) {
        let score = 100;
        // Deduct points for long functions
        const functionLengths = this.getFunctionLengths(lines);
        for (const length of functionLengths) {
            if (length > 20) {
                score -= (length - 20) * 0.5;
            }
        }
        // Deduct for deep nesting
        const maxNesting = this.getMaxNestingLevel(lines);
        if (maxNesting > 3) {
            score -= (maxNesting - 3) * 5;
        }
        // Deduct for long lines
        const longLines = lines.filter(line => line.length > 100).length;
        score -= longLines * 2;
        return Math.max(0, Math.min(100, score));
    }
    calculateTestability(lines) {
        let score = 100;
        // Check for dependency injection patterns
        const hasDI = lines.some(line => line.includes('constructor('));
        if (!hasDI) {
            score -= 20;
        }
        // Check for pure functions
        const sideEffects = this.countSideEffects(lines);
        score -= sideEffects * 5;
        return Math.max(0, Math.min(100, score));
    }
    calculateReusability(lines) {
        let score = 100;
        // Check for exports
        const hasExports = lines.some(line => line.includes('export'));
        if (!hasExports) {
            score -= 30;
        }
        // Check for interface usage
        const hasInterfaces = lines.some(line => line.includes('interface'));
        if (!hasInterfaces) {
            score -= 20;
        }
        return Math.max(0, Math.min(100, score));
    }
    extractDependencies(content) {
        const dependencies = new Set();
        // Match import statements
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            dependencies.add(match[1]);
        }
        // Match require statements
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            dependencies.add(match[1]);
        }
        return Array.from(dependencies);
    }
    getFunctionLengths(lines) {
        const lengths = [];
        let currentFunction = 0;
        let isInFunction = false;
        let braceCount = 0;
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.match(/^(function|class|const|let|var).*{/) ||
                trimmedLine.match(/^[a-zA-Z0-9_]+\s*\([^)]*\)\s*{/)) {
                isInFunction = true;
                braceCount = 1;
                currentFunction = 1;
            }
            else if (isInFunction) {
                currentFunction++;
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                if (braceCount === 0) {
                    lengths.push(currentFunction);
                    isInFunction = false;
                }
            }
        }
        return lengths;
    }
    getMaxNestingLevel(lines) {
        let maxNesting = 0;
        let currentNesting = 0;
        for (const line of lines) {
            const indentation = line.search(/\S/);
            if (indentation !== -1) {
                currentNesting = Math.floor(indentation / 2); // Assuming 2-space indentation
                maxNesting = Math.max(maxNesting, currentNesting);
            }
        }
        return maxNesting;
    }
    countSideEffects(lines) {
        let sideEffects = 0;
        const sideEffectPatterns = [
            /\b(localStorage|sessionStorage)\b/,
            /\b(fetch|axios)\b/,
            /\b(fs\.|writeFile|readFile)\b/,
            /\bconsole\.(log|warn|error)\b/,
            /\bdocument\./,
            /\bwindow\./,
            /\bprocess\./
        ];
        for (const line of lines) {
            for (const pattern of sideEffectPatterns) {
                if (pattern.test(line)) {
                    sideEffects++;
                    break;
                }
            }
        }
        return sideEffects;
    }
    generateKeyFilesOverview(tree) {
        // Only show important files (e.g., entry points, config files, main modules)
        const keyPatterns = [
            /index\.(ts|js|tsx|jsx)$/,
            /app\.(ts|js|tsx|jsx)$/,
            /main\.(ts|js|tsx|jsx)$/,
            /config\.[^.]+$/,
            /package\.json$/,
            /tsconfig\.json$/
        ];
        let result = '';
        const processNode = (node) => {
            if (node.type === 'file' && keyPatterns.some(pattern => pattern.test(node.name))) {
                result += `📄 ${node.path}\n`;
            }
            node.children?.forEach(processNode);
        };
        processNode(tree);
        return result;
    }
    async analyzeDirectoryStructure(tree) {
        const prompt = `Provide a brief, high-level overview of this project structure:

${this.formatDirectoryTree(tree, '')}

Focus on:
1. Main architecture components (1-2 sentences)
2. Key directory purposes (bullet points)
3. Project organization pattern (1 sentence)

Keep it brief and business-focused.`;
        return await this.callLLM(prompt);
    }
    shouldIncludeFile(filePath) {
        // Add more excluded patterns
        const excludePatterns = [
            /node_modules/,
            /\.git/,
            /dist/,
            /build/,
            /__pycache__/,
            /\.pyc$/,
            /\.DS_Store/,
            /\.env/,
            /\.vscode/,
            /\.idea/,
            /\.next/,
            /\.cache/,
            /coverage/,
            /\.tmp/,
            /temp/,
            /logs/,
            /\.test\./,
            /\.spec\./,
            /test\//,
            /tests\//
        ];
        // Check if file should be excluded
        if (excludePatterns.some(pattern => pattern.test(filePath))) {
            return false;
        }
        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        // Check if extension is supported
        return this.supportedExtensions.includes(ext);
    }
}
exports.DocumentationAgent = DocumentationAgent;
//# sourceMappingURL=documentationAgent.js.map