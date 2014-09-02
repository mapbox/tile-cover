var tilebelt = require('tilebelt'),
    extent = require('geojson-extent'),
    bboxIntersects = require('bbox-intersect'),
    intersect = require('turf-intersect');

module.exports.geojson = function(geom, limits) {
    var locked = [];

    if (geom.type != 'Point') {
        var seed = tilebelt.bboxToTile(extent(geom));
        if (!seed[3]) seed = [0, 0, 0];
        splitSeek(seed, geom, locked, limits);
        locked = mergeTiles(locked, limits);
    } else {
        locked.push(tilebelt.pointToTile(geom, limits.max_zoom));
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

    if (geom.type != 'Point') {
        var seed = tilebelt.bboxToTile(extent(geom));
        if (!seed[3]) seed = [0, 0, 0];
        splitSeek(seed, geom, locked, limits);
        locked = mergeTiles(locked, limits);
    } else {
        locked.push(tilebelt.pointToTile(geom, limits.max_zoom));
    }

    return locked;
};

module.exports.indexes = function(geom, limits) {
    var locked = [];

    if (geom.type != 'Point') {
        var seed = tilebelt.bboxToTile(extent(geom));
        if (!seed[3]) seed = [0, 0, 0];
        splitSeek(seed, geom, locked, limits);
        locked = mergeTiles(locked, limits);
    } else {
        locked.push(tilebelt.pointToTile(geom.coordinates[0], geom.coordinates[1], limits.max_zoom));
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
    if (!tileGeomEquals(tile, geom)) {
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
            locked.push(tile);
        }
    } else {
        locked.push(tile);
    }
}

function tileGeomEquals(tile, geom) {
    tile = tilebelt.getParent(tile);
    var tileGeojson = tilebelt.tileToGeoJSON(tile).geometry;
    if (tileGeojson.coordinates[0].length === 5 && geom.coordinates[0].length === 5) {
        var numShared = 0;
        geom.coordinates[0].forEach(function(coord1) {
            tileGeojson.coordinates[0].forEach(function(coord2) {
                if (coord1[0] === coord2[0] && coord1[1] === coord2[1]) {
                    numShared++;
                }
            });
        });
        if (numShared === 7) {
            return true;
        }
    } else {
        return false;
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