from data import load_and_prepare_data
from xgboost import XGBClassifier
import joblib
import json


def main():
    X_train, X_test, y_train, y_test, w_train, w_test = load_and_prepare_data("data.csv")

    xgb_model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        eval_metric="logloss",
        random_state=42,
    )
    xgb_model.fit(X_train, y_train, sample_weight=w_train)

    # Save model
    joblib.dump(xgb_model, "risk_model.pkl")

    # Save exact column order — critical for correct inference encoding
    model_columns = X_train.columns.tolist()
    with open("model_columns.json", "w") as f:
        json.dump(model_columns, f, indent=2)

    # Save valid category values (for reconstructing one-hot encoding)
    category_columns = [c for c in model_columns if c.startswith("primary_category_")]
    valid_categories = [c.replace("primary_category_", "") for c in category_columns]
    with open("valid_categories.json", "w") as f:
        json.dump(valid_categories, f, indent=2)

    print("Model exported successfully:")
    print("  - risk_model.pkl")
    print("  - model_columns.json")
    print("  - valid_categories.json")
    print(f"\nTotal columns model expects: {len(model_columns)}")


if __name__ == "__main__":
    main()