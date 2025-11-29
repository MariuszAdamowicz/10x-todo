# Conventional Commits Rules Summary

## Structure

The commit message should be structured as follows:
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

---

## Core Principles

### 1. Type

The commit MUST be prefixed with a type. This indicates the nature of the changes.

- **`feat`**: Introduces a new feature to the codebase.
  - _Correlates with `MINOR` in Semantic Versioning._
- **`fix`**: Patches a bug in your codebase.
  - _Correlates with `PATCH` in Semantic Versioning._

Other common types are allowed, for example:

- `build:`
- `chore:`
- `ci:`
- `docs:`
- `style:`
- `refactor:`
- `perf:`
- `test:`

### 2. Scope (Optional)

A scope MAY be provided after a type to provide additional contextual information. It MUST be contained within parentheses.

_Example: `feat(parser): add ability to parse arrays`_

### 3. Description

The description MUST immediately follow the colon and space after the type/scope. It's a short summary of the code changes.

_Example: `fix: array parsing issue when multiple spaces were contained in string`_

### 4. Body (Optional)

A longer commit body MAY be provided after the short description, starting one blank line after it. It provides additional context.

### 5. Footer(s) (Optional)

One or more footers MAY be provided one blank line after the body.

---

## Breaking Changes

Breaking API changes MUST be indicated in one of two ways:

1.  **Footer**: By including `BREAKING CHANGE:` as a footer, followed by a description of the breaking change.

    ```
    feat: allow provided config object to extend other configs

    BREAKING CHANGE: `extends` key in config file is now used for extending other config files
    ```

2.  **`!` Suffix**: By appending a `!` immediately before the `:` in the type/scope prefix. The description should then describe the breaking change.
    ```
    feat!: send an email to the customer when a product is shipped
    ```
    _lub_
    ```
    feat(api)!: send an email to the customer when a product is shipped
    ```

A `BREAKING CHANGE` (regardless of type) correlates with `MAJOR` in Semantic Versioning.
