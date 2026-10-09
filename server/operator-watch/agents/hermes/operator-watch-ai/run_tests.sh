#!/usr/bin/env bash
# Run the plugin's test_* functions with Hermes' own Python (it ships without pytest).
set -euo pipefail
HERMES_PY="${HERMES_PY:-$HOME/.hermes/hermes-agent/venv/bin/python}"
TESTS="$(cd "$(dirname "$0")" && pwd)/plugins/operator-hindsight/tests/test_operator_hindsight.py"
cd "$(dirname "$HERMES_PY")/../.."   # hermes-agent root, so `agent.memory_provider` imports
"$HERMES_PY" - "$TESTS" <<'PY'
import runpy, sys, traceback
ns = runpy.run_path(sys.argv[1])
tests = [(k, f) for k, f in ns.items() if k.startswith("test_") and callable(f)]
failed = 0
for name, fn in tests:
    try:
        fn()
    except Exception:
        failed += 1
        print(f"FAIL {name}")
        traceback.print_exc()
print(f"{len(tests) - failed} passed, {failed} failed")
sys.exit(1 if failed else 0)
PY
