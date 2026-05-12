# Receipts

Receipts preserve proof after PGDL, AAG, runtime binding, and execution decisions.

Receipts should eventually answer what was proposed, what objections were raised, what changed, who approved it, what was allowed or blocked, what action ran, and whether runtime execution matched the permit.

Receipts are audit evidence, not execution approval.

## v0.1 Governance Receipts

`@alignment-governance-stack/receipts` creates tamper-evident governance receipts for the current AGS spine:

```text
Original proposal
-> PGDL packet
-> Proposal sent to AAG
-> AAG decision
-> Runtime permit, if issued
-> Runtime Binding result, if a runtime action is supplied
-> Final governance decision
-> Governance receipt
-> Receipt hash
```

Receipt v0.1 preserves:

- what was originally proposed
- what PGDL decided
- what proposal was actually sent to AAG
- what AAG decided
- whether a runtime permit was issued
- whether a runtime action matched the permit
- what the final AGS decision was
- when the receipt was created
- whether the receipt body still matches its stable hash

Receipt hashes use Node `crypto` SHA-256 over canonical JSON. The canonical serializer recursively sorts object keys, preserves array order, removes undefined and function values from the hash representation, keeps null values, and excludes the top-level `receiptHash` field before hashing.

Receipts do not execute actions, approve execution, write to disk, or store anything in a database. They are an in-memory proof artifact in v0.1.

Future work can add persistent storage, signing, export formats, receipt-chain navigation, and dashboard views without changing the PGDL, AAG, or Runtime Binding responsibilities.
