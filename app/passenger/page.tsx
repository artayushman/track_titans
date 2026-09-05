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
  model: {
    name: string;
    status: string;
  };
};

const stations = [
  { name: "New Delhi", scheduled: "08:00", position: 0 },
  { name: "Ghaziabad", scheduled: "08:35", position: 18 },
  { name: "Aligarh", scheduled: "09:10", position: 38 },
  { name: "Tundla", scheduled: "09:50", position: 55 },
  { name: "Etawah", scheduled: "10:30", position: 72 },
  { name: "Kanpur", scheduled: "11:15", position: 90 },
  { name: "Prayagraj", scheduled: "13:00", position: 125 },
];

function formatTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = Math.floor(totalMinutes % 60);

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0"
  )}`;
}

export default function PassengerPage() {
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
        console.log("Passenger dashboard backend error:", error);
      }
    }

    fetchData();

    const interval = setInterval(fetchData, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const mainTrain = telemetry?.trains?.find(
    (train) => train.train_id === "12301"
  );

  const currentPosition = mainTrain?.position ?? 62;
  const currentSpeed = mainTrain?.speed ?? 0;
  const currentDelay = mainTrain?.delay ?? 0;

  const aiDelay =
    prediction?.ai_prediction?.total_predicted_delay ??
    currentDelay;

  const additionalAiDelay =
    prediction?.ai_prediction?.additional_delay ?? 0;

  const scheduledArrival = 13 * 60;

  const predictedArrival = scheduledArrival + aiDelay;

  const predictedETA = formatTime(Math.round(predictedArrival));

  const connectionDeparture = 13 * 60 + 35;

  const connectionBuffer =
    connectionDeparture - predictedArrival;

  const connectionRisk =
    connectionBuffer < 0
      ? "HIGH"
      : connectionBuffer < 15
      ? "AT RISK"
      : "SAFE";

  const trafficPressure =
    telemetry?.traffic?.pressure ?? "LOW";

  const signalStatus =
    telemetry?.signal?.status ?? "CLEAR";

  const weather = "FOG";

  const progress = Math.min(
    100,
    Math.max(0, (currentPosition / 125) * 100)
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#f5f5f5",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "24px",
      }}
    >
      <header
        style={{
          maxWidth: "1000px",
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
              Passenger ETA
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#888",
                fontSize: "13px",
              }}
            >
              Dynamic AI-powered journey forecast
            </p>
          </div>

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
            ● {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <Navigation />
        </div>
      </header>

      <section
        style={{
          maxWidth: "1000px",
          margin: "24px auto 0",
        }}
      >
        <div
          style={{
            background: "#0d0d0d",
            border: "1px solid #222",
            borderRadius: "18px",
            padding: "24px",
          }}
        >
          <div
            style={{
              color: "#777",
              fontSize: "11px",
              letterSpacing: "1px",
            }}
          >
            YOUR TRAIN
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: 900,
                }}
              >
                🚆 12301
              </h2>

              <div
                style={{
                  marginTop: "5px",
                  color: "#999",
                }}
              >
                NDLS Rajdhani
              </div>
            </div>

            <div
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                background:
                  currentDelay >= 20
                    ? "#321717"
                    : "#302610",
                color:
                  currentDelay >= 20
                    ? "#ff7777"
                    : "#ffca6b",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              {currentDelay > 0
                ? `DELAYED ${Math.round(
                    currentDelay
                  )} MIN`
                : "ON TIME"}
            </div>
          </div>

          <div
            style={{
              marginTop: "25px",
              padding: "22px",
              borderRadius: "14px",
              background: "#111",
              border: "1px solid #292929",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#777",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              EXPECTED ARRIVAL AT PRAYAGRAJ
            </div>

            <div
              style={{
                fontSize: "52px",
                fontWeight: 900,
                marginTop: "8px",
              }}
            >
              {predictedETA}
            </div>

            <div
              style={{
                marginTop: "5px",
                color: "#888",
                fontSize: "12px",
              }}
            >
              Scheduled arrival: 13:00
            </div>
          </div>

          <div style={{ marginTop: "25px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#777",
              }}
            >
              <span>New Delhi</span>
              <span>Prayagraj</span>
            </div>

            <div
              style={{
                height: "6px",
                background: "#222",
                borderRadius: "999px",
                marginTop: "9px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#ddd",
                  borderRadius: "999px",
                  transition: "width 1s linear",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "11px",
                color: "#777",
              }}
            >
              Current position:{" "}
              {currentPosition.toFixed(1)} km
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginTop: "18px",
          }}
        >
          <InfoCard
            title="AI FORECAST"
            value={`${Math.round(
              aiDelay
            )} min delay`}
            subtitle="Predicted final delay"
          />

          <InfoCard
            title="CURRENT SPEED"
            value={`${Math.round(
              currentSpeed
            )} km/h`}
            subtitle="Live train speed"
          />

          <InfoCard
            title="TRAFFIC"
            value={trafficPressure}
            subtitle="Track traffic pressure"
          />

          <InfoCard
            title="SIGNAL"
            value={signalStatus}
            subtitle="Current signal state"
          />
        </div>

        <Card
          title="Why is my train delayed?"
          subtitle="Track Titans AI explanation"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <Reason
              title="Existing delay"
              value={`+${Math.round(
                currentDelay
              )} min`}
            />

            <Reason
              title="Traffic"
              value={
                trafficPressure === "HIGH"
                  ? "+8 min"
                  : trafficPressure === "MEDIUM"
                  ? "+4 min"
                  : "0 min"
              }
            />

            <Reason
              title="Weather"
              value={
                weather === "FOG"
                  ? "+6 min"
                  : "0 min"
              }
            />

            <Reason
              title="AI prediction"
              value={`+${additionalAiDelay} min`}
            />
          </div>
        </Card>

        <div
          style={{
            marginTop: "18px",
            padding: "22px",
            borderRadius: "16px",
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
              fontSize: "11px",
              color: "#888",
              letterSpacing: "1px",
            }}
          >
            CONNECTION ALERT
          </div>

          <div
            style={{
              fontSize: "21px",
              fontWeight: 900,
              marginTop: "7px",
            }}
          >
            {connectionRisk === "HIGH"
              ? "⚠ Connection likely missed"
              : connectionRisk === "AT RISK"
              ? "⚠ Connection at risk"
              : "✓ Connection looks safe"}
          </div>

          <div
            style={{
              marginTop: "10px",
              color: "#aaa",
              fontSize: "13px",
            }}
          >
            Connecting train:
            <strong
              style={{
                color: "#fff",
                marginLeft: "5px",
              }}
            >
              12802 Purushottam Express
            </strong>
          </div>

          <div
            style={{
              marginTop: "5px",
              color: "#888",
              fontSize: "12px",
            }}
          >
            Departure: 13:35
          </div>

          <div
            style={{
              marginTop: "12px",
              color: "#aaa",
              fontSize: "12px",
            }}
          >
            Transfer buffer:{" "}
            <strong
              style={{
                color:
                  connectionBuffer < 0
                    ? "#ff7777"
                    : "#fff",
              }}
            >
              {connectionBuffer >= 0
                ? `${Math.round(
                    connectionBuffer
                  )} min`
                : `${Math.abs(
                    Math.round(connectionBuffer)
                  )} min late`}
            </strong>
          </div>
        </div>

        <Card
          title="Journey Forecast"
          subtitle="Station-by-station expected arrival"
        >
          <div style={{ marginTop: "18px" }}>
            {stations.map((station, index) => {
              const passed =
                station.position < currentPosition;

              const delay = Math.round(
                aiDelay *
                  ((index + 1) /
                    stations.length)
              );

              const [hour, minute] =
                station.scheduled
                  .split(":")
                  .map(Number);

              const scheduled =
                hour * 60 + minute;

              const eta = passed
                ? "PASSED"
                : formatTime(
                    scheduled + delay
                  );

              return (
                <div
                  key={station.name}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    padding: "14px 4px",
                    borderBottom:
                      "1px solid #1c1c1c",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: passed
                          ? "#555"
                          : "#ddd",
                      }}
                    />

                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "13px",
                        }}
                      >
                        {station.name}
                      </div>

                      <div
                        style={{
                          color: "#666",
                          fontSize: "10px",
                          marginTop: "3px",
                        }}
                      >
                        Scheduled{" "}
                        {station.scheduled}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "13px",
                      color: passed
                        ? "#555"
                        : "#fff",
                    }}
                  >
                    {eta}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <footer
          style={{
            textAlign: "center",
            color: "#555",
            fontSize: "11px",
            padding: "30px 0",
          }}
        >
          Track Titans • AI-powered railway ETA
          forecasting
          <div
            style={{
              marginTop: "6px",
              color: "#444",
            }}
          >
            Last backend update: {lastUpdate}
          </div>
        </footer>
      </section>
    </main>
  );
}

function InfoCard({
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
          fontSize: "24px",
          fontWeight: 900,
          marginTop: "7px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#666",
          fontSize: "11px",
          marginTop: "5px",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: "18px",
        background: "#0d0d0d",
        border: "1px solid #222",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "19px",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "5px 0 0",
          color: "#666",
          fontSize: "12px",
        }}
      >
        {subtitle}
      </p>

      {children}
    </div>
  );
}

function Reason({
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
        background: "#111",
        border: "1px solid #252525",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          color: "#777",
          fontSize: "11px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "6px",
          fontSize: "20px",
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}