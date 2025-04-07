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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const webview_1 = require("./webview");
const sarpachAgent_1 = require("./agents/sarpachAgent");
function activate(context) {
    console.log('Pravega Bot extension is now active!');
    // Create and register the sidebar view provider
    const provider = new ChatViewProvider(context.extensionUri);
    // Register the provider for a webview view
    const viewRegistration = vscode.window.registerWebviewViewProvider("pravega-bot.chatView", provider, {
        webviewOptions: {
            retainContextWhenHidden: true
        }
    });
    // Register command to focus the chat view
    const focusChatCommand = vscode.commands.registerCommand('pravega-bot.focusChat', () => {
        vscode.commands.executeCommand('pravega-bot.chatView.focus');
    });
    // Register other commands
    const clearChatCommand = vscode.commands.registerCommand('pravega-bot.clearChat', () => {
        provider._handleClearChat();
    });
    const stopGenerationCommand = vscode.commands.registerCommand('pravega-bot.stopGeneration', () => {
        provider.stopGeneration();
    });
    context.subscriptions.push(viewRegistration, focusChatCommand, clearChatCommand, stopGenerationCommand);
}
class ChatViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._messages = [];
        this._apiKey = 'AIzaSyBSu-Z0y_h1vSIoZEW6o8loDxp9V8Ylarg';
        this._modelName = 'gemini-2.0-flash';
        this._isProcessing = false;
        const welcomeMessage = {
            text: "Hello! I'm your AI coding assistant powered by Sarpach. How can I help you today?",
            sender: 'AI',
            timestamp: Date.now()
        };
        this._messages = [welcomeMessage];
        // Initialize Sarpach agent
        this._sarpachAgent = new sarpachAgent_1.SarpachAgent(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle all webview messages
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    await this._handleSendMessage(message.text);
                    break;
                case 'clearChat':
                    this._handleClearChat();
                    break;
                case 'getSuggestions':
                    await this._handleGetSuggestions(message.text);
                    break;
                case 'applyEdit':
                    await this._applyEdit(message.filePath, message.newContent);
                    break;
                case 'stopGeneration':
                    this.stopGeneration();
                    break;
            }
        });
        // Initialize with existing messages
        this._updateMessages();
    }
    async _handleSendMessage(text) {
        // Add user message
        const userMessage = {
            text,
            sender: 'user',
            timestamp: Date.now()
        };
        this._messages.push(userMessage);
        this._updateMessages();
        this._setThinking(true);
        try {
            // Process with Sarpach
            const result = await this._sarpachAgent.processUserInput(text);
            // Add thinking process message
            if (result.thinking) {
                this._addAIMessage(result.thinking);
            }
            // If we have file content to show
            if (result.fileContent) {
                const ext = result.fileExtension || '';
                this._addAIMessage(`\`\`\`${ext}\n${result.fileContent}\n\`\`\``);
            }
            // If there's a command to be executed
            if (result.command) {
                this._addAIMessage(`🔧 Executing: ${result.command}`);
            }
            // Add final result
            this._addAIMessage(result.result);
        }
        catch (error) {
            this._addAIMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            this._setThinking(false);
        }
    }
    _handleClearChat() {
        this._messages = [this._messages[0]];
        this._updateMessages();
    }
    async _handleGetSuggestions(text) {
        if (text.startsWith('@') || text.startsWith('#')) {
            const suggestions = await this._sarpachAgent.getSuggestions(text);
            this._view?.webview.postMessage({
                command: 'updateSuggestions',
                suggestions
            });
        }
    }
    _updateMessages() {
        this._view?.webview.postMessage({
            command: 'updateMessages',
            messages: this._messages
        });
    }
    _setThinking(isThinking) {
        this._view?.webview.postMessage({
            command: 'setThinking',
            isThinking
        });
    }
    async _processWithGemini(userText) {
        if (userText.startsWith('#')) {
            // Show initial thinking state
            this._setThinking(true);
            this._addAIMessage("💭 Processing command...");
            try {
                const response = await this._commandHandler.handleCommand(userText);
                // Handle the response directly as a CommandResponse object
                if (typeof response === 'object' && response.status) {
                    switch (response.status) {
                        case 'thinking':
                            this._addAIMessage("🔄 Analyzing...");
                            break;
                        case 'generating':
                            this._addAIMessage("⚙️ Generating changes...");
                            break;
                        case 'applying':
                            this._addAIMessage("📝 Applying changes...");
                            break;
                        case 'done':
                            // Clean up code blocks in the message if present
                            const cleanMessage = response.message.replace(/```\w*\n/g, '').replace(/```/g, '');
                            this._addAIMessage(cleanMessage);
                            break;
                        case 'error':
                            this._addAIMessage("❌ " + response.message);
                            break;
                    }
                }
                else {
                    if (typeof response === 'string') {
                        this._addAIMessage(response);
                    }
                    else {
                        this._addAIMessage(response.message);
                    }
                }
            }
            catch (error) {
                this._addAIMessage("❌ Error: " + error);
            }
            finally {
                this._setThinking(false);
            }
            return;
        }
        if (this._isProcessing) {
            return;
        }
        this._isProcessing = true;
        // Enhanced system instruction for better code assistance
        const systemInstruction = `You are an advanced code-editing assistant integrated into VS Code.
Your primary responsibility is to help the user understand, modify, and optimize their code.

When analyzing code:
- Provide detailed explanations of functions, classes, and control flow
- Identify potential bugs, performance issues, or security vulnerabilities
- Suggest modern coding patterns and best practices
- Consider the context of the entire project, not just isolated snippets

When modifying code:
- Use chain-of-thought reasoning to understand the user's intent
- Preserve existing functionality unless explicitly asked to change it
- Follow language-specific conventions and best practices
- Add clear comments explaining your changes

Be precise, professional, and concise in your explanations.`;
        // Prepare conversation and request data
        const conversation = this._messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
        const requestData = JSON.stringify({
            contents: conversation,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                temperature: 0.2, // Lower temperature for more precise code edits
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192
            }
        });
        // Show loading indicator
        this._setThinking(true);
        // Make API request
        await this._makeGeminiRequest(requestData);
    }
    async _handleCommand(command) {
        try {
            const response = await this._commandHandler.handleCommand(command);
            if (typeof response === 'string') {
                this._addAIMessage(response);
            }
            else {
                this._addAIMessage(response.message);
            }
        }
        catch (error) {
            this._handleApiError('Command error: ' + error);
        }
        finally {
            this._setThinking(false);
        }
    }
    _addAIMessage(text) {
        const aiMessage = {
            text,
            sender: 'AI',
            timestamp: Date.now()
        };
        this._messages.push(aiMessage);
        this._updateMessages();
    }
    async _makeGeminiRequest(requestData) {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${this._modelName}:generateContent?key=${this._apiKey}`,
            method: 'POST',
            headers: {
                'contentType': 'application/json',
                contentLength: Buffer.byteLength(requestData)
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                this._isProcessing = false;
                this._setThinking(false);
                try {
                    const response = JSON.parse(data);
                    if (response.candidates && response.candidates.length > 0) {
                        const aiResponse = response.candidates[0].content.parts[0].text;
                        this._addAIMessage(aiResponse);
                    }
                    else {
                        this._handleApiError('No response generated.');
                    }
                }
                catch (e) {
                    this._handleApiError('Error parsing API response: ' + data);
                }
            });
        });
        this._currentRequest = req;
        req.on('abort', () => {
            this._isProcessing = false;
            this._setThinking(false);
        });
        req.on('error', (e) => {
            this._isProcessing = false;
            this._handleApiError('API request failed: ' + e.message);
        });
        req.write(requestData);
        req.end();
    }
    stopGeneration() {
        if (this._currentRequest && this._isProcessing) {
            this._currentRequest.destroy();
            this._currentRequest = undefined;
            this._isProcessing = false;
            const stopMessage = {
                text: "*Generation stopped*",
                sender: 'AI',
                timestamp: Date.now()
            };
            this._messages.push(stopMessage);
            this._updateMessages();
        }
    }
    async _applyEdit(filePath, newContent) {
        try {
            const success = await this._sarpachAgent.applyFileEdit(filePath, Promise.resolve(newContent));
            if (success) {
                this._addAIMessage(`✅ Changes applied to ${filePath}`);
            }
            else {
                this._addAIMessage(`❌ Failed to apply changes to ${filePath}`);
            }
        }
        catch (error) {
            this._addAIMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    _handleApiError(errorMessage) {
        console.error(errorMessage);
        // Turn off thinking indicator
        this._setThinking(false);
        // Add error message to chat
        const errorResponseMsg = {
            text: "I'm sorry, I encountered an error. Please try again.",
            sender: 'AI',
            timestamp: Date.now()
        };
        this._messages.push(errorResponseMsg);
        // Update webview with all messages
        this._updateMessages();
    }
    _getHtmlForWebview(webview) {
        return (0, webview_1.getWebviewContent)(webview);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map