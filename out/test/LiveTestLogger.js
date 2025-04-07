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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveTestLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
class LiveTestLogger {
    constructor(logDir = path.join(__dirname, '../..', 'test-logs')) {
        this.allTests = [];
        this.startTime = Date.now();
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        this.logFile = path.join(logDir, `test-run-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
        this.initLogFile();
    }
    initLogFile() {
        const header = `# AI-Bot Extension Test Run
${new Date().toLocaleString()}

## Test Execution Log
`;
        fs.writeFileSync(this.logFile, header);
    }
    startTest(testName) {
        this.currentTest = {
            timestamp: new Date().toISOString(),
            testName,
            status: 'running'
        };
        this.appendToLog(`\n### ${testName}\n`);
        console.log(chalk_1.default.cyan(`\n▶ Starting: ${testName}`));
    }
    logInput(input) {
        try {
            if (this.currentTest) {
                this.currentTest.input = input;
                console.log('\n' + chalk_1.default.cyan('📥 Test Input:'));
                console.log(chalk_1.default.cyan('━'.repeat(80)));
                console.log(input.trim());
                console.log(chalk_1.default.cyan('━'.repeat(80)));
                this.appendToLog(`### Input\n\`\`\`\n${input}\n\`\`\`\n`);
            }
        }
        catch (error) {
            console.error('Error logging input:', error);
        }
    }
    logOutput(output) {
        try {
            if (this.currentTest) {
                this.currentTest.output = output;
                console.log('\n' + chalk_1.default.green('📤 Test Output:'));
                console.log(chalk_1.default.green('━'.repeat(80)));
                console.log(output.trim());
                console.log(chalk_1.default.green('━'.repeat(80)));
                this.appendToLog(`### Output\n\`\`\`\n${output}\n\`\`\`\n`);
            }
        }
        catch (error) {
            console.error('Error logging output:', error);
        }
    }
    endTest(success, duration, memoryUsed, error) {
        if (this.currentTest) {
            this.currentTest.status = success ? 'passed' : 'failed';
            this.currentTest.duration = duration;
            this.currentTest.memory = memoryUsed;
            this.currentTest.error = error;
            const status = success ? chalk_1.default.green('✓ PASSED') : chalk_1.default.red('✗ FAILED');
            const durationStr = duration < 50 ? chalk_1.default.green(`${duration}ms ⚡`) :
                duration < 100 ? chalk_1.default.greenBright(`${duration}ms`) :
                    chalk_1.default.yellow(`${duration}ms`);
            this.appendToLog(`#### Result\n`);
            this.appendToLog(`- Status: ${success ? '✓ PASSED' : '✗ FAILED'}`);
            this.appendToLog(`- Duration: ${duration}ms`);
            this.appendToLog(`- Memory Used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB\n`);
            if (error) {
                this.appendToLog(`#### Error\n\`\`\`\n${error}\n\`\`\`\n`);
            }
            console.log(chalk_1.default.bold(`${status} ${this.currentTest.testName} ` +
                `(${durationStr}, ${(memoryUsed / 1024 / 1024).toFixed(2)}MB)`));
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
        console.log('\n' + chalk_1.default.bold.green('📊 Test Run Summary'));
        console.log(chalk_1.default.green(`✓ Passed: ${passedTests}`));
        console.log(chalk_1.default.red(`✗ Failed: ${failedTests}`));
        console.log(chalk_1.default.blue(`⏱ Total Duration: ${totalDuration}ms`));
    }
    generatePerformanceTable() {
        const table = ['| Test Name | Duration | Memory | Status |',
            '|-----------|----------|---------|---------|'];
        this.allTests.forEach(test => {
            const duration = test.duration || 0;
            const memory = test.memory ? (test.memory / 1024 / 1024).toFixed(2) : 'N/A';
            const status = test.status === 'passed' ? '✓' : '✗';
            table.push(`| ${test.testName} | ${duration}ms | ${memory}MB | ${status} |`);
        });
        return table.join('\n');
    }
    generateTimeline() {
        return this.allTests.map(test => {
            const time = new Date(test.timestamp).toLocaleTimeString();
            const status = test.status === 'passed' ? '✓' : '✗';
            return `${time} - ${status} ${test.testName}`;
        }).join('\n');
    }
    appendToLog(text) {
        fs.appendFileSync(this.logFile, text + '\n');
    }
}
exports.LiveTestLogger = LiveTestLogger;
//# sourceMappingURL=LiveTestLogger.js.map