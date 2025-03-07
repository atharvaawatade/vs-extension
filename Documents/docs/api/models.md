# API Models Documentation

This document describes the data models used in the API of the extension, including the structure of request and response bodies, and any relevant validation rules or constraints.

## Models

### CommandResponse

The `CommandResponse` model represents the response structure for commands processed by the extension.

#### Properties

- **status**: `string`
  - The current status of the command processing. Possible values include:
    - `thinking`: The command is being processed.
    - `generating`: The command is generating a response.
    - `applying`: The command is applying changes.
    - `done`: The command has completed successfully.
    - `error`: An error occurred during command processing.

- **message**: `string`
  - A descriptive message providing information about the command's status or any errors encountered.

### CommandSuggestion

The `CommandSuggestion` model represents a suggestion for a command that the user can execute.

#### Properties

- **command**: `string`
  - The command string that the user can invoke.

- **description**: `string`
  - A brief description of what the command does.

### FileDiff

The `FileDiff` model represents the differences between the original and modified content of a file.

#### Properties

- **filePath**: `string`
  - The path of the file being compared.

- **originalContent**: `string`
  - The original content of the file before modifications.

- **modifiedContent**: `string`
  - The content of the file after modifications.

- **diffHtml**: `string`
  - An HTML representation of the differences between the original and modified content.

### CodeInsight

The `CodeInsight` model provides insights generated from code analysis.

#### Properties

- **type**: `string`
  - The type of insight. Possible values include:
    - `warning`: Indicates a potential issue that should be addressed.
    - `info`: Provides informational messages.
    - `error`: Indicates a critical issue that needs immediate attention.
    - `suggestion`: Offers suggestions for improvements.

- **message**: `string`
  - A message describing the insight.

- **line**: `number` (optional)
  - The line number associated with the insight, if applicable.

- **severity**: `string`
  - The severity level of the insight. Possible values include:
    - `high`: Critical issues that must be resolved.
    - `medium`: Important issues that should be addressed.
    - `low`: Minor issues that can be improved.

- **fix**: `string` (optional)
  - Suggested fix or improvement for the identified issue.

### Additional Notes

- All models should adhere to the specified structure and validation rules to ensure consistency across the API.
- When implementing these models, ensure that the data is validated before processing to maintain integrity and prevent errors.