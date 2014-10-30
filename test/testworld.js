var cover = require('../'),
    test = require('tape'),
    fs = require('fs');
    intersect = require('turf-intersect');
    merge = require('turf-merge');
    erase = require('turf-erase');
    

test('the world', function(t){
    var countries = fs.readdirSync(__dirname+'/fixtures/world');
    countries.forEach(function(countryName){
        console.log('party in ===============================>', countryName);
        
        var country = JSON.parse(fs.readFileSync(__dirname+'/fixtures/world/'+ countryName)); 
        if (country.features.length > 1) throw new Error('Invalid country; more than 1 feature')
        var limits = {
            min_zoom : 6,
            max_zoom : 6
        }
        var countryGeom = country.features[0].geometry; //just the geometry from the country featureCollection
        var countryCover = cover.geojson(countryGeom, limits); // returns a feature collection of tiles 
        var countryTiles = countryCover.features; // 
        
        t.ok(countryCover, 'check tile-cover');
        
        countryTiles.forEach(function(tile){ // 'tile' is one feature object
            var overlap = intersect(tile, countryGeom);
            t.notEqual(overlap.features[0].type, 'GeometryCollection', 'check for empty tiles');
        });

        var countryBlock = merge(countryCover);
        var countryBlockGeom = countryBlock.geometry;
        t.ok(countryBlock, 'check tilecover merge');
        
        var knockout = erase(country.features[0], countryBlock);
            console.log('erased output', knockout.geometry);
        t.deepEqual(knockout.geometry.geometries, [], 'check for exposed land');

    });
    t.end();
});
