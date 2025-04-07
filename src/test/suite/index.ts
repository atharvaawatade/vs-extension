import * as path from 'path';
import Mocha from 'mocha';
import { GreenThemeReporter } from '../reporter/TestReporter';
import { LiveTestLogger } from '../LiveTestLogger';

declare global {
    namespace NodeJS {
        interface Global {
            testLogger: LiveTestLogger;
        }
    }
}

export function run(): Promise<void> {
    // Initialize live logger
    const logger = new LiveTestLogger();
    (global as any).testLogger = logger;  // Type assertion to avoid TS errors

    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        reporter: GreenThemeReporter
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        mocha.addFile(path.resolve(testsRoot, 'extension.test.js'));
        
        try {
            const runner = mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });

            // Add hooks for live logging
            runner.on('end', () => {
                logger.generateSummary();
            });

        } catch (err) {
            reject(err);
        }
    });
}
