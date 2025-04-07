import * as Mocha from 'mocha';
import chalk from 'chalk';

interface TestResult {
    title: string;
    duration: number;
    state: 'passed' | 'failed';
    memory?: number;
}

export class GreenThemeReporter extends Mocha.reporters.Base {
    private results: TestResult[] = [];
    private startTime: number = Date.now();
    private startMemory: number = process.memoryUsage().heapUsed;
    private spinnerInterval?: NodeJS.Timeout;
    private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private spinnerIndex = 0;

    constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
        super(runner, options);
        this.startSpinner();

        runner.on('pass', (test) => {
            this.results.push({
                title: test.fullTitle(),
                duration: test.duration || 0,
                state: 'passed',
                memory: process.memoryUsage().heapUsed - this.startMemory
            });
            this.updateSpinner(`${chalk.green('✓')} ${test.title}`);
        });

        runner.on('fail', (test) => {
            this.results.push({
                title: test.fullTitle(),
                duration: test.duration || 0,
                state: 'failed',
                memory: process.memoryUsage().heapUsed - this.startMemory
            });
            this.updateSpinner(`${chalk.red('✗')} ${test.title}`);
        });

        runner.on('end', () => {
            this.stopSpinner();
            this.printReport();
        });
    }

    private updateSpinner(text: string) {
        try {
            // Clear previous line more safely
            process.stdout.write('\r\x1b[K'); // Clear current line
            process.stdout.write(`${text}\n`);
        } catch (error) {
            // Fallback for environments where ANSI escape codes don't work
            console.log(text);
        }
    }

    private formatSpinner(): string {
        return `${this.spinnerFrames[this.spinnerIndex]} Running tests...`;
    }

    private startSpinner() {
        if (this.spinnerInterval) {return;}
        
        try {
            process.stdout.write('\n');
            this.spinnerInterval = setInterval(() => {
                process.stdout.write(`\r${chalk.cyan(this.formatSpinner())}`);
                this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
            }, 80);
        } catch (error) {
            // Fallback for environments where spinner doesn't work
            console.log(chalk.cyan('Running tests...'));
        }
    }

    private stopSpinner() {
        if (this.spinnerInterval) {
            clearInterval(this.spinnerInterval);
            this.spinnerInterval = undefined;
            try {
                process.stdout.write('\r\x1b[K\n'); // Clear spinner line and add newline
            } catch {
                console.log(); // Fallback: just add a newline
            }
        }
    }

    private formatDuration(duration: number): string {
        if (duration < 50) {return chalk.green(`${duration}ms ⚡`);}
        if (duration < 100) {return chalk.greenBright(`${duration}ms`);}
        return chalk.yellow(`${duration}ms`);
    }

    private formatMemory(memory: number = 0): string {
        const mb = Math.round(memory / 1024 / 1024 * 100) / 100;
        if (mb < 10) {return chalk.green(`${mb}MB`);}
        if (mb < 50) {return chalk.greenBright(`${mb}MB`);}
        return chalk.yellow(`${mb}MB`);
    }

    private formatStatus(state: 'passed' | 'failed'): string {
        return state === 'passed' 
            ? chalk.green('✓ PASSED')  // Changed from ✔ to ✓ for better terminal compatibility
            : chalk.red('✗ FAILED');
    }

    private printReport(): void {
        const totalDuration = Date.now() - this.startTime;
        
        // Clear screen and move cursor to top
        console.clear();

        // Print header with animation
        const header = '🌿 Test Execution Report 🌿';
        console.log('\n' + chalk.bold.green('┏' + '━'.repeat(header.length + 2) + '┓'));
        console.log(chalk.bold.green('┃ ') + chalk.bold.white(header) + chalk.bold.green(' ┃'));
        console.log(chalk.bold.green('┗' + '━'.repeat(header.length + 2) + '┛\n'));

        // Show loading bar animation
        const progress = this.results.filter(r => r.state === 'passed').length / this.results.length;
        const barWidth = 40;
        const filled = Math.round(progress * barWidth);
        const bar = '█'.repeat(filled) + '▒'.repeat(barWidth - filled);
        console.log(chalk.green('Progress: ') + chalk.bold.green(`[${bar}] ${(progress * 100).toFixed(0)}%\n`));

        // Print results table with custom border
        console.log(chalk.green('┏' + '━'.repeat(98) + '┓'));
        console.log(
            chalk.green('┃ ') +
            chalk.bold.green('Test Case'.padEnd(50)) +
            chalk.bold.green('Duration'.padEnd(15)) +
            chalk.bold.green('Memory'.padEnd(15)) +
            chalk.bold.green('Status'.padEnd(15)) +
            chalk.green(' ┃')
        );
        console.log(chalk.green('┣' + '━'.repeat(98) + '┫'));

        this.results.forEach(result => {
            const status = result.state === 'passed' 
                ? chalk.green('✓ PASSED')
                : chalk.red('✗ FAILED');
            console.log(
                chalk.green('┃ ') +
                result.title.slice(0, 47).padEnd(50) +
                this.formatDuration(result.duration || 0).padEnd(15) +
                this.formatMemory(result.memory).padEnd(15) +
                status.padEnd(15) +
                chalk.green(' ┃')
            );
        });
        console.log(chalk.green('┗' + '━'.repeat(98) + '┛\n'));

        // Summary section with icons and colors
        const passCount = this.results.filter(r => r.state === 'passed').length;
        const totalTests = this.results.length;
        const failCount = totalTests - passCount;

        console.log(chalk.bold.green('📊 Summary'));
        console.log(chalk.green('┏' + '━'.repeat(40) + '┓'));
        console.log(chalk.green('┃ ') + '🎯 Total Tests:'.padEnd(20) + `${totalTests}`.padEnd(17) + chalk.green(' ┃'));
        console.log(chalk.green('┃ ') + '✅ Passed:'.padEnd(20) + chalk.green(`${passCount}`.padEnd(17)) + chalk.green(' ┃'));
        console.log(chalk.green('┃ ') + '❌ Failed:'.padEnd(20) + chalk.red(`${failCount}`.padEnd(17)) + chalk.green(' ┃'));
        console.log(chalk.green('┃ ') + '⏱️  Duration:'.padEnd(20) + `${totalDuration}ms`.padEnd(17) + chalk.green(' ┃'));
        console.log(chalk.green('┗' + '━'.repeat(40) + '┛\n'));

        // Performance indicator
        const avgDuration = totalDuration / totalTests;
        let perfIcon = '🚀';
        if (avgDuration > 100) {perfIcon = '⚡';}
        if (avgDuration > 500) {perfIcon = '🐢';}
        
        console.log(chalk.cyan(`${perfIcon} Performance: ${this.getPerformanceLabel(avgDuration)}`));
    }

    private getPerformanceLabel(avgDuration: number): string {
        if (avgDuration < 50) {return chalk.green('Exceptional');}
        if (avgDuration < 100) {return chalk.greenBright('Very Good');}
        if (avgDuration < 200) {return chalk.yellow('Good');}
        return chalk.red('Needs Improvement');
    }
}
