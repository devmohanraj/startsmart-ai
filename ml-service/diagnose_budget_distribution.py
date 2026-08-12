"""
diagnose_budget_distribution.py
StartSmart AI — Diagnostic
Checks how much training data exists near a given budget level, and what
the ACTUAL historical success rate was for companies in that range.

This tells us whether the model's extreme prediction is:
  (a) an honest reflection of real historical data (few/no low-budget
      successes existed), or
  (b) a symptom of the model over-extrapolating on very sparse data

Usage:
    python diagnose_budget_distribution.py
"""

from data import load_and_prepare_data
import pandas as pd
import numpy as np

# Re-load the RAW resolved data (before encoding) to inspect real values
df = pd.read_csv("data.csv")
df_resolved = df[df['status'].isin(['acquired', 'closed', 'ipo'])].copy()
df_resolved['success'] = df_resolved['status'].apply(lambda x: 0 if x == 'closed' else 1)

df_resolved['funding_total_usd'] = pd.to_numeric(
    df_resolved['funding_total_usd'].replace('-', np.nan), errors='coerce'
)
df_resolved['funding_total_usd'] = df_resolved['funding_total_usd'].fillna(
    df_resolved['funding_total_usd'].median()
)

# The test case: ₹18,00,000 / 83 ≈ $21,687
test_budget_usd = 1800000 / 83.0
print(f"Test budget in USD: ${test_budget_usd:,.0f}")

# Overall distribution
print(f"\nOverall funding_total_usd distribution:")
print(df_resolved['funding_total_usd'].describe())

# How many companies had funding BELOW this test budget?
below = df_resolved[df_resolved['funding_total_usd'] <= test_budget_usd]
print(f"\nCompanies with funding <= ${test_budget_usd:,.0f}: {len(below)} out of {len(df_resolved)} ({len(below)/len(df_resolved)*100:.2f}%)")

if len(below) > 0:
    print(f"Success rate among these low-budget companies: {below['success'].mean()*100:.1f}%")
    print(f"(Compare to overall success rate: {df_resolved['success'].mean()*100:.1f}%)")
else:
    print("ZERO companies in training data had funding this low — the model has")
    print("NEVER seen an example in this range and is extrapolating blindly.")

# Percentile of the test budget within the training distribution
percentile = (df_resolved['funding_total_usd'] < test_budget_usd).mean() * 100
print(f"\nThis budget sits at the {percentile:.1f}th percentile of training data.")