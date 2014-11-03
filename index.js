var tilebelt = require('tilebelt'),
    extent = require('geojson-extent');

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
            var polyHash = Object.keys(polyRingCover(geom.coordinates[i], limits.max_zoom));
            for(var k = 0; k < polyHash.length; k++) {
                tileHash[polyHash[k]] = true;
            }
        }
        locked = hashToArray(tileHash);
    } else {
        throw new Error('Geoemtry type not implemented')
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
        intersections = intersections.sort(function(a, b) {
            return a[0] - b[0];
        });
        // add tiles between intersection pairs
        for(var i = 0; i < intersections.length - 1; i++) {
            if(i % 2 === 0){
                var enter = intersections[i][0];
                var exit = intersections[i+1][0];
                var x = enter;
                while (x <= exit) {
                    tileHash[x+'/'+y+'/'+max_zoom] = true;
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
        next = segments[i+seek]
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
        next = segments[i+seek]
    }

    // No next segment.
    if (!next) return false;

    // Not max vs next segment.
    if (current[1][1] < next[1][1]) return false;

    return current[1][1] > next[1][1];
}

// modified from http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
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
    //var bbox = [coordinates[0][0], coordinates[0][1], coordinates[0][0], coordinates[0][1]];
    for(var i = 0; i < coordinates.length - 1; i++) {
        var iNext = i+1;
        segments.push([[coordinates[i][0], coordinates[i][1]], [coordinates[iNext][0], coordinates[iNext][1]]]);
        //if(coordinates[iNext][0] < bbox[0]) bbox[0] = coordinates[iNext][0];
        //if(coordinates[iNext][1] < bbox[1]) bbox[1] = coordinates[iNext][1];
        //if(coordinates[iNext][0] > bbox[2]) bbox[2] = coordinates[iNext][0];
        //if(coordinates[iNext][1] > bbox[3]) bbox[3] = coordinates[iNext][1];
    }
  /*  var bboxTile = tilebelt.bboxToTile(bbox);
    //console.log(bboxTile)
    if(bboxTile[2] === max_zoom) {
        //console.log('\n\nzoom equal: '+bboxTile[2]+' = '+max_zoom+'\n\n')
        tileHash[x0+'/'+y0+'/'+max_zoom] = true;
        return tileHash;
    } else if(bboxTile[2] > max_zoom) {
        //console.log('\n\nzoom greater: '+bboxTile[2]+' > '+max_zoom+'\n\n')
        //console.log(bbox)
        var center = [(((bbox[2] - bbox[0]) / 2) +bbox[0]), (((bbox[3] - bbox[1]) / 2) + bbox[1])];
        var centerTile = tilebelt.pointToTile(center[0], center[1], max_zoom);
        tileHash[centerTile[0]+'/'+centerTile[1]+'/'+max_zoom] = true;
    }*/

    for (var i = 0; i < segments.length; i ++) {
        // encode coordinates as tile relative pairs
        segments[i][0] = pointToTileFraction(segments[i][0][0], segments[i][0][1], max_zoom);
        segments[i][1] = pointToTileFraction(segments[i][1][0], segments[i][1][1], max_zoom);       
        // modified Bresenham digital differential analyzer algorithm
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
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);
        var dx = Math.abs(x1-x0);
        var dy = Math.abs(y1-y0);
        var sx = (x0 < x1) ? 1 : -1;
        var sy = (y0 < y1) ? 1 : -1;
        var err = dx - dy;

        while(true) {
            tileHash[x0+'/'+y0+'/'+max_zoom] = true;
            if(x0 > x1) throw new Error('Unable to find end of segment');
            //console.log(x0 +' : '+y0)
            if (x0==x1 && y0==y1) break;
            var e2 = 2*err;
            if (e2 >-dy){ err -= dy; x0 += sx; }
            else if (e2 < dx){ err += dx; y0 += sy; }
        }
    }
    return tileHash;
}

function pointToTileFraction (lon, lat, z) {
    var tile = tilebelt.pointToTile(lon, lat, z);
    var bbox = tilebelt.tileToBBOX(tile);
    var tileNW = [bbox[0], bbox[3]];
    var tileSE = [bbox[2], bbox[1]];

    var xTileOffset = tileSE[0] - tileNW[0];
    var xPointOffset = lon - tileNW[0];
    var xPercentOffset = xPointOffset / xTileOffset;

    var yTileOffset = tileSE[1] - tileNW[1];
    var yPointOffset = lat - tileNW[1];
    var yPercentOffset = yPointOffset / yTileOffset;

    return [tile[0]+xPercentOffset, tile[1]+yPercentOffset];
}

function hashMerge(hash1, hash2) {
    var keys = Object.keys(hash2)
    for(var i = 0; i < keys.length; i++) {
        hash1[keys[i]] = true;
    }
    return hash1;
}

function hashToArray(hash) {
    keys = Object.keys(hash);
    var tiles = []
    for(var i = 0; i < keys.length; i++) {
        var tileStrings = keys[i].split('/');
        tiles.push([parseInt(tileStrings[0]), parseInt(tileStrings[1]), parseInt(tileStrings[2])]);
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
