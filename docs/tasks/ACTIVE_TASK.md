# Active task

**MAX_RUNTIME_INTEGRATED — authorized bounded integration and exact release verification.**

Integration owner: codex/max-runtime-integrated. Baseline 1e4a7a2b454bed87bdcb40559773143c2fc38c9b. Compose accepted TLS, Bot and Mini App source commits; close the Mini App URL bound and Docker context/runtime containment; verify one exact release artifact. Preserve PostgreSQL/BullMQ/Redis/outbox/governor and conservative UNKNOWN. No live MAX mutations, deployment, queue redesign, data/Save/UI work.

T103 remains PASS / KEEP_EXISTING_BULLMQ. T104 DATA_RUNTIME_GATE=FAIL, LEGAL_MANUAL_GATE=OPEN. T105/T107 and unrelated UI work remain outside this authorization. Stop at the integration handoff/package boundary.
