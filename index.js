var tilebelt = require('tilebelt');

module.exports.geojson = function (geom, limits) {
    var locked = getLocked(geom, limits);
    var tileFeatures = locked.map(function (t) {
        return tilebelt.tileToGeoJSON(t);
    });
    return {
        type: 'FeatureCollection',
        features: tileFeatures
    };
};

module.exports.tiles = function (geom, limits) {
    var locked = getLocked(geom, limits);
    return locked;
};

module.exports.indexes = function (geom, limits) {
    var locked = getLocked(geom, limits);
    return locked.map(function (tile) {
        return tilebelt.tileToQuadkey(tile);
    });
};

function getLocked (geom, limits) {
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
    } else if (geom.type === 'LineString') {
        locked = hashToArray(lineCover(geom.coordinates, limits.max_zoom));
    } else if (geom.type === 'MultiLineString') {
        var tileHash = {};
        for(var i = 0; i < geom.coordinates.length; i++) {
            tileHash = hashMerge(tileHash, lineCover(geom.coordinates[i], limits.max_zoom));
        }
        locked = hashToArray(tileHash);
    } else if (geom.type === 'Polygon') {
        var tileHash = polyRingCover(geom.coordinates, limits.max_zoom);
        locked = hashToArray(tileHash);
    } else if (geom.type === 'MultiPolygon') {
        var tileHash = {};
        for(var i = 0; i < geom.coordinates.length; i++) {
            tileHash = hashMerge(tileHash, polyRingCover(geom.coordinates[i], limits.max_zoom));
        }
        locked = hashToArray(tileHash);
    } else {
        throw new Error('Geoemtry type not implemented');
    }
    if(limits.min_zoom !== limits.max_zoom){
        locked = mergeTiles(locked, limits);
    }
    return locked;
}

