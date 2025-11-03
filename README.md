# Telex Agent API

## Overview

This is an AI agent backend server built with Node.js, TypeScript, and the Mastra framework. It provides a JSON-RPC 2.0 API to interact with a specialized AI agent for mood-based movie recommendations.

## Features

- **@mastra/core**: For building, managing, and serving AI agents.
- **Google Gemini**: Powers the agent's natural language understanding and mood detection.
- **TMDB API**: Used as a tool to fetch up-to-date movie information and recommendations.
- **LibSQL/SQLite**: For in-memory or file-based storage of agent memory and observability data.

## Getting Started

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/shemigam1/ai-movie-telex-agent.git
    cd telex-agent
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Create a `.env` file in the root directory and add your environment variables.
    ```env
    # .env
    TMDB_API_KEY=your_tmdb_api_key_here
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
4.  Start the development server:
    ```sh
    npm run dev
    ```
    The server will be running on `http://localhost:3000`.

### Environment Variables

- `TMDB_API_KEY`: Your API key from The Movie Database for fetching movie data.
- `GEMINI_API_KEY`: Your API key from Google AI Studio for powering the generative AI agent.

## API Documentation

### Base URL

The API routes are registered at the root of the server URL (e.g., `http://localhost:3000`).

### Endpoints

#### POST /a2a/agent/:agentId

Executes the specified AI agent with a user prompt and returns the generated response. The agent ID for movie recommendations is `wasiu_the_cinephile`.

**Request**:
The endpoint follows the JSON-RPC 2.0 specification. The `params.message.parts[0].text` field contains the user's prompt.

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "agent.generate",
  "params": {
    "contextId": "ctx-12345",
    "taskId": "task-67890",
    "message": {
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "I feel sad today, show me a movie"
        }
      ]
    }
  }
}
```

**Response**:
A successful response contains the completed task details, including the agent's formatted text response, artifacts, and conversation history.

````json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "id": "task-67890",
    "contextId": "ctx-12345",
    "status": {
      "state": "completed",
      "timestamp": "2024-05-21T15:30:00.123Z",
      "message": {
        "messageId": "msg-agent-abc",
        "role": "agent",
        "parts": [
          {
            "kind": "text",
            "text": "😢 **Recommendations for Sad Mood**\n\n**Your Mood Profile:**\n- Mood: Sad\n- Preferred Genres: Drama\n\n**Movie Recommendations:**\n```json\n{\n  \"recommendations\": [\n    {\n      \"title\": \"The Shawshank Redemption\",\n      \"genre\": \"Drama\",\n      \"description\": \"Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.\",\n      \"matchScore\": 98,\n      \"runtime\": \"142 minutes\"\n    }\n  ]\n}\n```"
          }
        ],
        "kind": "message"
      }
    },
    "artifacts": [
      {
        "artifactId": "artifact-def-456",
        "name": "wasiu_the_cinephileResponse",
        "parts": [
          {
            "kind": "text",
            "text": "😢 **Recommendations for Sad Mood**\n\n**Your Mood Profile:**\n- Mood: Sad\n- Preferred Genres: Drama\n\n**Movie Recommendations:**\n```json\n{\n  \"recommendations\": [\n    {\n      \"title\": \"The Shawshank Redemption\",\n      \"genre\": \"Drama\",\n      \"description\": \"Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.\",\n      \"matchScore\": 98,\n      \"runtime\": \"142 minutes\"\n    }\n  ]\n}\n```"
          }
        ]
      }
    ],
    "history": [
      {
        "kind": "message",
        "role": "user",
        "parts": [
          {
            "kind": "text",
            "text": "I feel sad today, show me a movie"
          }
        ],
        "messageId": "msg-user-ghi",
        "taskId": "task-67890"
      },
      {
        "kind": "message",
        "role": "agent",
        "parts": [
          {
            "kind": "text",
            "text": "😢 **Recommendations for Sad Mood**\n\n**Your Mood Profile:**\n- Mood: Sad\n- Preferred Genres: Drama\n\n**Movie Recommendations:**\n```json\n{\n  \"recommendations\": [\n    {\n      \"title\": \"The Shawshank Redemption\",\n      \"genre\": \"Drama\",\n      \"description\": \"Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.\",\n      \"matchScore\": 98,\n      \"runtime\": \"142 minutes\"\n    }\n  ]\n}\n```"
          }
        ],
        "messageId": "msg-agent-abc",
        "taskId": "task-67890"
      }
    ],
    "kind": "task"
  }
}
````

**Errors**:

- `400 Bad Request`: Invalid JSON-RPC 2.0 format.
  ```json
  {
    "jsonrpc": "2.0",
    "id": null,
    "error": {
      "code": -32600,
      "message": "Invalid Request: jsonrpc must be \"2.0\" and id is required"
    }
  }
  ```
- `400 Bad Request`: Invalid or missing parameters in the request payload.
  ```json
  {
    "jsonrpc": "2.0",
    "id": "req-001",
    "error": {
      "code": -32602,
      "message": "Invalid params: message with parts required"
    }
  }
  ```
- `404 Not Found`: The requested `agentId` does not exist.
  ```json
  {
    "jsonrpc": "2.0",
    "id": "req-001",
    "error": {
      "code": -32602,
      "message": "Agent 'invalid-agent-id' not found"
    }
  }
  ```
- `500 Internal Server Error`: An unexpected error occurred on the server.
  ```json
  {
    "jsonrpc": "2.0",
    "id": null,
    "error": {
      "code": -32603,
      "message": "Internal error",
      "data": {
        "details": "Error message from the server."
      }
    }
  }
  ```

---

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
