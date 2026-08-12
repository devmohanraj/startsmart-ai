"""
check_calibration.py
StartSmart AI — Diagnostic
Checks whether the model's predicted probabilities match REAL observed
success rates in the test set. This tells us honestly whether the model
is overconfident (needs calibration) or already accurate (calibration
would just make it less precise).

Usage:
    python check_calibration.py
"""

from data import load_and_prepare_data
from xgboost import XGBClassifier
import numpy as np
import pandas as pd

X_train, X_test, y_train, y_test, w_train, w_test = load_and_prepare_data("data.csv")

xgb_model = XGBClassifier(
    n_estimators=100, max_depth=4, learning_rate=0.1,
    eval_metric="logloss", random_state=42,
)
xgb_model.fit(X_train, y_train, sample_weight=w_train)

probs = xgb_model.predict_proba(X_test)[:, 1]

# Bucket predictions into 10 bins (0-10%, 10-20%, ..., 90-100%)
bins = np.linspace(0, 1, 11)
bin_labels = [f"{int(bins[i]*100)}-{int(bins[i+1]*100)}%" for i in range(10)]
bin_idx = np.digitize(probs, bins) - 1
bin_idx = np.clip(bin_idx, 0, 9)

results = []
for i in range(10):
    mask = bin_idx == i
    if mask.sum() == 0:
        continue
    predicted_avg = probs[mask].mean()
    actual_rate = y_test.values[mask].mean()
    results.append({
        "bucket": bin_labels[i],
        "n_samples": mask.sum(),
        "model_predicted_avg": round(predicted_avg * 100, 1),
        "actual_success_rate": round(actual_rate * 100, 1),
        "gap": round((predicted_avg - actual_rate) * 100, 1),
    })

df = pd.DataFrame(results)
print("=" * 70)
print("CALIBRATION CHECK — predicted probability vs. actual outcome rate")
print("=" * 70)
print(df.to_string(index=False))
print("\nInterpretation:")
print("  'gap' near 0  -> well-calibrated (model IS accurate, don't 'fix' it)")
print("  'gap' notably positive -> model IS overconfident in that bucket")
print("  'gap' notably negative -> model IS underconfident in that bucket")