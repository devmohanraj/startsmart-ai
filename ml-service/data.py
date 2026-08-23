import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split


def load_and_prepare_data(csv_path: str = "data.csv", test_size: float = 0.2, random_state: int = 42):
    df = pd.read_csv(csv_path)

    required_cols = {"status", "funding_total_usd", "category_list", "country_code"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    # Target = resolved outcomes only (acquired/ipo/closed); 'operating' is not a resolved outcome.
    df_resolved = df[df["status"].isin(["acquired", "closed", "ipo"])].copy()
    df_resolved["success"] = df_resolved["status"].apply(lambda s: 0 if s == "closed" else 1)

    df_resolved["funding_total_usd"] = pd.to_numeric(
        df_resolved["funding_total_usd"].replace("-", np.nan), errors="coerce"
    )
    df_resolved["funding_total_usd"] = df_resolved["funding_total_usd"].fillna(
        df_resolved["funding_total_usd"].median()
    )

    # log1p compresses the heavy right-skew of dollar amounts (a few huge outliers dominate raw
    # values) so budget differences act proportionally; log1p(0)=0 handles zero funding safely.
    df_resolved["funding_total_usd_log"] = np.log1p(df_resolved["funding_total_usd"])

    df_resolved["primary_category"] = (
        df_resolved["category_list"].fillna("Unknown").apply(lambda x: x.split("|")[0])
    )
    top_categories = df_resolved["primary_category"].value_counts().nlargest(20).index
    df_resolved["primary_category"] = df_resolved["primary_category"].apply(
        lambda x: x if x in top_categories else "Other"
    )

    df_resolved["country_code"] = df_resolved["country_code"].fillna("Unknown")
    df_resolved["is_india"] = (df_resolved["country_code"] == "IND").astype(int)

    # Upweight India rows 3x via sample_weight.
    df_resolved["sample_weight"] = df_resolved["is_india"].apply(lambda x: 3 if x == 1 else 1)

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