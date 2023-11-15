// automatically generated by the FlatBuffers compiler, do not modify
import * as flatbuffers from 'flatbuffers';
import { Feature } from '../vector-tile/feature.js';
export class Layer {
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
        return (obj || new Layer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsLayer(bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new Layer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
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
    stringValues(index, optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__string(this.bb.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
    }
    stringValuesLength() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    floatValues(index) {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readFloat32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    floatValuesLength() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    floatValuesArray() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? new Float32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    doubleValues(index) {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.readFloat64(this.bb.__vector(this.bb_pos + offset) + index * 8) : 0;
    }
    doubleValuesLength() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    doubleValuesArray() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? new Float64Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    intValues(index) {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    intValuesLength() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    intValuesArray() {
        const offset = this.bb.__offset(this.bb_pos, 18);
        return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    uintValues(index) {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    uintValuesLength() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    uintValuesArray() {
        const offset = this.bb.__offset(this.bb_pos, 20);
        return offset ? new Uint32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    boolValues(index) {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? !!this.bb.readInt8(this.bb.__vector(this.bb_pos + offset) + index) : false;
    }
    boolValuesLength() {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    boolValuesArray() {
        const offset = this.bb.__offset(this.bb_pos, 22);
        return offset ? new Int8Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    extent() {
        const offset = this.bb.__offset(this.bb_pos, 24);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 4096;
    }
    static startLayer(builder) {
        builder.startObject(11);
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
    static addStringValues(builder, stringValuesOffset) {
        builder.addFieldOffset(4, stringValuesOffset, 0);
    }
    static createStringValuesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addOffset(data[i]);
        }
        return builder.endVector();
    }
    static startStringValuesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addFloatValues(builder, floatValuesOffset) {
        builder.addFieldOffset(5, floatValuesOffset, 0);
    }
    static createFloatValuesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat32(data[i]);
        }
        return builder.endVector();
    }
    static startFloatValuesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addDoubleValues(builder, doubleValuesOffset) {
        builder.addFieldOffset(6, doubleValuesOffset, 0);
    }
    static createDoubleValuesVector(builder, data) {
        builder.startVector(8, data.length, 8);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addFloat64(data[i]);
        }
        return builder.endVector();
    }
    static startDoubleValuesVector(builder, numElems) {
        builder.startVector(8, numElems, 8);
    }
    static addIntValues(builder, intValuesOffset) {
        builder.addFieldOffset(7, intValuesOffset, 0);
    }
    static createIntValuesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startIntValuesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addUintValues(builder, uintValuesOffset) {
        builder.addFieldOffset(8, uintValuesOffset, 0);
    }
    static createUintValuesVector(builder, data) {
        builder.startVector(4, data.length, 4);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt32(data[i]);
        }
        return builder.endVector();
    }
    static startUintValuesVector(builder, numElems) {
        builder.startVector(4, numElems, 4);
    }
    static addBoolValues(builder, boolValuesOffset) {
        builder.addFieldOffset(9, boolValuesOffset, 0);
    }
    static createBoolValuesVector(builder, data) {
        builder.startVector(1, data.length, 1);
        for (let i = data.length - 1; i >= 0; i--) {
            builder.addInt8(+data[i]);
        }
        return builder.endVector();
    }
    static startBoolValuesVector(builder, numElems) {
        builder.startVector(1, numElems, 1);
    }
    static addExtent(builder, extent) {
        builder.addFieldInt32(10, extent, 4096);
    }
    static endLayer(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createLayer(builder, version, nameOffset, featuresOffset, keysOffset, stringValuesOffset, floatValuesOffset, doubleValuesOffset, intValuesOffset, uintValuesOffset, boolValuesOffset, extent) {
        Layer.startLayer(builder);
        Layer.addVersion(builder, version);
        Layer.addName(builder, nameOffset);
        Layer.addFeatures(builder, featuresOffset);
        Layer.addKeys(builder, keysOffset);
        Layer.addStringValues(builder, stringValuesOffset);
        Layer.addFloatValues(builder, floatValuesOffset);
        Layer.addDoubleValues(builder, doubleValuesOffset);
        Layer.addIntValues(builder, intValuesOffset);
        Layer.addUintValues(builder, uintValuesOffset);
        Layer.addBoolValues(builder, boolValuesOffset);
        Layer.addExtent(builder, extent);
        return Layer.endLayer(builder);
    }
    unpack() {
        return new LayerT(this.version(), this.name(), this.bb.createObjList(this.features.bind(this), this.featuresLength()), this.bb.createScalarList(this.keys.bind(this), this.keysLength()), this.bb.createScalarList(this.stringValues.bind(this), this.stringValuesLength()), this.bb.createScalarList(this.floatValues.bind(this), this.floatValuesLength()), this.bb.createScalarList(this.doubleValues.bind(this), this.doubleValuesLength()), this.bb.createScalarList(this.intValues.bind(this), this.intValuesLength()), this.bb.createScalarList(this.uintValues.bind(this), this.uintValuesLength()), this.bb.createScalarList(this.boolValues.bind(this), this.boolValuesLength()), this.extent());
    }
    unpackTo(_o) {
        _o.version = this.version();
        _o.name = this.name();
        _o.features = this.bb.createObjList(this.features.bind(this), this.featuresLength());
        _o.keys = this.bb.createScalarList(this.keys.bind(this), this.keysLength());
        _o.stringValues = this.bb.createScalarList(this.stringValues.bind(this), this.stringValuesLength());
        _o.floatValues = this.bb.createScalarList(this.floatValues.bind(this), this.floatValuesLength());
        _o.doubleValues = this.bb.createScalarList(this.doubleValues.bind(this), this.doubleValuesLength());
        _o.intValues = this.bb.createScalarList(this.intValues.bind(this), this.intValuesLength());
        _o.uintValues = this.bb.createScalarList(this.uintValues.bind(this), this.uintValuesLength());
        _o.boolValues = this.bb.createScalarList(this.boolValues.bind(this), this.boolValuesLength());
        _o.extent = this.extent();
    }
}
export class LayerT {
    constructor(version = 1, name = null, features = [], keys = [], stringValues = [], floatValues = [], doubleValues = [], intValues = [], uintValues = [], boolValues = [], extent = 4096) {
        this.version = version;
        this.name = name;
        this.features = features;
        this.keys = keys;
        this.stringValues = stringValues;
        this.floatValues = floatValues;
        this.doubleValues = doubleValues;
        this.intValues = intValues;
        this.uintValues = uintValues;
        this.boolValues = boolValues;
        this.extent = extent;
    }
    pack(builder) {
        const name = (this.name !== null ? builder.createString(this.name) : 0);
        const features = Layer.createFeaturesVector(builder, builder.createObjectOffsetList(this.features));
        const keys = Layer.createKeysVector(builder, builder.createObjectOffsetList(this.keys));
        const stringValues = Layer.createStringValuesVector(builder, builder.createObjectOffsetList(this.stringValues));
        const floatValues = Layer.createFloatValuesVector(builder, this.floatValues);
        const doubleValues = Layer.createDoubleValuesVector(builder, this.doubleValues);
        const intValues = Layer.createIntValuesVector(builder, this.intValues);
        const uintValues = Layer.createUintValuesVector(builder, this.uintValues);
        const boolValues = Layer.createBoolValuesVector(builder, this.boolValues);
        return Layer.createLayer(builder, this.version, name, features, keys, stringValues, floatValues, doubleValues, intValues, uintValues, boolValues, this.extent);
    }
}