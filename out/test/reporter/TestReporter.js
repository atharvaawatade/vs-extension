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
exports.GreenThemeReporter = void 0;
const Mocha = __importStar(require("mocha"));
const chalk_1 = __importDefault(require("chalk"));
class GreenThemeReporter extends Mocha.reporters.Base {
    constructor(runner, options) {
        super(runner, options);
        this.results = [];
        this.startTime = Date.now();
        this.startMemory = process.memoryUsage().heapUsed;
        this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.spinnerIndex = 0;
        this.startSpinner();
        runner.on('pass', (test) => {
            this.results.push({
                title: test.fullTitle(),
                duration: test.duration || 0,
                state: 'passed',
                memory: process.memoryUsage().heapUsed - this.startMemory
            });
            this.updateSpinner(`${chalk_1.default.green('✓')} ${test.title}`);
        });
        runner.on('fail', (test) => {
            this.results.push({
                title: test.fullTitle(),
                duration: test.duration || 0,
                state: 'failed',
                memory: process.memoryUsage().heapUsed - this.startMemory
            });
            this.updateSpinner(`${chalk_1.default.red('✗')} ${test.title}`);
        });
        runner.on('end', () => {
            this.stopSpinner();
            this.printReport();
        });
    }
    updateSpinner(text) {
        try {
            // Clear previous line more safely
            process.stdout.write('\r\x1b[K'); // Clear current line
            process.stdout.write(`${text}\n`);
        }
        catch (error) {
            // Fallback for environments where ANSI escape codes don't work
            console.log(text);
        }
    }
    formatSpinner() {
        return `${this.spinnerFrames[this.spinnerIndex]} Running tests...`;
    }
    startSpinner() {
        if (this.spinnerInterval) {
            return;
        }
        try {
            process.stdout.write('\n');
            this.spinnerInterval = setInterval(() => {
                process.stdout.write(`\r${chalk_1.default.cyan(this.formatSpinner())}`);
                this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
            }, 80);
        }
        catch (error) {
            // Fallback for environments where spinner doesn't work
            console.log(chalk_1.default.cyan('Running tests...'));
        }
    }
    stopSpinner() {
        if (this.spinnerInterval) {
            clearInterval(this.spinnerInterval);
            this.spinnerInterval = undefined;
            try {
                process.stdout.write('\r\x1b[K\n'); // Clear spinner line and add newline
            }
            catch {
                console.log(); // Fallback: just add a newline
            }
        }
    }
    formatDuration(duration) {
        if (duration < 50) {
            return chalk_1.default.green(`${duration}ms ⚡`);
        }
        if (duration < 100) {
            return chalk_1.default.greenBright(`${duration}ms`);
        }
        return chalk_1.default.yellow(`${duration}ms`);
    }
    formatMemory(memory = 0) {
        const mb = Math.round(memory / 1024 / 1024 * 100) / 100;
        if (mb < 10) {
            return chalk_1.default.green(`${mb}MB`);
        }
        if (mb < 50) {
            return chalk_1.default.greenBright(`${mb}MB`);
        }
        return chalk_1.default.yellow(`${mb}MB`);
    }
    formatStatus(state) {
        return state === 'passed'
            ? chalk_1.default.green('✓ PASSED') // Changed from ✔ to ✓ for better terminal compatibility
            : chalk_1.default.red('✗ FAILED');
    }
    printReport() {
        const totalDuration = Date.now() - this.startTime;
        // Clear screen and move cursor to top
        console.clear();
        // Print header with animation
        const header = '🌿 Test Execution Report 🌿';
        console.log('\n' + chalk_1.default.bold.green('┏' + '━'.repeat(header.length + 2) + '┓'));
        console.log(chalk_1.default.bold.green('┃ ') + chalk_1.default.bold.white(header) + chalk_1.default.bold.green(' ┃'));
        console.log(chalk_1.default.bold.green('┗' + '━'.repeat(header.length + 2) + '┛\n'));
        // Show loading bar animation
        const progress = this.results.filter(r => r.state === 'passed').length / this.results.length;
        const barWidth = 40;
        const filled = Math.round(progress * barWidth);
        const bar = '█'.repeat(filled) + '▒'.repeat(barWidth - filled);
        console.log(chalk_1.default.green('Progress: ') + chalk_1.default.bold.green(`[${bar}] ${(progress * 100).toFixed(0)}%\n`));
        // Print results table with custom border
        console.log(chalk_1.default.green('┏' + '━'.repeat(98) + '┓'));
        console.log(chalk_1.default.green('┃ ') +
            chalk_1.default.bold.green('Test Case'.padEnd(50)) +
            chalk_1.default.bold.green('Duration'.padEnd(15)) +
            chalk_1.default.bold.green('Memory'.padEnd(15)) +
            chalk_1.default.bold.green('Status'.padEnd(15)) +
            chalk_1.default.green(' ┃'));
        console.log(chalk_1.default.green('┣' + '━'.repeat(98) + '┫'));
        this.results.forEach(result => {
            const status = result.state === 'passed'
                ? chalk_1.default.green('✓ PASSED')
                : chalk_1.default.red('✗ FAILED');
            console.log(chalk_1.default.green('┃ ') +
                result.title.slice(0, 47).padEnd(50) +
                this.formatDuration(result.duration || 0).padEnd(15) +
                this.formatMemory(result.memory).padEnd(15) +
                status.padEnd(15) +
                chalk_1.default.green(' ┃'));
        });
        console.log(chalk_1.default.green('┗' + '━'.repeat(98) + '┛\n'));
        // Summary section with icons and colors
        const passCount = this.results.filter(r => r.state === 'passed').length;
        const totalTests = this.results.length;
        const failCount = totalTests - passCount;
        console.log(chalk_1.default.bold.green('📊 Summary'));
        console.log(chalk_1.default.green('┏' + '━'.repeat(40) + '┓'));
        console.log(chalk_1.default.green('┃ ') + '🎯 Total Tests:'.padEnd(20) + `${totalTests}`.padEnd(17) + chalk_1.default.green(' ┃'));
        console.log(chalk_1.default.green('┃ ') + '✅ Passed:'.padEnd(20) + chalk_1.default.green(`${passCount}`.padEnd(17)) + chalk_1.default.green(' ┃'));
        console.log(chalk_1.default.green('┃ ') + '❌ Failed:'.padEnd(20) + chalk_1.default.red(`${failCount}`.padEnd(17)) + chalk_1.default.green(' ┃'));
        console.log(chalk_1.default.green('┃ ') + '⏱️  Duration:'.padEnd(20) + `${totalDuration}ms`.padEnd(17) + chalk_1.default.green(' ┃'));
        console.log(chalk_1.default.green('┗' + '━'.repeat(40) + '┛\n'));
        // Performance indicator
        const avgDuration = totalDuration / totalTests;
        let perfIcon = '🚀';
        if (avgDuration > 100) {
            perfIcon = '⚡';
        }
        if (avgDuration > 500) {
            perfIcon = '🐢';
        }
        console.log(chalk_1.default.cyan(`${perfIcon} Performance: ${this.getPerformanceLabel(avgDuration)}`));
    }
    getPerformanceLabel(avgDuration) {
        if (avgDuration < 50) {
            return chalk_1.default.green('Exceptional');
        }
        if (avgDuration < 100) {
            return chalk_1.default.greenBright('Very Good');
        }
        if (avgDuration < 200) {
            return chalk_1.default.yellow('Good');
        }
        return chalk_1.default.red('Needs Improvement');
    }
}
exports.GreenThemeReporter = GreenThemeReporter;
//# sourceMappingURL=TestReporter.js.map