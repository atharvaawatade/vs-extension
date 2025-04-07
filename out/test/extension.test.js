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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const commandHandler_1 = require("../commandHandler");
const perf_hooks_1 = require("perf_hooks");
const sarpachAgent_1 = require("../agents/sarpachAgent");
const fileManager_1 = require("../fileManager");
class MockCommandHandler extends commandHandler_1.CommandHandler {
    constructor(workspaceRoot) {
        super(workspaceRoot);
    }
    async getLLMSuggestion(filePath, _content, instruction) {
        // Always use relative paths
        const relativePath = path.relative(this.workspaceRoot, path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath));
        // Generate mock content based on file type and instruction
        const ext = path.extname(relativePath).slice(1);
        let content;
        switch (ext) {
            case 'js':
                content = `function test() {
    try {
        console.log("Hello World");
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}`;
                break;
            case 'tsx':
                content = 'export const Button = () => <button>Click me</button>;';
                break;
            case 'css':
                content = `.button { 
    color: blue;
    padding: 8px 16px;
    border-radius: 4px;
}`;
                break;
            default:
                content = `// Generated content for ${instruction}`;
        }
        return `\`\`\`${ext}\n// filepath: ${relativePath}\n${content}\n\`\`\``;
    }
    async callLLM(prompt) {
        if (prompt.includes('analyze')) {
            return 'Analysis Report:\n1. Main purpose: Test function\n2. Implementation details...';
        }
        return 'Mock response';
    }
}
// Store test results at module level
const testResults = [];
suite('SarpachAgent Test Suite', () => {
    let sarpachAgent;
    const testWorkspacePath = path.resolve(__dirname, '../../testWorkspace');
    // Setup
    suiteSetup(async () => {
        if (fs.existsSync(testWorkspacePath)) {
            fs.rmSync(testWorkspacePath, { recursive: true });
        }
        fs.mkdirSync(testWorkspacePath, { recursive: true });
        sarpachAgent = new sarpachAgent_1.SarpachAgent(testWorkspacePath);
    });
    // Cleanup
    suiteTeardown(() => {
        if (fs.existsSync(testWorkspacePath)) {
            fs.rmSync(testWorkspacePath, { recursive: true });
        }
        generatePerformanceReport(testResults);
    });
    // Test Cases
    test('Process Simple File Modification', async function () {
        this.timeout(10000);
        await runTest('Simple File Modification', async () => {
            // Create test file
            const testFile = 'test.go';
            const initialContent = `package main\n\nfunc main() {\n\tfmt.Println("Hello")\n}`;
            await fs.promises.writeFile(path.join(testWorkspacePath, testFile), initialContent);
            const result = await sarpachAgent.processUserInput(`@${testFile} add error handling`);
            assert.ok(result.thinking.includes('Processing files'));
            assert.ok(result.command?.includes('#edit'));
            assert.ok(result.result.includes('✅'));
        });
    });
    test('Process Multiple File Updates', async function () {
        this.timeout(15000);
        await runTest('Multiple File Updates', async () => {
            const files = {
                'handler.go': 'package main\n\nfunc handler() {}',
                'router.go': 'package main\n\nfunc router() {}'
            };
            for (const [file, content] of Object.entries(files)) {
                await fs.promises.writeFile(path.join(testWorkspacePath, file), content);
            }
            const result = await sarpachAgent.processUserInput('@handler.go @router.go implement gin server routes');
            assert.ok(result.thinking.includes('Processing files'));
            assert.ok(result.result.includes('✅ handler.go'));
            assert.ok(result.result.includes('✅ router.go'));
        });
    });
    test('File Content Request', async function () {
        this.timeout(5000);
        await runTest('File Content Request', async () => {
            const testFile = 'show.go';
            const content = 'package main\n\nfunc main() {}\n';
            await fs.promises.writeFile(path.join(testWorkspacePath, testFile), content);
            const result = await sarpachAgent.processUserInput(`show @${testFile}`);
            assert.ok(result.fileContent?.includes('package main'));
            assert.ok(result.thinking.includes('Reading'));
        });
    });
    test('Non-existent File Handling', async function () {
        this.timeout(5000);
        await runTest('Non-existent File Handling', async () => {
            const result = await sarpachAgent.processUserInput('@nonexistent.go implement http server');
            assert.ok(result.thinking.includes('🆕'));
            assert.ok(result.command?.includes('#create'));
        });
    });
    test('Code Improvement Suggestions', async function () {
        this.timeout(10000);
        await runTest('Code Improvement Suggestions', async () => {
            const testFile = 'improve.go';
            const content = `
            package main
            func handler(w http.ResponseWriter, r *http.Request) {
                w.Write([]byte("Hello"))
            }`;
            await fs.promises.writeFile(path.join(testWorkspacePath, testFile), content);
            const result = await sarpachAgent.processUserInput(`@${testFile} optimize and add error handling`);
            assert.ok(result.thinking.includes('Processing'));
            assert.ok(result.result.includes('✅'));
        });
    });
    test('Large File Processing', async function () {
        this.timeout(20000);
        await runTest('Large File Processing', async () => {
            const testFile = 'large.go';
            const content = Array(1000).fill('// Test line').join('\n');
            await fs.promises.writeFile(path.join(testWorkspacePath, testFile), content);
            const result = await sarpachAgent.processUserInput(`@${testFile} cleanup and optimize`);
            assert.ok(result.thinking.includes('Processing'));
            assert.ok(result.result.includes('✅'));
        });
    });
    test('File Type Detection', async function () {
        this.timeout(10000);
        await runTest('File Type Detection', async () => {
            const files = {
                'test.go': 'package main',
                'test.js': 'console.log("test")',
                'test.css': 'body { color: red; }'
            };
            for (const [file, content] of Object.entries(files)) {
                await fs.promises.writeFile(path.join(testWorkspacePath, file), content);
            }
            const result = await sarpachAgent.processUserInput('@test.go @test.js @test.css update all files');
            assert.ok(result.thinking.includes('Processing files'));
            assert.ok(result.result.includes('Operation results'));
        });
    });
    // ... rest of the existing test utils and helper functions ...
});
suite('CommandHandler Test Suite', () => {
    let commandHandler;
    const testWorkspacePath = path.resolve(__dirname, '../../testWorkspace');
    suiteSetup(async () => {
        if (fs.existsSync(testWorkspacePath)) {
            fs.rmSync(testWorkspacePath, { recursive: true });
        }
        fs.mkdirSync(testWorkspacePath, { recursive: true });
        commandHandler = new commandHandler_1.CommandHandler(testWorkspacePath);
    });
    suiteTeardown(() => {
        if (fs.existsSync(testWorkspacePath)) {
            fs.rmSync(testWorkspacePath, { recursive: true });
        }
    });
    test('Handle Create Command', async function () {
        this.timeout(10000);
        const result = await commandHandler.handleCommand('#create @test.ts export interface User { id: string; }');
        assert.ok(isCommandResponse(result));
        assert.strictEqual(result.status, 'done');
        assert.ok(fs.existsSync(path.join(testWorkspacePath, 'test.ts')));
    });
    test('Handle Multiple File Creation', async function () {
        this.timeout(15000);
        const result = await commandHandler.handleCommand('#create @models/user.ts @models/auth.ts create user and auth models');
        assert.ok(isCommandResponse(result));
        assert.strictEqual(result.status, 'done');
        assert.ok(fs.existsSync(path.join(testWorkspacePath, 'models/user.ts')));
        assert.ok(fs.existsSync(path.join(testWorkspacePath, 'models/auth.ts')));
    });
    test('Handle Edit Command', async function () {
        this.timeout(10000);
        // Create initial file
        const testFile = path.join(testWorkspacePath, 'edit.ts');
        await fs.promises.writeFile(testFile, 'let x = 1;');
        const result = await commandHandler.handleCommand('#edit @edit.ts convert to const');
        assert.ok(isCommandResponse(result));
        assert.strictEqual(result.status, 'done');
        const content = await fs.promises.readFile(testFile, 'utf8');
        assert.ok(content.includes('const'));
    });
    test('Handle Invalid Commands', async function () {
        const result = await commandHandler.handleCommand('#invalid command');
        assert.ok(isCommandResponse(result));
        assert.strictEqual(result.status, 'error');
    });
    test('Handle File Analysis', async function () {
        this.timeout(10000);
        const testFile = path.join(testWorkspacePath, 'analyze.ts');
        await fs.promises.writeFile(testFile, 'function test() { return true; }');
        const result = await commandHandler.handleCommand('#explain @analyze.ts');
        assert.ok(isCommandResponse(result));
        assert.strictEqual(result.status, 'done');
        assert.ok(result.message.includes('Analysis'));
    });
});
suite('FileManager Test Suite', () => {
    let fileManager;
    const testWorkspacePath = path.resolve(__dirname, '../../testWorkspace');
    // Setup: Ensure clean workspace before each test
    setup(async () => {
        if (fs.existsSync(testWorkspacePath)) {
            await fs.promises.rm(testWorkspacePath, { recursive: true, force: true });
        }
        await fs.promises.mkdir(testWorkspacePath, { recursive: true });
        fileManager = new fileManager_1.FileSystemManager(testWorkspacePath);
    });
    // Cleanup after each test
    teardown(async () => {
        try {
            if (fs.existsSync(testWorkspacePath)) {
                await fs.promises.rm(testWorkspacePath, { recursive: true, force: true });
            }
        }
        catch (error) {
            console.error('Cleanup error:', error);
        }
    });
    test('Create and Read File', async function () {
        const filePath = 'test-create.ts';
        const content = 'export const test = true;';
        // Test file creation
        const createSuccess = await fileManager.editFile(filePath, content);
        assert.ok(createSuccess);
        // Test file reading
        const readContent = await fileManager.getFileContent(filePath);
        assert.strictEqual(readContent, content);
    });
    test('File Tree Generation', async function () {
        // Create test directory structure
        const structure = {
            'src/components/Button.tsx': 'export const Button = () => <button />;',
            'src/styles/main.css': '.button { color: blue; }',
            'src/utils/helper.ts': 'export const helper = () => {};'
        };
        for (const [filePath, content] of Object.entries(structure)) {
            const fullPath = path.join(testWorkspacePath, filePath);
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, content);
        }
        const tree = await fileManager.getFileTree();
        assert.ok(tree.children?.some(node => node.name === 'src'));
        assert.ok(tree.children?.some(node => node.type === 'directory'));
    });
    test('File Search', async function () {
        this.timeout(15000); // Increase timeout for file indexing
        try {
            // Create test files first
            const testFiles = {
                'test1.ts': '// Test content 1',
                'test2.ts': '// Test content 2',
                'other.ts': '// Other content'
            };
            // Create directories if needed
            await fs.promises.mkdir(testWorkspacePath, { recursive: true });
            // Create all files
            for (const [file, content] of Object.entries(testFiles)) {
                const fullPath = path.join(testWorkspacePath, file);
                await fs.promises.writeFile(fullPath, content);
            }
            // Create a VS Code Uri for the workspace
            const workspaceUri = vscode.Uri.file(testWorkspacePath);
            // Wait for VS Code to fully index the files
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Perform the search using VS Code API
            const results = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceUri, '**/test*.ts'));
            // Convert URIs to relative paths
            const relativePaths = results.map(uri => path.relative(testWorkspacePath, uri.fsPath));
            // Verify results
            assert.strictEqual(relativePaths.length, 2, 'Should find exactly 2 test files');
            assert.ok(relativePaths.includes('test1.ts'), 'Should find test1.ts');
            assert.ok(relativePaths.includes('test2.ts'), 'Should find test2.ts');
        }
        catch (error) {
            console.error('Search test error:', error);
            throw error;
        }
    });
    // Update the Mock File Manager for tests
    class MockFileManager extends fileManager_1.FileSystemManager {
        async searchFiles(query) {
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(this.getWorkspaceRoot(), `**/*${query}*.ts`));
            return files.map(f => path.relative(this.getWorkspaceRoot(), f.fsPath));
        }
    }
    test('File Content Validation', async function () {
        const testCases = [
            {
                path: 'valid.ts',
                content: 'const x: number = 1;',
                shouldSucceed: true
            },
            {
                path: 'invalid.ts',
                content: 'const x = ;', // Invalid syntax
                shouldSucceed: false
            }
        ];
        for (const testCase of testCases) {
            const fullPath = path.join(testWorkspacePath, testCase.path);
            try {
                // Ensure directory exists
                await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                // Write the file first
                await fs.promises.writeFile(fullPath, testCase.content);
                // Then try to validate/edit it
                const result = await fileManager.editFile(testCase.path, testCase.content);
                if (testCase.shouldSucceed) {
                    assert.ok(result, `File ${testCase.path} should be valid`);
                    const content = await fileManager.getFileContent(testCase.path);
                    assert.strictEqual(content, testCase.content);
                }
                else {
                    assert.strictEqual(result, false, `File ${testCase.path} should be invalid`);
                }
            }
            catch (error) {
                if (testCase.shouldSucceed) {
                    throw error;
                }
                // If shouldSucceed is false, an error is expected
            }
        }
    });
    // Improve Multiple File Creation test
    test('Handle Multiple File Creation', async function () {
        this.timeout(20000); // Increase timeout
        const files = {
            'models/user.ts': 'export interface User { id: string; }',
            'models/auth.ts': 'export interface Auth { token: string; }'
        };
        try {
            // Create directory first
            await fs.promises.mkdir(path.join(testWorkspacePath, 'models'), { recursive: true });
            // Create files one by one
            for (const [filePath, content] of Object.entries(files)) {
                const success = await fileManager.editFile(filePath, content);
                assert.ok(success, `Failed to create ${filePath}`);
                // Verify file exists and has correct content
                const fullPath = path.join(testWorkspacePath, filePath);
                const fileContent = await fs.promises.readFile(fullPath, 'utf8');
                assert.strictEqual(fileContent, content);
            }
        }
        catch (error) {
            console.error('Multiple file creation error:', error);
            throw error;
        }
    });
    test('Directory Operations', async function () {
        // Test directory creation
        const dirPath = 'test-dir/nested';
        const filePath = 'test-dir/nested/test.ts';
        const content = 'export const test = true;';
        const result = await fileManager.editFile(filePath, content);
        assert.ok(result);
        assert.ok(fs.existsSync(path.join(testWorkspacePath, dirPath)));
        assert.ok(fs.existsSync(path.join(testWorkspacePath, filePath)));
    });
    test('Multiple File Operations', async function () {
        this.timeout(10000);
        const files = {
            'multi/file1.ts': 'export const a = 1;',
            'multi/file2.ts': 'export const b = 2;',
            'multi/file3.ts': 'export const c = 3;'
        };
        const results = await Promise.all(Object.entries(files).map(([file, content]) => fileManager.editFile(file, content)));
        assert.ok(results.every(r => r === true));
        // Verify all files exist with correct content
        for (const [file, content] of Object.entries(files)) {
            const readContent = await fileManager.getFileContent(file);
            assert.strictEqual(readContent, content);
        }
    });
    test('Import Graph Generation', async function () {
        const files = {
            'src/index.ts': 'import { User } from "./models/user";\nimport { Auth } from "./models/auth";',
            'src/models/user.ts': 'import { Base } from "./base";\nexport class User extends Base {}',
            'src/models/auth.ts': 'import { User } from "./user";\nexport class Auth {}',
            'src/models/base.ts': 'export class Base {}'
        };
        for (const [file, content] of Object.entries(files)) {
            await fileManager.editFile(file, content);
        }
        const graph = await fileManager.calculateImportGraph('src/index.ts');
        assert.ok(graph.has('src/index.ts'));
        assert.ok(graph.get('src/index.ts')?.includes('./models/user'));
    });
});
// Utility function to run test with performance metrics
async function runTest(name, testFn) {
    const startTime = perf_hooks_1.performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    try {
        await testFn();
        testResults.push({
            name,
            duration: perf_hooks_1.performance.now() - startTime,
            memoryUsage: process.memoryUsage().heapUsed - startMemory,
            status: 'passed'
        });
    }
    catch (error) {
        console.error(`Test failed: ${name}`, error);
        testResults.push({
            name,
            duration: perf_hooks_1.performance.now() - startTime,
            memoryUsage: process.memoryUsage().heapUsed - startMemory,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
// Add type guard function
function isCommandResponse(response) {
    return typeof response !== 'string' && 'status' in response;
}
// Increase timeout for async tests
const TEST_TIMEOUT = 30000; // 30 seconds
// Mock LLM response for tests
function mockLLMResponse(filePath, content = '') {
    const ext = path.extname(filePath).slice(1);
    return `\`\`\`${ext}
    // filepath: ${filePath}
    ${content || `// Generated content for ${filePath}`}
    \`\`\``;
}
function generatePerformanceReport(results) {
    const report = [
        '## Performance Report\n',
        '| Test Name | Duration (ms) | Memory (MB) | Status | Insights |',
        '|-----------|---------------|-------------|---------|-----------|'
    ];
    for (const result of results) {
        const insights = generateInsights(result);
        report.push(`| ${result.name} | ${result.duration.toFixed(2)} | ${(result.memoryUsage / 1024 / 1024).toFixed(2)} | ${result.status} | ${insights} |`);
    }
    // Write report to file
    const reportPath = path.join(__dirname, '../../test-report.md');
    fs.writeFileSync(reportPath, report.join('\n'));
}
function generateInsights(result) {
    const insights = [];
    if (result.duration > 1000) {
        insights.push('⚠️ High latency');
    }
    if (result.memoryUsage > 50 * 1024 * 1024) { // 50MB
        insights.push('⚠️ High memory usage');
    }
    if (result.status === 'failed') {
        insights.push(`❌ ${result.error}`);
    }
    if (result.duration < 100 && result.memoryUsage < 10 * 1024 * 1024) {
        insights.push('✅ Optimal performance');
    }
    return insights.join(', ') || 'Normal operation';
}
// Add helper function to ensure workspace is ready
async function ensureWorkspaceReady(workspacePath) {
    // Create workspace if it doesn't exist
    if (!fs.existsSync(workspacePath)) {
        await fs.promises.mkdir(workspacePath, { recursive: true });
    }
    // Wait for VS Code to initialize and index
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Verify workspace is accessible
    try {
        const testFile = path.join(workspacePath, '.test-write');
        await fs.promises.writeFile(testFile, 'test');
        await fs.promises.unlink(testFile);
    }
    catch (error) {
        throw new Error(`Workspace not ready: ${error}`);
    }
}
//# sourceMappingURL=extension.test.js.map