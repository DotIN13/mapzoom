import { DEVICE_HEIGHT, DEVICE_WIDTH } from "./globals";

export default class GridIndex {
  constructor() {
    this.gridWidth = 8; // 8 columns
    this.gridHeight = 24; // 16 rows
    this.cellWidth = DEVICE_WIDTH / this.gridWidth;
    this.cellHeight = DEVICE_HEIGHT / this.gridHeight;
    this.grid = new Uint8Array(this.gridHeight); // Each Uint8 represents a row
  }

  placeText(text, x, y, size = 20) {
    if (x < 0 || y < 0 || x >= DEVICE_WIDTH || y >= DEVICE_HEIGHT) return false;

    const textWidth = text.length * size; // Assuming each character is 10 pixels wide
    const endX = x + textWidth; // Calculate the end position of the text

    if (endX >= this.deviceWidth) {
      return false; // Text would overflow horizontally
    }

    const row = Math.floor(y / this.cellHeight);
    const startCol = Math.floor(x / this.cellWidth);
    const endCol = Math.floor(endX / this.cellWidth);

    for (let col = startCol; col <= endCol; col++) {
      const mask = 1 << col;
      if ((this.grid[row] & mask) !== 0) {
        return false; // Collision detected in one of the columns
      }
    }

    // Mark the cells as occupied
    for (let col = startCol; col <= endCol; col++) {
      this.grid[row] |= 1 << col;
    }
    return true;
  }

  clear() {
    this.grid.fill(0);
  }
}
