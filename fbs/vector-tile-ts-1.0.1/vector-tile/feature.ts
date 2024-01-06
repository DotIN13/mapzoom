// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { GeomType } from './geom-type.js';


export class Feature {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Feature {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsFeature(bb:flatbuffers.ByteBuffer, obj?:Feature):Feature {
  return (obj || new Feature()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsFeature(bb:flatbuffers.ByteBuffer, obj?:Feature):Feature {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Feature()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

coverage():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : 0;
}

nameZh():string|null
nameZh(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
nameZh(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

nameEn():string|null
nameEn(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
nameEn(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

nameDetail():string|null
nameDetail(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
nameDetail(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

pmapKind():string|null
pmapKind(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
pmapKind(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

pmapMinZoom():number {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : 0;
}

type():GeomType {
  const offset = this.bb!.__offset(this.bb_pos, 18);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : GeomType.UNKNOWN;
}

geometry(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 20);
  return offset ? this.bb!.readInt16(this.bb!.__vector(this.bb_pos + offset) + index * 2) : 0;
}

geometryLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 20);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

geometryArray():Int16Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 20);
  return offset ? new Int16Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startFeature(builder:flatbuffers.Builder) {
  builder.startObject(9);
}

static addId(builder:flatbuffers.Builder, id:number) {
  builder.addFieldInt32(0, id, 0);
}

static addCoverage(builder:flatbuffers.Builder, coverage:number) {
  builder.addFieldInt16(1, coverage, 0);
}

static addNameZh(builder:flatbuffers.Builder, nameZhOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, nameZhOffset, 0);
}

static addNameEn(builder:flatbuffers.Builder, nameEnOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, nameEnOffset, 0);
}

static addNameDetail(builder:flatbuffers.Builder, nameDetailOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, nameDetailOffset, 0);
}

static addPmapKind(builder:flatbuffers.Builder, pmapKindOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, pmapKindOffset, 0);
}

static addPmapMinZoom(builder:flatbuffers.Builder, pmapMinZoom:number) {
  builder.addFieldInt8(6, pmapMinZoom, 0);
}

static addType(builder:flatbuffers.Builder, type:GeomType) {
  builder.addFieldInt8(7, type, GeomType.UNKNOWN);
}

static addGeometry(builder:flatbuffers.Builder, geometryOffset:flatbuffers.Offset) {
  builder.addFieldOffset(8, geometryOffset, 0);
}

static createGeometryVector(builder:flatbuffers.Builder, data:number[]|Int16Array):flatbuffers.Offset;
/**
 * @deprecated This Uint8Array overload will be removed in the future.
 */
static createGeometryVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset;
static createGeometryVector(builder:flatbuffers.Builder, data:number[]|Int16Array|Uint8Array):flatbuffers.Offset {
  builder.startVector(2, data.length, 2);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt16(data[i]!);
  }
  return builder.endVector();
}

static startGeometryVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(2, numElems, 2);
}

static endFeature(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createFeature(builder:flatbuffers.Builder, id:number, coverage:number, nameZhOffset:flatbuffers.Offset, nameEnOffset:flatbuffers.Offset, nameDetailOffset:flatbuffers.Offset, pmapKindOffset:flatbuffers.Offset, pmapMinZoom:number, type:GeomType, geometryOffset:flatbuffers.Offset):flatbuffers.Offset {
  Feature.startFeature(builder);
  Feature.addId(builder, id);
  Feature.addCoverage(builder, coverage);
  Feature.addNameZh(builder, nameZhOffset);
  Feature.addNameEn(builder, nameEnOffset);
  Feature.addNameDetail(builder, nameDetailOffset);
  Feature.addPmapKind(builder, pmapKindOffset);
  Feature.addPmapMinZoom(builder, pmapMinZoom);
  Feature.addType(builder, type);
  Feature.addGeometry(builder, geometryOffset);
  return Feature.endFeature(builder);
}
}