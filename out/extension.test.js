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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const commandHandler_1 = require("./commandHandler");
const diffProvider_1 = require("./diffProvider");
const fileManager_1 = require("./fileManager");
// Test suite wrapper
suite('AI-Bot Extension Test Suite', () => {
    // Define variables at suite level
    const workspaceRoot = path.join(__dirname, '../../testWorkspace');
    let cmdHandler;
    let diffProvider;
    let fileManager;
    // Setup before all tests
    suiteSetup(async () => {
        if (!fs.existsSync(workspaceRoot)) {
            fs.mkdirSync(workspaceRoot, { recursive: true });
        }
        cmdHandler = new commandHandler_1.CommandHandler(workspaceRoot);
        diffProvider = new diffProvider_1.DiffProvider(workspaceRoot);
        fileManager = new fileManager_1.FileSystemManager(workspaceRoot);
    });
    // Setup before each test
    setup(async () => {
        const testFiles = {
            testJs: 'console.log("test");',
            stylesCss: 'body { color: black; }',
            indexHtml: '<html><body>Test</body></html>'
        };
        for (const [filename, content] of Object.entries(testFiles)) {
            const fullPath = path.join(workspaceRoot, filename);
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, content);
        }
    });
    // Cleanup after each test
    teardown(async () => {
        const files = await fs.promises.readdir(workspaceRoot);
        for (const file of files) {
            const fullPath = path.join(workspaceRoot, file);
            await fs.promises.rm(fullPath, { recursive: true, force: true });
        }
    });
    // Cleanup after all tests
    suiteTeardown(() => {
        if (fs.existsSync(workspaceRoot)) {
            fs.rmSync(workspaceRoot, { recursive: true });
        }
    });
    // Test cases
    test('Basic file creation', async function () {
        this.timeout(10000);
        const command = '#create @newfile.js console.log("Hello")';
        const response = await cmdHandler.handleCommand(command);
        if (typeof response === 'string') {
            assert.fail('Expected CommandResponse but got string');
            return;
        }
        assert.strictEqual(response.status, 'done');
        assert.ok(fs.existsSync(path.join(workspaceRoot, 'newfile.js')));
    });
    test('File structure command', async () => {
        const response = await cmdHandler.handleCommand('@tree');
        assert.ok(typeof response === 'string');
        assert.ok(response.includes('test.js'));
    });
    test('Generate diff HTML', () => {
        const original = 'console.log("old");';
        const modified = 'console.log("new");';
        const diff = diffProvider.generateDiffHtml(original, modified);
        assert.ok(diff.includes('diff-removed'));
        assert.ok(diff.includes('diff-added'));
    });
    test('Command suggestions', async () => {
        const suggestions = await cmdHandler.getSuggestions('@test');
        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        assert.ok(suggestions.some(s => s.command.includes('test.js')));
    });
    test('Basic content modification', async function () {
        this.timeout(10000);
        const testFile = 'simple.js';
        await fs.promises.writeFile(path.join(workspaceRoot, testFile), 'let x = 1;');
        const command = `#edit @${testFile} add const`;
        const response = await cmdHandler.handleCommand(command);
        if (typeof response === 'string') {
            assert.fail('Expected CommandResponse but got string');
            return;
        }
        assert.strictEqual(response.status, 'done');
        const content = await fs.promises.readFile(path.join(workspaceRoot, testFile), 'utf8');
        assert.ok(content.includes('const'));
    });
    test('Error handling for invalid commands', async () => {
        const command = '#invalid test';
        const response = await cmdHandler.handleCommand(command);
        if (typeof response === 'string') {
            assert.fail('Expected CommandResponse but got string');
            return;
        }
        assert.strictEqual(response.status, 'error');
        assert.ok(response.message.includes('Unknown command'));
    });
});
//# sourceMappingURL=extension.test.js.map