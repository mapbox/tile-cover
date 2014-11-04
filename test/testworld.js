var cover = require('../');
var test = require('tape');
var fs = require('fs');
var intersect = require('turf-intersect');
var merge = require('turf-merge');
var erase = require('turf-erase');

test('the world', function(t){
    var countries = fs.readdirSync(__dirname+'/fixtures/world');
    countries.forEach(function(countryName){
        var country = JSON.parse(fs.readFileSync(__dirname+'/fixtures/world/'+ countryName)); 
        if (country.features.length > 1) throw new Error('Invalid country; more than 1 feature')
        var limits = {
            min_zoom : 1,
            max_zoom : 6
        }
        var countryGeom = country.features[0].geometry; //just the geometry from the country featureCollection
        var countryCover = cover.geojson(countryGeom, limits); // returns a feature collection of tiles 
        var countryTiles = countryCover.features; // 
        t.ok(countryCover, 'Create a cover');
        
        countryTiles.forEach(function(tile){ // 'tile' is one feature object
            var overlap = intersect(tile, countryGeom);
            t.notEqual(overlap.features[0].type, 'GeometryCollection', 'Empty tile not found')
        });

        var countryBlock = merge(countryCover);
        var countryBlockGeom = countryBlock.geometry;
        if(!countryBlock) t.fail('Tile merge failed');
        
        var knockout = erase(country.features[0], countryBlock);
        t.deepEqual(knockout.geometry.geometries, [], 'Cover left no exposed geometry')
    });
    t.end();
});
