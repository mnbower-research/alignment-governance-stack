# Policy Profiles

Policy Profiles describe organization-specific governance constraints for AGS.

This v0.2 foundation package validates policy profile shape and resolves a policy profile against an `AgentActionProposal`. It does not execute actions, approve execution, replace PGDL or AAG, or write receipts.

Runtime behavior remains in the existing PGDL -> AAG -> Runtime Binding -> Receipts spine.
