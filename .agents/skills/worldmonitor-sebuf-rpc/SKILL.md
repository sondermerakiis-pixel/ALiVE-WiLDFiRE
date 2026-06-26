---
name: worldmonitor-sebuf-rpc
description: Designing, defining, and building client-server communications using the Sebuf proto-first RPC framework.
---
# Sebuf RPC Framework Integration

Use this skill when defining API contracts, writing Protocol Buffer definitions (`.proto`), or generating server/client interfaces using the Sebuf framework in the World Monitor codebase.

## What is Sebuf?

**Sebuf** is a lightweight, Go-based toolkit that compiles Protocol Buffer definitions directly into standard HTTP APIs, eliminating gRPC library dependencies at runtime.

*   **POST-only RPC Semantics**: Treats HTTP endpoints as direct function calls via standard HTTP `POST` requests, ignoring REST verbs (GET/PUT/DELETE) in favor of explicit method invocations.
*   **Zero-Drift Code Generation**: Translates `.proto` definitions into:
    *   TypeScript client classes (used by the frontend dashboard).
    *   Go handler interfaces (used by Vercel Edge functions and microservices).
    *   OpenAPI v3.1 specification documents.
*   **Validation Integration**: Incorporates `buf.validate` annotations directly within the `.proto` messages to perform automated request validation at the edge.

## Development Workflow

1.  **Define the Schema**: Create or edit `.proto` files in the `src/protos/` folder.
    ```protobuf
    syntax = "proto3";
    package worldmonitor.v1;

    import "buf/validate/validate.proto";

    message GetRiskScoreRequest {
      string country_code = 1 [(buf.validate.field).string.len = 2];
    }

    message GetRiskScoreResponse {
      float score = 1;
      string status = 2;
    }

    service RiskService {
      rpc GetRiskScore(GetRiskScoreRequest) returns (GetRiskScoreResponse);
    }
    ```
2.  **Generate Assets**: Run `make generate`. This triggers the `sebuf` compiler plugins, generating TypeScript types and Go server interfaces.
3.  **Implement Server-Side**: Write handlers in Go conforming to the generated interface, deploying them to the edge functions directory (`api/`).
4.  **Consume on Client-Side**: Import the generated TypeScript classes and call the service directly with type-safe parameters.
