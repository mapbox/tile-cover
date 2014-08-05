var isInside = require('turf-inside'),
    bboxPolygon = require('turf-bbox-polygon'),
    intersect = require('turf-intersect')

var limits = {
  min_zoom: 1,
  max_zoom: 8
}

module.exports.geojson = function(geom) {
  if(geom.type === 'Point') {

  } else if(geom.type === 'LineString') {

  } else if(geom.type === 'Polygon') {
    var seed = [0,0,0]

    console.log('splitting...')
    var locked = []
    splitSeek(seed, geom, locked, limits)
    
    return {
      type: 'FeatureCollection',
      features: locked.map(function(t){
        
      })
  }
}

function splitSeek(tile, geom, locked, limits){
  var tileCovers = true;
  //console.log(JSON.stringify(fc(tileToGeojson(tile[0],tile[1],tile[2]))))
  //console.log(JSON.stringify(fc(tileToGeojson(tile[0],tile[1],tile[2]))))
  //console.log(JSON.stringify(fc(feature(geom))))
  console.log('-------')
  console.log(tile)

  var intersects = intersect(fc(tileToGeojson(tile[0],tile[1],tile[2])), fc(feature(geom)));
  if(intersects.features[0].type === 'GeometryCollection'){
    tileCovers = false;
  }

  console.log(tileCovers)

  if(tile[2] === 0 || (tileCovers && tile[2] < limits.max_zoom)){
    console.log('split: ' + tile)
    var children = getChildren(tile);

    children.forEach(function(t){
      splitSeek(t, geom, locked, limits);
    })
  } else if(tileCovers){
    console.log('locking: ' + tile)
    locked.push(tile);
  }
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

function feature(geom){
  return {
    type: 'Feature',
    geometry: geom,
    properties: {}
  }
}

function fc(feat){
  return {
    type: 'FeatureCollection',
    features: [feat]
  }
}

function getChildren(tile){
  return [
    [tile[0]*2, tile[1]*2, tile[2]+1],
    [tile[0]*2+1, tile[1]*2, tile[2]+1],
    [tile[0]*2+1, tile[1]*2+1, tile[2]+1],
    [tile[0]*2, tile[1]*2+1, tile[2]+1],
  ]
}