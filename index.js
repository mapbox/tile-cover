var tilebelt = require('tilebelt'),
    extent = require('geojson-extent'),
    bboxIntersects = require('bbox-intersect'),
    intersect = require('turf-intersect');

module.exports.geojson = function(geom, limits) {
    var locked = [];

    if (geom.type === 'Point') {
        locked.push(tilebelt.pointToTile(geom.coordinates[0], geom.coordinates[1], limits.max_zoom));
    } else if (geom.type === 'MultiPoint') {
        var quadkeys = {};
        for(var i = 0; i < geom.coordinates.length; i++) {
            var tile = tilebelt.pointToTile(geom.coordinates[i][0], geom.coordinates[i][1], limits.max_zoom);
            var quadkey = tilebelt.tileToQuadkey(tile);
            if(!quadkeys[quadkey]) {
                quadkeys[quadkey] = true;
                locked.push(tile);
            }
        }
    } else {
        var seed = tilebelt.bboxToTile(extent(geom));
        if (!seed[3]) seed = [0, 0, 0];
        splitSeek(seed, geom, locked, limits);
        locked = mergeTiles(locked, limits);
    }

    var tileFeatures = locked.map(function(t) {
        return tilebelt.tileToGeoJSON(t);
    });
    return {
        type: 'FeatureCollection',
        features: tileFeatures
    };
};

module.exports.tiles = function(geom, limits) {
    var locked = [];

    if (geom.type === 'Point') {
        locked.push(tilebelt.pointToTile(geom.coordinates[0], geom.coordinates[1], limits.max_zoom));
    } else if(geom.type === 'MultiPoint') {
        var quadkeys = {};
        for(var i = 0; i < geom.coordinates.length; i++) {
            var tile = tilebelt.pointToTile(geom.coordinates[i][0], geom.coordinates[i][1], limits.max_zoom);
            var quadkey = tilebelt.tileToQuadkey(tile);
            if(!quadkeys[quadkey]) {
                quadkeys[quadkey] = true;
                locked.push(tile);
            }
        }
    } else {
        var seed = tilebelt.bboxToTile(extent(geom));
        if (!seed[3]) seed = [0, 0, 0];
        splitSeek(seed, geom, locked, limits);
        locked = mergeTiles(locked, limits);
    }

    return locked;
};

module.exports.indexes = function(geom, limits) {
    var locked = [];

    if (geom.type === 'Point') {
        locked.push(tilebelt.pointToTile(geom.coordinates[0], geom.coordinates[1], limits.max_zoom));
    } else if(geom.type === 'MultiPoint') {
        var quadkeys = {};
        for(var i = 0; i < geom.coordinates.length; i++) {
            var tile = tilebelt.pointToTile(geom.coordinates[i][0], geom.coordinates[i][1], limits.max_zoom);
            var quadkey = tilebelt.tileToQuadkey(tile);
            if(!quadkeys[quadkey]) {
                quadkeys[quadkey] = true;
                locked.push(tile);
            }
        }
    } else {
        var seed = tilebelt.bboxToTile(extent(geom));
        if (!seed[3]) seed = [0, 0, 0];
        splitSeek(seed, geom, locked, limits);
        locked = mergeTiles(locked, limits);
    }

    return locked.map(function(tile) {
        return tilebelt.tileToQuadkey(tile);
    });
};

function mergeTiles(tiles, limits) {
    var merged = [];
    var changed = false;
    tiles.forEach(function(t) {
        // top left and has all siblings -- merge
        if ((t[0] % 2 === 0 && t[1] % 2 === 0) && tilebelt.hasSiblings(t, tiles)) {
            if (t[2] > limits.min_zoom) {
                merged.push(tilebelt.getParent(t));
                changed = true;
            } else {
                merged = merged.concat(tilebelt.getSiblings(t));
            }
        }
        // does not have all siblings -- add
        else if (!tilebelt.hasSiblings(t, tiles)) {
            merged.push(t);
        }
    });
    // stop if the last round had no merges
    if (!changed) {
        return merged;
    } else {
        return mergeTiles(merged, limits);
    }
}

function splitSeek(tile, geom, locked, limits) {
    var tileCovers = true;
    var doIntersect = needsIntersect(tilebelt.tileToGeoJSON(tile), geom);
    var intersects;
    if (doIntersect) {
        intersects = intersect(fc(tilebelt.tileToGeoJSON(tile)), fc(feature(geom)));
    }
    if (!intersects || intersects.features[0].type === 'GeometryCollection') {
        tileCovers = false;
    }

    if (tile[2] === 0 || (tileCovers && tile[2] < limits.max_zoom)) {
        var children = tilebelt.getChildren(tile);
        children.forEach(function(t) {
            splitSeek(t, intersects.features[0], locked, limits);
        });
    } else if (tileCovers) {
        //console.log(tile[2])
        locked.push(tile);
    }
}

function feature(geom) {
    return {
        type: 'Feature',
        geometry: geom,
        properties: {}
    };
}

function fc(feat) {
    return {
        type: 'FeatureCollection',
        features: [feat]
    };
}

function needsIntersect(tile, geom) {
    var bboxGeom = extent(geom);
    var bboxTile = extent(tile);
    return bboxIntersects(bboxGeom, bboxTile);
}