from data import load_and_prepare_data
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, roc_auc_score, classification_report, confusion_matrix,
)
from xgboost import XGBClassifier


def main():
    X_train, X_test, y_train, y_test, w_train, w_test = load_and_prepare_data("data.csv")

    # -------------------------------------------------
    # STEP 5: Logistic Regression baseline
    # (feature scaling required — tree models don't need this)
    # -------------------------------------------------
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    log_reg = LogisticRegression(max_iter=1000, class_weight="balanced")
    log_reg.fit(X_train_scaled, y_train, sample_weight=w_train)

    log_reg_preds = log_reg.predict(X_test_scaled)
    log_reg_probs = log_reg.predict_proba(X_test_scaled)[:, 1]

    print("=" * 60)
    print("LOGISTIC REGRESSION — BASELINE RESULTS")
    print("=" * 60)
    print(f"Accuracy: {accuracy_score(y_test, log_reg_preds):.4f}")
    print(f"ROC AUC:  {roc_auc_score(y_test, log_reg_probs):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, log_reg_preds))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, log_reg_preds))

    # -------------------------------------------------
    # STEP 6: XGBoost comparison model (primary model)
    # -------------------------------------------------
    xgb_model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        eval_metric="logloss",
        random_state=42,
    )
    xgb_model.fit(X_train, y_train, sample_weight=w_train)

    xgb_preds = xgb_model.predict(X_test)
    xgb_probs = xgb_model.predict_proba(X_test)[:, 1]

    print("\n" + "=" * 60)
    print("XGBOOST — PRIMARY MODEL RESULTS")
    print("=" * 60)
    print(f"Accuracy: {accuracy_score(y_test, xgb_preds):.4f}")
    print(f"ROC AUC:  {roc_auc_score(y_test, xgb_probs):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, xgb_preds))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, xgb_preds))

    # -------------------------------------------------
    # STEP 7: Side-by-side summary
    # -------------------------------------------------
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"{'Metric':<15}{'LogReg':<15}{'XGBoost':<15}")
    print(f"{'Accuracy':<15}{accuracy_score(y_test, log_reg_preds):<15.4f}{accuracy_score(y_test, xgb_preds):<15.4f}")
    print(f"{'ROC AUC':<15}{roc_auc_score(y_test, log_reg_probs):<15.4f}{roc_auc_score(y_test, xgb_probs):<15.4f}")


if __name__ == "__main__":
    main()