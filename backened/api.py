from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path

from .ml_model import predict_delay


# ============================================================
# TRACK TITANS - FASTAPI BACKEND
# STEP 26.3 - ML CONNECTED
# ============================================================

app = FastAPI(
    title="Track Titans API",
    description="Dynamic ETA Forecasting Engine",
    version="1.1"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TELEMETRY FILE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
TELEMETRY_FILE = BASE_DIR / "telemetry.json"


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "system": "Track Titans",
        "status": "online",
        "service": "Dynamic ETA Forecasting Engine",
        "ml_model": "Random Forest"
    }


# ============================================================
# TELEMETRY ENDPOINT
# ============================================================

@app.get("/telemetry")
def get_telemetry():

    if not TELEMETRY_FILE.exists():
        return {
            "error": "Telemetry file not found",
            "message": "Start the simulator first."
        }

    with open(
        TELEMETRY_FILE,
        "r",
        encoding="utf-8"
    ) as file:
        telemetry = json.load(file)

    return telemetry


# ============================================================
# AI ETA PREDICTION ENDPOINT
# ============================================================

@app.get("/predict")
def predict_eta():

    if not TELEMETRY_FILE.exists():
        return {
            "error": "Telemetry file not found",
            "message": "Start the simulator first."
        }

    # --------------------------------------------------------
    # Read latest telemetry
    # --------------------------------------------------------

    with open(
        TELEMETRY_FILE,
        "r",
        encoding="utf-8"
    ) as file:
        telemetry = json.load(file)

    # --------------------------------------------------------
    # Get main train
    # --------------------------------------------------------

    trains = telemetry.get("trains", [])

    if not trains:
        return {
            "error": "No trains available"
        }

    # Prefer the first passenger train
    main_train = None

    for train in trains:
        if train.get("train_type") == "Passenger":
            main_train = train
            break

    if main_train is None:
        main_train = trains[0]

    # --------------------------------------------------------
    # Extract telemetry
    # --------------------------------------------------------

    current_delay = float(
        main_train.get("delay", 0)
    )

    speed = float(
        main_train.get("speed", 0)
    )

    position = float(
        main_train.get("position", 0)
    )

    # Track Titans corridor is represented as 0-100 km
    distance_remaining = max(
        0,
        100 - position
    )

    # --------------------------------------------------------
    # Traffic pressure
    #
    # LOW    = 0
    # MEDIUM = 1
    # HIGH   = 2
    # --------------------------------------------------------

    traffic_pressure_name = telemetry.get(
        "traffic",
        {}
    ).get(
        "pressure",
        "LOW"
    )

    traffic_pressure_map = {
        "LOW": 0,
        "MEDIUM": 1,
        "HIGH": 2
    }

    traffic_pressure = traffic_pressure_map.get(
        traffic_pressure_name,
        0
    )

    # --------------------------------------------------------
    # Signal severity
    #
    # CLEAR   = 0
    # CAUTION = 1
    # STOP    = 2
    # --------------------------------------------------------

    signal_status = telemetry.get(
        "signal",
        {}
    ).get(
        "status",
        "CLEAR"
    )

    signal_severity_map = {
        "CLEAR": 0,
        "CAUTION": 1,
        "STOP": 2
    }

    signal_severity = signal_severity_map.get(
        signal_status,
        0
    )

    # --------------------------------------------------------
    # Prototype environmental assumptions
    #
    # These will later come directly from the simulator.
    # --------------------------------------------------------

    speed_restriction = 0
    weather_severity = 1

    # --------------------------------------------------------
    # RUN ML MODEL
    # --------------------------------------------------------

    predicted_additional_delay = predict_delay(
        current_delay=current_delay,
        speed=speed,
        traffic_pressure=traffic_pressure,
        signal_severity=signal_severity,
        speed_restriction=speed_restriction,
        weather_severity=weather_severity,
        distance_remaining=distance_remaining
    )

    # --------------------------------------------------------
    # Final predicted delay
    # --------------------------------------------------------

    total_predicted_delay = round(
        current_delay + predicted_additional_delay,
        1
    )

    # --------------------------------------------------------
    # Return AI prediction
    # --------------------------------------------------------

    return {
        "train_id": main_train.get("train_id"),
        "train_name": main_train.get("name"),

        "current_delay": current_delay,

        "ai_prediction": {
            "additional_delay": predicted_additional_delay,
            "total_predicted_delay": total_predicted_delay
        },

        "inputs": {
            "speed": speed,
            "traffic_pressure": traffic_pressure_name,
            "signal_status": signal_status,
            "speed_restriction": speed_restriction,
            "weather_severity": weather_severity,
            "distance_remaining": distance_remaining
        },

        "model": {
            "name": "Random Forest Regressor",
            "status": "active"
        }
    }