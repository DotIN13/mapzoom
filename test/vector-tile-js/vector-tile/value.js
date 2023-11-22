// automatically generated by the FlatBuffers compiler, do not modify
import * as flatbuffers from 'flatbuffers';
import { TagType } from './tag-type.js';
export class Value {
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
        return (obj || new Value()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsValue(bb, obj) {
        bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
        return (obj || new Value()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    tagType() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readInt8(this.bb_pos + offset) : TagType.STRING;
    }
    stringValue(optionalEncoding) {
        const offset = this.bb.__offset(this.bb_pos, 6);
        return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    floatValue() {
        const offset = this.bb.__offset(this.bb_pos, 8);
        return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0.0;
    }
    doubleValue() {
        const offset = this.bb.__offset(this.bb_pos, 10);
        return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0.0;
    }
    intValue() {
        const offset = this.bb.__offset(this.bb_pos, 12);
        return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    uintValue() {
        const offset = this.bb.__offset(this.bb_pos, 14);
        return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
    }
    boolValue() {
        const offset = this.bb.__offset(this.bb_pos, 16);
        return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    static startValue(builder) {
        builder.startObject(7);
    }
    static addTagType(builder, tagType) {
        builder.addFieldInt8(0, tagType, TagType.STRING);
    }
    static addStringValue(builder, stringValueOffset) {
        builder.addFieldOffset(1, stringValueOffset, 0);
    }
    static addFloatValue(builder, floatValue) {
        builder.addFieldFloat32(2, floatValue, 0.0);
    }
    static addDoubleValue(builder, doubleValue) {
        builder.addFieldFloat64(3, doubleValue, 0.0);
    }
    static addIntValue(builder, intValue) {
        builder.addFieldInt32(4, intValue, 0);
    }
    static addUintValue(builder, uintValue) {
        builder.addFieldInt32(5, uintValue, 0);
    }
    static addBoolValue(builder, boolValue) {
        builder.addFieldInt8(6, +boolValue, +false);
    }
    static endValue(builder) {
        const offset = builder.endObject();
        return offset;
    }
    static createValue(builder, tagType, stringValueOffset, floatValue, doubleValue, intValue, uintValue, boolValue) {
        Value.startValue(builder);
        Value.addTagType(builder, tagType);
        Value.addStringValue(builder, stringValueOffset);
        Value.addFloatValue(builder, floatValue);
        Value.addDoubleValue(builder, doubleValue);
        Value.addIntValue(builder, intValue);
        Value.addUintValue(builder, uintValue);
        Value.addBoolValue(builder, boolValue);
        return Value.endValue(builder);
    }
}
