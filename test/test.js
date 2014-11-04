var cover = require('../'),
    test = require('tape'),
    fs = require('fs');

var REGEN = process.env.REGEN;

test('point', function(t){
    var point = {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Point",
            "coordinates": [
                79.08096313476562,
                21.135184856708992
            ]
        }
    };
    var limits = {
        min_zoom: 1,
        max_zoom: 15
    };

    t.ok(cover.geojson(point.geometry, limits), 'point geojson');
    t.ok(cover.tiles(point.geometry, limits).length, 'point tiles');
    t.ok(cover.indexes(point.geometry, limits).length, 'point indexes');
    t.notEqual(cover.indexes(point.geometry, limits)[0], '');
    t.equal(typeof cover.tiles(point.geometry, limits)[0][0], 'number');
    t.equal(typeof cover.tiles(point.geometry, limits)[0][1], 'number');
    t.equal(typeof cover.tiles(point.geometry, limits)[0][2], 'number');
    compareFixture(t, point.geometry, limits, __dirname+'/fixtures/point_out.geojson');
    t.end();
});

test('line', function(t){
    var line = JSON.parse(fs.readFileSync(__dirname+'/fixtures/line.geojson'));
    var limits = {
        min_zoom: 1,
        max_zoom: 12
    };

    t.ok(cover.geojson(line.geometry, limits), 'line geojson');
    t.ok(cover.tiles(line.geometry, limits).length, 'line tiles');
    t.ok(cover.indexes(line.geometry, limits).length, 'line indexes');
    compareFixture(t, line.geometry, limits, __dirname+'/fixtures/line_out.geojson');
    t.end();
});

test('edgeline', function(t){
    var line = JSON.parse(fs.readFileSync(__dirname+'/fixtures/edgeline.geojson'));
    var limits = {
        min_zoom: 14,
        max_zoom: 14
    };

    t.ok(cover.geojson(line.geometry, limits), 'edgeline geojson');
    t.deepEqual(cover.tiles(line.geometry, limits), [ [ 4543, 6612, 14 ], [ 4544, 6612, 14 ] ], 'edgeline tiles');
    t.deepEqual(cover.indexes(line.geometry, limits).length, 2, 'edgeline indexes');
    compareFixture(t, line.geometry, limits, __dirname+'/fixtures/edgeline_out.geojson');
    t.end();
});

test('polygon', function(t){
    var polygon = JSON.parse(fs.readFileSync(__dirname+'/fixtures/polygon.geojson'));
    var limits = {
        min_zoom: 1,
        max_zoom: 15
    };

    t.ok(cover.geojson(polygon, limits), 'polygon geojson');
    t.ok(cover.tiles(polygon, limits).length, 'polygon tiles');
    t.ok(cover.indexes(polygon, limits).length, 'polygon indexes');
    compareFixture(t, polygon, limits, __dirname+'/fixtures/polygon_out.geojson');
    t.end();
});

test('multipoint', function(t){
    var multipoint = JSON.parse(fs.readFileSync(__dirname+'/fixtures/multipoint.geojson'));
    var limits = {
        min_zoom: 1,
        max_zoom: 12
    };

    t.ok(cover.geojson(multipoint.geometry, limits), 'multipoint geojson');
    t.ok(cover.tiles(multipoint.geometry, limits).length, 'multipoint tiles');
    t.ok(cover.indexes(multipoint.geometry, limits).length, 'multipoint indexes');
    t.notEqual(cover.indexes(multipoint.geometry, limits)[0], '');
    t.equal(cover.tiles(multipoint.geometry, limits).length, 3);
    t.equal(cover.indexes(multipoint.geometry, limits).length, 3);
    t.equal(cover.geojson(multipoint.geometry, limits).features.length, 3);
    t.equal(typeof cover.tiles(multipoint.geometry, limits)[0][0], 'number');
    t.equal(typeof cover.tiles(multipoint.geometry, limits)[0][1], 'number');
    t.equal(typeof cover.tiles(multipoint.geometry, limits)[0][2], 'number');
    compareFixture(t, multipoint.geometry, limits, __dirname+'/fixtures/multipoint_out.geojson');
    t.end();
});

test('multiline', function(t){
    var multiline = JSON.parse(fs.readFileSync(__dirname+'/fixtures/multiline.geojson'));
    var limits = {
        min_zoom: 1,
        max_zoom: 8
    };

    t.ok(cover.geojson(multiline.geometry, limits), 'multiline geojson');
    t.ok(cover.tiles(multiline.geometry, limits).length, 'multiline tiles');
    t.ok(cover.indexes(multiline.geometry, limits).length, 'multiline indexes');
    t.notEqual(cover.indexes(multiline.geometry, limits)[0], '');
    t.equal(cover.tiles(multiline.geometry, limits).length, 20);
    t.equal(cover.indexes(multiline.geometry, limits).length, 20);
    t.equal(cover.geojson(multiline.geometry, limits).features.length, 20);
    t.equal(typeof cover.tiles(multiline.geometry, limits)[0][0], 'number');
    t.equal(typeof cover.tiles(multiline.geometry, limits)[0][1], 'number');
    t.equal(typeof cover.tiles(multiline.geometry, limits)[0][2], 'number');
    compareFixture(t, multiline.geometry, limits, __dirname+'/fixtures/multiline_out.geojson');
    t.end();
});

test('uk', function(t){
    var uk = JSON.parse(fs.readFileSync(__dirname+'/fixtures/uk.geojson'));
    var limits = {
        min_zoom: 7,
        max_zoom: 9
    };

    t.ok(cover.geojson(uk.geometry, limits), 'uk geojson');
    t.ok(cover.tiles(uk.geometry, limits).length, 'uk tiles');
    t.ok(cover.indexes(uk.geometry, limits).length, 'uk indexes');
    compareFixture(t, uk.geometry, limits, __dirname+'/fixtures/uk_out.geojson');
    t.end();
});

