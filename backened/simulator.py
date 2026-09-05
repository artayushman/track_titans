import simpy
import json
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path


# ============================================================
# TRACK TITANS - RAILWAY TELEMETRY SIMULATOR
# STEP 24.5
# ============================================================


@dataclass
class Train:
    train_id: str
    name: str
    train_type: str
    position: float
    speed: float
    delay: float


# ============================================================
# INITIAL TRAINS
# ============================================================

trains = [
    Train(
        train_id="12301",
        name="NDLS Rajdhani",
        train_type="Passenger",
        position=62.0,
        speed=110.0,
        delay=18.0,
    ),
    Train(
        train_id="12951",
        name="Mumbai Rajdhani",
        train_type="Passenger",
        position=42.0,
        speed=105.0,
        delay=7.0,
    ),
    Train(
        train_id="12424",
        name="New Delhi Express",
        train_type="Passenger",
        position=30.0,
        speed=95.0,
        delay=3.0,
    ),
    Train(
        train_id="F-204",
        name="Freight Service",
        train_type="Freight",
        position=68.0,
        speed=55.0,
        delay=0.0,
    ),
]


# ============================================================
# TRACK PARAMETERS
# ============================================================

TRACK_LENGTH = 125.0
SIMULATION_STEP = 1.0


# ============================================================
# TELEMETRY FILE LOCATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

TELEMETRY_FILE = BASE_DIR / "telemetry.json"


# ============================================================
# SIGNAL CALCULATION
# ============================================================

def calculate_signal_status():

    main_train = next(
        train
        for train in trains
        if train.train_id == "12301"
    )

    trains_ahead = [
        train
        for train in trains
        if (
            train.train_id != "12301"
            and train.position > main_train.position
        )
    ]

    if not trains_ahead:
        return "CLEAR", 999.0

    nearest_train = min(
        trains_ahead,
        key=lambda train: train.position
    )

    distance = (
        nearest_train.position
        - main_train.position
    )

    if distance < 8:
        return "STOP", distance

    if distance < 18:
        return "CAUTION", distance

    return "CLEAR", distance


# ============================================================
# TRAFFIC PRESSURE
# ============================================================

def calculate_traffic_pressure():

    main_train = next(
        train
        for train in trains
        if train.train_id == "12301"
    )

    interactions = 0

    for train in trains:

        if train.train_id == "12301":
            continue

        if abs(
            train.position - main_train.position
        ) < 30:

            interactions += 1

    if interactions >= 2:
        pressure = "HIGH"

    elif interactions == 1:
        pressure = "MEDIUM"

    else:
        pressure = "LOW"

    return pressure, interactions


# ============================================================
# GENERATE TELEMETRY
# ============================================================

def generate_telemetry():

    signal_status, signal_distance = (
        calculate_signal_status()
    )

    traffic_pressure, traffic_interactions = (
        calculate_traffic_pressure()
    )

    telemetry = {

        "timestamp": datetime.now().isoformat(),

        "simulation": {
            "track_length_km": TRACK_LENGTH,
            "update_interval_seconds": SIMULATION_STEP,
        },

        "traffic": {
            "pressure": traffic_pressure,
            "interactions": traffic_interactions,
        },

        "signal": {
            "status": signal_status,
            "nearest_train_distance_km": round(
                signal_distance,
                2
            ),
        },

        "trains": [
            asdict(train)
            for train in trains
        ],
    }

    return telemetry


# ============================================================
# SAVE TELEMETRY
# ============================================================

def save_telemetry(telemetry):

    with open(
        TELEMETRY_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            telemetry,
            file,
            indent=2
        )


# ============================================================
# DISPLAY TELEMETRY
# ============================================================

def display_telemetry(telemetry):

    print("\n========================================")
    print("TRACK TITANS - LIVE TELEMETRY")
    print("========================================")

    print(
        "Timestamp:",
        telemetry["timestamp"]
    )

    print(
        "Traffic:",
        telemetry["traffic"]["pressure"],
        "| Interactions:",
        telemetry["traffic"]["interactions"]
    )

    print(
        "Signal:",
        telemetry["signal"]["status"],
        "| Distance:",
        telemetry["signal"][
            "nearest_train_distance_km"
        ],
        "km"
    )

    print("----------------------------------------")

    for train in telemetry["trains"]:

        print(
            f'{train["train_id"]:6} | '
            f'{train["name"]:22} | '
            f'Position: '
            f'{train["position"]:6.2f} km | '
            f'Speed: '
            f'{train["speed"]:3.0f} km/h | '
            f'Delay: '
            f'{train["delay"]:4.1f} min'
        )

    print("========================================")


# ============================================================
# SIMULATION PROCESS
# ============================================================

def railway_simulation(env):

    while True:

        # ----------------------------------------------------
        # MOVE TRAINS
        # ----------------------------------------------------

        for train in trains:

            movement = train.speed / 3600

            # Freight trains are slower.
            if train.train_type == "Freight":

                movement = 55 / 3600

            # Main train responds to signal.
            if train.train_id == "12301":

                signal_status, _ = (
                    calculate_signal_status()
                )

                if signal_status == "STOP":

                    movement = 0

                elif signal_status == "CAUTION":

                    movement = 55 / 3600

            train.position += movement

            train.position = min(
                train.position,
                TRACK_LENGTH
            )

        # ----------------------------------------------------
        # GENERATE TELEMETRY
        # ----------------------------------------------------

        telemetry = generate_telemetry()

        # ----------------------------------------------------
        # SAVE TELEMETRY
        # ----------------------------------------------------

        save_telemetry(telemetry)

        # ----------------------------------------------------
        # DISPLAY
        # ----------------------------------------------------

        display_telemetry(telemetry)

        yield env.timeout(
            SIMULATION_STEP
        )


# ============================================================
# START SIMULATION
# ============================================================

if __name__ == "__main__":

    environment = simpy.Environment()

    environment.process(
        railway_simulation(environment)
    )

    print(
        "\nStarting Track Titans telemetry simulator..."
    )

    print(
        f"Telemetry file: {TELEMETRY_FILE}"
    )

    print(
        "Press CTRL+C to stop.\n"
    )

    try:

        while True:

            environment.step()

            time.sleep(
                SIMULATION_STEP
            )

    except KeyboardInterrupt:

        print(
            "\nSimulation stopped."
        )