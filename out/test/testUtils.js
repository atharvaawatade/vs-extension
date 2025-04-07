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
exports.TestUtils = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TestUtils {
    static async createTestWorkspace(root, files) {
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
    static async cleanTestWorkspace(root) {
        if (fs.existsSync(root)) {
            await fs.promises.rm(root, { recursive: true, force: true });
        }
    }
    static async verifyCommandResponse(response, expectedStatus) {
        if (typeof response === 'string') {
            throw new Error(`Expected CommandResponse but got string: ${response}`);
        }
        if (response.status !== expectedStatus) {
            throw new Error(`Expected status ${expectedStatus} but got ${response.status}`);
        }
    }
}
exports.TestUtils = TestUtils;
//# sourceMappingURL=testUtils.js.map