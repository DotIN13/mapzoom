// Converts a pair of low and high values into a combined number
// This is useful for handling JavaScript's limitations with large integers
function toNum(low, high) {
  return (high >>> 0) * 0x100000000 + (low >>> 0);
}

// Reads the remainder of a variable-length integer (varint) from a buffer
// This handles the case where the varint spans multiple bytes
function readVarIntRemainder(l, p) {
  var buf = p.buf; // Buffer from which to read
  var h, b; // Variables for storing high and low bits

  // The following blocks read bytes from the buffer, shifting and combining them
  // to construct the final number. Each byte is processed until a byte less than 0x80 is found.
  b = buf[p.pos++];
  h = (b & 0x70) >> 4;
  if (b < 0x80) return toNum(l, h);

  b = buf[p.pos++];
  h |= (b & 0x7f) << 3;
  if (b < 0x80) return toNum(l, h);

  b = buf[p.pos++];
  h |= (b & 0x7f) << 10;
  if (b < 0x80) return toNum(l, h);

  b = buf[p.pos++];
  h |= (b & 0x7f) << 17;
  if (b < 0x80) return toNum(l, h);

  b = buf[p.pos++];
  h |= (b & 0x7f) << 24;
  if (b < 0x80) return toNum(l, h);

  b = buf[p.pos++];
  h |= (b & 0x01) << 31;
  if (b < 0x80) return toNum(l, h);

  throw new Error("Expected varint not more than 10 bytes");
}

// Reads a variable-length integer (varint) from a buffer
// Varints are used in various binary formats to encode integers in a compact form
export function readVarIntLegacy(p) {
  var buf = p.buf; // Buffer from which to read
  var val, b; // Variables for constructing the integer

  // Similar to readVarIntRemainder, this reads bytes from the buffer
  // and constructs the integer, handling up to 32 bits directly
  b = buf[p.pos++];
  val = b & 0x7f;
  if (b < 0x80) return val;

  b = buf[p.pos++];
  val |= (b & 0x7f) << 7;
  if (b < 0x80) return val;

  b = buf[p.pos++];
  val |= (b & 0x7f) << 14;
  if (b < 0x80) return val;

  b = buf[p.pos++];
  val |= (b & 0x7f) << 21;
  if (b < 0x80) return val;

  b = buf[p.pos];
  val |= (b & 0x0f) << 28;

  // For varints longer than 5 bytes, call readVarIntRemainder
  return readVarIntRemainder(val, p);
}
