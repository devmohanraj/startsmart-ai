"""
data.py  (v3 — log-transformed budget)
StartSmart AI — Risk Prediction Model
Steps 1-4: Load data, define target, engineer features, train/test split

CHANGE FROM v2:
funding_total_usd is now log-transformed (log1p) before being used as a
model feature. Raw dollar amounts are heavily right-skewed (a few
companies raised hundreds of millions, most raised far less), which made
the model extremely sensitive at low budget values — small differences
between low budgets produced wildly swinging, unrealistically extreme
risk scores. Log-transforming compresses this skew so the model reasons
in proportional terms (10x more funding) rather than raw absolute gaps,
which is standard practice for monetary features and produces much more
stable, realistic predictions across the full budget range.

MODEL SCOPE (unchanged):
Inputs used  : funding_total_usd_log, primary_category, is_india
              (maps to form fields: Budget, Industry/Sector, is_india=1 default)
Target       : success (1 = acquired/ipo, 0 = closed)

Usage:
    from data import load_and_prepare_data
    X_train, X_test, y_train, y_test, w_train, w_test = load_and_prepare_data("data.csv")
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split


def load_and_prepare_data(csv_path: str = "data.csv", test_size: float = 0.2, random_state: int = 42):
    """
    Loads the Crunchbase startup dataset, cleans it, engineers the
    form-aligned feature set (with log-transformed budget), and returns
    a stratified train/test split.
    """

    # ---------------------------------------------------------
    # STEP 1: Load raw data
    # ---------------------------------------------------------
    df = pd.read_csv(csv_path)

    required_cols = {"status", "funding_total_usd", "category_list", "country_code"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    # ---------------------------------------------------------
    # STEP 2: Define target variable
    # Keep only resolved outcomes: acquired / ipo / closed
    # ('operating' is excluded — not a resolved outcome)
    # ---------------------------------------------------------
    df_resolved = df[df["status"].isin(["acquired", "closed", "ipo"])].copy()
    df_resolved["success"] = df_resolved["status"].apply(lambda s: 0 if s == "closed" else 1)

    # ---------------------------------------------------------
    # STEP 3: Feature engineering (form-aligned only)
    # ---------------------------------------------------------

    # 3a. funding_total_usd: '-' placeholder -> NaN -> median impute
    df_resolved["funding_total_usd"] = pd.to_numeric(
        df_resolved["funding_total_usd"].replace("-", np.nan), errors="coerce"
    )
    df_resolved["funding_total_usd"] = df_resolved["funding_total_usd"].fillna(
        df_resolved["funding_total_usd"].median()
    )

    # 3b. Log-transform budget — compresses the heavy right-skew of raw
    # dollar amounts (most companies raised far less than the handful of
    # huge outliers), so the model treats budget differences proportionally
    # instead of being dominated by extreme absolute gaps. log1p handles
    # zero values safely (log1p(0) = 0, no -inf error).
    df_resolved["funding_total_usd_log"] = np.log1p(df_resolved["funding_total_usd"])

    # 3c. Simplify category_list -> primary_category (top 20 + "Other")
    df_resolved["primary_category"] = (
        df_resolved["category_list"].fillna("Unknown").apply(lambda x: x.split("|")[0])
    )
    top_categories = df_resolved["primary_category"].value_counts().nlargest(20).index
    df_resolved["primary_category"] = df_resolved["primary_category"].apply(
        lambda x: x if x in top_categories else "Other"
    )

    # 3d. is_india flag
    df_resolved["country_code"] = df_resolved["country_code"].fillna("Unknown")
    df_resolved["is_india"] = (df_resolved["country_code"] == "IND").astype(int)

    # 3e. sample_weight — upweight India rows 3x
    df_resolved["sample_weight"] = df_resolved["is_india"].apply(lambda x: 3 if x == 1 else 1)

    # ---------------------------------------------------------
    # STEP 4: Train/test split
    # ---------------------------------------------------------
    # NOTE: uses funding_total_usd_log, NOT the raw funding_total_usd
    feature_cols = ["funding_total_usd_log", "primary_category", "is_india"]

    X = df_resolved[feature_cols]
    y = df_resolved["success"]
    weights = df_resolved["sample_weight"]

    X_encoded = pd.get_dummies(X, columns=["primary_category"], drop_first=True)

    X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
        X_encoded, y, weights,
        test_size=test_size, random_state=random_state, stratify=y,
    )

    return X_train, X_test, y_train, y_test, w_train, w_test


if __name__ == "__main__":
    X_train, X_test, y_train, y_test, w_train, w_test = load_and_prepare_data("data.csv")

    print(f"Train shape: {X_train.shape}")
    print(f"Test shape:  {X_test.shape}")
    print("\nTrain class balance:")
    print(y_train.value_counts(normalize=True))
    print("\nFeature columns:")
    print(X_train.columns.tolist())
    print("\nBudget feature range check (log-transformed):")
    print(X_train["funding_total_usd_log"].describe())