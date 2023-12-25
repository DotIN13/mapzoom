// automatically generated by the FlatBuffers compiler, do not modify
import * as flatbuffers from 'flatbuffers';
import { Feature } from './feature.js';
import { Value } from './value.js';
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
        return offset ? this.bb.readUint8(this.bb_pos + offset) : 2;
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
        return offset ? this.bb.readUint16(this.bb_pos + offset) : 4096;
    }
    static startLayer(builder) {
        builder.startObject(6);
    }
    static addVersion(builder, version) {
        builder.addFieldInt8(0, version, 2);
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
        builder.addFieldInt16(5, extent, 4096);
    }
    static endLayer(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createLayer(builder, version, nameOffset, featuresOffset, keysOffset, valuesOffset, extent) {
        Layer.startLayer(builder);
        Layer.addVersion(builder, version);
        Layer.addName(builder, nameOffset);
        Layer.addFeatures(builder, featuresOffset);
        Layer.addKeys(builder, keysOffset);
        Layer.addValues(builder, valuesOffset);
        Layer.addExtent(builder, extent);
        return Layer.endLayer(builder);
    }
}