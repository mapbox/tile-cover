var Benchmark = require('benchmark');
var cover = require('./index.js').tiles;
var fs = require('fs');

var polygon = JSON.parse(fs.readFileSync('./test/fixtures/building.geojson'));
var line = JSON.parse(fs.readFileSync('./test/fixtures/road.geojson'));
var point = JSON.parse(fs.readFileSync('./test/fixtures/point.geojson'));
var zooms = [6,12,18,20,22,25,28];

var suite = new Benchmark.Suite('tile-cover',{
    onError: function(err) {
        console.log(err);
    }
});

zooms.forEach(function(zoom){
    addBench(suite, point, 'point', zoom, zoom);
});
zooms.forEach(function(zoom){
    addBench(suite, line, 'road', zoom, zoom);
});
zooms.forEach(function(zoom){
    addBench(suite, polygon, 'building', zoom, zoom);
});

suite.on('cycle', function(event) {
    console.log(String(event.target));
}).run();

function addBench(suite, geometry, name, min_zoom, max_zoom) {
    suite.add('scan '+name+' - z'+min_zoom+' - z'+max_zoom, function() {
        cover(geometry, {min_zoom: min_zoom, max_zoom: max_zoom});
    });
}