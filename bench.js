var Benchmark = require('benchmark');
var cover = require('./index.js').tiles;
var fs = require('fs');

var building = JSON.parse(fs.readFileSync('./test/fixtures/building.geojson'));
var line = JSON.parse(fs.readFileSync('./test/fixtures/road.geojson'));
var point = JSON.parse(fs.readFileSync('./test/fixtures/point.geojson'));
var russia = JSON.parse(fs.readFileSync('./test/fixtures/russia.geojson'));
var zooms = [6,8,10,12,18];

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
    addBench(suite, building, 'building', zoom, zoom);
});
zooms.slice(0, 3).forEach(function(zoom){
    addBench(suite, russia, 'russia', zoom, zoom);
});

suite.on('cycle', function(event) {
    console.log(String(event.target));
}).run();

function addBench(suite, geometry, name, min_zoom, max_zoom) {
    suite.add('scan '+name+' - z'+min_zoom+' - z'+max_zoom, {
    fn: function() {
            cover(geometry, {min_zoom: min_zoom, max_zoom: max_zoom});
        },
    maxTime: 1
    });
}
