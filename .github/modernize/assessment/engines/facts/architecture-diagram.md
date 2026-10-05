# Architecture Diagram

KisanPlan is an Expo / React Native farm assistant with a local Python inference service. The workflow combines live weather and soil context, ESP32 telemetry, on-device/mobile interactions, and server-side PyTorch predictions.

## Application Architecture

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->
~~~mermaid
flowchart TD
    subgraph Client["Mobile and Web Client"]
        Expo["Expo 57 React Native"]
        Services["Typed Service Clients"]
        Cache[("AsyncStorage Cache")]
        Map["WebView Field Map"]
    end
    subgraph LocalApi["Local Python API"]
        Bridge["sensor_bridge.py Port 5001"]
        Disease["EfficientNet B0 and YOLO"]
        Fertilizer["Fertilizer MLP"]
        Sensor["ESP32 Sensor Bridge"]
    end
    subgraph External["External Data Services"]
        Weather["Open Meteo"]
        Soil["ISRIC SoilGrids"]
        Geo["BigDataCloud Geocoding"]
        OSM["OpenStreetMap"]
        Groq["Optional Groq Advisor"]
    end

    Expo -->|"renders screens"| Services
    Services -->|"persists local state"| Cache
    Expo -->|"loads map"| Map
    Services -->|"REST JSON"| Bridge
    Bridge -->|"crop image"| Disease
    Bridge -->|"soil and crop features"| Fertilizer
    Bridge -->|"serial telemetry"| Sensor
    Services -->|"forecast requests"| Weather
    Services -->|"soil requests"| Soil
    Services -->|"location lookup"| Geo
    Map -->|"map tiles"| OSM
    Services -->|"weekly summary"| Groq
~~~

### Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---:|---|
| Client | Expo | 57 | Cross-platform app runtime and tooling |
| Client | React Native | 0.86 | Mobile UI primitives |
| Client | TypeScript | 6.0 | Typed application code |
| Client | React Native WebView | 13.16 | Embedded OpenStreetMap field map |
| Client | AsyncStorage | 2.2 | Offline cache and farm profile persistence |
| API | Python HTTP server | 3.9+ | Local REST endpoints on port 5001 |
| ML | PyTorch / torchvision | 2.x | Crop disease and fertilizer inference |
| ML | EfficientNet-B0 | Project weights | Primary crop disease classifier |
| ML | FertilizerMLP | Project weights | Seven-class fertilizer recommender |
| Hardware | ESP32 | PlatformIO | Soil-moisture telemetry and pump status |
| Data | Open-Meteo | HTTP API | Forecast and geocoding |
| Data | ISRIC SoilGrids | HTTP API | Soil texture and drainage |
| Data | OpenStreetMap | HTTP/WebView | Field map visualization |
| AI | Groq | Optional HTTP API | Weekly advisor summary |

### Data Storage & External Services

The app uses AsyncStorage for local farm settings and cached data rather than a remote database. The Python bridge reads optional ESP32 serial telemetry and exposes prediction and sensor endpoints. Weather, soil, reverse-geocoding, map, and optional advisor data are obtained through HTTP APIs from the typed client service modules.

### Key Architectural Decisions

- Uses a cross-platform Expo client so the same workflow runs on Android, iOS, and web.
- Keeps model inference and serial hardware access in a local Python service, isolating heavyweight ML dependencies from the mobile bundle.
- Uses graceful fallbacks for unavailable ESP32 hardware and secondary crop-disease model weights.

## Component Relationships

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->
~~~mermaid
flowchart LR
    subgraph Presentation["Presentation"]
        cApp["App Root"]
        cDashboard["Dashboard Screen"]
        cPlanner["Planner Screen"]
        cScan["Scan Crop Screen"]
        cField["Field Map Screen"]
    end
    subgraph Business["Business Logic"]
        cFarm["Farm Context"]
        cPlan["Plan Context"]
        cLanguage["Language Context"]
        cIrrigation["Irrigation Logic"]
    end
    subgraph DataAccess["Data Access"]
        cWeather["Weather Service"]
        cSoil["Soil Service"]
        cSensor["Sensor Service"]
        cPredict["Prediction Services"]
        cStorage["Storage Utilities"]
    end
    subgraph Infrastructure["Infrastructure"]
        cBridge["Python API Bridge"]
        cModels["PyTorch Models"]
        cEsp["ESP32 Serial Device"]
        cApis["External HTTP APIs"]
    end

    cApp -->|"composes"| cDashboard
    cApp -->|"composes"| cPlanner
    cApp -->|"composes"| cScan
    cApp -->|"composes"| cField
    cDashboard -->|"reads"| cFarm
    cDashboard -->|"reads"| cPlan
    cPlanner -->|"uses"| cIrrigation
    cScan -->|"calls"| cPredict
    cField -->|"loads"| cWeather
    cFarm -->|"persists"| cStorage
    cPlan -->|"reads"| cWeather
    cPlan -->|"reads"| cSensor
    cIrrigation -->|"combines"| cWeather
    cIrrigation -->|"combines"| cSensor
    cWeather -->|"requests"| cApis
    cSoil -->|"requests"| cApis
    cSensor -->|"REST calls"| cBridge
    cPredict -->|"REST calls"| cBridge
    cBridge -->|"runs"| cModels
    cBridge -->|"reads"| cEsp
    cLanguage -.->|"cross cutting"| cApp
~~~

### Component Inventory

| Component | Layer | Type | Responsibility |
|---|---|---|---|
| App Root | Presentation | Application shell | Composes screens and providers |
| Dashboard Screen | Presentation | Screen | Displays farm status, weather, soil, and motor cards |
| Planner Screen | Presentation | Screen | Presents seven-day irrigation and spraying decisions |
| Scan Crop Screen | Presentation | Screen | Captures crop images and displays disease results |
| Field Map Screen | Presentation | Screen | Shows field selection through a WebView map |
| Farm Context | Business Logic | React context | Shares farm profile and location |
| Plan Context | Business Logic | React context | Shares planner state and recommendations |
| Language Context | Business Logic | React context | Selects regional language from farm location |
| Irrigation Logic | Business Logic | Domain module | Combines weather and moisture thresholds |
| Weather Service | Data Access | API client | Fetches forecast and geocoding data |
| Soil Service | Data Access | API client | Fetches and normalizes SoilGrids data |
| Sensor Service | Data Access | API client | Reads sensor and motor state |
| Prediction Services | Data Access | API clients | Calls disease and fertilizer endpoints |
| Storage Utilities | Data Access | Persistence helper | Reads and writes AsyncStorage |
| Python API Bridge | Infrastructure | HTTP server | Routes sensor, disease, and fertilizer requests |
| PyTorch Models | Infrastructure | ML runtime | Runs EfficientNet, YOLO, and FertilizerMLP |
| ESP32 Serial Device | Infrastructure | Hardware | Produces soil-moisture telemetry |
| External HTTP APIs | Infrastructure | Integrations | Provides weather, soil, geocoding, maps, and optional AI |
