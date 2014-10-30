var cover = require('../'),
    test = require('tape'),
    fs = require('fs');
    intersect = require('turf-intersect');
    

test('the world', function(t){
    var countries = fs.readdirSync(__dirname+'/fixtures/world');
    countries.forEach(function(countryName){
        var country = JSON.parse(fs.readFileSync(__dirname+'/fixtures/world/'+ countryName)); //each country file is a featureCollection, hopefully only one feature
        if(country.features.length > 1) throw new Error('Invalid country; more than 1 feature')
        var limits = {
            min_zoom : 6,
            max_zoom : 6
        }
        var countryGeom = country.features[0].geometry; //just the geometry from the country featureCollection
        var countryCover = cover.geojson(countryGeom, limits); // returns a feature collection of tiles 
        var countryFeature = country.features[0]; // there should only be [0] feature
        var countryTiles = countryCover.features; // 
        
        t.ok(countryCover, 'country geojson');
        
        countryTiles.forEach(function(tile){
            console.log(countryName)
            var overlap = intersect(tile, countryGeom);
            t.ok(overlap);
        });
    });
    t.end();
});
