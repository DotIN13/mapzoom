var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// utils/flatbuffers/vector-tile/vector-tile.ts
var vector_tile_exports = {};
__export(vector_tile_exports, {
  Feature: () => Feature,
  FeatureT: () => FeatureT,
  GeomType: () => GeomType,
  Layer: () => Layer,
  LayerT: () => LayerT,
  Tile: () => Tile,
  TileT: () => TileT,
  Value: () => Value,
  ValueT: () => ValueT
});

// utils/flatbuffers/vector-tile/vector-tile/feature.ts
import * as flatbuffers from "flatbuffers";

// utils/flatbuffers/vector-tile/vector-tile/geom-type.ts
var GeomType = /* @__PURE__ */ ((GeomType2) => {
  GeomType2[GeomType2["UNKNOWN"] = 0] = "UNKNOWN";
  GeomType2[GeomType2["POINT"] = 1] = "POINT";
  GeomType2[GeomType2["LINESTRING"] = 2] = "LINESTRING";
  GeomType2[GeomType2["POLYGON"] = 3] = "POLYGON";
  return GeomType2;
})(GeomType || {});

// utils/flatbuffers/vector-tile/vector-tile/feature.ts
var Feature = class _Feature {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsFeature(bb, obj) {
    return (obj || new _Feature()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsFeature(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new _Feature()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  id() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tags(index) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
  }
  tagsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  tagsArray() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
  }
  type() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* UNKNOWN */;
  }
  geometry(index) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
  }
  geometryLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  geometryArray() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
  }
  static startFeature(builder) {
    builder.startObject(4);
  }
  static addId(builder, id) {
    builder.addFieldInt64(0, id, BigInt("0"));
  }
  static addTags(builder, tagsOffset) {
    builder.addFieldOffset(1, tagsOffset, 0);
  }
  static createTagsVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addInt32(data[i]);
    }
    return builder.endVector();
  }
  static startTagsVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addType(builder, type) {
    builder.addFieldInt8(2, type, 0 /* UNKNOWN */);
  }
  static addGeometry(builder, geometryOffset) {
    builder.addFieldOffset(3, geometryOffset, 0);
  }
  static createGeometryVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addInt32(data[i]);
    }
    return builder.endVector();
  }
  static startGeometryVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static endFeature(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createFeature(builder, id, tagsOffset, type, geometryOffset) {
    _Feature.startFeature(builder);
    _Feature.addId(builder, id);
    _Feature.addTags(builder, tagsOffset);
    _Feature.addType(builder, type);
    _Feature.addGeometry(builder, geometryOffset);
    return _Feature.endFeature(builder);
  }
  unpack() {
    return new FeatureT(
      this.id(),
      this.bb.createScalarList(this.tags.bind(this), this.tagsLength()),
      this.type(),
      this.bb.createScalarList(this.geometry.bind(this), this.geometryLength())
    );
  }
  unpackTo(_o) {
    _o.id = this.id();
    _o.tags = this.bb.createScalarList(this.tags.bind(this), this.tagsLength());
    _o.type = this.type();
    _o.geometry = this.bb.createScalarList(this.geometry.bind(this), this.geometryLength());
  }
};
var FeatureT = class {
  constructor(id = BigInt("0"), tags = [], type = 0 /* UNKNOWN */, geometry = []) {
    this.id = id;
    this.tags = tags;
    this.type = type;
    this.geometry = geometry;
  }
  pack(builder) {
    const tags = Feature.createTagsVector(builder, this.tags);
    const geometry = Feature.createGeometryVector(builder, this.geometry);
    return Feature.createFeature(
      builder,
      this.id,
      tags,
      this.type,
      geometry
    );
  }
};

// utils/flatbuffers/vector-tile/vector-tile/layer.ts
import * as flatbuffers3 from "flatbuffers";

