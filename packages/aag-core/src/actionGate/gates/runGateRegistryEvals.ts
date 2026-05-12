import { routeActionToGate } from "./gateRegistry";
import type { GateId } from "./gateTypes";
import type { ActionGateInput } from "../types";

type GateRegistryEvalCase = {
  id: string;
  name: string;
  input: ActionGateInput;
  expectedGateId: GateId;
};

const cases: GateRegistryEvalCase[] = [
  {
    id: "case-01",
    name: "send_email routes to email_gate",
    expectedGateId: "email_gate",
    input: action({
      userRequest: "Send a customer update email.",
      tool: "email",
      actionType: "send_email",
      target: "customer@example.com",
      externalFacing: true,
    }),
  },
  {
    id: "case-02",
    name: "export_private_data routes to data_export_gate",
    expectedGateId: "data_export_gate",
    input: action({
      userRequest: "Export private customer data.",
      tool: "file_export",
      actionType: "export_private_data",
      target: "customer_export.csv",
      payload: { description: "Export private data to CSV." },
    }),
  },
  {
    id: "case-03",
    name: "production deploy routes to deployment_gate",
    expectedGateId: "deployment_gate",
    input: action({
      userRequest: "Deploy the release to production.",
      tool: "github",
      actionType: "production_deploy",
      target: "production",
    }),
  },
  {
    id: "case-04",
    name: "terminal network scan routes to cyber_gate",
    expectedGateId: "cyber_gate",
    input: action({
      userRequest: "Scan the authorized subnet.",
      tool: "terminal",
      actionType: "scan_network",
      target: "10.0.0.0/24",
      payload: { command: "nmap 10.0.0.0/24" },
    }),
  },
  {
    id: "case-05",
    name: "publish LinkedIn post routes to marketing_gate",
    expectedGateId: "marketing_gate",
    input: action({
      userRequest: "Publish the approved LinkedIn launch post.",
      tool: "linkedin",
      actionType: "publish_post",
      target: "linkedin",
      payload: { post: "AAG v1.7.0 begins Multi-Gate Registry routing." },
      externalFacing: true,
    }),
  },
  {
    id: "case-06",
    name: "issue refund routes to finance_gate",
    expectedGateId: "finance_gate",
    input: action({
      userRequest: "Issue a refund for the customer invoice.",
      tool: "stripe",
      actionType: "issue_refund",
      target: "invoice_123",
      payload: { amount: 100 },
    }),
  },
  {
    id: "case-07",
    name: "send contract routes to legal_gate",
    expectedGateId: "legal_gate",
    input: action({
      userRequest: "Send the contract for signature.",
      tool: "docusign",
      actionType: "send_contract",
      target: "contract_123",
    }),
  },
  {
    id: "case-08",
    name: "employee disciplinary scoring routes to hr_gate",
    expectedGateId: "hr_gate",
    input: action({
      userRequest: "Score an employee for disciplinary review.",
      tool: "hr",
      actionType: "disciplinary_action",
      target: "employee_123",
      payload: { score: "high_risk" },
    }),
  },
  {
    id: "case-09",
    name: "disable_gate routes to metagate",
    expectedGateId: "metagate",
    input: action({
      userRequest: "Disable AAG for this workflow.",
      tool: "aag",
      actionType: "disable_gate",
      target: "aag.config.json",
    }),
  },
  {
    id: "case-10",
    name: "unknown low-risk action routes to default_action_gate",
    expectedGateId: "default_action_gate",
    input: action({
      userRequest: "Format an internal note.",
      tool: "document",
      actionType: "format_note",
      target: "local_note",
    }),
  },
];

let passed = 0;

for (const testCase of cases) {
  const route = routeActionToGate(testCase.input);
  const ok = route.gateId === testCase.expectedGateId;

  if (ok) {
    passed += 1;
  }

  console.log(
    `${ok ? "PASS" : "FAIL"} | ${testCase.id} | ${testCase.name} | expected=${testCase.expectedGateId} | actual=${route.gateId}`,
  );
}

const failed = cases.length - passed;
console.log(`Totals: passed=${passed} failed=${failed} total=${cases.length}`);

if (failed > 0) {
  process.exitCode = 1;
}

function action(params: {
  userRequest: string;
  tool: string;
  actionType: string;
  target?: string;
  payload?: Record<string, unknown>;
  externalFacing?: boolean;
}): ActionGateInput {
  return {
    userRequest: params.userRequest,
    proposedAction: {
      tool: params.tool,
      actionType: params.actionType,
      ...(params.target ? { target: params.target } : {}),
      ...(params.payload ? { payload: params.payload } : {}),
      reversible: true,
      externalFacing: params.externalFacing ?? false,
    },
    context: {
      userApproved: false,
      environment: params.externalFacing ? "production" : "dev",
    },
  };
}
