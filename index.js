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
exports.geojson = function (geom, limits) {
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
exports.tiles = function (geom, limits) {
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
exports.indexes = function (geom, limits) {
    var locked = getLocked(geom, limits);
    return locked.map(function (tile) {
        return tilebelt.tileToQuadkey(tile);
    });
};

function getLocked(geom, limits) {
    var locked, i, tile, id,
        coords = geom.coordinates,
        tileHash = {};

    if (geom.type === 'Point') {
        locked = [tilebelt.pointToTile(coords[0], coords[1], limits.max_zoom)];

    } else if (geom.type === 'MultiPoint') {
        locked = [];
        for (i = 0; i < coords.length; i++) {
            tile = tilebelt.pointToTile(coords[i][0], coords[i][1], limits.max_zoom);
            id = toID(tile[0], tile[1], tile[2]);
            if (!tileHash[id]) {
                tileHash[id] = true;
                locked.push(tile);
            }
        }
    } else if (geom.type === 'LineString') {
        lineCover(tileHash, coords, limits.max_zoom);

    } else if (geom.type === 'MultiLineString') {
        for (i = 0; i < coords.length; i++) {
            lineCover(tileHash, coords[i], limits.max_zoom);
        }
    } else if (geom.type === 'Polygon') {
        polyRingCover(tileHash, coords, limits.max_zoom);

    } else if (geom.type === 'MultiPolygon') {
        for (i = 0; i < coords.length; i++) {
            polyRingCover(tileHash, coords[i], limits.max_zoom);
        }
    } else {
        throw new Error('Geometry type not implemented');
    }

    if (!locked) {
        if (limits.min_zoom !== limits.max_zoom) {
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

        for (i = 0; i < keys.length; i++) {
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
    var i, j, len;

    while (y <= tiled.maxY) {
        // calculate intersections at each tile top-line
        var intersections = [];
        for (var r = 0; r < tiled.geom.length; r++) {
            var ring = tiled.geom[r];
            for (i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
                var intersection = intersectY(ring[j], ring[i], y, isLocalMin(j, ring) || isLocalMax(j, ring));
                if (intersection !== null) {
                    intersections.push(Math.round(intersection));
                }
            }
        }
        // sort intersections
        intersections.sort(compareNum);
        // add tiles between intersection pairs
        for (i = 0; i < intersections.length - 1; i += 2) {
            var x = intersections[i];
            while (x <= intersections[i + 1]) {
                tileHash[toID(x, y, max_zoom)] = true;
                x++;
            }
        }
        y++;
    }
    // add any missing tiles with a segments pass
    for (i = 0; i < geom.length; i++) {
        lineCover(tileHash, geom[i], max_zoom);
    }
}

function compareNum(a, b) {
    return a - b;
}

exports.getTiledPoly = getTiledPoly;

function getTiledPoly(geom, max_zoom) {
    var minY = Infinity;
    var maxY = -Infinity;
    var tiled = [];
    var last;
    for (var i = 0; i < geom.length; i++) {
        var tiledRing = [];
        last = null;
        for (var k = 0; k < geom[i].length; k++) {
            var next = tilebelt.pointToTile(geom[i][k][0], geom[i][k][1], max_zoom);
            // Degenerate segment
            if (last && last[0] === next[0] && last[1] === next[1]) continue;
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
exports.isLocalMin = isLocalMin;
exports.isLocalMax = isLocalMax;

function isLocalMin(i, ring) {
    var mod = ring.length;
    var prev = ring[i];
    var curr = ring[(i + 1) % mod];
    var next = ring[(i + 2) % mod];

    // Not min in current segment.
    if (curr[1] >= prev[1]) return false;

    var j = (i + 1) % mod;
    while (j !== i && curr[1] === next[1]) {
        next = ring[(j + 2) % mod];
        j = (j + 1) % mod;
    }

    // Min vs next segment.
    return curr[1] < next[1];
}

function isLocalMax(i, ring) {
    var mod = ring.length;
    var prev = ring[i];
    var curr = ring[(i + 1) % mod];
    var next = ring[(i + 2) % mod];

    // Not max in current segment.
    if (curr[1] <= prev[1]) return false;

    var j = (i + 1) % mod;
    while (j !== i && curr[1] === next[1]) {
        next = ring[(j + 2) % mod];
        j = (j + 1) % mod;
    }

    // Min vs next segment.
    return curr[1] > next[1];
}

function intersectY(a, b, y, localMinMax) {
    if ((a[1] === b[1]) ||
        (a[1] > y && b[1] > y) ||
        (a[1] < y && b[1] < y) ||
        (!localMinMax && b[1] === y)) return null;

    return (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) + a[0];
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
    for (var i = 0; i < keys.length; i++) {
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
