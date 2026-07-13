// =============================================================================
// OverviewScreen — DEX Landing Hero
// -----------------------------------------------------------------------------
// Full-screen hero section showcasing the ZKDEX decentralized exchange.
// Uses /assets/image.png as a background with an overlay for readability.
// Features: headline, description, feature cards, and CTA buttons.
// =============================================================================

"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./OverviewScreen.module.scss";

/** Feature card data for the highlights section. */
const FEATURES = [
  {
    title: "Zero-Knowledge Proofs",
    description:
      "Every trade is verified with ZK proofs, ensuring complete privacy while maintaining full transparency of the order book.",
    icon: "🛡️",
  },
  {
    title: "On-Chain Settlement",
    description:
      "Deposits, withdrawals, and batch settlements happen directly on-chain with cryptographic guarantees.",
    icon: "⛓️",
  },
  {
    title: "Instant Matching",
    description:
      "Off-chain order matching with on-chain finality. Place limit orders and get matched in milliseconds.",
    icon: "⚡",
  },
  {
    title: "Non-Custodial",
    description:
      "Your keys, your funds. The module account holds assets but only ZK-verified state transitions can move them.",
    icon: "🔑",
  },
] as const;

/** Stats displayed in the hero section. */
const STATS = [
  { label: "Markets", value: "4+" },
  { label: "Avg. Settlement", value: "<2s" },
  { label: "Proof System", value: "Groth16" },
] as const;

export function OverviewScreen(): React.JSX.Element {
  return (
    <div className={styles.root}>
      {/* Background image layer */}
      <div className={styles.bgLayer}>
        <Image
          src="/assets/image.png"
          alt=""
          fill
          priority
          className={styles.bgImage}
          sizes="100vw"
        />
        <div className={styles.overlay} />
      </div>

      {/* Content layer */}
      <div className={styles.content}>
        {/* Hero section */}
        <section className={styles.hero}>
          <span className={styles.badge}>Live Demo</span>
          <h1 className={styles.headline}>
            Trade with <span className={styles.accent}>Zero-Knowledge</span> Privacy
          </h1>
          <p className={styles.subtitle}>
            A fully on-chain DEX powered by ZK proofs. Experience private trading
            with verifiable settlement on Cosmos.
          </p>

          {/* Stats row */}
          <div className={styles.stats}>
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.statItem}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className={styles.ctas}>
            <Link href="/trade" className={styles.ctaPrimary}>
              Start Trading
            </Link>
            <Link href="/wallet" className={styles.ctaSecondary}>
              Deposit Funds
            </Link>
          </div>
        </section>

        {/* Feature cards section */}
        <section className={styles.features} aria-label="Platform features">
          <h2 className={styles.featuresHeading}>Why ZKDEX?</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <article key={feature.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default OverviewScreen;
