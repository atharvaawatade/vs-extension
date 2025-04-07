# Pravega Code Guide 🤖

A powerful VS Code extension powered by Google's Generative AI (Gemini) that brings advanced AI-powered coding assistance right to your editor. This extension leverages cutting-edge language models to help you write, understand, and maintain code more efficiently.

![image](https://github.com/user-attachments/assets/0ecb5822-8080-4a78-8477-c1d82e8c87d3)


## 🌟 Core Features

### 🧠 AI-Powered Code Assistant
- Real-time coding suggestions using Gemini 2.0 Flash model
- Context-aware code analysis and generation
- Smart file editing with syntax awareness
- Intelligent code completion and refactoring
- Advanced error detection and fixing

### 💬 Interactive Chat Interface
- Dedicated sidebar chat view with real-time updates
- File-aware conversations with smart context tracking
- Dynamic command suggestions based on context
- Code snippets preview with syntax highlighting
- Auto-resizing input with markdown support

### 🛠️ Smart Commands
- Intelligent file creation and editing
- Advanced code optimization
- Automated documentation generation
- Error handling suggestions
- Batch file operations

### 📁 Advanced File Management
- Smart file suggestions with fuzzy matching
- Real-time file content preview
- Batch file operations with validation
- Syntax-aware editing across multiple files
- Automatic file type detection

### 📊 Code Analysis
- Deep code structure analysis
- Complexity metrics calculation
- Code quality assessment
- Dependency tracking
- Performance optimization suggestions

## 🚀 Technical Architecture

### Core Components
1. **SarpachAgent**
   - Central intelligence handler
   - Request processing and routing
   - Context management
   - LLM integration

2. **DocumentationAgent**
   - Automated documentation generation
   - Code structure analysis
   - Metrics calculation
   - Quality assessment

3. **FileSystemManager**
   - File operations handling
   - Directory structure management
   - Content validation
   - Change tracking

4. **CommandHandler**
   - Command parsing and routing
   - Natural language processing
   - Action execution
   - Response formatting

## ⚡ Advanced Usage

### Command Syntax
```bash
# File Operations
@filename                 # Show file content
@filename #edit          # Edit file
@filename #explain       # Analyze file

# Batch Operations
@file1 @file2 #edit     # Edit multiple files
#create @newfile        # Create new file

# Documentation
#documentation          # Generate project docs
```

### Special Features
1. **Intelligent File Handling**
   - Auto-detection of file types
   - Smart content formatting
   - Syntax validation
   - Change preview

2. **Context Awareness**
   - Project structure understanding
   - Code dependency tracking
   - Import suggestion
   - Type inference

3. **Advanced Documentation**
   - Architecture analysis
   - Code metrics
   - Quality assessment
   - Dependency graphs

## 🎯 Use Cases

1. **Code Creation & Modification**
   - Smart boilerplate generation
   - Type-safe code completion
   - Automated refactoring
   - Pattern implementation

2. **Code Understanding**
   - Deep code analysis
   - Architecture visualization
   - Dependency mapping
   - Performance profiling

3. **Code Optimization**
   - Performance enhancement
   - Memory optimization
   - Error handling
   - Type safety

4. **Code Maintenance**
   - Documentation updates
   - Refactoring assistance
   - Bug detection
   - Style enforcement

## ⚙️ Technical Configuration

```json
{
  "pravegaCodeGuide.apiKey": "your-api-key",
  "pravegaCodeGuide.modelName": "gemini-2.0-flash-thinking-exp-01-21",
  "pravegaCodeGuide.advanced": {
    "contextWindow": 8192,
    "temperature": 0.2,
    "topP": 0.95,
    "topK": 40
  }
}
```

## 🔧 System Requirements

- VS Code version 1.86.0 or higher
- Node.js 14.x or higher
- 4GB RAM minimum (8GB recommended)
- Active internet connection
- API key for Google's Generative AI

## 🔄 Latest Updates

### Version 0.0.1
- Initial release with Gemini 2.0 Flash integration
- Advanced chat interface with real-time updates
- File system integration with batch operations
- Documentation generation system
- Command system with natural language processing

## 🛠️ Development

### Building from Source
```bash
# Clone repository
git clone https://github.com/yourusername/pravega-code-guide

# Install dependencies
npm install

# Build extension
npm run build

# Run tests
npm test
```

### Architecture Overview
```
src/
├── agents/              # AI agents and processors
│   ├── sarpachAgent.ts  # Main AI agent
│   └── pluginAgents/    # Specialized agents
├── common/              # Shared utilities
├── handlers/            # Command handlers
└── services/           # Core services
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Source Code](https://github.com/yourusername/pravega-code-guide)
- [Issue Tracker](https://github.com/yourusername/pravega-code-guide/issues)
- [Documentation](https://github.com/yourusername/pravega-code-guide/wiki)
- [Change Log](CHANGELOG.md)

## 💖 Support

If you find this extension helpful, please consider:
- Star the repository
- Submit feedback and feature requests
- Share with your network
- Contribute to the codebase

