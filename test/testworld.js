var cover = require('../'),
    test = require('tape'),
    fs = require('fs');
    turf = require('turf-intersect');

test('the world', function(t){

    var countries = fs.readdirSync(__dirname+'/fixtures/world');
    countries.forEach(function(countryFC){
        var countryFC = JSON.parse(fs.readFileSync(__dirname+'/fixtures/world/'+ countryFC)); //each country file is a featureCollection
        var limits = {
            min_zoom : 6,
            max_zoom : 6
        }
        var countryGeom = countryFC.features[0].geometry; //just the geometry from the country featureCollection
        var countryTiles = cover.geojson(countryGeom, limits); 
        
        t.ok(countryTiles, 'country geojson');
        var intersect = turf.intersect(countryTiles, countryFC);
        t.ok(intersect);
        console.log(intersect);
        
    });
    t.end();
});
