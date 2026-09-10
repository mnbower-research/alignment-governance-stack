export type DataSensitivity = "low" | "medium" | "high";

export type ExecutionConstraintSetVersion = "execution-constraints/v0.1";

export type ExecutionConstraintType =
  | "exact_string"
  | "exact_number"
  | "exact_boolean"
  | "enum"
  | "identifier"
  | "timestamp"
  | "numeric_range"
  | "time_window"
  | "string_set"
  | "structured_object";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ExecutionConstraintBase {
  type: ExecutionConstraintType;
  description?: string;
  displayName?: string;
}

export interface ExactStringExecutionConstraint extends ExecutionConstraintBase {
  type: "exact_string";
  value: string;
}

export interface ExactNumberExecutionConstraint extends ExecutionConstraintBase {
  type: "exact_number";
  value: number;
}

export interface ExactBooleanExecutionConstraint extends ExecutionConstraintBase {
  type: "exact_boolean";
  value: boolean;
}

export interface EnumExecutionConstraint extends ExecutionConstraintBase {
  type: "enum";
  value: string;
  allowedValues: string[];
}

export interface IdentifierExecutionConstraint extends ExecutionConstraintBase {
  type: "identifier";
  value: string;
  namespace?: string;
}

export interface TimestampExecutionConstraint extends ExecutionConstraintBase {
  type: "timestamp";
  value: string;
}

export interface NumericRangeExecutionConstraint extends ExecutionConstraintBase {
  type: "numeric_range";
  min: number;
  max: number;
  unit?: string;
  inclusiveMin?: boolean;
  inclusiveMax?: boolean;
}

export interface TimeWindowExecutionConstraint extends ExecutionConstraintBase {
  type: "time_window";
  startsAt: string;
  endsAt: string;
}

export interface StringSetExecutionConstraint extends ExecutionConstraintBase {
  type: "string_set";
  values: string[];
}

export interface StructuredObjectExecutionConstraint extends ExecutionConstraintBase {
  type: "structured_object";
  value: JsonValue;
}

export type ExecutionConstraint =
  | ExactStringExecutionConstraint
  | ExactNumberExecutionConstraint
  | ExactBooleanExecutionConstraint
  | EnumExecutionConstraint
  | IdentifierExecutionConstraint
  | TimestampExecutionConstraint
  | NumericRangeExecutionConstraint
  | TimeWindowExecutionConstraint
  | StringSetExecutionConstraint
  | StructuredObjectExecutionConstraint;

export interface ExecutionConstraintSet {
  version: ExecutionConstraintSetVersion;
  constraints: Record<string, ExecutionConstraint>;
  metadata?: Record<string, JsonValue>;
}

export interface AgentActionProposal {
  id: string;
  userRequest: string;
  tool: string;
  actionType: string;
  target: string;
  environment: string;
  reversible: boolean;
  externalFacing: boolean;
  dataSensitivity: DataSensitivity;
  requiresApproval: boolean;
  knownApproval: boolean;
  executionConstraints?: ExecutionConstraintSet;
  metadata: Record<string, unknown>;
}
