var tilebelt = require('tilebelt');

/**
 * Given a geometry, create cells and return them in a format easily readable
 * by any software that reads GeoJSON.
 *
 * @alias geojson
 * @param {Object} geom GeoJSON geometry
 * @param {Object} limits an object with min_zoom and max_zoom properties
 * specifying the minimum and maximum level to be tiled.
 * @returns {Object} FeatureCollection of cells formatted as GeoJSON Features
 */
module.exports.geojson = function (geom, limits) {
    var locked = getLocked(geom, limits);
    var tileFeatures = locked.map(function (t) {
        return {
            type: 'Feature',
            geometry: tilebelt.tileToGeoJSON(t),
            properties: {}
        };
    });
    return {
        type: 'FeatureCollection',
        features: tileFeatures
    };
};

/**
 * Given a geometry, create cells and return them in their raw form,
 * as an array of cell identifiers.
 *
 * @alias tiles
 * @param {Object} geom GeoJSON geometry
 * @param {Object} limits an object with min_zoom and max_zoom properties
 * specifying the minimum and maximum level to be tiled.
 * @returns {Array<Array<number>>} An array of tiles given as [x, y, z] arrays
 */
module.exports.tiles = function (geom, limits) {
    var locked = getLocked(geom, limits);
    return locked;
};


/**
 * Given a geometry, create cells and return them as
 * [quadkey](http://msdn.microsoft.com/en-us/library/bb259689.aspx) indexes.
 *
 * @alias indexes
 * @param {Object} geom GeoJSON geometry
 * @param {Object} limits an object with min_zoom and max_zoom properties
 * specifying the minimum and maximum level to be tiled.
 * @returns {Array<String>} An array of tiles given as quadkeys.
 */
module.exports.indexes = function (geom, limits) {
    var locked = getLocked(geom, limits);
    return locked.map(function (tile) {
        return tilebelt.tileToQuadkey(tile);
    });
};

function getLocked (geom, limits) {
    var locked,
        i,
        tileHash = {};

    if (geom.type === 'Point') {
        locked = [tilebelt.pointToTile(geom.coordinates[0], geom.coordinates[1], limits.max_zoom)];
    } else if (geom.type === 'MultiPoint') {
        var quadkeys = {};
        locked = [];
        for(i = 0; i < geom.coordinates.length; i++) {
            var tile = tilebelt.pointToTile(geom.coordinates[i][0], geom.coordinates[i][1], limits.max_zoom);
            var quadkey = tilebelt.tileToQuadkey(tile);
            if(!quadkeys[quadkey]) {
                quadkeys[quadkey] = true;
                locked.push(tile);
            }
        }
    } else if (geom.type === 'LineString') {
        lineCover(tileHash, geom.coordinates, limits.max_zoom);

    } else if (geom.type === 'MultiLineString') {
        for(i = 0; i < geom.coordinates.length; i++) {
            lineCover(tileHash, geom.coordinates[i], limits.max_zoom);
        }
    } else if (geom.type === 'Polygon') {
        polyRingCover(tileHash, geom.coordinates, limits.max_zoom);

    } else if (geom.type === 'MultiPolygon') {
        for(i = 0; i < geom.coordinates.length; i++) {
            polyRingCover(tileHash, geom.coordinates[i], limits.max_zoom);
        }
    } else {
        throw new Error('Geometry type not implemented');
    }

    if (!locked) {
        if (limits.min_zoom !== limits.max_zoom){
            tileHash = mergeTiles(tileHash, limits);
        }
        locked = hashToArray(tileHash);
    }

    return locked;
}

function mergeTiles(tileHash, limits) {
    var mergedTileHash = {};

    for (var z = limits.max_zoom; z > limits.min_zoom; z--) {

        var keys = Object.keys(tileHash);
        var parentTileHash = {};

        for (var i = 0; i < keys.length; i++) {
            var id1 = +keys[i],
                t = fromID(id1);

            if (t[0] % 2 === 0 && t[1] % 2 === 0) {
                var id2 = toID(t[0] + 1, t[1], z),
                    id3 = toID(t[0], t[1] + 1, z),
                    id4 = toID(t[0] + 1, t[1] + 1, z);

                if (tileHash[id2] && tileHash[id3] && tileHash[id4]) {
                    tileHash[id1] = false;
                    tileHash[id2] = false;
                    tileHash[id3] = false;
                    tileHash[id4] = false;

                    var parentId = toID(t[0] / 2, t[1] / 2, z - 1);
                    (z - 1 === limits.min_zoom ? mergedTileHash : parentTileHash)[parentId] = true;
                }
            }
        }

        for (var i = 0; i < keys.length; i++) {
            if (tileHash[keys[i]]) {
                mergedTileHash[+keys[i]] = true;
            }
        }

        tileHash = parentTileHash;
    }

    return mergedTileHash;
}

