tile-cover
==========

[![Build Status](https://travis-ci.org/mapbox/tile-cover.svg)](https://travis-ci.org/mapbox/tile-cover)

generate the minimum number of tiles to cover a geojson geometry

### Install

```bash
npm install tile-cover
```

### Usage

```js
var poly = JSON.parse(fs.readFileSync('./poly.geojson'));
var limits = {
  	min_zoom: 4,
  	max_zoom: 9
  }

cover.geojson(poly.geom, limits);
cover.tiles(poly.geom, limits);
cover.indexes(poly.geom, limits);
```

# API

## geojson(geom, limits)

Given a geometry, create cells and return them in a format easily readable by any software that reads GeoJSON.

* `geom` (`Object`): GeoJSON geometry
* `limits` (`Object`): an object with min_zoom and max_zoom properties specifying the minimum and maximum level to be tiled.

**Returns** `Object`, FeatureCollection of cells formatted as GeoJSON Features
## tiles(geom, limits)

Given a geometry, create cells and return them in their raw form, as an array of cell identifiers.

* `geom` (`Object`): GeoJSON geometry
* `limits` (`Object`): an object with min_zoom and max_zoom properties specifying the minimum and maximum level to be tiled.

**Returns** `Array.<Array.<number>>`, An array of tiles given as [x, y, z] arrays
## indexes(geom, limits)

Given a geometry, create cells and return them as quadkey indexes.

* `geom` (`Object`): GeoJSON geometry
* `limits` (`Object`): an object with min_zoom and max_zoom properties specifying the minimum and maximum level to be tiled.

**Returns** `Array.<String>`, An array of tiles given as quadkeys.

### Tests

```bash
npm test
```

### Benchmarks

```bash
node bench.js
```

### Examples

##### Polygons:

![img](https://dl.dropbox.com/s/48cj16fvt8nyh3o/Screenshot%202014-08-06%2013.34.12.png)

##### Lines:

![img](https://dl.dropbox.com/s/u32bq56adqwhpyy/Screenshot%202014-08-06%2013.30.31.png)

##### Points:

![img](https://dl.dropbox.com/s/7kkmmm8owg1ezb0/Screenshot%202014-08-06%2014.02.01.png)
