var cover = require('../'),
    test = require('tape'),
    fs = require('fs');

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
    t.equal(typeof cover.tiles(point.geometry, limits)[0][0], 'number')
    t.equal(typeof cover.tiles(point.geometry, limits)[0][1], 'number')
    t.equal(typeof cover.tiles(point.geometry, limits)[0][2], 'number')
    fs.writeFileSync(__dirname+'/fixtures/point_out.geojson', JSON.stringify(cover.geojson(point.geometry, limits)));
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
    t.equal(cover.indexes(russia, limits).length, 457)
    fs.writeFileSync(__dirname+'/fixtures/russia_out.geojson', JSON.stringify(cover.geojson(russia, limits), 'russia tiles'));
    t.end();
});

function f(g, name){
    return {
        type:'Feature',
        properties: {name: name},
        geometry: g
    }
}