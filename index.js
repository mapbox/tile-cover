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
    return {
        type: 'FeatureCollection',
        features: getTiles(geom, limits).map(tileToFeature)
    };
};

function tileToFeature(t) {
    return {
        type: 'Feature',
        geometry: tilebelt.tileToGeoJSON(t),
        properties: {}
    };
}

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
exports.tiles = getTiles;

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
    return getTiles(geom, limits).map(tilebelt.tileToQuadkey);
};

function getTiles(geom, limits) {
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
        polygonCover(tileHash, coords, limits.max_zoom);

    } else if (geom.type === 'MultiPolygon') {
        for (i = 0; i < coords.length; i++) {
            polygonCover(tileHash, coords[i], limits.max_zoom);
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

function polygonCover(tileHash, geom, max_zoom) {
    var intersections = [];

    for (var i = 0; i < geom.length; i++) {
        var ring = [];
        lineCover(tileHash, geom[i], max_zoom, ring);

        for (var j = 0, len = ring.length, k = len - 1; j < len; k = j++) {
            var m = (j + 1) % len;
            var y = ring[j][1];

            // add interesction if it's not local extremum or duplicate
            if ((y > ring[k][1] || y > ring[m][1]) && // not local minimum
                (y < ring[k][1] || y < ring[m][1]) && // not local maximum
                y !== ring[m][1]) intersections.push(ring[j]);
        }
    }

    intersections.sort(compareTopLeft); // sort by y, then x

    for (i = 0; i < intersections.length; i += 2) {
        // fill tiles between pairs of intersections
        for (var x = intersections[i][0] + 1; x < intersections[i + 1][0]; x++) {
            tileHash[toID(x, intersections[i][1], max_zoom)] = true;
        }
    }
}

function compareTopLeft(a, b) {
    return (a[1] - b[1]) || (a[0] - b[0]);
}

function lineCover(tileHash, coords, max_zoom, ring) {
    var prevX, prevY;

    for (var i = 0; i < coords.length - 1; i++) {
        var start = tilebelt.pointToTileFraction(coords[i][0], coords[i][1], max_zoom),
            stop = tilebelt.pointToTileFraction(coords[i + 1][0], coords[i + 1][1], max_zoom),
            x0 = start[0],
            y0 = start[1],
            x1 = stop[0],
            y1 = stop[1],
            dx = x1 - x0,
            dy = y1 - y0;

        if (dy === 0 && dx === 0) continue;

        var sx = dx > 0 ? 1 : -1,
            sy = dy > 0 ? 1 : -1,
            x = Math.floor(x0),
            y = Math.floor(y0),
            tMaxX = dx === 0 ? Infinity : Math.abs(((dx > 0 ? 1 : 0) + x - x0) / dx),
            tMaxY = dy === 0 ? Infinity : Math.abs(((dy > 0 ? 1 : 0) + y - y0) / dy),
            tdx = Math.abs(sx / dx),
            tdy = Math.abs(sy / dy);

        if (x !== prevX || y !== prevY) {
            tileHash[toID(x, y, max_zoom)] = true;
            if (ring && y !== prevY) ring.push([x, y, max_zoom]);
            prevX = x;
            prevY = y;
        }

        while (tMaxX < 1 || tMaxY < 1) {
            if (tMaxX < tMaxY) {
                tMaxX += tdx;
                x += sx;
            } else {
                tMaxY += tdy;
                y += sy;
            }
            tileHash[toID(x, y, max_zoom)] = true;
            if (ring && y !== prevY) ring.push([x, y, max_zoom]);
            prevX = x;
            prevY = y;
        }
    }

    if (ring && ring[ring.length - 1][1] === ring[0][1]) ring.pop();
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
