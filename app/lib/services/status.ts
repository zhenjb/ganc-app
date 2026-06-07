import type {
  DepositStatus,
  WithdrawStatus,
  ProofStatus,
  BatchStatus,
} from "@/app/lib/interfaces/state";

export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

export type AnyStatus =
  | DepositStatus
  | WithdrawStatus
  | ProofStatus
  | BatchStatus;

export function statusLabel(status: AnyStatus): string {
  switch (status) {
    case "none":
      return "None";
    case "idle":
      return "Idle";
    case "pending":
      return "Pending";
    case "processed":
      return "Processed";
    case "submitted":
      return "Submitted";
    case "settled":
      return "Settled";
    case "rejected":
      return "Rejected";
    case "claimed":
      return "Claimed";
    case "generated":
      return "Generated";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusTone(status: AnyStatus): StatusTone {
  switch (status) {
    case "none":
      return "muted";
    case "idle":
      return "muted";
    case "pending":
      return "info";
    case "processed":
      return "success";
    case "generated":
      return "success";
    case "submitted":
      return "info";
    case "settled":
      return "success";
    case "claimed":
      return "success";
    case "rejected":
      return "danger";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
