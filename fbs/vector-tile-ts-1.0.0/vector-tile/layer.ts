// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { Feature } from './feature.js';
import { Value } from './value.js';


export class Layer {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Layer {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsLayer(bb:flatbuffers.ByteBuffer, obj?:Layer):Layer {
  return (obj || new Layer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsLayer(bb:flatbuffers.ByteBuffer, obj?:Layer):Layer {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Layer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

version():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : 2;
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

features(index: number, obj?:Feature):Feature|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new Feature()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

featuresLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

keys(index: number):string
keys(index: number,optionalEncoding:flatbuffers.Encoding):string|Uint8Array
keys(index: number,optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb!.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
}

keysLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

values(index: number, obj?:Value):Value|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? (obj || new Value()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

valuesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

extent():number {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : 4096;
}

static startLayer(builder:flatbuffers.Builder) {
  builder.startObject(6);
}

static addVersion(builder:flatbuffers.Builder, version:number) {
  builder.addFieldInt8(0, version, 2);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, nameOffset, 0);
}

static addFeatures(builder:flatbuffers.Builder, featuresOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, featuresOffset, 0);
}

static createFeaturesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startFeaturesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addKeys(builder:flatbuffers.Builder, keysOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, keysOffset, 0);
}

static createKeysVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startKeysVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addValues(builder:flatbuffers.Builder, valuesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, valuesOffset, 0);
}

static createValuesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startValuesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static addExtent(builder:flatbuffers.Builder, extent:number) {
  builder.addFieldInt16(5, extent, 4096);
}

static endLayer(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createLayer(builder:flatbuffers.Builder, version:number, nameOffset:flatbuffers.Offset, featuresOffset:flatbuffers.Offset, keysOffset:flatbuffers.Offset, valuesOffset:flatbuffers.Offset, extent:number):flatbuffers.Offset {
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