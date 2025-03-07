# Command Handler Module Documentation

## Overview
The `commandHandler` module is responsible for processing user commands within the extension. It interprets commands issued by the user, manages the execution of these commands, and generates appropriate responses. This module serves as the core interface between user input and the functionality provided by the extension.

## Purpose
The primary purpose of the `commandHandler` module is to handle various commands that users can issue through the extension. It processes these commands, performs the necessary actions, and returns structured responses that inform the user of the outcome.

## Exported Interfaces
### CommandSuggestion
```typescript
export interface CommandSuggestion {
    command: string; // The command string
    description: string; // A brief description of the command
}
```

### CommandResponse
```typescript
export interface CommandResponse {
    status: 'thinking' | 'generating' | 'applying' | 'done' | 'error'; // The current status of the command processing
    message: string; // A message providing details about the command execution
}
```

## Key Functions
### handleCommand
```typescript
async handleCommand(command: string): Promise<CommandResponse | string>
```
- **Description**: Main entry point for processing user commands. It determines the type of command and delegates the processing to the appropriate handler.
- **Parameters**: 
  - `command`: A string representing the user command.
- **Returns**: A promise that resolves to a `CommandResponse` or a string listing available commands.

### handleHashCommand
```typescript
private async handleHashCommand(command: string): Promise<CommandResponse>
```
- **Description**: Processes commands that start with a hash (`#`). This includes commands for editing files and creating new files.
- **Parameters**: 
  - `command`: A string representing the command to be processed.
- **Returns**: A promise that resolves to a `CommandResponse`.

### handleEditCommand
```typescript
private async handleEditCommand(filePaths: string[], instruction: string): Promise<CommandResponse>
```
- **Description**: Handles the editing of files based on user instructions.
- **Parameters**: 
  - `filePaths`: An array of strings representing the paths of files to be edited.
  - `instruction`: A string containing the user's instruction for the edit.
- **Returns**: A promise that resolves to a `CommandResponse`.

### getInitialTemplate
```typescript
private getInitialTemplate(filePath: string): string
```
- **Description**: Returns an initial template based on the file type for new files.
- **Parameters**: 
  - `filePath`: A string representing the path of the file.
- **Returns**: A string containing the initial template.

### parseFileModifications
```typescript
private parseFileModifications(response: string): Record<string, string>
```
- **Description**: Parses the response from the AI model to extract file modifications.
- **Parameters**: 
  - `response`: A string containing the response from the AI model.
- **Returns**: An object mapping file paths to their modified content.

### createDiff
```typescript
private async createDiff(originalContent: string, newContent: string): Promise<string>
```
- **Description**: Generates a diff between the original and modified content.
- **Parameters**: 
  - `originalContent`: A string containing the original content.
  - `newContent`: A string containing the modified content.
- **Returns**: A promise that resolves to a string representing the diff.

### handleCreateCommand
```typescript
private async handleCreateCommand(filePath: string, instruction: string): Promise<CommandResponse>
```
- **Description**: Handles the creation of new files based on user instructions.
- **Parameters**: 
  - `filePath`: A string representing the path of the new file.
  - `instruction`: A string containing the user's instruction for the file creation.
- **Returns**: A promise that resolves to a `CommandResponse`.

### handleCreateMultipleFiles
```typescript
private async handleCreateMultipleFiles(filePaths: string[], instruction: string): Promise<CommandResponse>
```
- **Description**: Handles the creation of multiple files based on user instructions.
- **Parameters**: 
  - `filePaths`: An array of strings representing the paths of the new files.
  - `instruction`: A string containing the user's instruction for the file creation.
- **Returns**: A promise that resolves to a `CommandResponse`.

### handleExplainCommand
```typescript
private async handleExplainCommand(filePath: string): Promise<CommandResponse>
```
- **Description**: Provides an explanation of the code in the specified file.
- **Parameters**: 
  - `filePath`: A string representing the path of the file to be explained.
- **Returns**: A promise that resolves to a `CommandResponse`.

## Conclusion
The `commandHandler` module is a crucial part of the extension, enabling users to interact with the functionality provided. By processing commands and generating responses, it facilitates a seamless user experience.