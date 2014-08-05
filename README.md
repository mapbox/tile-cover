tile-cover
==========

generate the minimum number of tiles to cover a geojson geometry


```js
var poly = JSON.parse(fs.readFileSync('./poly.geojson'));
cover.geojson(poly.geometry);
cover.geojson(poly.tiles);
```

Input:

![img](https://dl.dropbox.com/s/xf3ifvut64ay6jf/Screenshot%202014-08-05%2016.21.03.png)

Output:

![img](https://dl.dropbox.com/s/8fjof4uep86hwlc/Screenshot%202014-08-05%2016.21.24.png)

Input/Output:

![img](https://dl.dropbox.com/s/py6yywfxnenx4ks/Screenshot%202014-08-05%2016.29.17.png)