function mergeTiles (tiles, limits) {
    var merged = [];
    var changed = false;
    tiles.forEach(function (t) {
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

function polyRingCover(ring, max_zoom) {
    var segments = getTileSegments(ring, max_zoom);
    var tileHash = {};
    var min = [null,Infinity];
    var max = [null,-Infinity];
    for(var i = 0; i < ring[0].length; i++) {
        if(ring[0][i][1] < min[1]) {
            min = ring[0][i];
        } else if (ring[0][i][1] > max[1]) {
            max = ring[0][i];
        }
    }
    var minTile = tilebelt.pointToTile(min[0], min[1], max_zoom);
    var maxTile = tilebelt.pointToTile(max[0], max[1], max_zoom);
    var y = maxTile[1];
    while(y <= minTile[1]) {
        // calculate intersections at each tile top-line
        var intersections = [];
        for(var i = 0; i < segments.length; i++) {
            var localMin = isLocalMin(i, segments);
            var localMax = isLocalMax(i, segments);
            var intersection = lineIntersects(
                0, y,
                1, y,
                segments[i][0][0], segments[i][0][1],
                segments[i][1][0], segments[i][1][1],
                localMin || localMax);
            // Special treatment for horizontal segments.
            // @TODO get lineIntersects to handle this.
            if (segments[i][0][1] === y && segments[i][0][1] === segments[i][1][1]) {
                intersections.push([segments[i][0][0], segments[i][0][1]]);
                if (!localMin && !localMax) intersections.push([segments[i][1][0], segments[i][1][1]]);
            } else if (intersection !== false) {
                intersections.push([Math.round(intersection[0]), Math.round(intersection[1])]);
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
    for(var i = 0; i < ring.length; i++) {
        tileHash = hashMerge(tileHash, lineCover(ring[i], max_zoom));
    }

    return tileHash;
}

function compareX(a, b) {
    return a[0] - b[0];
}

// Convert a set of rings into segments connecting tile coordinates.
// Drops degenerate segments and merges sequential horizontal segments.
module.exports.getTileSegments = getTileSegments;
function getTileSegments(ring, max_zoom) {
    // construct segments
    var segments = [];
    var last = null;
    var start;
    var end;
    for(var i = 0; i < ring.length; i++) {
        for(var k = 0; k < ring[i].length - 1; k++) {
            start = tilebelt.pointToTile(ring[i][k][0], ring[i][k][1], max_zoom);
            end = tilebelt.pointToTile(ring[i][k+1][0], ring[i][k+1][1], max_zoom);
            // Degenerate segment (start === end). Skip.
            if (start[0] === end[0] && start[1] === end[1]) {
                continue;
            // Horizontal segment that continues previous horizontal segment. Merge.
            } else if (last && last[0][1] === last[1][1] && last[0][1] === start[1] && last[1][1] === end[1]) {
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

// Determines if the end y value of segment @ i is a local minima.
// If the segment is horizontal will continue iterating through next
// segments until it can be determined if the entire horizontal segment
// is a local minima.
//
// o current                        o current             o
//  \                                \                   /
//   \   o next                       x-----------------/
//    \ /                             ^
//     x <-------- local minima       +-----local minima
//
module.exports.isLocalMin = isLocalMin;
module.exports.isLocalMax = isLocalMax;
function isLocalMin(i, segments) {
    var seek = 1;
    var current = segments[i];
    var next = segments[i+seek];

    // Not min in current segment.
    if (current[1][1] >= current[0][1]) return false;

    while (next && current[1][1] === next[1][1]) {
        seek++;
        next = segments[i+seek];
    }

    // No next segment.
    if (!next) return false;

    // Not min vs next segment.
    if (current[1][1] > next[1][1]) return false;

    return current[1][1] < next[1][1];
}

function isLocalMax(i, segments) {
    var seek = 1;
    var current = segments[i];
    var next = segments[i+seek];

    // Not min in current segment.
    if (current[1][1] <= current[0][1]) return false;

    while (next && current[1][1] === next[1][1]) {
        seek++;
        next = segments[i+seek];
    }

    // No next segment.
    if (!next) return false;

    // Not max vs next segment.
    if (current[1][1] < next[1][1]) return false;

    return current[1][1] > next[1][1];
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

function lineCover(coordinates, max_zoom) {
    var tileHash = {};
    // break into segments and calculate bbox
    var segments = [];
    for(var i = 0; i < coordinates.length - 1; i++) {
        var iNext = i+1;
        // add endpoint tiles in case line is contained withing a single tile
        tileHash[toID.apply(null, tilebelt.pointToTile(coordinates[i][0], coordinates[i][1], max_zoom))] = true;
        tileHash[toID.apply(null, tilebelt.pointToTile(coordinates[iNext][0], coordinates[iNext][1], max_zoom))] = true;
        // encode segments as tile fractions
        var start = pointToTileFraction(coordinates[i][0], coordinates[i][1], max_zoom);
        var stop = pointToTileFraction(coordinates[iNext][0], coordinates[iNext][1], max_zoom);
        segments.push([[start[0], start[1]], [stop[0], stop[1]]]);
    }
    for (var i = 0; i < segments.length; i++) {
        var x0 = segments[i][0][0];
            y0 = segments[i][0][1];
            x1 = segments[i][1][0];
            y1 = segments[i][1][1];
        // verify x0,y0 is far left
        if(x0 > x1) {
            var firstX = x0;
            var firstY = y0;
            x0 = x1;
            y0 = y1;
            x1 = firstX;
            y1 = firstY;
        }
        var x0Floor = Math.floor(x0);
        var y0Floor = Math.floor(y0);
        var x1Floor = Math.floor(x1);
        var y1Floor = Math.floor(y1);
        /*
        vertical intersects:

        |  |  |  |
        |  |  |  |
        |  |  |  |

        */
        var x = 0;
        while(x0+x <= x1Floor+1) {
            var intersection = lineIntersects(Math.floor(x0+x), y0-10000, Math.floor(x0+x), y0+10000,
                                              x0, y0, x1, y1);

            // add tile to the left and right of the intersection
            //todo: check intersect and the two tiles being hashed
            if(intersection){
                tileHash[toID(Math.floor(intersection[0]-1), Math.floor(intersection[1]), max_zoom)] = true;
                tileHash[toID(Math.floor(intersection[0]), Math.floor(intersection[1]), max_zoom)] = true;
            }
            x++;
        }

        /*
        horizontal intersects

        ________
        ________
        ________

        */
        // verify x0,y0 is top
        if(y0 < y1) {
            var firstX = x0;
            var firstY = y0;
            x0 = x1;
            y0 = y1;
            x1 = firstX;
            y1 = firstY;
        }
        var x0Floor = Math.floor(x0);
        var y0Floor = Math.floor(y0);
        var x1Floor = Math.floor(x1);
        var y1Floor = Math.floor(y1);
        var y = 0;
        while(y0+y >= y1Floor) {
            var intersection = lineIntersects(x0-1000, Math.floor(y0+y), x0+1000, Math.floor(y0+y),
                                              x0, y0, x1, y1);

            // add tile above and below the intersection
            if(intersection){
                tileHash[toID(Math.floor(intersection[0]), Math.floor(intersection[1]), max_zoom)] = true;
                tileHash[toID(Math.floor(intersection[0]), Math.floor(intersection[1]-1), max_zoom)] = true;
            }
            y--;
        }
    }
    return tileHash;
}

function pointToTileFraction (lon, lat, z) {
    var tile = tilebelt.pointToTile(lon, lat, z);
    var bbox = tilebelt.tileToBBOX(tile);

    var xTileOffset = bbox[2] - bbox[0];
    var xPointOffset = lon - bbox[0];
    var xPercentOffset = xPointOffset / xTileOffset;

    var yTileOffset = bbox[1] - bbox[3];
    var yPointOffset = lat - bbox[3];
    var yPercentOffset = yPointOffset / yTileOffset;

    return [tile[0]+xPercentOffset, tile[1]+yPercentOffset];
}

function hashMerge(hash1, hash2) {
    var keys = Object.keys(hash2);
    for(var i = 0; i < keys.length; i++) {
        hash1[keys[i]] = true;
    }
    return hash1;
}

function hashToArray(hash) {
    keys = Object.keys(hash);
    var tiles = [];
    for(var i = 0; i < keys.length; i++) {
        tiles.push(fromID(keys[i]));
    }
    return tiles;
}

function feature (geom) {
    return {
        type: 'Feature',
        geometry: geom,
        properties: {}
    };
}

function fc (feat) {
    return {
        type: 'FeatureCollection',
        features: [feat]
    };
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
