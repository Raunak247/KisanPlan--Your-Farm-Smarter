/** Leaflet page shown inside the app. Tiles are OpenStreetMap. */
export function fieldMapHtml(latitude: number, longitude: number, hasField: boolean): string {
  const lat = Number.isFinite(latitude) ? latitude : 20.5937;
  const lon = Number.isFinite(longitude) ? longitude : 78.9629;
  const zoom = hasField ? 15 : 5;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: #e7eee4; }
    .leaflet-control-attribution { font-size: 11px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map("map", { zoomControl: true }).setView([${lat}, ${lon}], ${zoom});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    var marker = null;
    function mark(latlng) {
      if (!marker) {
        marker = L.marker(latlng).addTo(map);
      } else {
        marker.setLatLng(latlng);
      }
    }
    ${hasField ? `mark([${lat}, ${lon}]);` : ""}
    function send(latlng) {
      var payload = JSON.stringify({ latitude: latlng.lat, longitude: latlng.lng });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(payload);
      }
    }
    map.on("click", function (event) {
      mark(event.latlng);
      send(event.latlng);
    });
  </script>
</body>
</html>`;
}
