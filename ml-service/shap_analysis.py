from data import load_and_prepare_data
from xgboost import XGBClassifier
import shap
import pandas as pd


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

    explainer = shap.TreeExplainer(xgb_model)
    shap_values = explainer.shap_values(X_test)

    mean_abs_shap = pd.DataFrame({
        "feature": X_test.columns,
        "mean_abs_shap": abs(shap_values).mean(axis=0),
    }).sort_values("mean_abs_shap", ascending=False)

    print("=" * 60)
    print("GLOBAL FEATURE IMPORTANCE (mean |SHAP value|)")
    print("=" * 60)
    print(mean_abs_shap.to_string(index=False))

    # One test row through the same predict_proba + SHAP path the /predict endpoint uses.
    sample_idx = 0
    sample_shap = shap_values[sample_idx]
    sample_features = X_test.iloc[sample_idx]

    single_explanation = pd.DataFrame({
        "feature": X_test.columns,
        "value": sample_features.values,
        "shap_contribution": sample_shap,
    }).sort_values("shap_contribution", key=abs, ascending=False)

    print("\n" + "=" * 60)
    print("EXAMPLE — SINGLE PREDICTION EXPLANATION")
    print("=" * 60)
    prob = xgb_model.predict_proba(X_test.iloc[[sample_idx]])[0][1]
    print(f"Predicted success probability: {prob:.2%}")
    print(single_explanation.to_string(index=False))
    print("\n(Positive = pushes toward SUCCESS, Negative = pushes toward RISK)")


if __name__ == "__main__":
    main()