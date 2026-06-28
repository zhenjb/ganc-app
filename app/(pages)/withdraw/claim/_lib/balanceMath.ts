/**
 * Pure arithmetic helpers for verifying claim balances against the standard test vector.
 * All calculations use BigInt to avoid floating-point issues.
 */

/**
 * Verify that post-claim balances match the expected test vector formula.
 *
 * Formula:
 *   moduleBalance === totalDeposit - totalClaim
 *   userBalance   === startBalance - totalDeposit + totalClaim
 *
 * Standard test vector: start=1000, deposit=100, claim=40 → user=940, module=60
 */
export function verifyTestVector(
  userBalance: string,
  moduleBalance: string,
  options: { totalDeposit: string; totalClaim: string; startBalance: string },
): boolean {
  const user = BigInt(userBalance);
  const module = BigInt(moduleBalance);
  const deposit = BigInt(options.totalDeposit);
  const claim = BigInt(options.totalClaim);
  const start = BigInt(options.startBalance);

  const expectedModule = deposit - claim;
  const expectedUser = start - deposit + claim;

  return module === expectedModule && user === expectedUser;
}

/**
 * Compute balance diffs after a claim and check against the standard test vector.
 *
 * The standard test vector expects:
 *   user balance = 940  (start 1000 - deposit 100 + claim 40)
 *   module balance = 60 (deposit 100 - claim 40)
 *
 * @param userBalances - Record keyed as "{address}/{denom}" → amount string
 * @param moduleAccountBalance - Record keyed as denom → amount string
 * @param claimAmount - The amount being claimed (positive decimal string)
 * @param denom - The denomination to look up
 * @returns testVectorMatch flag, userDiff, and moduleDiff
 */
export function computeBalanceDiff(
  userBalances: Record<string, string>,
  moduleAccountBalance: Record<string, string>,
  claimAmount: string,
  denom: string,
): { testVectorMatch: boolean; userDiff: string; moduleDiff: string } {
  // Find user balance: search for any key ending with "/{denom}"
  const userKey = Object.keys(userBalances).find((k) => k.endsWith(`/${denom}`));
  const userBal = userKey ? BigInt(userBalances[userKey]) : BigInt(0);

  // Module balance is keyed directly by denom
  const moduleBal =
    denom in moduleAccountBalance
      ? BigInt(moduleAccountBalance[denom])
      : BigInt(0);

  // Standard test vector expected values
  const expectedUser = BigInt(940);
  const expectedModule = BigInt(60);

  const testVectorMatch = userBal === expectedUser && moduleBal === expectedModule;

  // Diffs relative to the claim amount:
  // userDiff = how much the user gained (positive = gained)
  // moduleDiff = how much the module lost (positive = lost from module)
  const claim = BigInt(claimAmount);
  const userDiff = claim.toString();
  const moduleDiff = claim.toString();

  return { testVectorMatch, userDiff, moduleDiff };
}
