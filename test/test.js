var cover = require('../')
    test = require('tape'),
    fs = require('fs');

test('uk', function(t){
  var uk = JSON.parse(fs.readFileSync(__dirname+'/fixtures/uk.geojson'));

  t.ok(cover.geojson(uk.geometry), 'uk geojson');
  //t.ok(cover.tiles(uk.geometry), 'uk tiles');
});