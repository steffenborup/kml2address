(function(global){

  var self = {};

  self._polygons = [];

  self._successCallback = function(){};

  self._errorCallback = function(){};

  self.find = function(kml, config){

    if (typeof config === 'undefined') {
      config = {};
    }

    if (typeof config.success === 'function') {
      self._successCallback = config.success;
    }

    if (typeof config.error === 'function') {
      self._errorCallback = config.error;
    }

    if (!(typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.geometry === 'object')) {

      self._errorCallback('Google Maps Geometry Library not found. See https://developers.google.com/maps/documentation/javascript/geometry for instruction on how to load it.');

      return;

    }

    if (typeof kml === 'object') {

      var kmlDoc = kml;

    } else {

      var kmlParser = new DOMParser();

      var kmlDoc = kmlParser.parseFromString(kml, 'text/xml');

    }

    var polygonNodes = kmlDoc.getElementsByTagName('Polygon');

    // Find polygons in KML

    for (var i = 0; i < polygonNodes.length; i++) {

      var polygon = {
        name: null,
        addresses: []
      };

      var nameNodes = polygonNodes[i].parentNode.getElementsByTagName('name');

      if (nameNodes.length > 0) {

        polygon.name = nameNodes[0].textContent;

      }

      var coordinatesNodes = polygonNodes[i].getElementsByTagName('coordinates');

      if (coordinatesNodes.length) {

        var coordinates = [];

        var lngs = [];

        var lats = [];

        var _coordinates = coordinatesNodes[0].textContent.split(' ');

        for (var c = 0; c < _coordinates.length; c++) {

          var coordinate = _coordinates[c].split(',');

          var lng = parseFloat(coordinate[0]);

          var lat = parseFloat(coordinate[1]);

          coordinates.push({
            lng: lng,
            lat: lat
          });

          lngs.push(lng);

          lats.push(lat);

        }

        polygon.coordinates = coordinates;

        polygon.boundingBox = self._getLatLngBounds(lats, lngs);

      }

      self._polygons.push(polygon);

    }

    // Find addresses in each polygon

    if (self._polygons.length > 0) {

      self._processPolygons(0);

    } else {

      self._successCallback(self._polygons);

    }

  };

  /*
   * _getLatLngBounds(lats, lngs)
   * Converts two arrays of latitudes and longitudes to one array containing coordinates for the bounds.
   * nw, ne, se, sw, nw
   */

  self._getLatLngBounds = function(lats, lngs){

      if (typeof lats === 'undefined' || typeof lngs === 'undefined') {
          return [];
      }

      lngs.sort(function(a, b) {
        return a - b;
      });

      lats.sort(function(a, b) {
        return a - b;
      });

      var latMax = lats.length - 1;

      var lngMax = lngs.length - 1;

      var bounds = [
        {
          lng: lngs[0],
          lat: lats[latMax]
        },
        {
          lng: lngs[lngMax],
          lat: lats[latMax]
        },
        {
          lng: lngs[lngMax],
          lat: lats[0]
        },
        {
          lng: lngs[0],
          lat: lats[0]
        }
      ];

      bounds.push(bounds[0]);

      return bounds;

  };

  self._processPolygons = function(startIndex){

    var polygon = self._polygons[startIndex];

    var url = 'http://dawa.aws.dk/adresser?polygon=[[[' + polygon.boundingBox[0].lng + ',' + polygon.boundingBox[0].lat + '],[' + polygon.boundingBox[1].lng + ',' + polygon.boundingBox[1].lat + '],[' + polygon.boundingBox[2].lng + ',' + polygon.boundingBox[2].lat + '],[' + polygon.boundingBox[3].lng + ',' + polygon.boundingBox[3].lat + '],[' + polygon.boundingBox[4].lng + ',' + polygon.boundingBox[4].lat + ']]]';

    var xhr = new XMLHttpRequest();

    xhr.addEventListener('load', function(){

      var addresses = JSON.parse(this.responseText);

      var addressesInPolygon = [];

      if (addresses.length > 0) {

        var gmPolygon = new google.maps.Polygon({
          paths: polygon.coordinates
        });

        for (var i = 0; i < addresses.length; i++) {

          var gmPoint = new google.maps.LatLng(
            addresses[i].adgangsadresse.adgangspunkt.koordinater[1],
            addresses[i].adgangsadresse.adgangspunkt.koordinater[0]
          );

          if (google.maps.geometry.poly.containsLocation(gmPoint, gmPolygon)) {

            addressesInPolygon.push(addresses[i]);

          }

        }

      }

      if (addressesInPolygon.length > 0) {

        polygon.addresses = addressesInPolygon;

      }

      startIndex++;

      if (startIndex < self._polygons.length) {

        self._processPolygons(startIndex);

      } else {

        self._successCallback(self._polygons);

      }

    });

    xhr.open('GET', url);

    xhr.send();

  };

  global.kml2address = self;

})(typeof window !== 'undefined' ? window : this);
