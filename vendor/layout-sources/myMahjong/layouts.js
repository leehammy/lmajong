const LAYOUT_TURTLE = (() => {
    const out = [];
    // Layer 0: 8×9 main grid + ears + head/tail = 78
    for (let y = 2; y <= 18; y += 2)
        for (let x = 2; x <= 16; x += 2) out.push({z:0, x, y});
    out.push({z:0, x:0,  y:9});
    out.push({z:0, x:0,  y:11});
    out.push({z:0, x:18, y:9});
    out.push({z:0, x:18, y:11});
    out.push({z:0, x:8,  y:0});
    out.push({z:0, x:10, y:0});
    // Layer 1: 6×7 = 42
    for (let y = 4; y <= 16; y += 2)
        for (let x = 4; x <= 14; x += 2) out.push({z:1, x, y});
    // Layer 2: 4×4 = 16
    for (let y = 6; y <= 12; y += 2)
        for (let x = 6; x <= 12; x += 2) out.push({z:2, x, y});
    // Layer 3: 2×3 = 6
    for (let y = 7; y <= 11; y += 2)
        for (let x = 8; x <= 10; x += 2) out.push({z:3, x, y});
    // Layer 4: 2 apex
    out.push({z:4, x:9, y:8});
    out.push({z:4, x:9, y:10});
    return out;
})();

// Pyramid (120 tiles) — stepped square pyramid, no overhangs.
const LAYOUT_PYRAMID = (() => {
    const out = [];
    // Layer 0: 8×8 = 64
    for (let y = 2; y <= 16; y += 2)
        for (let x = 2; x <= 16; x += 2) out.push({z:0, x, y});
    // Layer 1: 6×6 = 36
    for (let y = 4; y <= 14; y += 2)
        for (let x = 4; x <= 14; x += 2) out.push({z:1, x, y});
    // Layer 2: 4×4 = 16
    for (let y = 6; y <= 12; y += 2)
        for (let x = 6; x <= 12; x += 2) out.push({z:2, x, y});
    // Layer 3: 2×2 = 4
    for (let y = 8; y <= 10; y += 2)
        for (let x = 8; x <= 10; x += 2) out.push({z:3, x, y});
    return out;
})();

// Dragon (140 tiles) — long narrow body with crown ridge, fans at head/tail.
const LAYOUT_DRAGON = (() => {
    const out = [];
    // z=0 body: 4 wide × 12 rows = 48 (x:4..10, y:2..24)
    for (let y = 2; y <= 24; y += 2)
        for (let x = 4; x <= 10; x += 2) out.push({z:0, x, y});
    // z=0 head fan (top): 6 wide × 1 row at y=0
    for (let x = 2; x <= 12; x += 2) out.push({z:0, x, y:0});
    // z=0 tail fan (bottom): 6 wide × 1 row at y=26
    for (let x = 2; x <= 12; x += 2) out.push({z:0, x, y:26});
    // z=0 side scales (4 tiles each side, half-row offset for organic feel)
    for (let y of [7, 11, 15, 19]) out.push({z:0, x:2, y});
    for (let y of [7, 11, 15, 19]) out.push({z:0, x:12, y});
    // z=1: 4 wide × 10 rows = 40 (x:4..10, y:4..22)
    for (let y = 4; y <= 22; y += 2)
        for (let x = 4; x <= 10; x += 2) out.push({z:1, x, y});
    // z=2: 2 wide × 8 rows = 16 (x:6..8, y:6..20)
    for (let y = 6; y <= 20; y += 2)
        for (let x = 6; x <= 8; x += 2) out.push({z:2, x, y});
    // z=3: 2 wide × 6 rows = 12 (x:6..8, y:8..18)
    for (let y = 8; y <= 18; y += 2)
        for (let x = 6; x <= 8; x += 2) out.push({z:3, x, y});
    return out;
})();

// Simple (72 tiles) — fast, beginner-friendly play. Mostly flat.
const LAYOUT_SIMPLE = (() => {
    const out = [];
    // Layer 0: 6×8 = 48
    for (let y = 2; y <= 16; y += 2)
        for (let x = 4; x <= 14; x += 2) out.push({z:0, x, y});
    // Layer 1: 4×4 = 16
    for (let y = 6; y <= 12; y += 2)
        for (let x = 6; x <= 12; x += 2) out.push({z:1, x, y});
    // Layer 2: 2×4 = 8
    for (let y = 6; y <= 12; y += 2)
        for (let x = 8; x <= 10; x += 2) out.push({z:2, x, y});
    return out;
})();


