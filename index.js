var isInside = require('turf-inside'),
    bboxPolygon = require('turf-bbox-polygon'),
    intersect = require('turf-intersect')

var limits = {
  min_zoom: 1,
  max_zoom: 20,
  max_tiles: 100
}

module.exports.geojson = function(geom) {
  if(geom.type === 'Point') {

  } else if(geom.type === 'LineString') {

  } else if(geom.type === 'Polygon') {
    var active = [
      {x:0,y:0,z:1, locked:false},
      {x:1,y:0,z:1, locked:false},
      {x:1,y:1,z:1, locked:false},
      {x:0,y:1,z:1, locked:false}
    ]

    active.forEach(function(){

    });
    

  }
}

function split(tile){
  return 
}

function tileToGeojson(x, y, z){
  var bbox = [tile2long(x,z), tile2lat(y,z), tile2long(x+1,z), tile2lat(y+1,z)];
  return bboxPolygon(bbox);
}

function tile2long(x,z) {
  return (x/Math.pow(2,z)*360-180);
}
 function tile2lat(y,z) {
  var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}