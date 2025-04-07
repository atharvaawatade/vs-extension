import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        const testWorkspace = path.resolve(extensionDevelopmentPath, 'testWorkspace');

        // Basic launch arguments that won't interfere with VS Code
        const launchArgs = [
            testWorkspace,
            '--disable-workspace-trust',
            '--skip-release-notes',
            '--disable-extensions', // Disable other extensions
            '--new-window', // Open in new window instead of killing existing
            '--user-data-dir', // Use a separate user data directory
            path.join(extensionDevelopmentPath, '.vscode-test/user-data')
        ];

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
            version: '1.98.1'
        });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main();
