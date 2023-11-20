function getVisibleSectors(tileBB, viewBB, gridSize) {
  const sectorW = (tileBB[1] - tileBB[0]) / gridSize;
  const sectorH = (tileBB[3] - tileBB[2]) / gridSize;

  // Calculate visible columns
  const colStart = Math.max(0, Math.floor((viewBB[0] - tileBB[0]) / sectorW));
  const colEnd = Math.min(
    gridSize,
    Math.ceil((viewBB[1] - tileBB[0]) / sectorW)
  );
  let visibleCols = (1 << colEnd) - (1 << colStart);

  // Calculate visible rows
  const rowStart = Math.max(0, Math.floor((viewBB[2] - tileBB[2]) / sectorH));
  const rowEnd = Math.min(
    gridSize,
    Math.ceil((viewBB[3] - tileBB[2]) / sectorH)
  );
  let visibleRows = (1 << rowEnd) - (1 << rowStart);

  console.log(visibleCols.toString(2), visibleRows.toString(2));

  // Combine row and column visibility to get the final result
  let result = 0;
  for (let i = 0; i < gridSize; i++) {
    if (visibleRows & (1 << i)) {
      result |= visibleCols << (i * gridSize);
    }
  }

  return result;
}

function testGetVisibleSectors() {
  let testCount = 0;
  let passCount = 0;

  function assertEqual(expected, actual, message) {
    testCount++;
    if (expected === actual) {
      passCount++;
      console.log("PASS: " + message);
    } else {
      console.error("FAIL: " + message, { expected: expected, actual: actual });
    }
  }

  // Convert bounding box object to Float32Array
  function toFloat32Array(bb) {
    return new Float32Array([bb.x1, bb.x2, bb.y1, bb.y2]);
  }

  // Test case 1: Viewport fully covers the tile
  let tileBB = toFloat32Array({ x1: 0, y1: 0, x2: 100, y2: 100 });
  let viewportBB = toFloat32Array({ x1: 0, y1: 0, x2: 100, y2: 100 });
  let gridSize = 4; // 4x4 grid

  assertEqual(
    0xffff,
    getVisibleSectors(tileBB, viewportBB, gridSize),
    "Viewport fully covers the tile"
  );

  // Test case 2: Viewport does not intersect the tile
  viewportBB = toFloat32Array({ x1: 200, y1: 200, x2: 300, y2: 300 });
  assertEqual(
    0x0000,
    getVisibleSectors(tileBB, viewportBB, gridSize),
    "Viewport does not intersect the tile"
  );

  // Test case 3: Viewport partially covers the tile
  viewportBB = toFloat32Array({ x1: 79, y1: 25, x2: 80, y2: 75 });
  assertEqual(
    (0b0000100010000000).toString(2),
    getVisibleSectors(tileBB, viewportBB, gridSize).toString(2),
    "Viewport partially covers the tile"
  );

  // Test case 4: Viewport partially covers the bottom of the tile
  viewportBB = toFloat32Array({ x1: 12, y1: 50, x2: 80, y2: 75 });
  assertEqual(
    (0b0000111100000000).toString(2),
    getVisibleSectors(tileBB, viewportBB, gridSize).toString(2),
    "Viewport partially covers the bottom of the tile"
  );

  // Add more test cases as needed...

  console.log(
    `Ran ${testCount} tests, ${passCount} passed, ${
      testCount - passCount
    } failed.`
  );
}

// Run the test function
testGetVisibleSectors();
