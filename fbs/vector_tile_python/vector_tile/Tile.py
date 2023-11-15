# automatically generated by the FlatBuffers compiler, do not modify

# namespace: vector_tile

import flatbuffers
from flatbuffers.compat import import_numpy
np = import_numpy()

class Tile(object):
    __slots__ = ['_tab']

    @classmethod
    def GetRootAs(cls, buf, offset=0):
        n = flatbuffers.encode.Get(flatbuffers.packer.uoffset, buf, offset)
        x = Tile()
        x.Init(buf, n + offset)
        return x

    @classmethod
    def GetRootAsTile(cls, buf, offset=0):
        """This method is deprecated. Please switch to GetRootAs."""
        return cls.GetRootAs(buf, offset)
    # Tile
    def Init(self, buf, pos):
        self._tab = flatbuffers.table.Table(buf, pos)

    # Tile
    def Layers(self, j):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            x = self._tab.Vector(o)
            x += flatbuffers.number_types.UOffsetTFlags.py_type(j) * 4
            x = self._tab.Indirect(x)
            from vector_tile.Layer import Layer
            obj = Layer()
            obj.Init(self._tab.Bytes, x)
            return obj
        return None

    # Tile
    def LayersLength(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            return self._tab.VectorLen(o)
        return 0

    # Tile
    def LayersIsNone(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        return o == 0

def TileStart(builder):
    builder.StartObject(1)

def Start(builder):
    TileStart(builder)

def TileAddLayers(builder, layers):
    builder.PrependUOffsetTRelativeSlot(0, flatbuffers.number_types.UOffsetTFlags.py_type(layers), 0)

def AddLayers(builder, layers):
    TileAddLayers(builder, layers)

def TileStartLayersVector(builder, numElems):
    return builder.StartVector(4, numElems, 4)

def StartLayersVector(builder, numElems: int) -> int:
    return TileStartLayersVector(builder, numElems)

def TileEnd(builder):
    return builder.EndObject()

def End(builder):
    return TileEnd(builder)