// utils/flatbuffers/vector-tile/vector-tile/value.ts
import * as flatbuffers2 from "flatbuffers";
var Value = class _Value {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsValue(bb, obj) {
    return (obj || new _Value()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsValue(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers2.SIZE_PREFIX_LENGTH);
    return (obj || new _Value()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  stringValue(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  floatValue() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0;
  }
  doubleValue() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  intValue() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
  }
  uintValue() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  sintValue() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
  }
  boolValue() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
  }
  static startValue(builder) {
    builder.startObject(7);
  }
  static addStringValue(builder, stringValueOffset) {
    builder.addFieldOffset(0, stringValueOffset, 0);
  }
  static addFloatValue(builder, floatValue) {
    builder.addFieldFloat32(1, floatValue, 0);
  }
  static addDoubleValue(builder, doubleValue) {
    builder.addFieldFloat64(2, doubleValue, 0);
  }
  static addIntValue(builder, intValue) {
    builder.addFieldInt64(3, intValue, BigInt("0"));
  }
  static addUintValue(builder, uintValue) {
    builder.addFieldInt64(4, uintValue, BigInt("0"));
  }
  static addSintValue(builder, sintValue) {
    builder.addFieldInt64(5, sintValue, BigInt("0"));
  }
  static addBoolValue(builder, boolValue) {
    builder.addFieldInt8(6, +boolValue, 0);
  }
  static endValue(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createValue(builder, stringValueOffset, floatValue, doubleValue, intValue, uintValue, sintValue, boolValue) {
    _Value.startValue(builder);
    _Value.addStringValue(builder, stringValueOffset);
    _Value.addFloatValue(builder, floatValue);
    _Value.addDoubleValue(builder, doubleValue);
    _Value.addIntValue(builder, intValue);
    _Value.addUintValue(builder, uintValue);
    _Value.addSintValue(builder, sintValue);
    _Value.addBoolValue(builder, boolValue);
    return _Value.endValue(builder);
  }
  unpack() {
    return new ValueT(
      this.stringValue(),
      this.floatValue(),
      this.doubleValue(),
      this.intValue(),
      this.uintValue(),
      this.sintValue(),
      this.boolValue()
    );
  }
  unpackTo(_o) {
    _o.stringValue = this.stringValue();
    _o.floatValue = this.floatValue();
    _o.doubleValue = this.doubleValue();
    _o.intValue = this.intValue();
    _o.uintValue = this.uintValue();
    _o.sintValue = this.sintValue();
    _o.boolValue = this.boolValue();
  }
};
var ValueT = class {
  constructor(stringValue = null, floatValue = 0, doubleValue = 0, intValue = BigInt("0"), uintValue = BigInt("0"), sintValue = BigInt("0"), boolValue = false) {
    this.stringValue = stringValue;
    this.floatValue = floatValue;
    this.doubleValue = doubleValue;
    this.intValue = intValue;
    this.uintValue = uintValue;
    this.sintValue = sintValue;
    this.boolValue = boolValue;
  }
  pack(builder) {
    const stringValue = this.stringValue !== null ? builder.createString(this.stringValue) : 0;
    return Value.createValue(
      builder,
      stringValue,
      this.floatValue,
      this.doubleValue,
      this.intValue,
      this.uintValue,
      this.sintValue,
      this.boolValue
    );
  }
};

// utils/flatbuffers/vector-tile/vector-tile/layer.ts
var Layer = class _Layer {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsLayer(bb, obj) {
    return (obj || new _Layer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsLayer(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers3.SIZE_PREFIX_LENGTH);
    return (obj || new _Layer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  version() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 1;
  }
  name(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  features(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new Feature()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  featuresLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  keys(index, optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
  }
  keysLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  values(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new Value()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  valuesLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extent() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 4096;
  }
  static startLayer(builder) {
    builder.startObject(6);
  }
  static addVersion(builder, version) {
    builder.addFieldInt32(0, version, 1);
  }
  static addName(builder, nameOffset) {
    builder.addFieldOffset(1, nameOffset, 0);
  }
  static addFeatures(builder, featuresOffset) {
    builder.addFieldOffset(2, featuresOffset, 0);
  }
  static createFeaturesVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startFeaturesVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addKeys(builder, keysOffset) {
    builder.addFieldOffset(3, keysOffset, 0);
  }
  static createKeysVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startKeysVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addValues(builder, valuesOffset) {
    builder.addFieldOffset(4, valuesOffset, 0);
  }
  static createValuesVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startValuesVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addExtent(builder, extent) {
    builder.addFieldInt32(5, extent, 4096);
  }
  static endLayer(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createLayer(builder, version, nameOffset, featuresOffset, keysOffset, valuesOffset, extent) {
    _Layer.startLayer(builder);
    _Layer.addVersion(builder, version);
    _Layer.addName(builder, nameOffset);
    _Layer.addFeatures(builder, featuresOffset);
    _Layer.addKeys(builder, keysOffset);
    _Layer.addValues(builder, valuesOffset);
    _Layer.addExtent(builder, extent);
    return _Layer.endLayer(builder);
  }
  unpack() {
    return new LayerT(
      this.version(),
      this.name(),
      this.bb.createObjList(this.features.bind(this), this.featuresLength()),
      this.bb.createScalarList(this.keys.bind(this), this.keysLength()),
      this.bb.createObjList(this.values.bind(this), this.valuesLength()),
      this.extent()
    );
  }
  unpackTo(_o) {
    _o.version = this.version();
    _o.name = this.name();
    _o.features = this.bb.createObjList(this.features.bind(this), this.featuresLength());
    _o.keys = this.bb.createScalarList(this.keys.bind(this), this.keysLength());
    _o.values = this.bb.createObjList(this.values.bind(this), this.valuesLength());
    _o.extent = this.extent();
  }
};
var LayerT = class {
  constructor(version = 1, name = null, features = [], keys = [], values = [], extent = 4096) {
    this.version = version;
    this.name = name;
    this.features = features;
    this.keys = keys;
    this.values = values;
    this.extent = extent;
  }
  pack(builder) {
    const name = this.name !== null ? builder.createString(this.name) : 0;
    const features = Layer.createFeaturesVector(builder, builder.createObjectOffsetList(this.features));
    const keys = Layer.createKeysVector(builder, builder.createObjectOffsetList(this.keys));
    const values = Layer.createValuesVector(builder, builder.createObjectOffsetList(this.values));
    return Layer.createLayer(
      builder,
      this.version,
      name,
      features,
      keys,
      values,
      this.extent
    );
  }
};

// utils/flatbuffers/vector-tile/vector-tile/tile.ts
import * as flatbuffers4 from "flatbuffers";
var Tile = class _Tile {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsTile(bb, obj) {
    return (obj || new _Tile()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsTile(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers4.SIZE_PREFIX_LENGTH);
    return (obj || new _Tile()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  layers(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new Layer()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  layersLength() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  static startTile(builder) {
    builder.startObject(1);
  }
  static addLayers(builder, layersOffset) {
    builder.addFieldOffset(0, layersOffset, 0);
  }
  static createLayersVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startLayersVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static endTile(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static finishTileBuffer(builder, offset) {
    builder.finish(offset);
  }
  static finishSizePrefixedTileBuffer(builder, offset) {
    builder.finish(offset, void 0, true);
  }
  static createTile(builder, layersOffset) {
    _Tile.startTile(builder);
    _Tile.addLayers(builder, layersOffset);
    return _Tile.endTile(builder);
  }
  unpack() {
    return new TileT(
      this.bb.createObjList(this.layers.bind(this), this.layersLength())
    );
  }
  unpackTo(_o) {
    _o.layers = this.bb.createObjList(this.layers.bind(this), this.layersLength());
  }
};
var TileT = class {
  constructor(layers = []) {
    this.layers = layers;
  }
  pack(builder) {
    const layers = Tile.createLayersVector(builder, builder.createObjectOffsetList(this.layers));
    return Tile.createTile(
      builder,
      layers
    );
  }
};
export {
  vector_tile_exports as vector_tile
};