function polyRingCover(tileHash, geom, max_zoom) {
    var tiled = getTiledPoly(geom, max_zoom);
    var y = tiled.minY;
    while (y <= tiled.maxY) {
        // calculate intersections at each tile top-line
        var intersections = [];
        for(var r = 0; r < tiled.geom.length; r++) {
            var ring = tiled.geom[r];
            for(var i = 0; i < ring.length; i++) {
                var curr = ring[i];
                var next = ring[i+1] || ring[0];
                var localMin = isLocalMin(i, ring);
                var localMax = isLocalMax(i, ring);
                var intersection = lineIntersects(
                    0, y,
                    1, y,
                    curr[0], curr[1],
                    next[0], next[1],
                    localMin || localMax);
                if (intersection) {
                    intersections.push([Math.round(intersection[0]), Math.round(intersection[1]), r, i, 'nonhoriz', localMin, localMax]);
                }
            }
        }
        // sort intersections by x
        intersections.sort(compareX);
        // add tiles between intersection pairs
        for(var i = 0; i < intersections.length - 1; i++) {
            if(i % 2 === 0){
                var enter = intersections[i][0];
                var exit = intersections[i+1][0];
                var x = enter;
                while (x <= exit) {
                    tileHash[toID(x, y, max_zoom)] = true;
                    x++;
                }
            }
        }
        y++;
    }
    // add any missing tiles with a segments pass
    for(var i = 0; i < geom.length; i++) {
        lineCover(tileHash, geom[i], max_zoom);
    }
}

function compareX(a, b) {
    return a[0] - b[0];
}

module.exports.getTiledPoly = getTiledPoly;
function getTiledPoly(geom, max_zoom, latlon) {
    var minY = Infinity;
    var maxY = -Infinity;
    var tiled = [];
    var ring;
    var last;
    for(var i = 0; i < geom.length; i++) {
        tiledRing = [];
        last = [];
        for(var k = 0; k < geom[i].length; k++) {
            var next = tilebelt.pointToTile(geom[i][k][0], geom[i][k][1], max_zoom);
            if (latlon) {
                var bbox = tilebelt.tileToBBOX(next, max_zoom);
                next = [
                    bbox[0] + (bbox[2]-bbox[0])*0.5,
                    bbox[1] + (bbox[3]-bbox[1])*0.5,
                ];
            }
            // Degenerate segment
            if (last[0] === next[0] && last[1] === next[1]) continue;
            minY = Math.min(minY, next[1]);
            maxY = Math.max(maxY, next[1]);
            tiledRing.push(next);
            last = next;
        }
        // Skip degenerate rings
        if (tiledRing.length >= 4) tiled.push(tiledRing);
    }
    return {
        minY: minY,
        maxY: maxY,
        geom: tiled
    };
}

/*
// Convert a set of rings into segments connecting tile coordinates.
// Drops degenerate segments and merges sequential horizontal segments.
module.exports.getTileSegments = getTileSegments;
function getTileSegments(ring, max_zoom) {
    // construct segments
    var segments = [];
    var last = null;
    var start;
    var end;
    ring = getTiledRing(ring, max_zoom);

    for(var i = 0; i < ring.length; i++) {
        for(var k = 0; k < ring[i].length - 1; k++) {
            start = ring[i][k];
            end = ring[i][k+1];

            // Degenerate segment (start === end). Skip.
            if (start[0] === end[0] && start[1] === end[1]) {
                continue;
            // Horizontal segment that continues previous horizontal segment. Merge.
            } else if (last &&
                // last seg is horizontal
                last[0][1] === last[1][1] &&
                // current seg continues horizontal
                last[0][1] === start[1] && last[1][1] === end[1] &&
                // merging does not lead to a degenerate horizontal
                last[0][0] !== end[0]
            ) {
                last[1] = end;
            // Vertical segment that continues previous vertical segment. Merge.
            } else if (last &&
                // last seg is vertical
                last[0][0] === last[1][0] &&
                // current seg continues vertical
                last[0][0] === start[0] && last[1][0] === end[0] &&
                // merging does not lead to a degenerate vertical
                last[0][1] !== end[1]
            ) {
                last[1] = end;
            // Add in new segment.
            } else {
                last = [ start, end ];
                segments.push(last);
            }
        }
        last = null;
    }
    return segments;
}
*/

