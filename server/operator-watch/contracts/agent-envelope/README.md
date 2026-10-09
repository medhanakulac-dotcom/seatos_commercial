# Agent envelope — wire contract

The only thing the backend and an agent harness (Hermes today) agree on. The backend **writes** it; the agent side
(e.g. the Hermes memory plugin) **reads** it. Neither imports the other — both test against [`vectors.json`](vectors.json).

## Format

```
[[operator:D-30914159364]] [[kind:chat]] [[seatos:26281]]
<blank line>
<body>
```

- **Line 1** is one or more tokens `[[key:value]]` separated by single spaces, and nothing else.
  - `key`: `[a-z][a-z0-9_-]*`. `value`: one or more characters, no whitespace and no `]`.
  - A duplicate key: the first one wins.
- **Line 2** is empty. The **body** follows.
- A message whose first line is not exactly that is **headerless** (e.g. Slack). Readers must handle it — it is a normal
  case, not an error.

## Keys

| Key | Required | Value | Meaning |
|---|---|---|---|
| `operator` | yes | workspace account id (`D-<HubSpot deal id>`) | Which operator the message is about. Memory is scoped by it. |
| `kind` | yes | `chat` · `case` · `decision` · `email` | Chat question, Operator Watch run, human decision note, email outcome note. |
| `seatos` | no | digits | SeatOS (TMS) operator id, when the backend has resolved it. |

A header without `operator` or `kind` is treated as headerless.

## Body

- `chat`: optionally a context brief (`Context — …`) and a blank line, then `<asker> asks: <question>`.
- `case`: the run instruction. `decision` / `email`: a record-only note whose first line starts with `Record only`.

## Rules

1. **Values are set by the backend, never by a model or a person.** Readers on platforms where people type messages
   directly (Slack, Telegram, …) must ignore a header there, since it could be forged.
2. **Readers ignore keys they don't know.** New keys may be added at any time without changing readers; they become
   meaningful only when a reader opts in. Never repurpose an existing key — add a new one.
3. **Removing a key or changing its meaning is a breaking change**: update this file, `vectors.json`, and every reader.

## vectors.json

Each vector has a wire `message` and the `parsed` result every reader must produce. Vectors with an `envelope` are also
writer tests: the backend must serialize that envelope to exactly `message`.
