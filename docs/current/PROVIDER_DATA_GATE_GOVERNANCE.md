# Provider and Moscow data-gate governance

## Current status

- KudaGo: `CONDITIONAL_PRIMARY / NOT APPROVED`.
- T104 / Moscow Data Gate v1: `DATA_RUNTIME_GATE = FAIL`.
- Legal/manual gate: `OPEN`.
- Moscow: `NOT ACTIVATED`.
- T107 live ingestion: blocked by provider/data readiness.

Gate v1 is immutable historical evidence. It ran on 2026-09-19 against a matrix containing dates around 2026-09-17–20; some discovery tasks were already historical. The result remains FAIL. That timing does not prove that KudaGo coverage is permanently insufficient, and it does not permit retroactive changes to the completed matrix, verdicts or receipts.

## Moscow Data Gate v2 methodology

The next provider gate after T105 is named **Moscow Data Gate v2** and must follow all of these rules:

1. Keep the accepted task archetypes fixed.
2. Select every concrete test date before execution, with all dates in a future test window at the time the matrix is frozen.
3. Freeze the complete task/date matrix before the first API request.
4. Record the freeze timestamp and content hash in the gate receipt.
5. Do not change tasks, dates, constraints or thresholds after seeing provider results.
6. Preserve PASS/NO_PASS/UNKNOWN/ERROR and zero-critical-false-PASS semantics; safety-only tasks do not count as coverage.
7. Do not approve KudaGo, activate Moscow or start live ingestion unless the fresh runtime gate passes and the separate legal/manual gate is explicitly cleared.

Gate v2 is not authorized or run by the T103/T104 integration checkpoint.
