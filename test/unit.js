var cover = require('../');
var tape = require('tape');
var fs = require('fs');

tape('getTiledPoly', function(assert) {
    assert.deepEqual(cover.getTiledPoly([[
        [-40, 40],
        [40, 40],
        [40, -40],
        [-40, 40]
    ]], 1), {
        minY: 0,
        maxY: 1,
        geom: [[
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 1]
        ]]
    }, 'Generates tiled geom');
    assert.deepEqual(cover.getTiledPoly([[
        [-40, 40],
        [40, 40],
        [40, 20],
        [40, -40],
        [-40, 40]
    ]], 1), {
        minY: 0,
        maxY: 1,
        geom: [[
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 1]
        ]]
    }, 'Drops degenerate segment');
    assert.end();
});

tape('isLocalMin/Max', function(assert) {
    var geom;
    //    0 max
    //   / \
    //  3   1
    //   \ /
    //    2 min
    geom = [ [1,2], [2,1], [1,0], [0,1], [1,2] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), true,  2);
    assert.equal(cover.isLocalMin(2, geom), false, 3);
    assert.equal(cover.isLocalMin(3, geom), false, 0);
    assert.equal(cover.isLocalMin(4, geom), false, 1);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), true,  0);

    //    2 max
    //   / \
    //  1   3
    //   \ /
    //    0 min
    geom = [ [1,0], [0,1], [1,2], [2,1], [1,0] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), false, 3);
    assert.equal(cover.isLocalMin(3, geom), true,  0);
    assert.equal(cover.isLocalMin(4, geom), false, 1);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), true,  2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), false, 0);

    //max 0--1
    //   /    \
    //  5      2
    //   \    /
    //    4--3 min
    geom = [ [1,2], [2,2], [3,1], [2,0], [1,0], [0,1], [1,2] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), true,  3);
    assert.equal(cover.isLocalMin(3, geom), false, 4);
    assert.equal(cover.isLocalMin(4, geom), false, 5);
    assert.equal(cover.isLocalMin(5, geom), false, 0);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), false, 4);
    assert.equal(cover.isLocalMax(4, geom), false, 5);
    assert.equal(cover.isLocalMax(5, geom), true,  0);

    //max 3--4
    //   /    \
    //  2      5
    //   \    /
    //    1--0 min
    geom = [ [2,0], [1,0], [0,1], [1,2], [2,2], [3,1], [2,0] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), false, 3);
    assert.equal(cover.isLocalMin(3, geom), false, 4);
    assert.equal(cover.isLocalMin(4, geom), false, 5);
    assert.equal(cover.isLocalMin(5, geom), true,  0);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), true, 3);
    assert.equal(cover.isLocalMax(3, geom), false, 4);
    assert.equal(cover.isLocalMax(4, geom), false, 5);
    assert.equal(cover.isLocalMax(5, geom), false, 0);

    // max 3--4
    //     |  |
    //  1--2  |
    //  |     |
    //  0-----5 min
    geom = [ [0,0], [0,1], [1,1], [1,2], [2,2], [2,0], [0,0] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), false, 3);
    assert.equal(cover.isLocalMin(3, geom), false, 4);
    assert.equal(cover.isLocalMin(4, geom), true,  5);
    assert.equal(cover.isLocalMin(5, geom), false, 0);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), true,  3);
    assert.equal(cover.isLocalMax(3, geom), false, 4);
    assert.equal(cover.isLocalMax(4, geom), false, 5);
    assert.equal(cover.isLocalMax(5, geom), false, 0);

    // max 4--5
    //     |  |
    //  2--3  |
    //  |     |
    //  1-----0 min
    geom = [ [2,0], [0,0], [0,1], [1,1], [1,2], [2,2], [2,0] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), false, 3);
    assert.equal(cover.isLocalMin(3, geom), false, 4);
    assert.equal(cover.isLocalMin(4, geom), false, 5);
    assert.equal(cover.isLocalMin(5, geom), true,  0);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), true,  4);
    assert.equal(cover.isLocalMax(4, geom), false, 5);
    assert.equal(cover.isLocalMax(5, geom), false, 0);

    // max 1--2
    //     |  |
    //  5--0  |
    //  |     |
    //  4-----3 min
    geom = [ [1,1], [1,2], [2,2], [2,0], [0,0], [0,1], [1,1] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), true,  3);
    assert.equal(cover.isLocalMin(3, geom), false, 4);
    assert.equal(cover.isLocalMin(4, geom), false, 5);
    assert.equal(cover.isLocalMin(5, geom), false, 0);

    assert.equal(cover.isLocalMax(0, geom), true,  1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), false, 4);
    assert.equal(cover.isLocalMax(4, geom), false, 5);
    assert.equal(cover.isLocalMax(5, geom), false, 0);

    // max 0   2 max
    //    / \ / \
    //   /   1   \ ----- 1 min
    //  7         3
    //   \   5   / ----- 5 max
    //    \ / \ /
    // min 6   4 min
    geom = [ [1,2], [2,1.5], [3,2], [4,1], [3,0], [2,0.5], [1,0], [0,1], [1,2] ];
    assert.equal(cover.isLocalMin(0, geom), true,  1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), false, 3);
    assert.equal(cover.isLocalMin(3, geom), true,  4);
    assert.equal(cover.isLocalMin(4, geom), false, 5);
    assert.equal(cover.isLocalMin(5, geom), true,  6);
    assert.equal(cover.isLocalMin(6, geom), false, 7);
    assert.equal(cover.isLocalMin(7, geom), false, 0);

    assert.equal(cover.isLocalMax(0, geom), false, 1);
    assert.equal(cover.isLocalMax(1, geom), true,  2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), false, 4);
    assert.equal(cover.isLocalMax(4, geom), true,  5);
    assert.equal(cover.isLocalMax(5, geom), false, 6);
    assert.equal(cover.isLocalMax(6, geom), false, 7);
    assert.equal(cover.isLocalMax(7, geom), true,  0);

    // max 7   1 max
    //    / \ / \
    //   /   0   \ ----- 0 min
    //  6         2
    //   \   4   / ----- 4 max
    //    \ / \ /
    // min 5   3 min
    geom = [ [2,1.5], [3,2], [4,1], [3,0], [2,0.5], [1,0], [0,1], [1,2], [2,1.5] ];
    assert.equal(cover.isLocalMin(0, geom), false, 1);
    assert.equal(cover.isLocalMin(1, geom), false, 2);
    assert.equal(cover.isLocalMin(2, geom), true,  3);
    assert.equal(cover.isLocalMin(3, geom), false, 4);
    assert.equal(cover.isLocalMin(4, geom), true,  5);
    assert.equal(cover.isLocalMin(5, geom), false, 6);
    assert.equal(cover.isLocalMin(6, geom), false, 7);
    assert.equal(cover.isLocalMin(7, geom), true,  0);

    assert.equal(cover.isLocalMax(0, geom), true,  1);
    assert.equal(cover.isLocalMax(1, geom), false, 2);
    assert.equal(cover.isLocalMax(2, geom), false, 3);
    assert.equal(cover.isLocalMax(3, geom), true,  4);
    assert.equal(cover.isLocalMax(4, geom), false, 5);
    assert.equal(cover.isLocalMax(5, geom), false, 6);
    assert.equal(cover.isLocalMax(6, geom), true,  7);
    assert.equal(cover.isLocalMax(7, geom), false, 0);

    assert.end();
});

