import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface TestLogEntry {
    timestamp: string;
    testName: string;
    input?: string;
    output?: string;
    duration?: number;
    memory?: number;
    status: 'running' | 'passed' | 'failed';
    error?: string;
}

export class LiveTestLogger {
    private logFile: string;
    private currentTest?: TestLogEntry;
    private allTests: TestLogEntry[] = [];
    private startTime: number;

    constructor(logDir: string = path.join(__dirname, '../..', 'test-logs')) {
        this.startTime = Date.now();
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        this.logFile = path.join(logDir, `test-run-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
        this.initLogFile();
    }

    private initLogFile() {
        const header = `# AI-Bot Extension Test Run
${new Date().toLocaleString()}

## Test Execution Log
`;
        fs.writeFileSync(this.logFile, header);
    }

    startTest(testName: string) {
        this.currentTest = {
            timestamp: new Date().toISOString(),
            testName,
            status: 'running'
        };
        this.appendToLog(`\n### ${testName}\n`);
        console.log(chalk.cyan(`\n▶ Starting: ${testName}`));
    }

    logInput(input: string) {
        try {
            if (this.currentTest) {
                this.currentTest.input = input;
                
                console.log('\n' + chalk.cyan('📥 Test Input:'));
                console.log(chalk.cyan('━'.repeat(80)));
                console.log(input.trim());
                console.log(chalk.cyan('━'.repeat(80)));
                
                this.appendToLog(`### Input\n\`\`\`\n${input}\n\`\`\`\n`);
            }
        } catch (error) {
            console.error('Error logging input:', error);
        }
    }

    logOutput(output: string) {
        try {
            if (this.currentTest) {
                this.currentTest.output = output;
                
                console.log('\n' + chalk.green('📤 Test Output:'));
                console.log(chalk.green('━'.repeat(80)));
                console.log(output.trim());
                console.log(chalk.green('━'.repeat(80)));
                
                this.appendToLog(`### Output\n\`\`\`\n${output}\n\`\`\`\n`);
            }
        } catch (error) {
            console.error('Error logging output:', error);
        }
    }

    endTest(success: boolean, duration: number, memoryUsed: number, error?: string) {
        if (this.currentTest) {
            this.currentTest.status = success ? 'passed' : 'failed';
            this.currentTest.duration = duration;
            this.currentTest.memory = memoryUsed;
            this.currentTest.error = error;

            const status = success ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED');
            const durationStr = duration < 50 ? chalk.green(`${duration}ms ⚡`) : 
                              duration < 100 ? chalk.greenBright(`${duration}ms`) :
                              chalk.yellow(`${duration}ms`);
            
            this.appendToLog(`#### Result\n`);
            this.appendToLog(`- Status: ${success ? '✓ PASSED' : '✗ FAILED'}`);
            this.appendToLog(`- Duration: ${duration}ms`);
            this.appendToLog(`- Memory Used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB\n`);
            
            if (error) {
                this.appendToLog(`#### Error\n\`\`\`\n${error}\n\`\`\`\n`);
            }

            console.log(chalk.bold(
                `${status} ${this.currentTest.testName} ` +
                `(${durationStr}, ${(memoryUsed / 1024 / 1024).toFixed(2)}MB)`
            ));

            this.allTests.push(this.currentTest);
            this.currentTest = undefined;
        }
    }

    generateSummary() {
        const totalDuration = Date.now() - this.startTime;
        const totalTests = this.allTests.length;
        const passedTests = this.allTests.filter(t => t.status === 'passed').length;
        const failedTests = totalTests - passedTests;

        const summary = `\n## Test Run Summary
- Total Tests: ${totalTests}
- Passed: ${passedTests} ✓
- Failed: ${failedTests} ${failedTests > 0 ? '✗' : ''}
- Total Duration: ${totalDuration}ms
- Average Duration: ${(totalDuration / totalTests).toFixed(2)}ms

## Performance Analysis
${this.generatePerformanceTable()}

## Test Timeline
${this.generateTimeline()}
`;
        this.appendToLog(summary);

        // Console output
        console.log('\n' + chalk.bold.green('📊 Test Run Summary'));
        console.log(chalk.green(`✓ Passed: ${passedTests}`));
        console.log(chalk.red(`✗ Failed: ${failedTests}`));
        console.log(chalk.blue(`⏱ Total Duration: ${totalDuration}ms`));
    }

    private generatePerformanceTable(): string {
        const table = ['| Test Name | Duration | Memory | Status |',
                      '|-----------|----------|---------|---------|'];

        this.allTests.forEach(test => {
            const duration = test.duration || 0;
            const memory = test.memory ? (test.memory / 1024 / 1024).toFixed(2) : 'N/A';
            const status = test.status === 'passed' ? '✓' : '✗';
            table.push(
                `| ${test.testName} | ${duration}ms | ${memory}MB | ${status} |`
            );
        });

        return table.join('\n');
    }

    private generateTimeline(): string {
        return this.allTests.map(test => {
            const time = new Date(test.timestamp).toLocaleTimeString();
            const status = test.status === 'passed' ? '✓' : '✗';
            return `${time} - ${status} ${test.testName}`;
        }).join('\n');
    }

    private appendToLog(text: string) {
        fs.appendFileSync(this.logFile, text + '\n');
    }
}
