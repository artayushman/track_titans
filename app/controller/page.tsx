"use client";

import { useEffect, useState } from "react";
import Navigation from "../components/Navigation";

type Train = {
  train_id: string;
  name: string;
  train_type: "Passenger" | "Freight";
  position: number;
  speed: number;
  delay: number;
};

type Telemetry = {
  timestamp: string;
  traffic: {
    pressure: "LOW" | "MEDIUM" | "HIGH";
    interactions: number;
  };
  signal: {
    status: "CLEAR" | "CAUTION" | "STOP";
    nearest_train_distance_km: number;
  };
  trains: Train[];
};

type Prediction = {
  train_id: string;
  train_name: string;
  current_delay: number;
  ai_prediction: {
    additional_delay: number;
    total_predicted_delay: number;
  };
  inputs: {
    speed: number;
    traffic_pressure: string;
    signal_status: string;
    speed_restriction: number;
    weather_severity: number;
    distance_remaining: number;
  };
  model: {
    name: string;
    status: string;
  };
};

const stations = [
  { name: "New Delhi", position: 0 },
  { name: "Ghaziabad", position: 18 },
  { name: "Aligarh", position: 38 },
  { name: "Tundla", position: 55 },
  { name: "Etawah", position: 72 },
  { name: "Kanpur", position: 90 },
  { name: "Prayagraj", position: 125 },
];

