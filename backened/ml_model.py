import numpy as np
from sklearn.ensemble import RandomForestRegressor


# ---------------------------------------------------------
# TRAINING DATA
# ---------------------------------------------------------
#
# Features:
# 1. Current delay (minutes)
# 2. Speed (km/h)
# 3. Traffic pressure
# 4. Signal severity
# 5. Speed restriction
# 6. Weather severity
# 7. Distance remaining (km)
#
# Target:
# Additional delay expected in the remaining journey (minutes)
# ---------------------------------------------------------

X = np.array([
    [0, 120, 0, 0, 0, 0, 100],
    [5, 115, 0, 0, 0, 0, 80],
    [10, 100, 1, 1, 0, 0, 70],
    [15, 90, 2, 1, 1, 0, 60],
    [20, 75, 2, 2, 1, 1, 50],
    [25, 65, 2, 2, 1, 1, 40],
    [5, 110, 1, 0, 0, 0, 90],
    [8, 95, 1, 1, 0, 1, 75],
    [12, 85, 2, 1, 1, 1, 65],
    [18, 70, 2, 2, 1, 1, 55],
    [30, 60, 2, 2, 1, 1, 35],
    [2, 118, 0, 0, 0, 0, 95],
    [7, 105, 1, 0, 0, 0, 85],
    [14, 88, 1, 1, 1, 0, 70],
    [22, 72, 2, 2, 1, 1, 45],
])


y = np.array([
    0,
    2,
    5,
    8,
    12,
    15,
    3,
    6,
    9,
    12,
    18,
    1,
    3,
    7,
    14,
])


# ---------------------------------------------------------
# CREATE AND TRAIN MODEL
# ---------------------------------------------------------

model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X, y)


# ---------------------------------------------------------
# PREDICTION FUNCTION
# ---------------------------------------------------------

def predict_delay(
    current_delay,
    speed,
    traffic_pressure,
    signal_severity,
    speed_restriction,
    weather_severity,
    distance_remaining
):
    """
    Predict additional delay for the remaining journey.
    """

    features = np.array([[
        current_delay,
        speed,
        traffic_pressure,
        signal_severity,
        speed_restriction,
        weather_severity,
        distance_remaining
    ]])

    prediction = model.predict(features)[0]

    return round(max(0, float(prediction)), 1)


# ---------------------------------------------------------
# TEST
# ---------------------------------------------------------

if __name__ == "__main__":

    predicted = predict_delay(
        current_delay=12,
        speed=85,
        traffic_pressure=2,
        signal_severity=1,
        speed_restriction=1,
        weather_severity=1,
        distance_remaining=65
    )

    print("AI Predicted Additional Delay:", predicted, "minutes")