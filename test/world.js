var cover = require('../');
var test = require('tape');
var fs = require('fs');
var intersect = require('turf-intersect');
var merge = require('turf-merge');
var erase = require('turf-erase');

var REGEN = process.env.REGEN;

test('the world', function(t){
    var countries = fs.readdirSync(__dirname+'/fixtures/world');
    // filter output files
    countries = countries.filter(function(c){
        if(c.indexOf('_out') === -1) return true;
    });
    countries.forEach(function(countryName){
        var country = JSON.parse(fs.readFileSync(__dirname+'/fixtures/world/'+ countryName)); 
        if (country.features.length > 1) throw new Error('Invalid country; more than 1 feature: '+countryName);
        var limits = {
            min_zoom : 1,
            max_zoom : 6
        };  
        var countryGeom = country.features[0].geometry; //just the geometry from the country featureCollection
        var countryCover = cover.geojson(countryGeom, limits); // returns a feature collection of tiles 
        var countryTiles = countryCover.features; // 
        t.ok(countryCover, 'Create a cover');
        var emptyTile = false;
        countryTiles.forEach(function(tile){ // 'tile' is one feature object
            var overlap = intersect(tile, countryGeom);
            if(!overlap) emptyTile = true;
        });
        if(emptyTile) console.warn('Empty tile not found');

        var countryBlock = merge(countryCover);
        var countryBlockGeom = countryBlock.geometry;
        if(!countryBlock) t.fail('Tile merge failed');
        
        var knockout = erase(country.features[0], countryBlock);
        t.deepEqual(knockout, undefined, 'Cover left no exposed geometry');

        compareFixture(t, countryGeom, limits, __dirname+'/fixtures/world/'+countryName.split('.')[0]+'_out.geojson');
    });
    t.end();
});

function compareFixture(t, geom, limits, filepath) {
    var result = cover.geojson(geom, limits);
    result.features.push({
        type: 'Feature',
        properties: {name:'original', stroke:'#f44', fill:'#f44'},
        geometry: geom
    });
    // Sort features to ensure changes such that changes to tile cover
    // order is not considered significant.
    result.features.sort(function(a, b) {
        if (a.properties.name === 'original') return 1;
        if (b.properties.name === 'original') return -1;
        return a.geometry.coordinates[0][0] < b.geometry.coordinates[0][0] ? -1 :
            a.geometry.coordinates[0][0] > b.geometry.coordinates[0][0] ? 1 :
            a.geometry.coordinates[0][1] < b.geometry.coordinates[0][1] ? -1 :
            a.geometry.coordinates[0][1] > b.geometry.coordinates[0][1] ? 1 : 0;
    });

    if (REGEN) fs.writeFileSync(filepath, JSON.stringify(result, roundify, 2));
    var expected = JSON.parse(JSON.stringify(JSON.parse(fs.readFileSync(filepath)), roundify, 2));

    // Skip the massive deepEquals diff if feature length is not the same.
    if (result.features.length !== expected.features.length) {
        t.equal(result.features.length, expected.features.length);
    } else {
        t.deepEqual(JSON.parse(JSON.stringify(result, roundify, 2)), expected);
    }
}

function roundify(key, val) {
    if (typeof val !== 'number') return val;
    return parseFloat(val.toFixed(8));
}