export default function ControllerPage() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("--:--:--");

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const telemetryResponse = await fetch(
          "http://127.0.0.1:8000/telemetry",
          {
            cache: "no-store",
          }
        );

        const predictionResponse = await fetch(
          "http://127.0.0.1:8000/predict",
          {
            cache: "no-store",
          }
        );

        if (!telemetryResponse.ok || !predictionResponse.ok) {
          throw new Error("Backend unavailable");
        }

        const telemetryData = await telemetryResponse.json();
        const predictionData = await predictionResponse.json();

        if (!mounted) return;

        setTelemetry(telemetryData);
        setPrediction(predictionData);
        setConnected(true);

        if (telemetryData.timestamp) {
          setLastUpdate(
            new Date(telemetryData.timestamp).toLocaleTimeString()
          );
        }
      } catch (error) {
        if (!mounted) return;

        setConnected(false);
        console.log("Controller dashboard error:", error);
      }
    }

    fetchData();

    const interval = setInterval(fetchData, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const trains = telemetry?.trains ?? [];

  const passengerTrains = trains.filter(
    (train) => train.train_type === "Passenger"
  );

  const freightTrains = trains.filter(
    (train) => train.train_type === "Freight"
  );

  const delayedTrains = trains.filter(
    (train) => train.delay > 5
  );

  const trafficPressure =
    telemetry?.traffic?.pressure ?? "LOW";

  const signalStatus =
    telemetry?.signal?.status ?? "CLEAR";

  const mainTrain =
    trains.find(
      (train) => train.train_id === "12301"
    ) ?? passengerTrains[0];

  const mainTrainDelay =
    mainTrain?.delay ?? 0;

  const aiDelay =
    prediction?.ai_prediction?.total_predicted_delay ??
    mainTrainDelay;

  const additionalAiDelay =
    prediction?.ai_prediction?.additional_delay ?? 0;

  const currentPosition =
    mainTrain?.position ?? 62;

  const activeAlerts =
    (trafficPressure === "HIGH" ? 1 : 0) +
    (signalStatus === "STOP" ? 1 : 0) +
    (mainTrainDelay > 10 ? 1 : 0) +
    (additionalAiDelay > 5 ? 1 : 0);

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
      <header
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          paddingBottom: "20px",
          borderBottom: "1px solid #292929",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#777",
                letterSpacing: "2px",
              }}
            >
              TRACK TITANS
            </div>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "32px",
                fontWeight: 900,
              }}
            >
              Controller Dashboard
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#888",
                fontSize: "13px",
              }}
            >
              Railway traffic monitoring & AI ETA
              control center
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "9px 14px",
                borderRadius: "999px",
                background: "#111",
                border: "1px solid #292929",
                color: connected
                  ? "#7cff9b"
                  : "#ff7777",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              ●{" "}
              {connected
                ? "PYTHON BACKEND LIVE"
                : "BACKEND OFFLINE"}
            </div>

            <div
              style={{
                padding: "9px 14px",
                borderRadius: "999px",
                background: "#111",
                border: "1px solid #292929",
                color: "#888",
                fontSize: "11px",
              }}
            >
              {lastUpdate}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <Navigation />
        </div>
      </header>

      <section
        style={{
          maxWidth: "1200px",
          margin: "22px auto 0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <Kpi
            title="TRAINS MONITORED"
            value={String(trains.length)}
            subtitle={`${passengerTrains.length} passenger • ${freightTrains.length} freight`}
          />

          <Kpi
            title="DELAYED TRAINS"
            value={String(delayedTrains.length)}
            subtitle="Delay above 5 minutes"
          />

          <Kpi
            title="TRAFFIC PRESSURE"
            value={trafficPressure}
            subtitle={`${telemetry?.traffic?.interactions ?? 0} interactions`}
          />

          <Kpi
            title="ACTIVE ALERTS"
            value={String(activeAlerts)}
            subtitle="Requires controller attention"
          />
        </div>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr",
            gap: "18px",
          }}
        >
          <div
            style={{
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <SectionTitle
              title="Live Corridor"
              subtitle="New Delhi → Kanpur → Prayagraj"
            />

            <div
              style={{
                marginTop: "25px",
                position: "relative",
                height: "145px",
                borderTop:
                  "3px solid #444",
              }}
            >
              {stations.map((station) => {
                const left = `${
                  (station.position / 125) *
                  100
                }%`;

                const nearbyTrain =
                  trains.find(
                    (train) =>
                      Math.abs(
                        train.position -
                          station.position
                      ) < 8
                  );

                return (
                  <div
                    key={station.name}
                    style={{
                      position: "absolute",
                      left,
                      top: "-10px",
                      transform:
                        "translateX(-50%)",
                      textAlign: "center",
                      width: "100px",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background:
                          nearbyTrain
                            ? "#fff"
                            : "#555",
                        margin: "0 auto",
                        border:
                          "3px solid #111",
                        boxShadow:
                          nearbyTrain
                            ? "0 0 0 2px #777"
                            : "none",
                      }}
                    />

                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "10px",
                        color: "#aaa",
                      }}
                    >
                      {station.name}
                    </div>

                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "9px",
                        color: "#555",
                      }}
                    >
                      {station.position} km
                    </div>
                  </div>
                );
              })}

              {trains.map((train) => {
                const left = `${Math.min(
                  98,
                  Math.max(
                    2,
                    (train.position / 125) *
                      100
                  )
                )}%`;

                return (
                  <div
                    key={train.train_id}
                    style={{
                      position: "absolute",
                      left,
                      top:
                        train.train_type ===
                        "Freight"
                          ? "45px"
                          : "75px",
                      transform:
                        "translateX(-50%)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "18px",
                      }}
                    >
                      🚆
                    </div>

                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        color:
                          train.delay > 10
                            ? "#ff7777"
                            : "#ddd",
                      }}
                    >
                      {train.train_id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <SectionTitle
              title="Signal Status"
              subtitle="Nearest block signal"
            />

            <div
              style={{
                marginTop: "22px",
                textAlign: "center",
                padding: "20px",
                background: "#111",
                borderRadius: "14px",
                border:
                  "1px solid #292929",
              }}
            >
              <div
                style={{
                  width: "62px",
                  height: "62px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  background:
                    signalStatus ===
                    "STOP"
                      ? "#ff4444"
                      : signalStatus ===
                        "CAUTION"
                      ? "#ffb020"
                      : "#4cff78",
                  boxShadow:
                    signalStatus ===
                    "STOP"
                      ? "0 0 30px rgba(255,68,68,.35)"
                      : "none",
                }}
              />

              <div
                style={{
                  marginTop: "15px",
                  fontSize: "22px",
                  fontWeight: 900,
                }}
              >
                {signalStatus}
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "11px",
                  color: "#777",
                }}
              >
                Nearest train distance:{" "}
                {telemetry?.signal
                  ?.nearest_train_distance_km ??
                  0}{" "}
                km
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "18px",
          }}
        >
          <div
            style={{
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <SectionTitle
              title="Train Operations"
              subtitle="Live fleet telemetry"
            />

            <div style={{ marginTop: "16px" }}>
              {trains.map((train) => (
                <TrainRow
                  key={train.train_id}
                  train={train}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <SectionTitle
              title="AI Forecast"
              subtitle="Prediction for primary passenger train"
            />

            <div
              style={{
                marginTop: "18px",
                padding: "20px",
                borderRadius: "14px",
                background: "#111",
                border:
                  "1px solid #292929",
              }}
            >
              <div
                style={{
                  color: "#777",
                  fontSize: "10px",
                  letterSpacing: "1px",
                }}
              >
                {prediction?.train_id ??
                  "12301"}{" "}
                •{" "}
                {prediction?.train_name ??
                  "NDLS Rajdhani"}
              </div>

              <div
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  marginTop: "8px",
                }}
              >
                +{Math.round(aiDelay)} min
              </div>

              <div
                style={{
                  color: "#888",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                Predicted total delay
              </div>

              <div
                style={{
                  marginTop: "18px",
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "10px",
                }}
              >
                <MiniMetric
                  title="CURRENT"
                  value={`+${Math.round(
                    mainTrainDelay
                  )} min`}
                />

                <MiniMetric
                  title="AI ADDITION"
                  value={`+${additionalAiDelay} min`}
                />

                <MiniMetric
                  title="SPEED"
                  value={`${Math.round(
                    prediction?.inputs
                      ?.speed ??
                      mainTrain?.speed ??
                      0
                  )} km/h`}
                />

                <MiniMetric
                  title="MODEL"
                  value="Random Forest"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: "18px",
            background: "#0d0d0d",
            border: "1px solid #222",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <SectionTitle
            title="Controller Alerts"
            subtitle="Operational situations requiring attention"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            <AlertCard
              level={
                signalStatus === "STOP"
                  ? "CRITICAL"
                  : "NORMAL"
              }
              title="Signal condition"
              message={
                signalStatus === "STOP"
                  ? "Train movement restricted by current signal state."
                  : signalStatus ===
                    "CAUTION"
                  ? "Caution signal detected. Monitor following movement."
                  : "Signal path currently clear."
              }
            />

            <AlertCard
              level={
                trafficPressure ===
                "HIGH"
                  ? "HIGH"
                  : "NORMAL"
              }
              title="Traffic pressure"
              message={
                trafficPressure ===
                "HIGH"
                  ? "High corridor pressure may increase sectional delay."
                  : trafficPressure ===
                    "MEDIUM"
                  ? "Moderate traffic interaction detected."
                  : "Traffic pressure is currently low."
              }
            />

            <AlertCard
              level={
                mainTrainDelay > 10
                  ? "HIGH"
                  : "NORMAL"
              }
              title="Rajdhani delay"
              message={
                mainTrainDelay > 10
                  ? `Train 12301 currently has a ${Math.round(
                      mainTrainDelay
                    )} minute delay.`
                  : "Primary passenger train remains within manageable delay."
              }
            />

            <AlertCard
              level={
                additionalAiDelay > 5
                  ? "MEDIUM"
                  : "NORMAL"
              }
              title="AI forecast"
              message={`AI expects approximately ${Math.round(
                additionalAiDelay
              )} additional minutes under current conditions.`}
            />
          </div>
        </section>

        <section
          style={{
            marginTop: "18px",
            background: "#0d0d0d",
            border: "1px solid #222",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <SectionTitle
            title="Operational Snapshot"
            subtitle="Current section-level intelligence"
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
            <Snapshot
              title="MAIN TRAIN POSITION"
              value={`${currentPosition.toFixed(
                1
              )} km`}
            />

            <Snapshot
              title="FREIGHT TRAINS"
              value={String(
                freightTrains.length
              )}
            />

            <Snapshot
              title="PASSENGER TRAINS"
              value={String(
                passengerTrains.length
              )}
            />

            <Snapshot
              title="TRACK INTERACTIONS"
              value={String(
                telemetry?.traffic
                  ?.interactions ?? 0
              )}
            />

            <Snapshot
              title="WEATHER"
              value="FOG"
            />

            <Snapshot
              title="AI MODEL"
              value="ACTIVE"
            />
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            color: "#555",
            fontSize: "11px",
            padding: "30px 0",
          }}
        >
          Track Titans • Controller intelligence
          powered by simulation + AI

          <div
            style={{
              marginTop: "6px",
              color: "#444",
            }}
          >
            Last backend update:{" "}
            {lastUpdate}
          </div>
        </footer>
      </section>
    </main>
  );
}

function Kpi({
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
        background: "#0d0d0d",
        border: "1px solid #222",
        borderRadius: "14px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: "#777",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "1px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "26px",
          fontWeight: 900,
          marginTop: "7px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#666",
          fontSize: "10px",
          marginTop: "5px",
        }}
      >
        {subtitle}
      </div>
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
          fontSize: "19px",
          fontWeight: 900,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "5px 0 0",
          color: "#666",
          fontSize: "11px",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function TrainRow({
  train,
}: {
  train: Train;
}) {
  const status =
    train.delay > 15
      ? "CRITICAL DELAY"
      : train.delay > 5
      ? "DELAYED"
      : "NORMAL";

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom:
          "1px solid #1c1c1c",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "15px",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 900,
          }}
        >
          {train.train_id}
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#777",
            marginTop: "3px",
          }}
        >
          {train.name} •{" "}
          {train.train_type}
        </div>
      </div>

      <div
        style={{
          textAlign: "right",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          {Math.round(
            train.speed
          )}{" "}
          km/h
        </div>

        <div
          style={{
            fontSize: "10px",
            marginTop: "3px",
            color:
              train.delay > 10
                ? "#ff7777"
                : train.delay > 5
                ? "#ffca6b"
                : "#777",
          }}
        >
          {status} • +
          {Math.round(
            train.delay
          )}{" "}
          min
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "9px",
        background: "#0b0b0b",
        border: "1px solid #222",
      }}
    >
      <div
        style={{
          color: "#666",
          fontSize: "9px",
          letterSpacing: "1px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "5px",
          fontSize: "14px",
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AlertCard({
  level,
  title,
  message,
}: {
  level: string;
  title: string;
  message: string;
}) {
  const isCritical =
    level === "CRITICAL";

  const isHigh =
    level === "HIGH";

  const isMedium =
    level === "MEDIUM";

  const border =
    isCritical
      ? "#703030"
      : isHigh
      ? "#634b28"
      : isMedium
      ? "#5d5127"
      : "#252525";

  const background =
    isCritical
      ? "#211010"
      : isHigh
      ? "#20180d"
      : isMedium
      ? "#201d0d"
      : "#111";

  const text =
    isCritical
      ? "#ff7777"
      : isHigh
      ? "#ffca6b"
      : isMedium
      ? "#e4d56b"
      : "#7cff9b";

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "12px",
        background,
        border: `1px solid ${border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: "13px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: text,
            fontSize: "9px",
            fontWeight: 900,
          }}
        >
          {level}
        </div>
      </div>

      <div
        style={{
          color: "#999",
          fontSize: "11px",
          lineHeight: 1.5,
          marginTop: "9px",
        }}
      >
        {message}
      </div>
    </div>
  );
}

function Snapshot({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "15px",
        borderRadius: "10px",
        background: "#111",
        border: "1px solid #252525",
      }}
    >
      <div
        style={{
          color: "#666",
          fontSize: "9px",
          letterSpacing: "1px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "7px",
          fontSize: "17px",
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}