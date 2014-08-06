var cover = require('../')
    test = require('tape'),
    fs = require('fs');

test('uk', function(t){
  var uk = JSON.parse(fs.readFileSync(__dirname+'/fixtures/uk.geojson'));
  var limits = {
  	min_zoom: 7,
  	max_zoom: 9
  }

  t.ok(cover.geojson(uk.geometry, limits), 'uk geojson');
  t.ok(cover.tiles(uk.geometry, limits).length, 'uk tiles');
  fs.writeFileSync(__dirname+'/fixtures/uk_out.geojson', JSON.stringify(cover.geojson(uk.geometry, limits)));
  t.end()
});

test('line', function(t){
  var line = JSON.parse(fs.readFileSync(__dirname+'/fixtures/line.geojson'));
  var limits = {
  	min_zoom: 7,
  	max_zoom: 12
  }


  t.ok(cover.geojson(line.geometry, limits), 'line geojson');
  t.ok(cover.tiles(line.geometry, limits).length, 'line tiles');
  fs.writeFileSync(__dirname+'/fixtures/line_out.geojson', JSON.stringify(cover.geojson(line.geometry, limits)));
  t.end()
});