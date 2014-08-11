var bboxPolygon = require('turf-bbox-polygon'),
  extent = require('geojson-extent'),
  bboxIntersects = require('bbox-intersect'),
  intersect = require('turf-intersect');

module.exports.geojson = function(geom, limits) {
  var seed = [0,0,0];
  var locked = [];

  splitSeek(seed, geom, locked, limits);
  locked = mergeTiles(locked, limits);

  var tileFeatures = locked.map(function(t) {
      return tileToGeojson(t);
  });
  return {
    type: 'FeatureCollection',
    features: tileFeatures
  };
}

module.exports.tiles = function(geom, limits) {
  var seed = [0,0,0];
  var locked = [];

  splitSeek(seed, geom, locked, limits);
  locked = mergeTiles(locked, limits);

  return locked;
}

module.exports.indexes = function(geom, limits) {
  var seed = [0,0,0];
  var locked = [];

  splitSeek(seed, geom, locked, limits);
  locked = mergeTiles(locked, limits);

  return locked.map(function(tile){
    return getIndex(tile);
  });
}

function mergeTiles(tiles, limits){
  var merged = [];
  var changed = false;
  tiles.forEach(function(t){
    // top left and has all siblings -- merge
    if((t[0]%2===0 && t[1]%2===0) && hasSiblings(t, tiles)) {
      if(t[2] > limits.min_zoom){
        merged.push(getParent(t));
        changed = true;
      }
      else{
        merged = merged.concat(getSiblings(t));
      }
    }
    // does not have all siblings -- add
    else if(!hasSiblings(t, tiles)){
      merged.push(t);
    }
  });
  // stop if the last round had no merges
  if(!changed) {
    return merged;
  }
  else{
    return mergeTiles(merged, limits);
  }
}

function splitSeek(tile, geom, locked, limits){
  var tileCovers = true;

  if(needsIntersect(tileToGeojson(tile), geom)){
    var intersects = intersect(fc(tileToGeojson(tile)), fc(feature(geom)));
  }
  if(!intersects || intersects.features[0].type === 'GeometryCollection'){
    tileCovers = false;
  }

  if(tile[2] === 0 || (tileCovers && tile[2] < limits.max_zoom)){
    var children = getChildren(tile);
    children.forEach(function(t){
      splitSeek(t, intersects.features[0], locked, limits);
    });
  } else if(tileCovers){
    locked.push(tile);
  }
}

function tileToGeojson(tile){
  var bbox = [tile2long(tile[0],tile[2]), tile2lat(tile[1],tile[2]), tile2long(tile[0]+1,tile[2]), tile2lat(tile[1]+1,tile[2])];
  var poly = bboxPolygon(bbox);
  poly.properties.tile =  tile[0]+'/'+tile[1]+'/'+tile[2];
  poly.properties.id = getIndex(tile);
  return poly;
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
  };
}

function fc(feat){
  return {
    type: 'FeatureCollection',
    features: [feat]
  };
}

function getChildren(tile){
  return [
    [tile[0]*2, tile[1]*2, tile[2]+1],
    [tile[0]*2+1, tile[1]*2, tile[2]+1],
    [tile[0]*2+1, tile[1]*2+1, tile[2]+1],
    [tile[0]*2, tile[1]*2+1, tile[2]+1],
  ];
}

function getParent(tile){
  // top left
  if(tile[0]%2===0 && tile[1]%2===0){
    return [tile[0]/2, tile[1]/2, tile[2]-1];
  }
  // bottom left
  else if((tile[0]%2===0) && (!tile[1]%2===0)){
    return [tile[0]/2, (tile[1]-1)/2, tile[2]-1];
  }
  // top right
  else if((!tile[0]%2===0) && (tile[1]%2===0)){
    return [(tile[0]-1)/2, (tile[1])/2, tile[2]-1];
  }
  // bottom right
  else {
    return [(tile[0]-1)/2, (tile[1]-1)/2, tile[2]-1];
  }
}

function getSiblings(tile){
  return getChildren(getParent(tile));
}

function hasSiblings(tile, tiles){
  var hasAll = true;
  var siblings = getSiblings(tile);
  siblings.forEach(function(sibling){
    if(!hasTile(tiles, sibling)){
      hasAll = false;
    }
  });
  return hasAll;
}

function hasTile(tiles, tile){
  var tileFound = false;
  tiles.forEach(function(t){
    if(tilesEqual(t, tile)){
      tileFound = true;
    }
  });
  return tileFound;
}

function tilesEqual(tile1, tile2) {
  return (
      tile1[0] === tile2[0] &&
      tile1[1] === tile2[1] &&
      tile1[2] === tile2[2]
    );
}

function getIndex(tile){
  var index = '';
  for (var zoom = tile[2]; zoom > 0; zoom--) {
      var b = 0;
      var mask = 1 << (zoom - 1);
      if ((tile[0] & mask) !== 0) b++;
      if ((tile[1] & mask) !== 0) b += 2;
      index += b.toString();
  }
  return index;
}

function needsIntersect(tile, geom){
  var bboxGeom = extent(geom);
  var bboxTile = extent(tile);
  return bboxIntersects(bboxGeom, bboxTile);
}
