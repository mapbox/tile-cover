var cover = require('../'),
    test = require('tape'),
    fs = require('fs');


test('the world', function(t){
    t.plan(179);

    var countries = fs.readdirSync('./fixtures/world');
    
    countries.forEach(function(country){
        t.ok(cover.geojson(country.feature.geometry, limits), 'country geojson');
        var countryCover = cover.geojson(country.feature.geometry, limits);
        console.log(countryCover);
    });
});
