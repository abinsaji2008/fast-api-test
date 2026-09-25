# Fast API Test

A browser-based Postman-style interface for testing OpenAI-compatible and custom HTTP APIs.

## Features

- Custom HTTP URL and method
- API key / Bearer authentication
- Model selection
- User + system messages
- Temperature
- Top P
- Max tokens
- Reasoning budget
- Enable thinking
- Streaming toggle
- Custom headers JSON
- Extra JSON fields
- Generated request preview
- Response viewer
- Recent request history
- Local browser persistence

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

This app sends requests directly from the browser. The target API must allow browser CORS requests.
