import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommandHandler, CommandResponse } from './commandHandler';
import { DiffProvider } from './diffProvider';
import { FileSystemManager } from './fileManager';

// Test suite wrapper
suite('AI-Bot Extension Test Suite', () => {
    // Define variables at suite level
    const workspaceRoot = path.join(__dirname, '../../testWorkspace');
    let cmdHandler: CommandHandler;
    let diffProvider: DiffProvider;
    let fileManager: FileSystemManager;

    // Setup before all tests
    suiteSetup(async () => {
        if (!fs.existsSync(workspaceRoot)) {
            fs.mkdirSync(workspaceRoot, { recursive: true });
        }

        cmdHandler = new CommandHandler(workspaceRoot);
        diffProvider = new DiffProvider(workspaceRoot);
        fileManager = new FileSystemManager(workspaceRoot);
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
    test('Basic file creation', async function() {
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

    test('Basic content modification', async function() {
        this.timeout(10000);
        
        const testFile = 'simple.js';
        await fs.promises.writeFile(
            path.join(workspaceRoot, testFile),
            'let x = 1;'
        );

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