// Determines if the end y value of segment @ i is a local minima.
// If the segment is horizontal will continue iterating through next
// segments until it can be determined if the entire horizontal segment
// is a local minima.
//
// o prev                           o prev                o
//  \                                \                   /
//   \   o next                       x--------o--------/
//    \ /                             ^        ^------------next
//     x <-------- local minima       +-----local minima
//
module.exports.isLocalMin = isLocalMin;
module.exports.isLocalMax = isLocalMax;

function isLocalMin(i, ring) {
    var mod = ring.length;
    var prev = ring[i];
    var curr = ring[(i+1) % mod];
    var next = ring[(i+2) % mod];

    // Not min in current segment.
    if (curr[1] >= prev[1]) return false;

    var j = (i+1) % mod;
    while (j !== i && curr[1] === next[1]) {
        next = ring[(j+2) % mod];
        j = (j+1) % mod;
    }

    // Min vs next segment.
    return curr[1] < next[1];
}

function isLocalMax(i, ring) {
    var mod = ring.length;
    var prev = ring[i];
    var curr = ring[(i+1) % mod];
    var next = ring[(i+2) % mod];

    // Not max in current segment.
    if (curr[1] <= prev[1]) return false;

    var j = (i+1) % mod;
    while (j !== i && curr[1] === next[1]) {
        next = ring[(j+2) % mod];
        j = (j+1) % mod;
    }

    // Min vs next segment.
    return curr[1] > next[1];
}

// modified from http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
// line1 is an infinite line, and line2 is a finite segment
function lineIntersects(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY, localMinMax) {
    var denominator,
        a,
        b,
        numerator1,
        numerator2,
        onLine1= false,
        onLine2= false,
        res = [null, null];

    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator === 0) {
        if(res[0] !== null && res[1] !== null) {
            return res;
        } else {
            return false;
        }
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    res[0] = line1StartX + (a * (line1EndX - line1StartX));
    res[1] = line1StartY + (a * (line1EndY - line1StartY));

    // if line2 is a segment and line1 is infinite, they intersect if:
    if ((b > 0 && b < 1) ||
        (res[0] === line2StartX && res[1] === line2StartY) ||
        (localMinMax && res[0] === line2EndX && res[1] === line2EndY)) {
        return res;
    } else {
        return false;
    }
}

function lineCover(tileHash, coords, max_zoom) {
    for (var i = 0; i < coords.length - 1; i++) {
        var start = tilebelt.pointToTileFraction(coords[i][0], coords[i][1], max_zoom),
            stop = tilebelt.pointToTileFraction(coords[i + 1][0], coords[i + 1][1], max_zoom),
            x0 = start[0],
            y0 = start[1],
            x1 = stop[0],
            y1 = stop[1],
            dx = x1 - x0,
            dy = y1 - y0,
            sx = dx > 0 ? 1 : -1,
            sy = dy > 0 ? 1 : -1,
            x = Math.floor(x0),
            y = Math.floor(y0),
            tMaxX = Math.abs(((dx > 0 ? 1 : 0) + x - x0) / dx),
            tMaxY = Math.abs(((dy > 0 ? 1 : 0) + y - y0) / dy),
            tdx = Math.abs(sx / dx),
            tdy = Math.abs(sy / dy);

        tileHash[toID(x, y, max_zoom)] = true;

        // handle edge cases
        if (dy === 0 && dx === 0) continue;
        if (isNaN(tMaxX)) tMaxX = Infinity;
        if (isNaN(tMaxY)) tMaxY = Infinity;

        while (tMaxX < 1 || tMaxY < 1) {
            if (tMaxX < tMaxY) {
                tMaxX += tdx;
                x += sx;
            } else {
                tMaxY += tdy;
                y += sy;
            }
            tileHash[toID(x, y, max_zoom)] = true;
        }
    }
}

function hashToArray(hash) {
    var keys = Object.keys(hash);
    var tiles = [];
    for(var i = 0; i < keys.length; i++) {
        tiles.push(fromID(+keys[i]));
    }
    return tiles;
}

function toID(x, y, z) {
    var dim = 2 * (1 << z);
    return ((dim * y + x) * 32) + z;
}

function fromID(id) {
    var z = id % 32,
        dim = 2 * (1 << z),
        xy = ((id - z) / 32),
        x = xy % dim,
        y = ((xy - x) / dim) % dim;
    return [x, y, z];
}
