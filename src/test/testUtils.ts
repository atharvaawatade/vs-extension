import * as fs from 'fs';
import * as path from 'path';
import { CommandResponse } from '../commandHandler';

export class TestUtils {
    static async createTestWorkspace(root: string, files: Record<string, string>): Promise<void> {
        if (!fs.existsSync(root)) {
            await fs.promises.mkdir(root, { recursive: true });
        }

        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(root, filePath);
            const dir = path.dirname(fullPath);
            
            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.writeFile(fullPath, content);
        }
    }

    static async cleanTestWorkspace(root: string): Promise<void> {
        if (fs.existsSync(root)) {
            await fs.promises.rm(root, { recursive: true, force: true });
        }
    }

    static async verifyCommandResponse(
        response: string | CommandResponse, 
        expectedStatus: 'done' | 'error' | 'thinking' | 'generating' | 'applying'
    ): Promise<void> {
        if (typeof response === 'string') {
            throw new Error(`Expected CommandResponse but got string: ${response}`);
        }
        
        if (response.status !== expectedStatus) {
            throw new Error(`Expected status ${expectedStatus} but got ${response.status}`);
        }
    }
}
