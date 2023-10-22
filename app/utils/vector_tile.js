/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

const $Reader = $protobuf.Reader, $util = $protobuf.util;

const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const vector_tile = $root.vector_tile = (() => {

    const vector_tile = {};

    vector_tile.Tile = (function() {

        function Tile(p) {
            this.layers = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        Tile.prototype.layers = $util.emptyArray;

        Tile.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.vector_tile.Tile();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 3: {
                        if (!(m.layers && m.layers.length))
                            m.layers = [];
                        m.layers.push($root.vector_tile.Tile.Layer.decode(r, r.uint32()));
                        break;
                    }
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        Tile.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        Tile.verify = function verify(m) {
            if (typeof m !== "object" || m === null)
                return "object expected";
            if (m.layers != null && m.hasOwnProperty("layers")) {
                if (!Array.isArray(m.layers))
                    return "layers: array expected";
                for (var i = 0; i < m.layers.length; ++i) {
                    {
                        var e = $root.vector_tile.Tile.Layer.verify(m.layers[i]);
                        if (e)
                            return "layers." + e;
                    }
                }
            }
            return null;
        };

        Tile.fromObject = function fromObject(d) {
            if (d instanceof $root.vector_tile.Tile)
                return d;
            var m = new $root.vector_tile.Tile();
            if (d.layers) {
                if (!Array.isArray(d.layers))
                    throw TypeError(".vector_tile.Tile.layers: array expected");
                m.layers = [];
                for (var i = 0; i < d.layers.length; ++i) {
                    if (typeof d.layers[i] !== "object")
                        throw TypeError(".vector_tile.Tile.layers: object expected");
                    m.layers[i] = $root.vector_tile.Tile.Layer.fromObject(d.layers[i]);
                }
            }
            return m;
        };

        Tile.toObject = function toObject(m, o) {
            if (!o)
                o = {};
            var d = {};
            if (o.arrays || o.defaults) {
                d.layers = [];
            }
            if (m.layers && m.layers.length) {
                d.layers = [];
                for (var j = 0; j < m.layers.length; ++j) {
                    d.layers[j] = $root.vector_tile.Tile.Layer.toObject(m.layers[j], o);
                }
            }
            return d;
        };

        Tile.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        Tile.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/vector_tile.Tile";
        };

        Tile.GeomType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "UNKNOWN"] = 0;
            values[valuesById[1] = "POINT"] = 1;
            values[valuesById[2] = "LINESTRING"] = 2;
            values[valuesById[3] = "POLYGON"] = 3;
            return values;
        })();

        Tile.Value = (function() {

            function Value(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }

            Value.prototype.stringValue = "";
            Value.prototype.floatValue = 0;
            Value.prototype.doubleValue = 0;
            Value.prototype.intValue = $util.Long ? $util.Long.fromBits(0,0,false) : 0;
            Value.prototype.uintValue = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            Value.prototype.sintValue = $util.Long ? $util.Long.fromBits(0,0,false) : 0;
            Value.prototype.boolValue = false;

            Value.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.vector_tile.Tile.Value();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 1: {
                            m.stringValue = r.string();
                            break;
                        }
                    case 2: {
                            m.floatValue = r.float();
                            break;
                        }
                    case 3: {
                            m.doubleValue = r.double();
                            break;
                        }
                    case 4: {
                            m.intValue = r.int64();
                            break;
                        }
                    case 5: {
                            m.uintValue = r.uint64();
                            break;
                        }
                    case 6: {
                            m.sintValue = r.sint64();
                            break;
                        }
                    case 7: {
                            m.boolValue = r.bool();
                            break;
                        }
                    default:
                        r.skipType(t & 7);
                        break;
                    }
                }
                return m;
            };

            Value.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            Value.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.stringValue != null && m.hasOwnProperty("stringValue")) {
                    if (!$util.isString(m.stringValue))
                        return "stringValue: string expected";
                }
                if (m.floatValue != null && m.hasOwnProperty("floatValue")) {
                    if (typeof m.floatValue !== "number")
                        return "floatValue: number expected";
                }
                if (m.doubleValue != null && m.hasOwnProperty("doubleValue")) {
                    if (typeof m.doubleValue !== "number")
                        return "doubleValue: number expected";
                }
                if (m.intValue != null && m.hasOwnProperty("intValue")) {
                    if (!$util.isInteger(m.intValue) && !(m.intValue && $util.isInteger(m.intValue.low) && $util.isInteger(m.intValue.high)))
                        return "intValue: integer|Long expected";
                }
                if (m.uintValue != null && m.hasOwnProperty("uintValue")) {
                    if (!$util.isInteger(m.uintValue) && !(m.uintValue && $util.isInteger(m.uintValue.low) && $util.isInteger(m.uintValue.high)))
                        return "uintValue: integer|Long expected";
                }
                if (m.sintValue != null && m.hasOwnProperty("sintValue")) {
                    if (!$util.isInteger(m.sintValue) && !(m.sintValue && $util.isInteger(m.sintValue.low) && $util.isInteger(m.sintValue.high)))
                        return "sintValue: integer|Long expected";
                }
                if (m.boolValue != null && m.hasOwnProperty("boolValue")) {
                    if (typeof m.boolValue !== "boolean")
                        return "boolValue: boolean expected";
                }
                return null;
            };

            Value.fromObject = function fromObject(d) {
                if (d instanceof $root.vector_tile.Tile.Value)
                    return d;
                var m = new $root.vector_tile.Tile.Value();
                if (d.stringValue != null) {
                    m.stringValue = String(d.stringValue);
                }
                if (d.floatValue != null) {
                    m.floatValue = Number(d.floatValue);
                }
                if (d.doubleValue != null) {
                    m.doubleValue = Number(d.doubleValue);
                }
                if (d.intValue != null) {
                    if ($util.Long)
                        (m.intValue = $util.Long.fromValue(d.intValue)).unsigned = false;
                    else if (typeof d.intValue === "string")
                        m.intValue = parseInt(d.intValue, 10);
                    else if (typeof d.intValue === "number")
                        m.intValue = d.intValue;
                    else if (typeof d.intValue === "object")
                        m.intValue = new $util.LongBits(d.intValue.low >>> 0, d.intValue.high >>> 0).toNumber();
                }
                if (d.uintValue != null) {
                    if ($util.Long)
                        (m.uintValue = $util.Long.fromValue(d.uintValue)).unsigned = true;
                    else if (typeof d.uintValue === "string")
                        m.uintValue = parseInt(d.uintValue, 10);
                    else if (typeof d.uintValue === "number")
                        m.uintValue = d.uintValue;
                    else if (typeof d.uintValue === "object")
                        m.uintValue = new $util.LongBits(d.uintValue.low >>> 0, d.uintValue.high >>> 0).toNumber(true);
                }
                if (d.sintValue != null) {
                    if ($util.Long)
                        (m.sintValue = $util.Long.fromValue(d.sintValue)).unsigned = false;
                    else if (typeof d.sintValue === "string")
                        m.sintValue = parseInt(d.sintValue, 10);
                    else if (typeof d.sintValue === "number")
                        m.sintValue = d.sintValue;
                    else if (typeof d.sintValue === "object")
                        m.sintValue = new $util.LongBits(d.sintValue.low >>> 0, d.sintValue.high >>> 0).toNumber();
                }
                if (d.boolValue != null) {
                    m.boolValue = Boolean(d.boolValue);
                }
                return m;
            };

            Value.toObject = function toObject(m, o) {
                if (!o)
                    o = {};
                var d = {};
                if (o.defaults) {
                    d.stringValue = "";
                    d.floatValue = 0;
                    d.doubleValue = 0;
                    if ($util.Long) {
                        var n = new $util.Long(0, 0, false);
                        d.intValue = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
                    } else
                        d.intValue = o.longs === String ? "0" : 0;
                    if ($util.Long) {
                        var n = new $util.Long(0, 0, true);
                        d.uintValue = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
                    } else
                        d.uintValue = o.longs === String ? "0" : 0;
                    if ($util.Long) {
                        var n = new $util.Long(0, 0, false);
                        d.sintValue = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
                    } else
                        d.sintValue = o.longs === String ? "0" : 0;
                    d.boolValue = false;
                }
                if (m.stringValue != null && m.hasOwnProperty("stringValue")) {
                    d.stringValue = m.stringValue;
                }
                if (m.floatValue != null && m.hasOwnProperty("floatValue")) {
                    d.floatValue = o.json && !isFinite(m.floatValue) ? String(m.floatValue) : m.floatValue;
                }
                if (m.doubleValue != null && m.hasOwnProperty("doubleValue")) {
                    d.doubleValue = o.json && !isFinite(m.doubleValue) ? String(m.doubleValue) : m.doubleValue;
                }
                if (m.intValue != null && m.hasOwnProperty("intValue")) {
                    if (typeof m.intValue === "number")
                        d.intValue = o.longs === String ? String(m.intValue) : m.intValue;
                    else
                        d.intValue = o.longs === String ? $util.Long.prototype.toString.call(m.intValue) : o.longs === Number ? new $util.LongBits(m.intValue.low >>> 0, m.intValue.high >>> 0).toNumber() : m.intValue;
                }
                if (m.uintValue != null && m.hasOwnProperty("uintValue")) {
                    if (typeof m.uintValue === "number")
                        d.uintValue = o.longs === String ? String(m.uintValue) : m.uintValue;
                    else
                        d.uintValue = o.longs === String ? $util.Long.prototype.toString.call(m.uintValue) : o.longs === Number ? new $util.LongBits(m.uintValue.low >>> 0, m.uintValue.high >>> 0).toNumber(true) : m.uintValue;
                }
                if (m.sintValue != null && m.hasOwnProperty("sintValue")) {
                    if (typeof m.sintValue === "number")
                        d.sintValue = o.longs === String ? String(m.sintValue) : m.sintValue;
                    else
                        d.sintValue = o.longs === String ? $util.Long.prototype.toString.call(m.sintValue) : o.longs === Number ? new $util.LongBits(m.sintValue.low >>> 0, m.sintValue.high >>> 0).toNumber() : m.sintValue;
                }
                if (m.boolValue != null && m.hasOwnProperty("boolValue")) {
                    d.boolValue = m.boolValue;
                }
                return d;
            };

            Value.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            Value.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/vector_tile.Tile.Value";
            };

            return Value;
        })();

        Tile.Feature = (function() {

            function Feature(p) {
                this.tags = [];
                this.geometry = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }

            Feature.prototype.id = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            Feature.prototype.tags = $util.emptyArray;
            Feature.prototype.type = 0;
            Feature.prototype.geometry = $util.emptyArray;

            Feature.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.vector_tile.Tile.Feature();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 1: {
                            m.id = r.uint64();
                            break;
                        }
                    case 2: {
                            if (!(m.tags && m.tags.length))
                                m.tags = [];
                            if ((t & 7) === 2) {
                                var c2 = r.uint32() + r.pos;
                                while (r.pos < c2)
                                    m.tags.push(r.uint32());
                            } else
                                m.tags.push(r.uint32());
                            break;
                        }
                    case 3: {
                            m.type = r.int32();
                            break;
                        }
                    case 4: {
                            if (!(m.geometry && m.geometry.length))
                                m.geometry = [];
                            if ((t & 7) === 2) {
                                var c2 = r.uint32() + r.pos;
                                while (r.pos < c2)
                                    m.geometry.push(r.uint32());
                            } else
                                m.geometry.push(r.uint32());
                            break;
                        }
                    default:
                        r.skipType(t & 7);
                        break;
                    }
                }
                return m;
            };

            Feature.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            Feature.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.id != null && m.hasOwnProperty("id")) {
                    if (!$util.isInteger(m.id) && !(m.id && $util.isInteger(m.id.low) && $util.isInteger(m.id.high)))
                        return "id: integer|Long expected";
                }
                if (m.tags != null && m.hasOwnProperty("tags")) {
                    if (!Array.isArray(m.tags))
                        return "tags: array expected";
                    for (var i = 0; i < m.tags.length; ++i) {
                        if (!$util.isInteger(m.tags[i]))
                            return "tags: integer[] expected";
                    }
                }
                if (m.type != null && m.hasOwnProperty("type")) {
                    switch (m.type) {
                    default:
                        return "type: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.geometry != null && m.hasOwnProperty("geometry")) {
                    if (!Array.isArray(m.geometry))
                        return "geometry: array expected";
                    for (var i = 0; i < m.geometry.length; ++i) {
                        if (!$util.isInteger(m.geometry[i]))
                            return "geometry: integer[] expected";
                    }
                }
                return null;
            };

            Feature.fromObject = function fromObject(d) {
                if (d instanceof $root.vector_tile.Tile.Feature)
                    return d;
                var m = new $root.vector_tile.Tile.Feature();
                if (d.id != null) {
                    if ($util.Long)
                        (m.id = $util.Long.fromValue(d.id)).unsigned = true;
                    else if (typeof d.id === "string")
                        m.id = parseInt(d.id, 10);
                    else if (typeof d.id === "number")
                        m.id = d.id;
                    else if (typeof d.id === "object")
                        m.id = new $util.LongBits(d.id.low >>> 0, d.id.high >>> 0).toNumber(true);
                }
                if (d.tags) {
                    if (!Array.isArray(d.tags))
                        throw TypeError(".vector_tile.Tile.Feature.tags: array expected");
                    m.tags = [];
                    for (var i = 0; i < d.tags.length; ++i) {
                        m.tags[i] = d.tags[i] >>> 0;
                    }
                }
                switch (d.type) {
                default:
                    if (typeof d.type === "number") {
                        m.type = d.type;
                        break;
                    }
                    break;
                case "UNKNOWN":
                case 0:
                    m.type = 0;
                    break;
                case "POINT":
                case 1:
                    m.type = 1;
                    break;
                case "LINESTRING":
                case 2:
                    m.type = 2;
                    break;
                case "POLYGON":
                case 3:
                    m.type = 3;
                    break;
                }
                if (d.geometry) {
                    if (!Array.isArray(d.geometry))
                        throw TypeError(".vector_tile.Tile.Feature.geometry: array expected");
                    m.geometry = [];
                    for (var i = 0; i < d.geometry.length; ++i) {
                        m.geometry[i] = d.geometry[i] >>> 0;
                    }
                }
                return m;
            };

            Feature.toObject = function toObject(m, o) {
                if (!o)
                    o = {};
                var d = {};
                if (o.arrays || o.defaults) {
                    d.tags = [];
                    d.geometry = [];
                }
                if (o.defaults) {
                    if ($util.Long) {
                        var n = new $util.Long(0, 0, true);
                        d.id = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
                    } else
                        d.id = o.longs === String ? "0" : 0;
                    d.type = o.enums === String ? "UNKNOWN" : 0;
                }
                if (m.id != null && m.hasOwnProperty("id")) {
                    if (typeof m.id === "number")
                        d.id = o.longs === String ? String(m.id) : m.id;
                    else
                        d.id = o.longs === String ? $util.Long.prototype.toString.call(m.id) : o.longs === Number ? new $util.LongBits(m.id.low >>> 0, m.id.high >>> 0).toNumber(true) : m.id;
                }
                if (m.tags && m.tags.length) {
                    d.tags = [];
                    for (var j = 0; j < m.tags.length; ++j) {
                        d.tags[j] = m.tags[j];
                    }
                }
                if (m.type != null && m.hasOwnProperty("type")) {
                    d.type = o.enums === String ? $root.vector_tile.Tile.GeomType[m.type] === undefined ? m.type : $root.vector_tile.Tile.GeomType[m.type] : m.type;
                }
                if (m.geometry && m.geometry.length) {
                    d.geometry = [];
                    for (var j = 0; j < m.geometry.length; ++j) {
                        d.geometry[j] = m.geometry[j];
                    }
                }
                return d;
            };

            Feature.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            Feature.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/vector_tile.Tile.Feature";
            };

            return Feature;
        })();

        Tile.Layer = (function() {

            function Layer(p) {
                this.features = [];
                this.keys = [];
                this.values = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }

            Layer.prototype.version = 1;
            Layer.prototype.name = "";
            Layer.prototype.features = $util.emptyArray;
            Layer.prototype.keys = $util.emptyArray;
            Layer.prototype.values = $util.emptyArray;
            Layer.prototype.extent = 4096;

            Layer.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.vector_tile.Tile.Layer();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 15: {
                            m.version = r.uint32();
                            break;
                        }
                    case 1: {
                            m.name = r.string();
                            break;
                        }
                    case 2: {
                            if (!(m.features && m.features.length))
                                m.features = [];
                            m.features.push($root.vector_tile.Tile.Feature.decode(r, r.uint32()));
                            break;
                        }
                    case 3: {
                            if (!(m.keys && m.keys.length))
                                m.keys = [];
                            m.keys.push(r.string());
                            break;
                        }
                    case 4: {
                            if (!(m.values && m.values.length))
                                m.values = [];
                            m.values.push($root.vector_tile.Tile.Value.decode(r, r.uint32()));
                            break;
                        }
                    case 5: {
                            m.extent = r.uint32();
                            break;
                        }
                    default:
                        r.skipType(t & 7);
                        break;
                    }
                }
                if (!m.hasOwnProperty("version"))
                    throw $util.ProtocolError("missing required 'version'", { instance: m });
                if (!m.hasOwnProperty("name"))
                    throw $util.ProtocolError("missing required 'name'", { instance: m });
                return m;
            };

            Layer.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            Layer.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.version))
                    return "version: integer expected";
                if (!$util.isString(m.name))
                    return "name: string expected";
                if (m.features != null && m.hasOwnProperty("features")) {
                    if (!Array.isArray(m.features))
                        return "features: array expected";
                    for (var i = 0; i < m.features.length; ++i) {
                        {
                            var e = $root.vector_tile.Tile.Feature.verify(m.features[i]);
                            if (e)
                                return "features." + e;
                        }
                    }
                }
                if (m.keys != null && m.hasOwnProperty("keys")) {
                    if (!Array.isArray(m.keys))
                        return "keys: array expected";
                    for (var i = 0; i < m.keys.length; ++i) {
                        if (!$util.isString(m.keys[i]))
                            return "keys: string[] expected";
                    }
                }
                if (m.values != null && m.hasOwnProperty("values")) {
                    if (!Array.isArray(m.values))
                        return "values: array expected";
                    for (var i = 0; i < m.values.length; ++i) {
                        {
                            var e = $root.vector_tile.Tile.Value.verify(m.values[i]);
                            if (e)
                                return "values." + e;
                        }
                    }
                }
                if (m.extent != null && m.hasOwnProperty("extent")) {
                    if (!$util.isInteger(m.extent))
                        return "extent: integer expected";
                }
                return null;
            };

            Layer.fromObject = function fromObject(d) {
                if (d instanceof $root.vector_tile.Tile.Layer)
                    return d;
                var m = new $root.vector_tile.Tile.Layer();
                if (d.version != null) {
                    m.version = d.version >>> 0;
                }
                if (d.name != null) {
                    m.name = String(d.name);
                }
                if (d.features) {
                    if (!Array.isArray(d.features))
                        throw TypeError(".vector_tile.Tile.Layer.features: array expected");
                    m.features = [];
                    for (var i = 0; i < d.features.length; ++i) {
                        if (typeof d.features[i] !== "object")
                            throw TypeError(".vector_tile.Tile.Layer.features: object expected");
                        m.features[i] = $root.vector_tile.Tile.Feature.fromObject(d.features[i]);
                    }
                }
                if (d.keys) {
                    if (!Array.isArray(d.keys))
                        throw TypeError(".vector_tile.Tile.Layer.keys: array expected");
                    m.keys = [];
                    for (var i = 0; i < d.keys.length; ++i) {
                        m.keys[i] = String(d.keys[i]);
                    }
                }
                if (d.values) {
                    if (!Array.isArray(d.values))
                        throw TypeError(".vector_tile.Tile.Layer.values: array expected");
                    m.values = [];
                    for (var i = 0; i < d.values.length; ++i) {
                        if (typeof d.values[i] !== "object")
                            throw TypeError(".vector_tile.Tile.Layer.values: object expected");
                        m.values[i] = $root.vector_tile.Tile.Value.fromObject(d.values[i]);
                    }
                }
                if (d.extent != null) {
                    m.extent = d.extent >>> 0;
                }
                return m;
            };

            Layer.toObject = function toObject(m, o) {
                if (!o)
                    o = {};
                var d = {};
                if (o.arrays || o.defaults) {
                    d.features = [];
                    d.keys = [];
                    d.values = [];
                }
                if (o.defaults) {
                    d.name = "";
                    d.extent = 4096;
                    d.version = 1;
                }
                if (m.name != null && m.hasOwnProperty("name")) {
                    d.name = m.name;
                }
                if (m.features && m.features.length) {
                    d.features = [];
                    for (var j = 0; j < m.features.length; ++j) {
                        d.features[j] = $root.vector_tile.Tile.Feature.toObject(m.features[j], o);
                    }
                }
                if (m.keys && m.keys.length) {
                    d.keys = [];
                    for (var j = 0; j < m.keys.length; ++j) {
                        d.keys[j] = m.keys[j];
                    }
                }
                if (m.values && m.values.length) {
                    d.values = [];
                    for (var j = 0; j < m.values.length; ++j) {
                        d.values[j] = $root.vector_tile.Tile.Value.toObject(m.values[j], o);
                    }
                }
                if (m.extent != null && m.hasOwnProperty("extent")) {
                    d.extent = m.extent;
                }
                if (m.version != null && m.hasOwnProperty("version")) {
                    d.version = m.version;
                }
                return d;
            };

            Layer.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            Layer.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/vector_tile.Tile.Layer";
            };

            return Layer;
        })();

        return Tile;
    })();

    return vector_tile;
})();

export { $root as default };
