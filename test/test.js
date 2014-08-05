var cover = require('../')
    test = require('tape'),
    fs = require('fs');

test('uk', function(t){
  var uk = JSON.parse(fs.readFileSync(__dirname+'/fixtures/uk.geojson'));

  t.ok(cover.geojson(uk), 'uk geojson');
  t.ok(cover.tiles(uk), 'uk tiles');
})