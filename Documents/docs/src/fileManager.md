# File Manager Module Documentation

## Overview
The `fileManager` module is responsible for managing files and directories within the extension. It provides various utility functions to read, edit, create, and retrieve information about files in the workspace. This module is essential for enabling file manipulation features in the extension, allowing users to interact with their codebase effectively.

## Functions

### `getFilesInDirectory(directory: string): Promise<string[]>`
- **Description**: Retrieves a list of files in the specified directory.
- **Parameters**:
  - `directory`: The directory path from which to retrieve files. If not provided, the workspace root is used.
- **Returns**: A promise that resolves to an array of file paths relative to the workspace.

### `getFileContent(filePath: string): Promise<string | null>`
- **Description**: Reads the content of a specified file.
- **Parameters**:
  - `filePath`: The path of the file to read.
- **Returns**: A promise that resolves to the file content as a string, or `null` if the file cannot be read.

### `searchFiles(query: string): Promise<string[]>`
- **Description**: Searches for files matching the specified query string.
- **Parameters**:
  - `query`: The search term to look for in file names.
- **Returns**: A promise that resolves to an array of file paths that match the query.

### `editFile(filePath: string, content: string): Promise<boolean>`
- **Description**: Edits the content of a specified file.
- **Parameters**:
  - `filePath`: The path of the file to edit.
  - `content`: The new content to write to the file.
- **Returns**: A promise that resolves to `true` if the edit was successful, or `false` otherwise.

### `getFileTree(directory: string = ''): Promise<FileTreeNode>`
- **Description**: Constructs a tree representation of the files and directories starting from the specified directory.
- **Parameters**:
  - `directory`: The directory path to start building the file tree. Defaults to the workspace root.
- **Returns**: A promise that resolves to a `FileTreeNode` representing the file structure.

### `createNewFile(filePath: string, content: string): Promise<boolean>`
- **Description**: Creates a new file with the specified content.
- **Parameters**:
  - `filePath`: The path where the new file should be created.
  - `content`: The content to write to the new file.
- **Returns**: A promise that resolves to `true` if the file was created successfully, or `false` otherwise.

### `calculateImportGraph(filePath: string): Promise<Map<string, string[]>>`
- **Description**: Analyzes a file to create a dependency graph of its imports.
- **Parameters**:
  - `filePath`: The path of the file to analyze.
- **Returns**: A promise that resolves to a map where keys are file paths and values are arrays of imported module names.

## Interfaces

### `FileTreeNode`
- **Properties**:
  - `name`: The name of the file or directory.
  - `type`: The type of the node, either `'file'` or `'directory'`.
  - `path`: The path of the file or directory.
  - `children`: An optional array of `FileTreeNode` objects representing the contents of a directory.

## Usage
The `fileManager` module is utilized throughout the extension to facilitate file operations. It allows users to navigate their workspace, edit files, and manage their codebase efficiently. By providing a clear API for file management, this module enhances the overall functionality of the extension.