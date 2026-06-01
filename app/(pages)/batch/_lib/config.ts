/**
 * Page-private build configuration for the Batch screen (FE-06).
 *
 * Single-side build configuration flag.
 *
 * When `true`, the user is allowed to build a batch with only one side selected
 * (deposits only, or withdrawals only). In that case the Batch Input Selector
 * surfaces the warning "Backend may reject a partial batch." (Requirement 4.2),
 * and the Build Batch button stays enabled for a single-side selection.
 *
 * When `false`, a single-side selection keeps the Build Batch button disabled,
 * so only batches containing at least one deposit AND one withdrawal can be
 * built (Requirement 4.5).
 *
 * Defaults to `true` to support the demo/single-code-path behaviour: partial
 * batches are permitted but flagged with a visible warning rather than blocked.
 */
export const SINGLE_SIDE_BUILD_ENABLED: boolean = true;
