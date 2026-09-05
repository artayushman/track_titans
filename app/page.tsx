"use client";

import { useEffect, useMemo, useState } from "react";
import Navigation from "./components/Navigation";

type Train = {
  id: string;
  name: string;
  type: "Passenger" | "Freight";
  position: number;
  speed: number;
  delay: number;
  status: "ON TIME" | "DELAYED" | "HEAVY DELAY";
};

type Station = {
  name: string;
  position: number;
  scheduled: string;
};

type BackendTrain = {
  train_id: string;
  name: string;
  train_type: "Passenger" | "Freight";
  position: number;
  speed: number;
  delay: number;
};

type BackendTelemetry = {
  timestamp: string;
  traffic: {
    pressure: "LOW" | "MEDIUM" | "HIGH";
    interactions: number;
  };
  signal: {
    status: "CLEAR" | "CAUTION" | "STOP";
    nearest_train_distance_km: number;
  };
  trains: BackendTrain[];
};

type BackendPrediction = {
  train_id: string;
  train_name: string;
  current_delay: number;
  ai_prediction: {
    additional_delay: number;
    total_predicted_delay: number;
  };
  inputs: {
    speed: number;
    traffic_pressure: "LOW" | "MEDIUM" | "HIGH";
    signal_status: "CLEAR" | "CAUTION" | "STOP";
    speed_restriction: number;
    weather_severity: number;
    distance_remaining: number;
  };
  model: {
    name: string;
    status: string;
  };
};

const stations: Station[] = [
  { name: "New Delhi", position: 0, scheduled: "08:00" },
  { name: "Ghaziabad", position: 18, scheduled: "08:35" },
  { name: "Aligarh", position: 38, scheduled: "09:10" },
  { name: "Tundla", position: 55, scheduled: "09:50" },
  { name: "Etawah", position: 72, scheduled: "10:30" },
  { name: "Kanpur", position: 90, scheduled: "11:15" },
  { name: "Prayagraj", position: 125, scheduled: "13:00" },
];

/* =====================================================
   WEATHER SIMULATION
   ===================================================== */

const weatherCondition:
  | "CLEAR"
  | "FOG"
  | "HEAVY RAIN" = "FOG";

const weatherSpeedReduction =
  weatherCondition === "FOG"
    ? 25
    : weatherCondition === "HEAVY RAIN"
    ? 15
    : 0;

const weatherDelay =
  weatherCondition === "FOG"
    ? 6
    : weatherCondition === "HEAVY RAIN"
    ? 4
    : 0;

/* =====================================================
   INITIAL TRAINS
   ===================================================== */

const initialTrains: Train[] = [
  {
    id: "12301",
    name: "NDLS Rajdhani",
    type: "Passenger",
    position: 62,
    speed: 110,
    delay: 18,
    status: "DELAYED",
  },
  {
    id: "12951",
    name: "Mumbai Rajdhani",
    type: "Passenger",
    position: 42,
    speed: 105,
    delay: 7,
    status: "DELAYED",
  },
  {
    id: "12424",
    name: "New Delhi Express",
    type: "Passenger",
    position: 30,
    speed: 95,
    delay: 3,
    status: "DELAYED",
  },
  {
    id: "F-204",
    name: "Freight Service",
    type: "Freight",
    position: 68,
    speed: 55,
    delay: 0,
    status: "ON TIME",
  },
];

/* =====================================================
   HELPER FUNCTIONS
   ===================================================== */

