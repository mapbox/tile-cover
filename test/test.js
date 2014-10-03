var cover = require('../'),
    test = require('tape'),
    fs = require('fs');

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
    fs.writeFileSync(__dirname+'/fixtures/point_out.geojson', JSON.stringify(cover.geojson(point.geometry, limits)));
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
    fs.writeFileSync(__dirname+'/fixtures/line_out.geojson', JSON.stringify(cover.geojson(line.geometry, limits)));
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
    fs.writeFileSync(__dirname+'/fixtures/polygon_out.geojson', JSON.stringify(cover.geojson(polygon, limits)));
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
    fs.writeFileSync(__dirname+'/fixtures/multipoint_out.geojson', JSON.stringify(cover.geojson(multipoint.geometry, limits)));
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
    fs.writeFileSync(__dirname+'/fixtures/multiline_out.geojson', JSON.stringify(cover.geojson(multiline.geometry, limits)));
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
    fs.writeFileSync(__dirname+'/fixtures/uk_out.geojson', JSON.stringify(cover.geojson(uk.geometry, limits)));
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
    fs.writeFileSync(__dirname+'/fixtures/building_out.geojson', JSON.stringify(cover.geojson(building, limits)));
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
    t.equal(cover.indexes(russia, limits).length, 457);
    fs.writeFileSync(__dirname+'/fixtures/russia_out.geojson', JSON.stringify(cover.geojson(russia, limits), 'russia tiles'));
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

function f(g, name){
    return {
        type:'Feature',
        properties: {name: name},
        geometry: g
    };
}