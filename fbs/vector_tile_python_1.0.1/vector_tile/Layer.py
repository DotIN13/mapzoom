# automatically generated by the FlatBuffers compiler, do not modify

# namespace: vector_tile

import flatbuffers
from flatbuffers.compat import import_numpy
np = import_numpy()

class Layer(object):
    __slots__ = ['_tab']

    @classmethod
    def GetRootAs(cls, buf, offset=0):
        n = flatbuffers.encode.Get(flatbuffers.packer.uoffset, buf, offset)
        x = Layer()
        x.Init(buf, n + offset)
        return x

    @classmethod
    def GetRootAsLayer(cls, buf, offset=0):
        """This method is deprecated. Please switch to GetRootAs."""
        return cls.GetRootAs(buf, offset)
    # Layer
    def Init(self, buf, pos):
        self._tab = flatbuffers.table.Table(buf, pos)

    # Layer
    def Version(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Uint8Flags, o + self._tab.Pos)
        return 2

    # Layer
    def Name(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(6))
        if o != 0:
            return self._tab.String(o + self._tab.Pos)
        return None

    # Layer
    def Features(self, j):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        if o != 0:
            x = self._tab.Vector(o)
            x += flatbuffers.number_types.UOffsetTFlags.py_type(j) * 4
            x = self._tab.Indirect(x)
            from vector_tile.Feature import Feature
            obj = Feature()
            obj.Init(self._tab.Bytes, x)
            return obj
        return None

    # Layer
    def FeaturesLength(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        if o != 0:
            return self._tab.VectorLen(o)
        return 0

    # Layer
    def FeaturesIsNone(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        return o == 0

    # Layer
    def Extent(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(10))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Uint16Flags, o + self._tab.Pos)
        return 4096

def LayerStart(builder):
    builder.StartObject(4)

def Start(builder):
    LayerStart(builder)

def LayerAddVersion(builder, version):
    builder.PrependUint8Slot(0, version, 2)

def AddVersion(builder, version):
    LayerAddVersion(builder, version)

def LayerAddName(builder, name):
    builder.PrependUOffsetTRelativeSlot(1, flatbuffers.number_types.UOffsetTFlags.py_type(name), 0)

def AddName(builder, name):
    LayerAddName(builder, name)

def LayerAddFeatures(builder, features):
    builder.PrependUOffsetTRelativeSlot(2, flatbuffers.number_types.UOffsetTFlags.py_type(features), 0)

def AddFeatures(builder, features):
    LayerAddFeatures(builder, features)

def LayerStartFeaturesVector(builder, numElems):
    return builder.StartVector(4, numElems, 4)

def StartFeaturesVector(builder, numElems: int) -> int:
    return LayerStartFeaturesVector(builder, numElems)

def LayerAddExtent(builder, extent):
    builder.PrependUint16Slot(3, extent, 4096)

def AddExtent(builder, extent):
    LayerAddExtent(builder, extent)

def LayerEnd(builder):
    return builder.EndObject()

def End(builder):
    return LayerEnd(builder)