function formatTime(totalMinutes: number) {
  const baseHour = 8;
  const baseMinute = 0;

  const total = baseHour * 60 + baseMinute + totalMinutes;

  const hour = Math.floor(total / 60) % 24;
  const minute = Math.floor(total % 60);

  return `${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

function formatAbsoluteTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = Math.floor(totalMinutes % 60);

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getNearestStation(position: number) {
  let nearest = stations[0];

  for (const station of stations) {
    if (
      Math.abs(station.position - position) <
      Math.abs(nearest.position - position)
    ) {
      nearest = station;
    }
  }

  return nearest;
}

/* =====================================================
   MAIN DASHBOARD
   ===================================================== */

export default function Home() {
  const [trains, setTrains] = useState<Train[]>(
    initialTrains
  );

  const [simulationRunning, setSimulationRunning] =
    useState(true);

  const [demoMode, setDemoMode] = useState(false);

  const [lastUpdate, setLastUpdate] = useState(
    "--:--:--"
  );

  const [backendConnected, setBackendConnected] =
    useState(false);

  const [aiPrediction, setAiPrediction] =
    useState<BackendPrediction | null>(null);

  /* ===================================================
     PYTHON BACKEND CONNECTION
     =================================================== */

  useEffect(() => {
    if (!simulationRunning) {
      return;
    }

    let mounted = true;

    const fetchTelemetry = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/telemetry",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        const data: BackendTelemetry =
          await response.json();

        if (
          !data.trains ||
          !Array.isArray(data.trains)
        ) {
          throw new Error("Invalid telemetry received");
        }

        if (!mounted) {
          return;
        }

        setBackendConnected(true);

        setTrains(
          data.trains.map((train) => {
            let status: Train["status"] =
              "ON TIME";

            if (train.delay >= 20) {
              status = "HEAVY DELAY";
            } else if (train.delay > 0) {
              status = "DELAYED";
            }

            return {
              id: train.train_id,
              name: train.name,
              type: train.train_type,
              position: train.position,
              speed: train.speed,
              delay: train.delay,
              status,
            };
          })
        );

        setLastUpdate(
          new Date(data.timestamp).toLocaleTimeString()
        );
      } catch (error) {
        if (!mounted) {
          return;
        }

        setBackendConnected(false);

        console.log(
          "Track Titans backend connection error:",
          error
        );
      }
    };

    fetchTelemetry();

    const interval = setInterval(
      fetchTelemetry,
      2000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [simulationRunning]);

  /* ===================================================
     AI PREDICTION CONNECTION
     =================================================== */

  useEffect(() => {
    if (!simulationRunning) {
      return;
    }

    let mounted = true;

    const fetchPrediction = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/predict",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("AI prediction unavailable");
        }

        const data: BackendPrediction =
          await response.json();

        if (!mounted) {
          return;
        }

        if (
          !data.ai_prediction ||
          typeof data.ai_prediction.total_predicted_delay !==
            "number"
        ) {
          throw new Error("Invalid AI prediction received");
        }

        setAiPrediction(data);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setAiPrediction(null);

        console.log(
          "Track Titans AI prediction connection error:",
          error
        );
      }
    };

    fetchPrediction();

    const interval = setInterval(
      fetchPrediction,
      2000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [simulationRunning]);

  /* ===================================================
     MAIN TRAIN
     =================================================== */

  const mainTrain = trains.find(
    (train) => train.id === "12301"
  )!;

  /* ===================================================
     TRAFFIC
     =================================================== */

  const trafficInteractions = useMemo(() => {
    return trains.filter(
      (train) =>
        train.id !== "12301" &&
        Math.abs(
          train.position - mainTrain.position
        ) < 30
    ).length;
  }, [trains, mainTrain.position]);

  const trafficPressure =
    trafficInteractions >= 2
      ? "HIGH"
      : trafficInteractions === 1
      ? "MEDIUM"
      : "LOW";

  const trafficDelay =
    trafficPressure === "HIGH"
      ? 8
      : trafficPressure === "MEDIUM"
      ? 4
      : 0;

  /* ===================================================
     SIGNAL / HEADWAY
     =================================================== */

  const trainsAhead = trains
    .filter(
      (train) =>
        train.id !== "12301" &&
        train.position > mainTrain.position
    )
    .sort(
      (a, b) => a.position - b.position
    );

  const nearestTrain = trainsAhead[0];

  const nearestTrainDistance = nearestTrain
    ? nearestTrain.position - mainTrain.position
    : 999;

  let signalStatus:
    | "CLEAR"
    | "CAUTION"
    | "STOP" = "CLEAR";

  if (nearestTrainDistance < 8) {
    signalStatus = "STOP";
  } else if (nearestTrainDistance < 18) {
    signalStatus = "CAUTION";
  }

  const signalDelay =
    signalStatus === "STOP"
      ? 10
      : signalStatus === "CAUTION"
      ? 5
      : 0;

  /* ===================================================
     TEMPORARY SPEED RESTRICTION
     =================================================== */

  const speedRestrictionActive =
    mainTrain.position >= 55 &&
    mainTrain.position <= 72;

  const speedRestrictionLimit = 80;

  const normalPassengerSpeed = 110;

  /*
   * Weather now affects normal speed.
   */

  const weatherAdjustedSpeed = Math.max(
    60,
    normalPassengerSpeed -
      weatherSpeedReduction
  );

  const restrictedSpeed =
    speedRestrictionActive
      ? Math.min(
          speedRestrictionLimit,
          weatherAdjustedSpeed
        )
      : weatherAdjustedSpeed;

  const restrictionDelay =
    speedRestrictionActive ? 4 : 0;

  /* ===================================================
     DYNAMIC SPEED RECOVERY
     =================================================== */

  const recoveryPossible =
    mainTrain.position > 72 &&
    signalStatus === "CLEAR";

  const recoveredDelay = recoveryPossible
    ? Math.min(3, mainTrain.delay)
    : 0;

  /* ===================================================
     TOTAL DELAY
     =================================================== */

  const baseDelay = mainTrain.delay;

  const totalPredictedDelay = Math.max(
    0,
    baseDelay +
      trafficDelay +
      signalDelay +
      restrictionDelay +
      weatherDelay -
      recoveredDelay
  );

  /*
   * Use the Python ML forecast when available.
   * The existing rule-based calculation remains
   * as the fallback if the AI endpoint is offline.
   */
  const forecastDelay = aiPrediction
    ? Math.max(
        0,
        aiPrediction.ai_prediction.total_predicted_delay
      )
    : totalPredictedDelay;

  /* ===================================================
     EFFECTIVE SPEED
     =================================================== */

  const effectiveSpeed =
    signalStatus === "STOP"
      ? 0
      : signalStatus === "CAUTION"
      ? Math.min(restrictedSpeed, 55)
      : restrictedSpeed;

  /* ===================================================
     ETA
     =================================================== */

  const remainingDistance = Math.max(
    0,
    125 - mainTrain.position
  );

  let travelMinutes = 0;

  if (effectiveSpeed > 0) {
    travelMinutes =
      (remainingDistance / effectiveSpeed) *
      60;
  } else {
    travelMinutes = 10;
  }

  /*
   * IMPORTANT: ETA is anchored to the timetable.
   * Prayagraj scheduled arrival is 13:00, so the
   * forecast cannot incorrectly show an earlier time.
   */
  const scheduledPrayagrajMinutes = 13 * 60;
  const predictedArrivalAbsoluteMinutes =
    scheduledPrayagrajMinutes +
    forecastDelay;

  const predictedETA = formatAbsoluteTime(
    Math.round(predictedArrivalAbsoluteMinutes)
  );

  /* ===================================================
     CONFIDENCE
     =================================================== */

  const confidence = Math.max(
    70,
    96 -
      trafficInteractions * 4 -
      (signalStatus === "STOP"
        ? 10
        : signalStatus === "CAUTION"
        ? 5
        : 0) -
      (weatherCondition === "FOG" ? 5 : 0)
  );

  /* ===================================================
     SIMULATION
     =================================================== */

  useEffect(() => {
    if (!simulationRunning || backendConnected) {
      return;
    }

    const interval = setInterval(() => {
      setTrains((previousTrains) =>
        previousTrains.map((train) => {
          let movement =
            train.speed / 3600;

          if (
            train.id === "12301" &&
            signalStatus === "STOP"
          ) {
            movement = 0;
          }

          if (
            train.id === "12301" &&
            signalStatus === "CAUTION"
          ) {
            movement = 55 / 3600;
          }

          if (train.type === "Freight") {
            movement = 55 / 3600;
          }

          const newPosition = Math.min(
            124,
            train.position + movement
          );

          let newDelay = train.delay;

          if (
            train.id === "12301" &&
            newPosition > 72 &&
            signalStatus === "CLEAR" &&
            newDelay > 0
          ) {
            newDelay = Math.max(
              0,
              newDelay - 0.1
            );
          }

          let status: Train["status"] =
            "ON TIME";

          if (newDelay >= 20) {
            status = "HEAVY DELAY";
          } else if (newDelay > 0) {
            status = "DELAYED";
          }

          return {
            ...train,
            position: newPosition,
            delay: Number(
              newDelay.toFixed(1)
            ),
            status,
          };
        })
      );

      setLastUpdate(new Date().toLocaleTimeString());
    }, 2000);

    return () => clearInterval(interval);
  }, [
    simulationRunning,
    signalStatus,
    backendConnected,
  ]);

  /* ===================================================
     STATION PREDICTIONS
     =================================================== */

  const stationPredictions =
    stations.map((station, index) => {
      const distance =
        station.position -
        mainTrain.position;

      if (distance <= 0) {
        return {
          ...station,
          eta: "PASSED",
          extraDelay: 0,
        };
      }

      const progressiveDelay =
        forecastDelay *
        ((index + 1) /
          stations.length);

      const [scheduledHour, scheduledMinute] =
        station.scheduled
          .split(":")
          .map(Number);

      const scheduledMinutes =
        scheduledHour * 60 +
        scheduledMinute;

      return {
        ...station,
        eta: formatAbsoluteTime(
          Math.round(
            scheduledMinutes +
              progressiveDelay
          )
        ),
        extraDelay: Math.round(
          progressiveDelay
        ),
      };
    });

  /* ===================================================
     PLATFORM RISK
     =================================================== */

  const platformRisk =
    forecastDelay >= 20
      ? "HIGH"
      : forecastDelay >= 10
      ? "MEDIUM"
      : "LOW";

  /* ===================================================
     CONNECTION RISK
     =================================================== */

  const connectingTrainName =
    "12802 Purushottam Express";

  const connectingTrainDeparture =
    "13:35";

  const connectingTrainDepartureMinutes =
    13 * 60 + 35;

  const connectionBuffer =
    connectingTrainDepartureMinutes -
    predictedArrivalAbsoluteMinutes;

  const connectionRisk =
    connectionBuffer < 0
      ? "HIGH"
      : connectionBuffer < 15
      ? "AT RISK"
      : "SAFE";

  const connectionMessage =
    connectionRisk === "HIGH"
      ? "Connection likely to be missed"
      : connectionRisk === "AT RISK"
      ? "Very limited transfer buffer"
      : "Sufficient transfer buffer available";

  const currentStation =
    getNearestStation(
      mainTrain.position
    );

  /* ===================================================
     UI
     =================================================== */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#f5f5f5",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        padding: "24px",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
          borderBottom:
            "1px solid #292929",
          paddingBottom: "20px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "14px",
              color: "#888",
              letterSpacing: "2px",
              marginBottom: "6px",
            }}
          >
            SMART INDIA HACKATHON 2026
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              fontWeight: 800,
            }}
          >
            Track Titans
          </h1>

          <p
            style={{
              margin:
                "6px 0 0",
              color: "#aaa",
            }}
          >
            Dynamic ETA Forecasting
            Engine
          </p>

          <div style={{ marginTop: "18px" }}>
            <Navigation />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding:
                "10px 16px",
              borderRadius:
                "999px",
              background:
                "#111",
              border:
                "1px solid #292929",
              color:
                simulationRunning
                  ? "#7CFF9B"
                  : "#ffcc66",
              fontSize:
                "13px",
              fontWeight: 700,
            }}
          >
            ●{" "}
            {simulationRunning
              ? "LIVE SIMULATION"
              : "PAUSED"}
          </div>

          <div
            style={{
              padding:
                "10px 16px",
              borderRadius:
                "999px",
              background:
                "#111",
              border:
                "1px solid #292929",
              color:
                backendConnected
                  ? "#7CFF9B"
                  : "#ff6b6b",
              fontSize:
                "13px",
              fontWeight: 700,
            }}
          >
            ●{" "}
            {backendConnected
              ? "PYTHON BACKEND"
              : "BACKEND OFFLINE"}
          </div>

          <button
            onClick={() => {
              setDemoMode(!demoMode);
              setSimulationRunning(true);
            }}
            style={{
              border:
                demoMode
                  ? "1px solid #7cff9b"
                  : "1px solid #444",
              background:
                demoMode
                  ? "#16351e"
                  : "#151515",
              color:
                demoMode
                  ? "#7cff9b"
                  : "#fff",
              borderRadius:
                "8px",
              padding:
                "10px 16px",
              cursor:
                "pointer",
              fontWeight: 800,
            }}
          >
            {demoMode
              ? "Demo Mode ON"
              : "Demo Mode"}
          </button>

          <button
            onClick={() =>
              setSimulationRunning(
                !simulationRunning
              )
            }
            style={{
              border:
                "1px solid #444",
              background:
                "#151515",
              color: "#fff",
              borderRadius:
                "8px",
              padding:
                "10px 16px",
              cursor:
                "pointer",
            }}
          >
            {simulationRunning
              ? "Pause"
              : "Resume"}
          </button>
        </div>
      </header>

      {demoMode && (
        <div
          style={{
            maxWidth: "1400px",
            margin: "14px auto 0",
            padding: "13px 16px",
            borderRadius: "12px",
            border: "1px solid #285f35",
            background: "#102317",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#7cff9b",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "1px",
              }}
            >
              ● DEMO MODE ACTIVE
            </div>
            <div
              style={{
                color: "#aaa",
                fontSize: "11px",
                marginTop: "4px",
              }}
            >
              Presentation scenario running with live telemetry and AI ETA forecasting.
            </div>
          </div>

          <div
            style={{
              color: "#777",
              fontSize: "11px",
            }}
          >
            Track Titans • SIH 2026
          </div>
        </div>
      )}

      {demoMode && (
        <section
          style={{
            maxWidth: "1400px",
            margin: "14px auto 0",
          }}
        >
          <Card>
            <SectionTitle
              title="Demo Scenario"
              subtitle="How Track Titans converts railway conditions into a dynamic ETA"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              <DemoStep
                icon="🌫️"
                title="FOG DETECTED"
                text="Reduced visibility affects operating speed."
                active={weatherCondition === "FOG"}
              />

              <DemoStep
                icon="⚠️"
                title="TRAFFIC PRESSURE"
                text="Mixed passenger and freight traffic changes the delay risk."
                active={trafficPressure !== "LOW"}
              />

              <DemoStep
                icon="🚦"
                title="SIGNAL / HEADWAY"
                text="Train spacing influences signal status and movement."
                active={signalStatus !== "CLEAR"}
              />

              <DemoStep
                icon="🤖"
                title="AI FORECAST"
                text="The ML model updates the expected delay from current inputs."
                active={Boolean(aiPrediction)}
              />
            </div>

            <div
              style={{
                marginTop: "14px",
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#111",
                border: "1px solid #252525",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#777",
                    letterSpacing: "1px",
                    fontWeight: 800,
                  }}
                >
                  RESULT
                </div>
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  Passenger ETA updated dynamically
                </div>
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                }}
              >
                {predictedETA}
              </div>
            </div>
          </Card>
        </section>
      )}

      <section
        style={{
          maxWidth:
            "1400px",
          margin:
            "24px auto 0",
        }}
      >
        {/* KPI CARDS */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          <KpiCard
            title="LIVE ETA"
            value={
              predictedETA
            }
            subtitle="Prayagraj"
          />

          <KpiCard
            title="AI FORECAST DELAY"
            value={`${Math.round(
              forecastDelay
            )} min`}
            subtitle={
              aiPrediction
                ? "Random Forest prediction"
                : "Rule-based fallback"
            }
          />

          <KpiCard
            title="CONFIDENCE"
            value={`${confidence}%`}
            subtitle="Prediction confidence"
          />

          <KpiCard
            title="TRAFFIC"
            value={
              trafficPressure
            }
            subtitle={`${trafficInteractions} interaction(s)`}
          />
        </div>

        {/* MAIN GRID */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "minmax(0, 2fr) minmax(320px, 1fr)",
            gap: "18px",
            marginTop:
              "18px",
          }}
        >
          {/* MAP */}

          <Card>
            <SectionTitle
              title="Railway Traffic Map"
              subtitle={`Last update: ${lastUpdate}`}
            />

            <div
              style={{
                position:
                  "relative",
                height:
                  "390px",
                marginTop:
                  "24px",
                background:
                  "linear-gradient(180deg, #0b0b0b, #080808)",
                borderRadius:
                  "14px",
                border:
                  "1px solid #222",
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(#151515 1px, transparent 1px), linear-gradient(90deg, #151515 1px, transparent 1px)",
                  backgroundSize:
                    "40px 40px",
                  opacity: 0.5,
                }}
              />

              {/* TRACK */}

              <div
                style={{
                  position:
                    "absolute",
                  left: "7%",
                  right: "7%",
                  top:
                    "190px",
                  height:
                    "6px",
                  background:
                    "#777",
                  borderRadius:
                    "10px",
                }}
              />

              {/* SPEED RESTRICTION */}

              <div
                style={{
                  position:
                    "absolute",
                  left: "51%",
                  width: "14%",
                  top:
                    "170px",
                  height:
                    "46px",
                  borderTop:
                    "2px dashed #ffb347",
                  borderBottom:
                    "2px dashed #ffb347",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color:
                    "#ffb347",
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                }}
              >
                TSR 80
              </div>

              {/* STATIONS */}

              {stations.map(
                (station) => {
                  const left =
                    7 +
                    (station.position /
                      125) *
                      86;

                  return (
                    <div
                      key={
                        station.name
                      }
                      style={{
                        position:
                          "absolute",
                        left: `${left}%`,
                        top:
                          "168px",
                        transform:
                          "translateX(-50%)",
                        textAlign:
                          "center",
                      }}
                    >
                      <div
                        style={{
                          width:
                            "18px",
                          height:
                            "18px",
                          borderRadius:
                            "50%",
                          background:
                            "#ddd",
                          border:
                            "4px solid #333",
                          margin:
                            "0 auto 8px",
                        }}
                      />

                      <div
                        style={{
                          fontSize:
                            "10px",
                          color:
                            "#bbb",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          station.name
                        }
                      </div>
                    </div>
                  );
                }
              )}

              {/* TRAINS */}

              {trains.map(
                (
                  train,
                  index
                ) => {
                  const left =
                    7 +
                    (train.position /
                      125) *
                      86;

                  const top =
                    train.id ===
                    "12301"
                      ? 135
                      : train.type ===
                        "Freight"
                      ? 235
                      : 245 +
                        index *
                          28;

                  const isMain =
                    train.id ===
                    "12301";

                  return (
                    <div
                      key={
                        train.id
                      }
                      style={{
                        position:
                          "absolute",
                        left: `${left}%`,
                        top: `${top}px`,
                        transform:
                          "translateX(-50%)",
                        transition:
                          "left 1.5s linear",
                        zIndex:
                          isMain
                            ? 5
                            : 3,
                      }}
                    >
                      <div
                        style={{
                          padding:
                            "6px 9px",
                          borderRadius:
                            "7px",
                          background:
                            isMain
                              ? "#f5f5f5"
                              : train.type ===
                                "Freight"
                              ? "#8d6e63"
                              : "#333",
                          color:
                            isMain
                              ? "#000"
                              : "#fff",
                          fontSize:
                            "10px",
                          fontWeight:
                            800,
                          whiteSpace:
                            "nowrap",
                          boxShadow:
                            "0 5px 20px rgba(0,0,0,.35)",
                        }}
                      >
                        🚆{" "}
                        {
                          train.id
                        }
                      </div>
                    </div>
                  );
                }
              )}

              {/* LEGEND */}

              <div
                style={{
                  position:
                    "absolute",
                  left:
                    "16px",
                  bottom:
                    "16px",
                  background:
                    "rgba(0,0,0,.75)",
                  padding:
                    "10px 12px",
                  borderRadius:
                    "8px",
                  fontSize:
                    "11px",
                  color:
                    "#aaa",
                }}
              >
                <div>
                  ⚪ Station
                </div>
                <div>
                  🚆 Passenger
                </div>
                <div>
                  🚛 Freight
                </div>
                <div>
                  🟠 Speed restriction
                </div>
              </div>
            </div>
          </Card>

          {/* PRIMARY TRAIN */}

          <Card>
            <SectionTitle
              title="Primary Train"
              subtitle="12301 NDLS Rajdhani"
            />

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "18px",
                background:
                  "#101010",
                borderRadius:
                  "12px",
                border:
                  "1px solid #292929",
              }}
            >
              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#888",
                }}
              >
                CURRENT LOCATION
              </div>

              <div
                style={{
                  fontSize:
                    "25px",
                  fontWeight:
                    800,
                  marginTop:
                    "5px",
                }}
              >
                {
                  currentStation.name
                }
              </div>

              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "#999",
                }}
              >
                Position{" "}
                {mainTrain.position.toFixed(
                  1
                )}{" "}
                km
              </div>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
                marginTop:
                  "12px",
              }}
            >
              <MiniStat
                label="Speed"
                value={`${Math.round(
                  effectiveSpeed
                )} km/h`}
              />

              <MiniStat
                label="AI Delay"
                value={`${Math.round(
                  forecastDelay
                )} min`}
              />

              <MiniStat
                label="Signal"
                value={
                  signalStatus
                }
              />

              <MiniStat
                label="ETA"
                value={
                  predictedETA
                }
              />
            </div>
          </Card>
        </div>

        {/* SECOND ROW */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            marginTop:
              "18px",
          }}
        >
          {/* SIGNAL */}

          <Card>
            <SectionTitle
              title="Signal & Headway"
              subtitle="Real-time traffic protection"
            />

            <div
              style={{
                marginTop:
                  "20px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  width:
                    "90px",
                  height:
                    "90px",
                  margin:
                    "0 auto",
                  borderRadius:
                    "50%",
                  background:
                    signalStatus ===
                    "CLEAR"
                      ? "#16351e"
                      : signalStatus ===
                        "CAUTION"
                      ? "#3a2d0b"
                      : "#421616",
                  border:
                    "3px solid " +
                    (signalStatus ===
                    "CLEAR"
                      ? "#5cff7c"
                      : signalStatus ===
                        "CAUTION"
                      ? "#ffc857"
                      : "#ff5c5c"),
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                }}
              >
                {
                  signalStatus
                }
              </div>

              <div
                style={{
                  marginTop:
                    "15px",
                  color:
                    "#aaa",
                }}
              >
                Nearest train:
                <strong
                  style={{
                    color:
                      "#fff",
                    marginLeft:
                      "5px",
                  }}
                >
                  {nearestTrain
                    ? nearestTrain.id
                    : "None"}
                </strong>
              </div>

              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "#777",
                }}
              >
                Headway:
                {" "}
                {nearestTrainDistance ===
                999
                  ? "Safe"
                  : `${nearestTrainDistance.toFixed(
                      1
                    )} km`}
              </div>
            </div>
          </Card>

          {/* SPEED RESTRICTION */}

          <Card>
            <SectionTitle
              title="Temporary Speed Restriction"
              subtitle="Track condition analysis"
            />

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "16px",
                borderRadius:
                  "12px",
                background:
                  speedRestrictionActive
                    ? "#2b2110"
                    : "#101010",
                border:
                  "1px solid " +
                  (speedRestrictionActive
                    ? "#75551e"
                    : "#292929"),
              }}
            >
              <div
                style={{
                  fontSize:
                    "13px",
                  color:
                    speedRestrictionActive
                      ? "#ffca6b"
                      : "#777",
                  fontWeight:
                    800,
                }}
              >
                {speedRestrictionActive
                  ? "⚠ RESTRICTION ACTIVE"
                  : "✓ NO ACTIVE RESTRICTION"}
              </div>

              <div
                style={{
                  fontSize:
                    "28px",
                  fontWeight:
                    800,
                  marginTop:
                    "10px",
                }}
              >
                {
                  speedRestrictionLimit
                }{" "}
                <span
                  style={{
                    fontSize:
                      "14px",
                    color:
                      "#888",
                  }}
                >
                  km/h
                </span>
              </div>

              <div
                style={{
                  marginTop:
                    "8px",
                  fontSize:
                    "12px",
                  color:
                    "#888",
                }}
              >
                Restriction
                zone:
                <br />
                55 km →
                72 km
              </div>

              <div
                style={{
                  marginTop:
                    "12px",
                  color:
                    "#aaa",
                  fontSize:
                    "12px",
                }}
              >
                Estimated delay:
                <strong
                  style={{
                    color:
                      "#fff",
                    marginLeft:
                      "5px",
                  }}
                >
                  +4 min
                </strong>
              </div>
            </div>
          </Card>

          {/* WEATHER */}

          <Card>
            <SectionTitle
              title="Weather Impact"
              subtitle="Visibility and weather conditions"
            />

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "16px",
                borderRadius:
                  "12px",
                background:
                  weatherCondition ===
                  "FOG"
                    ? "#24221b"
                    : weatherCondition ===
                      "HEAVY RAIN"
                    ? "#1b2024"
                    : "#102317",
                border:
                  "1px solid " +
                  (weatherCondition ===
                  "FOG"
                    ? "#6b5c32"
                    : weatherCondition ===
                      "HEAVY RAIN"
                    ? "#394b59"
                    : "#285f35"),
              }}
            >
              <div
                style={{
                  fontSize:
                    "13px",
                  fontWeight:
                    800,
                  color:
                    weatherCondition ===
                    "FOG"
                      ? "#e6c76b"
                      : weatherCondition ===
                        "HEAVY RAIN"
                      ? "#8fc7ed"
                      : "#7cff9b",
                }}
              >
                {weatherCondition ===
                "FOG"
                  ? "🌫️ FOG DETECTED"
                  : weatherCondition ===
                    "HEAVY RAIN"
                  ? "🌧️ HEAVY RAIN"
                  : "☀️ CLEAR WEATHER"}
              </div>

              <div
                style={{
                  fontSize:
                    "28px",
                  fontWeight:
                    900,
                  marginTop:
                    "10px",
                }}
              >
                -
                {
                  weatherSpeedReduction
                }{" "}
                <span
                  style={{
                    fontSize:
                      "14px",
                    color:
                      "#888",
                  }}
                >
                  km/h
                </span>
              </div>

              <div
                style={{
                  color:
                    "#888",
                  fontSize:
                    "12px",
                  marginTop:
                    "5px",
                }}
              >
                Estimated speed
                reduction
              </div>

              <div
                style={{
                  marginTop:
                    "14px",
                  color:
                    "#aaa",
                  fontSize:
                    "12px",
                }}
              >
                Weather delay:
                <strong
                  style={{
                    color:
                      "#fff",
                    marginLeft:
                      "5px",
                  }}
                >
                  +{weatherDelay}{" "}
                  min
                </strong>
              </div>
            </div>
          </Card>

          {/* CONNECTION RISK */}

          <Card>
            <SectionTitle
              title="Connection Risk"
              subtitle="Passenger transfer prediction"
            />

            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "12px",
                background:
                  connectionRisk === "HIGH"
                    ? "#321717"
                    : connectionRisk === "AT RISK"
                    ? "#302610"
                    : "#102317",
                border:
                  "1px solid " +
                  (connectionRisk === "HIGH"
                    ? "#703030"
                    : connectionRisk === "AT RISK"
                    ? "#6b5724"
                    : "#285f35"),
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color:
                    connectionRisk === "HIGH"
                      ? "#ff7777"
                      : connectionRisk === "AT RISK"
                      ? "#ffca6b"
                      : "#7cff9b",
                }}
              >
                {connectionRisk === "HIGH"
                  ? "⚠ HIGH CONNECTION RISK"
                  : connectionRisk === "AT RISK"
                  ? "⚠ CONNECTION AT RISK"
                  : "✓ CONNECTION SAFE"}
              </div>

              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  marginTop: "10px",
                }}
              >
                {connectingTrainName}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                Departure: {connectingTrainDeparture}
              </div>

              <div
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "#aaa",
                }}
              >
                Predicted arrival: {predictedETA}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  fontSize: "13px",
                  color: "#aaa",
                }}
              >
                Transfer buffer:
                <strong
                  style={{
                    color:
                      connectionBuffer < 0
                        ? "#ff7777"
                        : "#fff",
                    marginLeft: "5px",
                  }}
                >
                  {connectionBuffer >= 0
                    ? `${Math.round(connectionBuffer)} min`
                    : `${Math.abs(Math.round(connectionBuffer))} min late`}
                </strong>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  color: "#888",
                  fontSize: "12px",
                }}
              >
                {connectionMessage}
              </div>
            </div>
          </Card>

          {/* SPEED RECOVERY */}

          <Card>
            <SectionTitle
              title="Dynamic Speed Recovery"
              subtitle="Can lost time be recovered?"
            />

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "16px",
                borderRadius:
                  "12px",
                background:
                  recoveryPossible
                    ? "#102516"
                    : "#101010",
                border:
                  "1px solid " +
                  (recoveryPossible
                    ? "#285f35"
                    : "#292929"),
              }}
            >
              <div
                style={{
                  fontSize:
                    "13px",
                  color:
                    recoveryPossible
                      ? "#7cff9b"
                      : "#888",
                  fontWeight:
                    800,
                }}
              >
                {recoveryPossible
                  ? "✓ RECOVERY AVAILABLE"
                  : "RECOVERY NOT ACTIVE"}
              </div>

              <div
                style={{
                  fontSize:
                    "30px",
                  fontWeight:
                    800,
                  marginTop:
                    "10px",
                }}
              >
                {
                  recoveredDelay
                }{" "}
                min
              </div>

              <div
                style={{
                  color:
                    "#888",
                  fontSize:
                    "12px",
                  marginTop:
                    "6px",
                }}
              >
                Estimated delay
                recovered
              </div>

              <div
                style={{
                  marginTop:
                    "15px",
                  fontSize:
                    "12px",
                  color:
                    "#aaa",
                }}
              >
                Conditions:
              </div>

              <div
                style={{
                  marginTop:
                    "7px",
                  fontSize:
                    "12px",
                  color:
                    "#888",
                  lineHeight:
                    1.8,
                }}
              >
                • Train past
                restriction
                <br />
                • Signal clear
                <br />
                • Track capacity
                available
              </div>
            </div>
          </Card>
        </div>

        {/* AI FORECAST */}

        <Card
          style={{
            marginTop: "18px",
          }}
        >
          <SectionTitle
            title="AI ETA Forecast"
            subtitle="Machine-learning prediction from the Python backend"
          />

          <div
            style={{
              marginTop: "18px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <DelayItem
              title="MODEL"
              value={
                aiPrediction
                  ? aiPrediction.model.name
                  : "Waiting for AI"
              }
            />

            <DelayItem
              title="AI ADDITIONAL DELAY"
              value={
                aiPrediction
                  ? `+${aiPrediction.ai_prediction.additional_delay} min`
                  : "—"
              }
            />

            <DelayItem
              title="AI TOTAL DELAY"
              value={`${Math.round(
                forecastDelay
              )} min`}
            />

            <DelayItem
              title="AI STATUS"
              value={
                aiPrediction
                  ? aiPrediction.model.status.toUpperCase()
                  : "OFFLINE"
              }
            />
          </div>

          <div
            style={{
              marginTop: "14px",
              padding: "14px",
              borderRadius: "10px",
              background: "#111",
              border: "1px solid #252525",
              color: "#888",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            {aiPrediction
              ? "The Random Forest model is using live telemetry including speed, traffic pressure, signal status, weather and remaining distance."
              : "The dashboard is using the existing rule-based forecast until the Python ML endpoint is available."}
          </div>
        </Card>

        {/* DELAY ANALYSIS */}

        <Card
          style={{
            marginTop:
              "18px",
          }}
        >
          <SectionTitle
            title="Explainable Delay Analysis"
            subtitle="Why the ETA changed"
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop:
                "20px",
            }}
          >
            <DelayItem
              title="Existing delay"
              value={`+${Math.round(
                baseDelay
              )} min`}
            />

            <DelayItem
              title="Traffic interaction"
              value={`+${trafficDelay} min`}
            />

            <DelayItem
              title="Signal / headway"
              value={`+${signalDelay} min`}
            />

            <DelayItem
              title="Speed restriction"
              value={`+${restrictionDelay} min`}
            />

            <DelayItem
              title="Weather / fog"
              value={`+${weatherDelay} min`}
            />

            <DelayItem
              title="Connection risk"
              value={connectionRisk}
            />

            <DelayItem
              title="Speed recovery"
              value={`-${recoveredDelay} min`}
            />

            <DelayItem
              title="AI additional forecast"
              value={
                aiPrediction
                  ? `+${aiPrediction.ai_prediction.additional_delay} min`
                  : "—"
              }
            />
          </div>

          <div
            style={{
              marginTop:
                "20px",
              padding:
                "18px",
              background:
                "#111",
              borderRadius:
                "12px",
              border:
                "1px solid #252525",
            }}
          >
            <div
              style={{
                color:
                  "#777",
                fontSize:
                  "12px",
              }}
            >
              FINAL FORECASTED
              DELAY
            </div>

            <div
              style={{
                fontSize:
                  "36px",
                fontWeight:
                  900,
                marginTop:
                  "5px",
              }}
            >
              {Math.round(
                forecastDelay
              )}{" "}
              min
            </div>

            <div
              style={{
                marginTop:
                  "8px",
                color:
                  "#999",
                fontSize:
                  "13px",
              }}
            >
              Forecasted ETA
              to Prayagraj:
              <strong
                style={{
                  color:
                    "#fff",
                  marginLeft:
                    "6px",
                }}
              >
                {
                  predictedETA
                }
              </strong>
            </div>
          </div>
        </Card>

        {/* STATION TABLE */}

        <Card
          style={{
            marginTop:
              "18px",
          }}
        >
          <SectionTitle
            title="Station-by-Station ETA Forecast"
            subtitle="Delay propagation along the corridor"
          />

          <div
            style={{
              overflowX:
                "auto",
              marginTop:
                "18px",
            }}
          >
            <table
              style={{
                width:
                  "100%",
                borderCollapse:
                  "collapse",
                fontSize:
                  "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign:
                      "left",
                    color:
                      "#777",
                    borderBottom:
                      "1px solid #292929",
                  }}
                >
                  <th
                    style={{
                      padding:
                        "12px",
                    }}
                  >
                    Station
                  </th>

                  <th
                    style={{
                      padding:
                        "12px",
                    }}
                  >
                    Scheduled
                  </th>

                  <th
                    style={{
                      padding:
                        "12px",
                    }}
                  >
                    Predicted ETA
                  </th>

                  <th
                    style={{
                      padding:
                        "12px",
                    }}
                  >
                    Delay Impact
                  </th>

                  <th
                    style={{
                      padding:
                        "12px",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {stationPredictions.map(
                  (station) => (
                    <tr
                      key={
                        station.name
                      }
                      style={{
                        borderBottom:
                          "1px solid #191919",
                      }}
                    >
                      <td
                        style={{
                          padding:
                            "14px 12px",
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          station.name
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          color:
                            "#777",
                        }}
                      >
                        {
                          station.scheduled
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          fontWeight:
                            800,
                        }}
                      >
                        {
                          station.eta
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          color:
                            station.extraDelay >
                            0
                              ? "#ffca6b"
                              : "#777",
                        }}
                      >
                        {station.extraDelay >
                        0
                          ? `+${station.extraDelay} min`
                          : "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        <span
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "999px",
                            background:
                              station.eta ===
                              "PASSED"
                                ? "#171717"
                                : "#17241a",
                            color:
                              station.eta ===
                              "PASSED"
                                ? "#777"
                                : "#7cff9b",
                            fontSize:
                              "11px",
                            fontWeight:
                              800,
                          }}
                        >
                          {station.eta ===
                          "PASSED"
                            ? "PASSED"
                            : "FORECAST"}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* LIVE TRAIN TRAFFIC */}

        <Card
          style={{
            marginTop:
              "18px",
          }}
        >
          <SectionTitle
            title="Live Train Traffic"
            subtitle="Mixed passenger and freight traffic"
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
              marginTop:
                "18px",
            }}
          >
            {trains.map(
              (train) => (
                <div
                  key={
                    train.id
                  }
                  style={{
                    padding:
                      "16px",
                    background:
                      "#101010",
                    border:
                      "1px solid #292929",
                    borderRadius:
                      "12px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight:
                            800,
                        }}
                      >
                        {
                          train.id
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            "4px",
                          fontSize:
                            "12px",
                          color:
                            "#777",
                        }}
                      >
                        {
                          train.name
                        }
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize:
                          "10px",
                        padding:
                          "5px 8px",
                        borderRadius:
                          "999px",
                        background:
                          train.type ===
                          "Freight"
                            ? "#2b2117"
                            : "#171717",
                        color:
                          train.type ===
                          "Freight"
                            ? "#d5a76b"
                            : "#aaa",
                        height:
                          "fit-content",
                      }}
                    >
                      {
                        train.type
                      }
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "8px",
                      marginTop:
                        "14px",
                    }}
                  >
                    <MiniStat
                      label="Position"
                      value={`${train.position.toFixed(
                        1
                      )} km`}
                    />

                    <MiniStat
                      label="Speed"
                      value={`${Math.round(
                        train.speed
                      )} km/h`}
                    />

                    <MiniStat
                      label="Delay"
                      value={`${Math.round(
                        train.delay
                      )} min`}
                    />

                    <MiniStat
                      label="Status"
                      value={
                        train.status
                      }
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>

        {/* PLATFORM ALERT */}

        <Card
          style={{
            marginTop:
              "18px",
            marginBottom:
              "30px",
          }}
        >
          <SectionTitle
            title="Platform Clash Prediction"
            subtitle="Station-level operational warning"
          />

          <div
            style={{
              marginTop:
                "18px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: "20px",
              flexWrap:
                "wrap",
              padding:
                "18px",
              background:
                platformRisk ===
                "HIGH"
                  ? "#321717"
                  : platformRisk ===
                    "MEDIUM"
                  ? "#302610"
                  : "#102317",
              borderRadius:
                "12px",
              border:
                "1px solid " +
                (platformRisk ===
                "HIGH"
                  ? "#703030"
                  : platformRisk ===
                    "MEDIUM"
                  ? "#6b5724"
                  : "#285f35"),
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#888",
                }}
              >
                NEXT PLATFORM
                RISK
              </div>

              <div
                style={{
                  fontSize:
                    "28px",
                  fontWeight:
                    900,
                  marginTop:
                    "5px",
                }}
              >
                Platform 5
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  color:
                    "#999",
                  fontSize:
                    "12px",
                }}
              >
                Expected
                arrival:
                {" "}
                {
                  predictedETA
                }
              </div>
            </div>

            <div
              style={{
                padding:
                  "12px 18px",
                borderRadius:
                  "10px",
                fontWeight:
                  900,
                fontSize:
                  "13px",
                background:
                  platformRisk ===
                  "HIGH"
                    ? "#5a2020"
                    : platformRisk ===
                      "MEDIUM"
                    ? "#594717"
                    : "#1b4927",
              }}
            >
              {
                platformRisk
              }{" "}
              RISK
            </div>
          </div>
        </Card>

        {/* FOOTER */}

        <footer
          style={{
            textAlign:
              "center",
            color:
              "#555",
            fontSize:
              "12px",
            paddingBottom:
              "30px",
          }}
        >
          Track Titans •
          SIH 2026 • Dynamic
          ETA Forecasting
          Engine • AI Powered
        </footer>
      </section>
    </main>
  );
}

/* =====================================================
   REUSABLE COMPONENTS
   ===================================================== */

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background:
          "#0d0d0d",
        border:
          "1px solid #222",
        borderRadius:
          "16px",
        padding:
          "20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontSize:
            "19px",
          fontWeight:
            800,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin:
            "5px 0 0",
          color:
            "#666",
          fontSize:
            "12px",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function DemoStep({
  icon,
  title,
  text,
  active,
}: {
  icon: string;
  title: string;
  text: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "12px",
        background: active ? "#102317" : "#101010",
        border:
          "1px solid " +
          (active ? "#285f35" : "#292929"),
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
        }}
      >
        <span style={{ fontSize: "20px" }}>
          {icon}
        </span>

        <span
          style={{
            fontSize: "11px",
            fontWeight: 900,
            color: active ? "#7cff9b" : "#aaa",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          marginTop: "9px",
          color: "#888",
          fontSize: "11px",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        background:
          "#0d0d0d",
        border:
          "1px solid #222",
        borderRadius:
          "14px",
        padding:
          "18px",
      }}
    >
      <div
        style={{
          fontSize:
            "10px",
          color:
            "#777",
          fontWeight:
            800,
          letterSpacing:
            "1px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "28px",
          fontWeight:
            900,
          marginTop:
            "7px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color:
            "#666",
          fontSize:
            "11px",
          marginTop:
            "5px",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background:
          "#151515",
        borderRadius:
          "8px",
        padding:
          "10px",
      }}
    >
      <div
        style={{
          color:
            "#666",
          fontSize:
            "9px",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "4px",
          fontSize:
            "12px",
          fontWeight:
            800,
          color:
            "#ddd",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DelayItem({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          "15px",
        background:
          "#111",
        border:
          "1px solid #252525",
        borderRadius:
          "10px",
      }}
    >
      <div
        style={{
          fontSize:
            "11px",
          color:
            "#777",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "22px",
          fontWeight:
            900,
          marginTop:
            "6px",
        }}
      >
        {value}
      </div>
    </div>
  );
}