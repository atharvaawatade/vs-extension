import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview): string {
    // Add CSP meta tag for security
    const cspMeta = `
        <meta http-equiv="Content-Security-Policy" 
              content="default-src 'none'; 
                     style-src ${webview.cspSource} https://cdnjs.cloudflare.com 'unsafe-inline';
                     script-src ${webview.cspSource} https://cdnjs.cloudflare.com 'unsafe-inline';
                     img-src ${webview.cspSource} https: data:;">`;

    // Add styles for suggestions and edit buttons
    const additionalStyles = `
    .suggestions {
        position: absolute;
        bottom: 100%;
        left: 16px;
        right: 16px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
    }

    .suggestion-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .suggestion-item:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .edit-button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 8px;
    }

    .edit-button:hover {
        background: var(--vscode-button-hoverBackground);
    }

    .code-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    .edit-button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
    }

    .edit-button:hover {
        background: var(--vscode-button-hoverBackground);
    }

    .stop-button {
        background: var(--vscode-errorForeground);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        display: none;
        align-items: center;
        gap: 4px;
        font-size: 12px;
    }

    .stop-button.visible {
        display: flex;
    }

    pre {
        position: relative;
        padding: 16px;
        margin: 8px 0;
        background: var(--vscode-textBlockQuote-background);
        border-radius: 6px;
        overflow-x: auto;
    }

    pre code {
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        line-height: 1.4;
        tab-size: 4;
    }

    .file-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding: 8px 12px;
        font-size: 13px;
        border-top-left-radius: 3px;
        border-top-right-radius: 3px;
    }
    
    .analysis-section {
        padding: 12px;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 6px;
        margin-top: 12px;
        margin-bottom: 12px;
    }
    
    .code-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
    }
    
    .code-actions button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .code-actions button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    
    pre {
        position: relative;
        max-height: 400px;
        overflow-y: auto;
    }
    
    .line-highlight {
        background-color: var(--vscode-editor-selectionBackground);
        display: block;
    }
    
    /* Add language-specific syntax highlight overrides here */
    .command-list {
        position: absolute;
        bottom: 100%;
        left: 16px;
        right: 16px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
    }

    .command-category {
        padding: 8px 12px;
        font-weight: bold;
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    .command-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .command-item:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .command-syntax {
        color: var(--vscode-textPreformat-foreground);
        font-family: var(--vscode-editor-font-family);
    }

    /* Diff Viewer Styles */
    .diff-viewer {
        font-family: 'Consolas', 'Courier New', monospace;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        margin: 16px 0;
        overflow: hidden;
    }

    .diff-header {
        padding: 8px 16px;
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .diff-stats {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
    }

    .diff-stats .added { color: #28a745; }
    .diff-stats .removed { color: #d73a49; }

    .diff-content {
        background: var(--vscode-editor-background);
        overflow-x: auto;
    }

    .diff-line {
        display: flex;
        font-size: 13px;
        line-height: 1.5;
        min-width: 100%;
        border-left: 2px solid transparent;
    }

    .diff-line pre {
        margin: 0;
        padding: 2px 16px;
        white-space: pre;
        flex: 1;
        font-family: inherit;
    }

    .diff-mark {
        width: 40px;
        padding: 2px 10px;
        text-align: center;
        user-select: none;
        font-family: Consolas, monospace;
        opacity: 0.7;
    }

    .diff-line.added {
        background: rgba(40, 167, 69, 0.1);
        border-left-color: #28a745;
    }

    .diff-line.added .diff-mark {
        color: #28a745;
    }

    .diff-line.removed {
        background: rgba(215, 58, 73, 0.1);
        border-left-color: #d73a49;
    }

    .diff-line.removed .diff-mark {
        color: #d73a49;
    }

    /* File comparison UI */
    .file-comparison {
        margin: 16px 0;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        overflow: hidden;
        background: var(--vscode-editor-background);
    }

    .file-comparison-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: var(--vscode-sideBarSectionHeader-background);
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    .file-path {
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
        color: var(--vscode-foreground);
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .file-path::before {
        content: '';
        width: 16px;
        height: 16px;
        background: var(--vscode-icon-foreground);
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v3h4v9z'/%3E%3C/svg%3E");
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v3h4v9z'/%3E%3C/svg%3E");
    }

    .file-actions {
        display: flex;
        gap: 8px;
    }

    .file-actions button {
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        border: none;
        cursor: pointer;
    }

    .save-button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
    }

    .save-button:hover {
        background: var(--vscode-button-hoverBackground);
    }

    .cancel-button {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
    }

    .cancel-button:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }

    /* Loading animation for save button */
    .save-button.loading {
        position: relative;
        color: transparent;
    }

    .save-button.loading::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        border: 2px solid var(--vscode-button-foreground);
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    /* VS Code-like Diff Viewer */
    .diff-viewer {
        font-family: var(--vscode-editor-font-family);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        overflow: hidden;
        margin: 16px 0;
        background: var(--vscode-editor-background);
    }

    .diff-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--vscode-sideBarSectionHeader-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        font-size: 12px;
    }

    .diff-title {
        color: var(--vscode-foreground);
        font-weight: 600;
    }

    .diff-stats {
        display: flex;
        gap: 8px;
        font-size: 12px;
    }

    .stats-added {
        color: var(--vscode-gitDecoration-addedResourceForeground, #2ea043);
    }

    .stats-removed {
        color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149);
    }

    .diff-content {
        overflow-x: auto;
        padding: 8px 0;
    }

    .diff-line {
        display: flex;
        font-size: 12px;
        min-height: 20px;
        padding: 0 16px;
    }

    .diff-line:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .line-number {
        color: var(--vscode-editorLineNumber-foreground);
        padding-right: 16px;
        text-align: right;
        width: 40px;
        user-select: none;
    }

    .diff-text {
        white-space: pre;
        font-family: var(--vscode-editor-font-family);
    }

    .diff-line.added {
        background: var(--vscode-diffEditor-insertedLineBackground, rgba(46, 160, 67, 0.15));
    }

    .diff-line.added .line-number {
        color: var(--vscode-gitDecoration-addedResourceForeground, #2ea043);
    }

    .diff-line.removed {
        background: var(--vscode-diffEditor-removedLineBackground, rgba(248, 81, 73, 0.15));
    }

    .diff-line.removed .line-number {
        color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149);
    }

    /* File action buttons */
    .file-actions {
        margin-top: 8px;
    }

    .file-actions button {
        padding: 4px 10px;
        border-radius: 2px;
        font-size: 11px;
    }
`;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${cspMeta}
        <title>Pravega Code Guide</title>
        <style>
				:root {
					--animation-duration: 1.5s;
				}
				
				body {
					font-family: var(--vscode-font-family);
					padding: 0;
					margin: 0;
					color: var(--vscode-editor-foreground);
					background-color: var(--vscode-editor-background);
					display: flex;
					flex-direction: column;
					height: 100vh;
				}
				
				.header {
					padding: 12px 16px;
					font-weight: bold;
					border-bottom: 1px solid var(--vscode-panel-border);
					display: flex;
					justify-content: space-between;
					align-items: center;
					background-color: var(--vscode-sideBar-background);
				}
				
				.header-title {
					display: flex;
					align-items: center;
					gap: 8px;
				}
				
				.header-logo {
					width: 24px;
					height: 24px;
					background-color: var(--vscode-button-background);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: bold;
					font-size: 14px;
					color: var(--vscode-button-foreground);
				}
				
				.header-actions {
					display: flex;
					gap: 8px;
				}
				
				.icon-button {
					background: none;
					border: none;
					color: var(--vscode-foreground);
					cursor: pointer;
					padding: 4px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 4px;
				}
				
				.icon-button:hover {
					background-color: var(--vscode-toolbar-hoverBackground);
				}
				
				.chat-container {
					flex: 1;
					overflow-y: auto;
					padding: 16px;
					display: flex;
					flex-direction: column;
					gap: 16px;
				}
				
				.message-group {
					display: flex;
					flex-direction: column;
					gap: 8px;
					max-width: 90%;
				}
				
				.user-group {
					align-self: flex-end;
				}
				
				.ai-group {
					align-self: flex-start;
				}
				
				.message {
					padding: 10px 14px;
					border-radius: 8px;
					word-break: break-word;
					font-size: 14px;
					line-height: 1.5;
					position: relative;
				}
				
				.user-message {
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border-top-right-radius: 2px;
				}
				
				.ai-message {
					background-color: var(--vscode-editor-inactiveSelectionBackground);
					border-top-left-radius: 2px;
				}
				
				.message-time {
					font-size: 10px;
					color: var(--vscode-descriptionForeground);
					margin-top: 4px;
					align-self: flex-end;
				}
				
				.input-container {
					display: flex;
					flex-direction: column;
					padding: 12px 16px;
					border-top: 1px solid var(--vscode-panel-border);
					background-color: var(--vscode-sideBar-background);
				}
				
				.thinking {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 8px 12px;
					border-radius: 8px;
					background-color: var(--vscode-editor-inactiveSelectionBackground);
					margin-bottom: 12px;
					font-size: 13px;
					color: var(--vscode-descriptionForeground);
					max-width: 160px;
				}
				
				.thinking-dots {
					display: flex;
					gap: 4px;
				}
				
				.dot {
					width: 6px;
					height: 6px;
					border-radius: 50%;
					background-color: var(--vscode-descriptionForeground);
					opacity: 0.7;
				}
				
				.dot:nth-child(1) {
					animation: pulse var(--animation-duration) infinite 0s;
				}
				
				.dot:nth-child(2) {
					animation: pulse var(--animation-duration) infinite 0.2s;
				}
				
				.dot:nth-child(3) {
					animation: pulse var(--animation-duration) infinite 0.4s;
				}
				
				@keyframes pulse {
					0%, 100% {
						transform: scale(1);
						opacity: 0.7;
					}
					50% {
						transform: scale(1.2);
						opacity: 1;
					}
				}
				
				.input-row {
					display: flex;
					gap: 8px;
				}
				
				#messageInput {
					flex: 1;
					resize: none;
					height: 60px;
					padding: 10px 12px;
					border: 1px solid var(--vscode-input-border);
					background-color: var(--vscode-input-background);
					color: var(--vscode-input-foreground);
					border-radius: 6px;
					font-family: var(--vscode-font-family);
					font-size: 13px;
					line-height: 1.5;
				}
				
				#messageInput:focus {
					outline: 1px solid var(--vscode-focusBorder);
				}
				
				.send-button {
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					border-radius: 6px;
					padding: 0;
					width: 34px;
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				
				.send-button:hover {
					background-color: var(--vscode-button-hoverBackground);
				}
				
				.send-button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				
				.shortcuts-text {
					font-size: 11px;
					margin-top: 8px;
					color: var(--vscode-descriptionForeground);
					text-align: right;
				}
				
				code {
					font-family: var(--vscode-editor-font-family);
					background-color: var(--vscode-textBlockQuote-background);
					padding: 0.1em 0.3em;
					border-radius: 3px;
					font-size: 0.9em;
				}
				
				pre {
					font-family: var(--vscode-editor-font-family);
					background-color: var(--vscode-textBlockQuote-background);
					border-radius: 6px;
					padding: 12px;
					overflow-x: auto;
					margin: 8px 0;
				}
				
				pre code {
					background-color: transparent;
					padding: 0;
				}
				
				.empty-state {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					height: 100%;
					text-align: center;
					gap: 16px;
					color: var(--vscode-descriptionForeground);
					padding: 0 20px;
				}
				
				.ai-avatar {
					width: 40px;
					height: 40px;
					border-radius: 50%;
					background-color: var(--vscode-button-background);
					display: flex;
					align-items: center;
					justify-content: center;
					color: var(--vscode-button-foreground);
					font-weight: bold;
					font-size: 16px;
					}
				${additionalStyles}
			</style>
		</head>
		<body>
			<div class="header">
				<div class="header-title">
					<div class="header-logo">P</div>
					<span>Pravega Code Guide</span>
				</div>
				<div class="header-actions">
					<button id="clearButton" class="icon-button" title="Clear Chat">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M8 2C4.7 2 2 4.7 2 8C2 11.3 4.7 14 8 14C11.3 14 14 11.3 14 8C14 4.7 11.3 2 8 2ZM10.5 9.5L9.5 10.5L8 9L6.5 10.5L5.5 9.5L7 8L5.5 6.5L6.5 5.5L8 7L9.5 5.5L10.5 6.5L9 8L10.5 9.5Z" fill="currentColor"/>
						</svg>
					</button>
					<button id="stopButton" class="stop-button" title="Stop Generation">
						<svg width="16" height="16" viewBox="0 0 16 16">
							<rect x="3" y="3" width="10" height="10" fill="currentColor"/>
						</svg>
						Stop
					</button>
				</div>
			</div>
			<div class="chat-container" id="chatContainer">
				<!-- Messages will be added here dynamically -->
			</div>
			<div class="input-container">
				<div id="thinkingIndicator" class="thinking" style="display: none;">
					<span>Thinking</span>
					<div class="thinking-dots">
						<div class="dot"></div>
						<div class="dot"></div>
						<div class="dot"></div>
					</div>
				</div>
				<div class="input-row">
					<textarea id="messageInput" placeholder="Ask coding questions..."></textarea>
					<button id="sendButton" class="send-button" title="Send Message">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M14.3 1.7L7.6 8.4L14.3 15.1L15.7 13.7L10.4 8.4L15.7 3.1L14.3 1.7ZM6.7 1.7L0 8.4L6.7 15.1L8.1 13.7L2.8 8.4L8.1 3.1L6.7 1.7Z" fill="currentColor"/>
						</svg>
					</button>
				</div>
				<div class="shortcuts-text">Ctrl+Enter to send</div>
			</div>
			<div class="suggestions" id="suggestionsContainer" style="display: none;">
				<!-- File suggestions will appear here -->
			</div>
			<script>
				const vscode = acquireVsCodeApi();
				const chatContainer = document.getElementById('chatContainer');
				const messageInput = document.getElementById('messageInput');
				const sendButton = document.getElementById('sendButton');
				const clearButton = document.getElementById('clearButton');
				const thinkingIndicator = document.getElementById('thinkingIndicator');
				const suggestionsContainer = document.getElementById('suggestionsContainer');
				const stopButton = document.getElementById('stopButton');
				
				let isProcessing = false;
				let messages = [];

				// Format the message text with markdown-like syntax
				function formatMessageText(text) {
					// Replace code blocks
					let formattedText = text.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
					
					// Replace inline code
					formattedText = formattedText.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
					
					// Replace new lines with <br>
					formattedText = formattedText.replace(/\\n/g, '<br>');
					
					return formattedText;
				}

				// Format timestamp
				function formatTime(timestamp) {
					const date = new Date(timestamp);
					return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				}

				// Update the chat UI with all messages
				function updateChatUI() {
					chatContainer.innerHTML = '';
					
					if (messages.length === 0) {
						chatContainer.innerHTML = \`
							<div class="empty-state">
								<div class="ai-avatar">A</div>
								<h3>Appointy Code Guide</h3>
								<p>Ask coding questions, get explanations, or request code solutions.</p>
							</div>
						\`;
						return;
					}
					
					let currentSender = null;
					let messageGroupDiv = null;
					
					messages.forEach((message, index) => {
						// If this is a new sender or the first message, create a new message group
						if (message.sender !== currentSender) {
							currentSender = message.sender;
							messageGroupDiv = document.createElement('div');
							messageGroupDiv.className = \`message-group \${message.sender === 'user' ? 'user-group' : 'ai-group'}\`;
							chatContainer.appendChild(messageGroupDiv);
						}
						
						// Create message element
						const messageDiv = document.createElement('div');
						messageDiv.className = \`message \${message.sender === 'user' ? 'user-message' : 'ai-message'}\`;
						messageDiv.innerHTML = formatMessageText(message.text);
						messageGroupDiv.appendChild(messageDiv);
						
						// Add timestamp to the last message in the group
						if (index === messages.length - 1 || messages[index + 1].sender !== message.sender) {
							const timeDiv = document.createElement('div');
							timeDiv.className = 'message-time';
							timeDiv.textContent = formatTime(message.timestamp);
							messageGroupDiv.appendChild(timeDiv);
						}
					});
					
					// Scroll to bottom
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}

				// Send a message
				function sendMessage() {
					if (isProcessing) return;
					
					const text = messageInput.value.trim();
					if (text) {
						// Send message to extension
						vscode.postMessage({
							command: 'sendMessage',
							text: text
						});
						
						// Clear input field
						messageInput.value = '';
					}
				}

				// Handle send button click
				sendButton.addEventListener('click', sendMessage);

				// Clear chat history
				clearButton.addEventListener('click', () => {
					vscode.postMessage({
						command: 'clearChat'
					});
				});

				// Handle Enter key (Ctrl+Enter to send)
				messageInput.addEventListener('keydown', (e) => {
					if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
						e.preventDefault();
						sendMessage();
					}
				});

				// Handle input event for suggestions
				messageInput.addEventListener('input', () => {
					const text = messageInput.value;
					if (text.startsWith('@')) {
						vscode.postMessage({
							command: 'getSuggestions',
							text: text
						});
					} else {
						suggestionsContainer.style.display = 'none';
					}
				});

				// Handle messages from the extension
				window.addEventListener('message', event => {
					const message = event.data;
					switch (message.command) {
						case 'updateMessages':
							messages = message.messages;
							updateChatUI();
							break;
						case 'setThinking':
							isProcessing = message.isThinking;
							updateThinkingState(isProcessing);
							break;
						case 'updateSuggestions':
							const suggestions = message.suggestions;
							if (suggestions.length === 0) {
								suggestionsContainer.style.display = 'none';
								return;
							}

							suggestionsContainer.innerHTML = suggestions.map(s => \`
								<div class="suggestion-item" data-value="\${s.command}">
									<span>\${s.command}</span>
									<span class="suggestion-description">\${s.description}</span>
								</div>
							\`).join('');
							suggestionsContainer.style.display = 'block';
							break;
					}
				});

				// Handle suggestion clicks
				suggestionsContainer.addEventListener('click', (e) => {
					const item = e.target.closest('.suggestion-item');
					if (item) {
						messageInput.value = item.dataset.value;
						suggestionsContainer.style.display = 'none';
						messageInput.focus();
					}
				});

				// Handle edit buttons
				document.addEventListener('click', (e) => {
					if (e.target.matches('.edit-button')) {
						const { file, content } = e.target.dataset;
						vscode.postMessage({
							command: 'applyEdit',
							filePath: file,
							newContent: decodeURIComponent(content)
						});
					}
				});

				// Handle buttons in the chat
				document.addEventListener('click', function(event) {
					const target = event.target;
					
					// Handle save button (Apply Changes)
					if (target.classList && target.classList.contains('save-button')) {
						console.log('Save button clicked');
						const file = target.getAttribute('data-file');
						const content = decodeURIComponent(target.getAttribute('data-content') || '');
						
						if (file && content) {
							console.log(\`Applying changes to \${file}\`);
							vscode.postMessage({
								command: 'applyEdit',
								filePath: file,
								newContent: content
							});
						}
					}
					
					// Handle cancel button
					if (target.classList && target.classList.contains('cancel-button')) {
						console.log('Cancel button clicked');
						// Just close or hide any UI elements if needed
					}
				});

				stopButton.addEventListener('click', () => {
					vscode.postMessage({ command: 'stopGeneration' });
				});

				function updateThinkingState(isThinking) {
					stopButton.classList.toggle('visible', isThinking);
					thinkingIndicator.style.display = isThinking ? 'flex' : 'none';
					sendButton.disabled = isThinking;
				}

				// Focus the input field on load
				messageInput.focus();

				const commandHelp = {
					'Basic Commands': {
						'@tree': 'Show project file structure',
						'@help': 'Show command help'
					},
					'File Creation': {
						'#create @filepath': 'Create new file(s)',
						'#create @filepath1 @filepath2': 'Create multiple files'
					},
					'File Editing': {
						'#edit @filepath': 'Edit existing file',
						'#edit @filepath1 @filepath2': 'Edit multiple files'
					},
					'Analysis': {
						'#explain @filepath': 'Explain code in file'
					}
				};

				function handleCommand(text) {
					const command = text.trim();
					
					// Command validation
					if (command.startsWith('#create') || command.startsWith('#edit')) {
						const parts = command.split(' ');
						const action = parts[0];
						const files = parts.slice(1).filter(p => p.startsWith('@'));
						
						if (files.length === 0) {
							return {
								error: 'No files specified. Use @ to specify files (e.g. @main.css)'
							};
						}
						
						// Remove @ from filenames and validate
						const filePaths = files.map(f => f.substring(1));
						
						return {
							action: action.substring(1),
							files: filePaths
						};
					}
					
					return { error: 'Invalid command' };
				}

				messageInput.addEventListener('input', () => {
					const text = messageInput.value;
					if (text.startsWith('#') || text.startsWith('@')) {
						showCommandSuggestions(text);
					} else {
						suggestionsContainer.style.display = 'none';
					}
				});

				function showCommandSuggestions(text) {
					const suggestions = [];
					
					Object.entries(commandHelp).forEach(([category, commands]) => {
						Object.entries(commands).forEach(([cmd, desc]) => {
							if (cmd.toLowerCase().includes(text.toLowerCase())) {
								suggestions.push({ command: cmd, description: desc });
							}
						});
					});
					
					// Update suggestions UI
					if (suggestions.length > 0) {
						suggestionsContainer.innerHTML = suggestions.map(s => \`
							<div class="suggestion-item" data-value="\${s.command}">
								<span class="command-syntax">\${s.command}</span>
								<span class="command-description">\${s.description}</span>
							</div>
						\`).join('');
						suggestionsContainer.style.display = 'block';
					} else {
						suggestionsContainer.style.display = 'none';
					}
				}
			</script>
		</body>
    </html>`;
}
