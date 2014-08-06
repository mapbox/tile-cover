tile-cover
==========

generate the minimum number of tiles to cover a geojson geometry

###Install

```bash
npm install tile-cover
```

###Usage

```js
var poly = JSON.parse(fs.readFileSync('./poly.geojson'));
var limits = {
  	min_zoom: 4,
  	max_zoom: 9
  }

cover.geojson(poly, limits);
cover.tiles(poly, limits);
cover.indexes(poly, limits);
```

###Examples

#####Polygons:

![img](https://dl.dropbox.com/s/48cj16fvt8nyh3o/Screenshot%202014-08-06%2013.34.12.png)

#####Lines:

![img](https://dl.dropbox.com/s/u32bq56adqwhpyy/Screenshot%202014-08-06%2013.30.31.png)

#####Points:

![img](https://dl.dropbox.com/s/7kkmmm8owg1ezb0/Screenshot%202014-08-06%2014.02.01.png)