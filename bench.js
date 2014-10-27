var Benchmark = require('benchmark');
var cover = require('./index.js');
var fs = require('fs');
var poly = JSON.parse(fs.readFileSync('./test/fixtures/building.geojson'));
var line = JSON.parse(fs.readFileSync('./test/fixtures/road.geojson'));

var suite = new Benchmark.Suite('tile-cover',{
    onError: function(err) {
        console.log(err);
    }
});

suite.add('scan building - z6', function() {
    cover(poly, {min_zoom: 6, max_zoom: 6})
}).add('scan building - z12', function() {
    cover(poly, {min_zoom: 12, max_zoom: 12})
}).add('scan building - z18', function() {
    cover(poly, {min_zoom: 18, max_zoom: 18})
}).add('scan building - z20', function() {
    cover(poly, {min_zoom: 20, max_zoom: 20})
}).add('scan building - z22', function() {
    cover(poly, {min_zoom: 22, max_zoom: 22})
}).add('scan building - z25', function() {
    cover(poly, {min_zoom: 25, max_zoom: 25})
}).add('scan building - z28', function() {
    cover(poly, {min_zoom: 28, max_zoom: 28})
}).add('scan road - z6', function() {
    cover(line, {min_zoom: 6, max_zoom: 6})
}).add('scan road - z12', function() {
    cover(line, {min_zoom: 12, max_zoom: 12})
}).add('scan road - z18', function() {
    cover(line, {min_zoom: 18, max_zoom: 18})
}).add('scan road - z20', function() {
    cover(line, {min_zoom: 20, max_zoom: 20})
}).add('scan road - z22', function() {
    cover(line, {min_zoom: 22, max_zoom: 22})
}).add('scan road - z25', function() {
    cover(line, {min_zoom: 25, max_zoom: 25})
}).add('scan road - z28', function() {
    cover(line, {min_zoom: 28, max_zoom: 28})
}).on('cycle', function(event) {
    console.log(String(event.target));
}).run();