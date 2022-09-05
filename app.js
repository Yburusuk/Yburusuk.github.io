import points_json from './hastaneler.json' assert {type: 'json'};

var platform = new H.service.Platform({
  'apikey': 'PBNDEz_G35KyAjSRYzh5Pc0Mz-w4ntxAJXU8SAamU70'
});

var defaultLayers = platform.createDefaultLayers();
console.log(defaultLayers);

var router = platform.getRoutingService(null, 8);

var map = new H.Map(document.getElementById('mapContainer'),
  defaultLayers.vector.normal.map,
  {
    center: { lng: 29, lat: 41 },
    zoom: 12,
    pixelRatio: window.devicePixelRatio || 1
  });

window.addEventListener('resize', () => map.getViewPort().resize());

var ui = H.ui.UI.createDefault(map, defaultLayers, 'tr-TR');

var mapEvents = new H.mapevents.MapEvents(map);


var behavior = new H.mapevents.Behavior(mapEvents);

var textbox = document.getElementById("searchbar");
var button = document.getElementById("button");
var liveButton = document.getElementById("liveLocation");
var json;

let x = [];
let y = [];

points_json.forEach(function(i){
    x.push(i.json_geometry.coordinates[0]);
    y.push(i.json_geometry.coordinates[1]);
  }
)

var coordinates = [];

x.forEach(function(i){
    let m = x.indexOf(i);
    coordinates.push({lat: y[m], lng: i});
})

var reader = new H.data.geojson.Reader('hastaneler.geojson');

reader.parse();

const layer = reader.getLayer();

map.addLayer(layer,2);

layer.getProvider().addEventListener('tap', function(ev) {
  console.log(ev.target.getData());
  const info = ev.target.getData();

  let content = '<b>' + info.properties.ADI + '</b><br/>';
  content += 'Address: ' + info.properties.ALT_KATEGORI;

let bubble =  new H.ui.InfoBubble(ev.target.getGeometry(), {
content: content,
});
ui.addBubble(bubble);

layer.getProvider().addEventListener('tap', function(){
  ui.removeBubble(bubble);
}

)
});
  
coordinates.forEach(function (value, index) {
  var myIcon = new H.map.Icon('empty.png'),
  marker = new H.map.Marker(value,  {
    icon: myIcon,
    volatility: true
  });
  // add custom data to the marker
  marker.setData(index + 1);

  map.addObject(marker);
});

var objects = map.getObjects();
var len = map.getObjects().length;


function findNearestHospital(coords) {
  var minDist = 2000,
    nearest_hospital = 'None',
    hospDist,
    i;

  for (i = 0; i < len; i += 1) {
    hospDist = objects[i].getGeometry().distance(coords);
    if (hospDist < minDist) {
      minDist = hospDist;
      nearest_hospital = points_json[objects[i-1].getData()].json_geometry.coordinates;
    }
  }

  return nearest_hospital;
}

const marker_icon = new H.map.Icon('icon.png', {size: {w: 40, h: 40}});
const empty_icon = new H.map.Icon('empty.png');

var q_marker = new H.map.Marker({lat: 41, lng: 29}, {icon: empty_icon});
map.addObject(q_marker);

var q_marker;

function addMarker(){
  map.addObject(q_marker);
}

function setCenter(center, zoom){
  map.getViewModel().setLookAtData(
    {
      position: center,
      zoom: zoom
    },
    true
  );
}

function getCoords(given_address){
  var theUrl = "https://geocode.search.hereapi.com/v1/geocode?q=" + given_address + "&apiKey=PBNDEz_G35KyAjSRYzh5Pc0Mz-w4ntxAJXU8SAamU70";
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false);
  xmlHttp.send(null);
  json = JSON.parse(xmlHttp.responseText);
  map.removeObject(q_marker);
  q_marker = new H.map.Marker(json.items[0].position, {icon: marker_icon});
  addMarker();
  setCenter(json.items[0].position, 14);
  return findNearestHospital(q_marker.a);
}



var routingParameters = {
  'routingMode': 'fast',
  'transportMode': 'car',
  'origin': '40.98879683,29.0265372',
  'destination': '40.98535156,29.03823618',
  'return': 'polyline'
};

function onResult(result) {
  if (result.routes.length) {
    result.routes[0].sections.forEach((section) => {
        let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);
        let routeLine = new H.map.Polyline(linestring, {
          style: { strokeColor: 'green', lineWidth: 3 }
        });

        map.addObjects([routeLine]);
    });
  }
};

function getRoute(){
router.calculateRoute(routingParameters, onResult,
  function(error) {
    alert(error.message);
  });
}

textbox.addEventListener("keypress", function(event) {
   if (event.key === "Enter") {
    address = document.getElementById("searchbar").value;
    var hospCoords = getCoords(address);

    routingParameters.origin = (q_marker.a.lat + "," + q_marker.a.lng);
    routingParameters.destination = (hospCoords[1] + "," + hospCoords[0]);

    getRoute();
   }
})
var address;

button.addEventListener("click", function(){
  address = document.getElementById("searchbar").value;
  var hospCoords = getCoords(address);

  routingParameters.origin = (q_marker.a.lat + "," + q_marker.a.lng);
  routingParameters.destination = (hospCoords[1] + "," + hospCoords[0]);

  getRoute();
})

liveButton.addEventListener("click", function(){
  function success(event){
    var livePosition = {lat: event.coords.latitude, lng: event.coords.longitude};

    map.removeObject(q_marker);

    q_marker = new H.map.Marker(livePosition, {icon: marker_icon});
    addMarker();
    setCenter(livePosition, 14);

    var hospCoords = findNearestHospital(q_marker.a);

    routingParameters.origin = (q_marker.a.lat + "," + q_marker.a.lng);
    routingParameters.destination = (hospCoords[1] + "," + hospCoords[0]);

    getRoute();
  }
  function error(){
    console.log("Live location error occured.");
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error, {maximumAge:60000, timeout:2000});
  } else {
    console.log("Canlı konum izni verilmedi.");
  }
})
