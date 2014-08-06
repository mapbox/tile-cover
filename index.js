/*
tile: x,y,z

quad:
00 | 10
-------
01 | 11
*/ 

var isInside = require('turf-inside'),
    bboxPolygon = require('turf-bbox-polygon'),
    intersect = require('turf-intersect')

var limits = {
  min_zoom: 1,
  max_zoom: 8
};

module.exports.geojson = function(geom) {

  if(geom.type === 'Point') {

  } else if(geom.type === 'LineString') {

  } else if(geom.type === 'Polygon') {
    var seed = [0,0,0];

    var locked = [];
    splitSeek(seed, geom, locked, limits);
    locked = mergeTiles(locked);

    var tileFeatures = locked.map(function(t){
        return tileToGeojson(t)
    });
    return {
      type: 'FeatureCollection',
      features: tileFeatures
    }
  }
}

module.exports.tiles = function(geom) {
  if(geom.type === 'Point') {

  } else if(geom.type === 'LineString') {

  } else if(geom.type === 'Polygon') {
    var seed = [0,0,0];

    var locked = [];
    splitSeek(seed, geom, locked, limits);
    
   // locked = mergeTiles(locked);

    return locked;
  }
}

function mergeTiles(tiles){
  var merged = [];

  tiles.forEach(function(t){
    // top left and has all siblings
    if((t[0]%2===0 && t[1]%2===0) && hasSiblings(t, tiles)) {
      console.log('MERGE')
      merged.push(getParent(t));
    // does not have all siblings
    } else if(!hasSiblings(t, tiles)){
      console.log('NO MERGE')
      //merged.push(t);
    // is not top left but has all siblings
    } else {
      console.log('DROP')
      merged.push(t);
    }
  })
  return merged;
}


function splitSeek(tile, geom, locked, limits){
  var tileCovers = true;
  var intersects = intersect(fc(tileToGeojson(tile)), fc(feature(geom)));
  if(intersects.features[0].type === 'GeometryCollection'){
    tileCovers = false;
  }

  if(tile[2] === 0 || (tileCovers && tile[2] < limits.max_zoom)){
    var children = getChildren(tile);
    children.forEach(function(t){
      splitSeek(t, geom, locked, limits);
    })
  } else if(tileCovers){
    locked.push(tile);
  }
}


function tileToGeojson(tile){
  var bbox = [tile2long(tile[0],tile[2]), tile2lat(tile[1],tile[2]), tile2long(tile[0]+1,tile[2]), tile2lat(tile[1]+1,tile[2])];
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

function getParent(tile){
  // top left
  if(tile[0]%2===0 && tile[1]%2===0){
    return [tile[0]/2, tile[1]/2, tile[2]-1]
  } 
  // bottom left
  else if(tile[0]%2===0){
    return [tile[0]/2, (tile[1]-1)/2, tile[2]-1]
  }
  // top right
  else if(tile[1]%2===0){
    return [(tile[0]-1)/2, (tile[1])/2, tile[2]-1]
  }
  // bottom right
  else {
    return [(tile[0]-1)/2, (tile[1]-1)/2, tile[2]-1]
  }
}

/*
00 | 10
-------
01 | 11
*/ 
function hasSiblings(tile, tiles){
  // top left
  if(
      (tile[0]%2===0 && tile[1]%2===0) && 
      hasTile(tiles, [tile[0]+1, tile[1], tile[2]]) && // has top right
      hasTile(tiles, [tile[0]+1, tile[1]+1, tile[2]]) && // has bottom right
      hasTile(tiles, [tile[0], tile[1]+1, tile[2]]) // has bottom left
    ) {
    return true;
  // bottom left
  } else if(
      (tile[0]%2===0) &&
      hasTile(tiles, [tile[0], tile[1]-1, tile[2]]) && // has top left
      hasTile(tiles, [tile[0]+1, tile[1], tile[2]]) && // has bottom right
      hasTile(tiles, [tile[0]+1, tile[1]-1, tile[2]]) // has top right
    ) {
  // top right
  } else if(
      (tile[1]%2===0) &&
      hasTile(tiles, [tile[0]-1, tile[1], tile[2]]) && // has top left
      hasTile(tiles, [tile[0]-1, tile[1]+1, tile[2]]) && // has bottom left
      hasTile(tiles, [tile[0], tile[1]+1, tile[2]]) // has bottom right
    ){
  // bottom right
  } else if(
      (!tile[0]%2===0) && (!tile[1]%2===0) &&
      hasTile(tiles, [tile[0]-1, tile[1]-1, tile[2]]) && // has top left
      hasTile(tiles, [tile[0]-1, tile[1], tile[2]]) && // has bottom left
      hasTile(tiles, [tile[0], tile[1], tile[2]]) // has top right
    ) {

  }
  else {
    return false;
  }
}

function hasTile(tiles, tile){
  var tileFound = false;
  tiles.forEach(function(t){
    if(tilesEqual(t, tile)){
      tileFound = true;
    }
  })
  return tileFound;
}

function tilesEqual(tile1, tile2) {
  return (
      tile1[0] === tile2[0] &&
      tile1[1] === tile2[1] &&
      tile1[2] === tile2[2]
    );
}