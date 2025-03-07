# API Endpoints Documentation

This document outlines the various API endpoints available in the extension, detailing the request methods, URL paths, expected parameters, and response formats for each endpoint.

## Endpoints

### 1. Create File

- **Method**: POST
- **URL**: `/api/files/create`
- **Request Body**:
  ```json
  {
    "filePath": "string",
    "content": "string"
  }
  ```
- **Response**:
  - **Status**: 201 Created
  - **Body**:
    ```json
    {
      "status": "done",
      "message": "File created successfully."
    }
    ```

### 2. Edit File

- **Method**: POST
- **URL**: `/api/files/edit`
- **Request Body**:
  ```json
  {
    "filePath": "string",
    "content": "string"
  }
  ```
- **Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "status": "done",
      "message": "File edited successfully."
    }
    ```

### 3. Get File Content

- **Method**: GET
- **URL**: `/api/files/content`
- **Query Parameters**:
  - `filePath`: string (required)
- **Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "content": "string"
    }
    ```

### 4. Delete File

- **Method**: DELETE
- **URL**: `/api/files/delete`
- **Request Body**:
  ```json
  {
    "filePath": "string"
  }
  ```
- **Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "status": "done",
      "message": "File deleted successfully."
    }
    ```

### 5. Get Suggestions

- **Method**: POST
- **URL**: `/api/suggestions`
- **Request Body**:
  ```json
  {
    "text": "string"
  }
  ```
- **Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "suggestions": [
        {
          "command": "string",
          "description": "string"
        }
      ]
    }
    ```

### 6. Analyze Code

- **Method**: POST
- **URL**: `/api/analyze`
- **Request Body**:
  ```json
  {
    "filePath": "string",
    "content": "string"
  }
  ```
- **Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "insights": [
        {
          "type": "string",
          "message": "string",
          "line": "number",
          "severity": "string",
          "fix": "string"
        }
      ]
    }
    ```

## Notes

- Ensure that all endpoints are secured and validate incoming requests.
- Use appropriate HTTP status codes to indicate the success or failure of requests.
- Consider implementing rate limiting and logging for API usage.