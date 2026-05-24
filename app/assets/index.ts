import BatchIcon from "./icons/BatchIcon";
import ChevronIcon from "./icons/ChevronIcon";
import ClaimIcon from "./icons/ClaimIcon";
import DepositIcon from "./icons/DepositIcon";
import FailureDemoIcon from "./icons/FailureDemoIcon";
import HamburgerIcon from "./icons/HamburgerIcon";
import MoonIcon from "./icons/MoonIcon";
import OverviewIcon from "./icons/OverviewIcon";
import ProofIcon from "./icons/ProofIcon";
import SubmitIcon from "./icons/SubmitIcon";
import SunIcon from "./icons/SunIcon";
import SystemIcon from "./icons/SystemIcon";
import WithdrawIcon from "./icons/WithdrawIcon";

/**
 * Single icon registry referenced by `NavLeafDefinition.iconKey` and
 * `NavParentDefinition.iconKey` (see design.md). Keys here are the source of
 * truth for `keyof typeof import("@/app/assets").icons`.
 */
export const icons = {
  overview: OverviewIcon,
  deposit: DepositIcon,
  withdraw: WithdrawIcon,
  claim: ClaimIcon,
  batch: BatchIcon,
  proof: ProofIcon,
  submit: SubmitIcon,
  failureDemo: FailureDemoIcon,
  hamburger: HamburgerIcon,
  chevron: ChevronIcon,
  sun: SunIcon,
  moon: MoonIcon,
  system: SystemIcon,
} as const;