test('building', function(t){
    var building = JSON.parse(fs.readFileSync(__dirname+'/fixtures/building.geojson'));
    var limits = {
        min_zoom: 18,
        max_zoom: 18
    };

    t.ok(cover.geojson(building, limits), 'building geojson');
    t.ok(cover.tiles(building, limits).length, 'building tiles');
    t.ok(cover.indexes(building, limits).length, 'building indexes');
    compareFixture(t, building, limits, __dirname+'/fixtures/building_out.geojson');
    t.end();
});

test('russia', function(t){
    var russia = JSON.parse(fs.readFileSync(__dirname+'/fixtures/russia.geojson'));
    var limits = {
        min_zoom: 6,
        max_zoom: 6
    };

    t.ok(cover.geojson(russia, limits), 'russia geojson');
    t.ok(cover.tiles(russia, limits).length, 'russia tiles');
    t.ok(cover.indexes(russia, limits).length, 'russia indexes');
    t.equal(cover.indexes(russia, limits).length, 254);
    compareFixture(t, russia, limits, __dirname+'/fixtures/russia_out.geojson');
    t.end();
});

test('invalid polygon --- hourglass', function(t) {
    var invalid = {
    "type": "Polygon",
        "coordinates": [
            [
                [
                    -12.034835815429688,
                    8.901183448260598
                ],
                [
                    -12.060413360595701,
                    8.899826693726117
                ],
                [
                    -12.036380767822266,
                    8.873199368734273
                ],
                [
                    -12.059383392333983,
                    8.871418491385919
                ],
                [
                    -12.034835815429688,
                    8.901183448260598
                ]
            ]
        ]
    };
    var limits = {
        min_zoom: 1,
        max_zoom: 12
    };

    try {
        cover.tiles(invalid, limits);
    } catch(err) {
        t.equal(err.toString(), 'Error: found non-noded intersection between LINESTRING ( -12.060413360595701 8.899826693726117, -12.036380767822266 8.873199368734273 ) and LINESTRING ( -12.059383392333983 8.871418491385919, -12.034835815429688 8.901183448260598 ) [ (-12.047632938440815, 8.885666404927512) ]');
    }
    t.end();
});

test('high zoom', function(t){
    var building = {"properties":{"osm_id":0},"geometry":{"type":"Polygon","coordinates":[[[-77.04474940896034,38.90019399459534],[-77.04473063349724,38.90019399459534],[-77.04473063349724,38.90027122854152],[-77.04474672675133,38.900273315944304],[-77.04474672675133,38.900457007149065],[-77.04394474625587,38.90017520794709],[-77.04394206404686,38.900173120541425],[-77.04384550452232,38.9001710331357],[-77.04384550452232,38.900141809449025],[-77.04365238547325,38.90007501240577],[-77.04365238547325,38.89989340762676],[-77.04371139407158,38.899916369176196],[-77.04371139407158,38.89986209641103],[-77.04369261860847,38.89986209641103],[-77.04369261860847,38.89969927786663],[-77.04452946782112,38.89969719044697],[-77.04460456967354,38.89967214140626],[-77.04460725188255,38.89969510302724],[-77.04474672675133,38.89969719044697],[-77.04474940896034,38.90019399459534],[-77.04474940896034,38.90019399459534],[-77.04474940896034,38.90019399459534]]]},"type":"Feature"}
    building = building.geometry

    var limits = {
        min_zoom: 25,
        max_zoom: 25
    };

    t.ok(cover.geojson(building, limits), 'building geojson');
    t.ok(cover.tiles(building, limits).length, 'building tiles');
    t.ok(cover.indexes(building, limits).length, 'building indexes');
    compareFixture(t, building, limits, __dirname+'/fixtures/highzoom_out.geojson');
    t.end();
});

function f(g, name){
    return {
        type:'Feature',
        properties: {name: name},
        geometry: g
    };
}

function compareFixture(t, geom, limits, filepath) {
    var result = cover.geojson(geom, limits);
    result.features.push({
        type: 'Feature',
        properties: {name:'original', stroke:'#f44', fill:'#f44'},
        geometry: geom
    });
    // Sort features to ensure changes such that changes to tile cover
    // order is not considered significant.
    result.features.sort(function(a, b) {
        if (a.properties.name === 'original') return 1;
        if (b.properties.name === 'original') return -1;
        return a.geometry.coordinates[0][0] < b.geometry.coordinates[0][0] ? -1 :
            a.geometry.coordinates[0][0] > b.geometry.coordinates[0][0] ? 1 :
            a.geometry.coordinates[0][1] < b.geometry.coordinates[0][1] ? -1 :
            a.geometry.coordinates[0][1] > b.geometry.coordinates[0][1] ? 1 : 0;
    });

    if (REGEN) fs.writeFileSync(filepath, JSON.stringify(result, roundify, 2));
    var expected = JSON.parse(JSON.stringify(JSON.parse(fs.readFileSync(filepath)), roundify, 2));

    // Skip the massive deepEquals diff if feature length is not the same.
    if (result.features.length !== expected.features.length) {
        t.equal(result.features.length, expected.features.length);
    } else {
        t.deepEqual(JSON.parse(JSON.stringify(result, roundify, 2)), expected);
    }
}

function roundify(key, val) {
    if (typeof val !== 'number') return val;
    return parseFloat(val.toFixed(8));
}

