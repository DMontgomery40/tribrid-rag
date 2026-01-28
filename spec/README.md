# TriBridRAG Specifications

This directory contains YAML specifications for all components of TriBridRAG.

## Structure

```
spec/
├── backend/          # Backend component specs
│   ├── api_*.yaml    # API endpoint specifications
│   ├── db_*.yaml     # Database client specifications
│   ├── indexing_*.yaml    # Indexing pipeline specs
│   └── retrieval_*.yaml   # Retrieval pipeline specs
└── frontend/         # Frontend component specs
    ├── components_*.yaml  # React component specifications
    ├── hooks.yaml         # React hooks specifications
    ├── stores.yaml        # Zustand store specifications
    └── types.yaml         # TypeScript type specifications
```

## Spec Format

Each YAML file follows this structure:

```yaml
name: ComponentName
description: Brief description
version: "1.0"

# For API specs
endpoints:
  - path: /api/endpoint
    method: POST
    request: RequestModel
    response: ResponseModel
    description: What it does

# For component specs
props:
  - name: propName
    type: string
    required: true
    description: What it controls

# For hooks
returns:
  - name: fieldName
    type: Type
    description: What it provides
```

## Usage

These specs serve as:
1. Documentation for developers
2. Contract validation between frontend/backend
3. Test generation source
4. Code review reference
