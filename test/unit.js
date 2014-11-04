var cover = require('../');
var tape = require('tape');
var fs = require('fs');

tape('getTileSegments', function(assert) {
    assert.deepEqual(cover.getSegments([[
        [-40, 40],
        [40, 40],
        [40, -40]
    ]]), [
        [[-40, 40], [40, 40]],
        [[40, 40], [40, -40]]
    ], 'Generates segments');
    assert.deepEqual(cover.getSegments([[
        [-40, 40],
        [40, 40],
        [40, 40],
        [40, -40]
    ]]), [
        [[-40, 40], [40, 40]],
        [[40, 40], [40, -40]]
    ], 'Drops degenerate segment');
    assert.deepEqual(cover.getSegments([[
        [-180, 40],
        [-60, 40],
        [-20, 40],
        [20, 40]
    ]]), [
        [[-180, 40], [20, 40]]
    ], 'Merges horizontal');
    assert.end();
});

tape('isLocalMin', function(assert) {
    assert.equal(cover.isLocalMin(0, [
        [ [0, 1], [1, 0] ],
        [ [1, 0], [2, 1] ]
    ]), true, '\\/ local min');
    assert.equal(cover.isLocalMin(0, [
        [ [0, 1], [1, 0] ],
        [ [1, 0], [2, 0] ],
        [ [2, 0], [3, 1] ]
    ]), true, '\\_/ local min');
    assert.equal(cover.isLocalMin(0, [
        [ [0, 0], [1, 1] ],
        [ [1, 1], [2, 0] ]
    ]), false, '/\\ not local min');
    assert.equal(cover.isLocalMin(0, [
        [ [0, 1], [1, 1] ],
        [ [1, 1], [2, 0] ]
    ]), false, '-\\ not local min');
    assert.equal(cover.isLocalMin(0, [
        [ [0, 0], [1, 0] ],
        [ [1, 0], [2, 1] ]
    ]), false, '-/ not local min');
    assert.equal(cover.isLocalMin(0, [
        [ [0, 0], [1, 1] ],
        [ [1, 1], [2, 1] ]
    ]), false, '/- not local min');
    assert.equal(cover.isLocalMin(0, [
        [ [0, 1], [1, 0] ],
        [ [1, 0], [2, 0] ]
    ]), false, '\\- not local min');
    assert.end();
});

tape('isLocalMax', function(assert) {
    assert.equal(cover.isLocalMax(0, [
        [ [0, 1], [1, 0] ],
        [ [1, 0], [2, 1] ]
    ]), false, '\\/ not local max');
    assert.equal(cover.isLocalMax(0, [
        [ [0, 1], [1, 0] ],
        [ [1, 0], [2, 0] ],
        [ [2, 0], [3, 1] ]
    ]), false, '\\_/ not local max');
    assert.equal(cover.isLocalMax(0, [
        [ [0, 0], [1, 1] ],
        [ [1, 1], [2, 0] ]
    ]), true, '/\\ local max');
    assert.equal(cover.isLocalMax(0, [
        [ [0, 1], [1, 1] ],
        [ [1, 1], [2, 0] ]
    ]), false, '-\\ not local max');
    assert.equal(cover.isLocalMax(0, [
        [ [0, 0], [1, 0] ],
        [ [1, 0], [2, 1] ]
    ]), false, '-/ not local max');
    assert.equal(cover.isLocalMax(0, [
        [ [0, 0], [1, 1] ],
        [ [1, 1], [2, 1] ],
        [ [2, 1], [3, 0] ]
    ]), true, '/-\\ local max');
    assert.equal(cover.isLocalMax(0, [
        [ [0, 1], [1, 0] ],
        [ [1, 0], [2, 0] ]
    ]), false, '\\- not local max');
    assert.end();
});

