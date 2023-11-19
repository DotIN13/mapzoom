export default class GzipDecompressor {
  constructor() {
    this.fleb = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
      5, 5, 5, 0, 0, 0, 0,
    ]);
    this.fdeb = new Uint8Array([
      0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
      11, 11, 12, 12, 13, 13, 0, 0,
    ]);
    this.clim = new Uint8Array([
      16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
    ]);

    const _a = this._freb(this.fleb, 2);
    this.fl = _a.b;
    this.revfl = _a.r;
    this.fl[28] = 258;
    this.revfl[258] = 28;

    const _b = this._freb(this.fdeb, 0);
    this.fd = _b.b;

    this.rev = new Uint16Array(32768);
    for (let i = 0; i < 32768; ++i) {
      // reverse table algorithm from SO
      let x = ((i & 0xaaaa) >> 1) | ((i & 0x5555) << 1);
      x = ((x & 0xcccc) >> 2) | ((x & 0x3333) << 2);
      x = ((x & 0xf0f0) >> 4) | ((x & 0x0f0f) << 4);
      this.rev[i] = (((x & 0xff00) >> 8) | ((x & 0x00ff) << 8)) >> 1;
    }

    const flt = new Uint8Array(288);
    for (let i = 0; i < 144; ++i) flt[i] = 8;
    for (let i = 144; i < 256; ++i) flt[i] = 9;
    for (let i = 256; i < 280; ++i) flt[i] = 7;
    for (let i = 280; i < 288; ++i) flt[i] = 8;

    const fdt = new Uint8Array(32);
    for (let i = 0; i < 32; ++i) fdt[i] = 5;

    this.flrm = this._hMap(flt, 9, 1);
    this.fdrm = this._hMap(fdt, 5, 1);
  }

  get ec() {
    return [
      "unexpected EOF",
      "invalid block type",
      "invalid length/literal",
      "invalid distance",
      "stream finished",
      "no stream handler",
      "invalid gzip data",
      "no callback",
      "invalid UTF-8 data",
      "extra field too long",
      "date not in range 1980-2099",
      "filename too long",
      "stream finishing",
      "invalid zip data",
    ];
  }

  _err(ind, msg = null, nt = false) {
    const e = new Error(msg || this.ec[ind]);
    e.code = ind;
    if (!nt) throw e;
    return e;
  }

  _freb(eb, start) {
    const b = new Uint16Array(31);
    for (let i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    const r = new Int32Array(b[30]);
    for (let i = 1; i < 30; ++i) {
      for (let j = b[i]; j < b[i + 1]; ++j) {
        r[j] = ((j - b[i]) << 5) | i;
      }
    }
    return { b: b, r: r };
  }

  _hMap(cd, mb, r) {
    const s = cd.length;
    // index
    let i = 0;
    // u16 "map": index -> # of codes with bit length = index
    const l = new Uint16Array(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i) {
      if (cd[i]) ++l[cd[i] - 1];
    }
    // u16 "map": index -> minimum code for bit length = index
    const le = new Uint16Array(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    let co;
    if (r) {
      // u16 "map": index -> number of actual bits, symbol for code
      co = new Uint16Array(1 << mb);
      // bits to remove for reverser
      const rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        // ignore 0 lengths
        if (cd[i]) {
          // num encoding both symbol and bits read
          const sv = (i << 4) | cd[i];
          // free bits
          const r_1 = mb - cd[i];
          // start value
          let v = le[cd[i] - 1]++ << r_1;
          // m is end value
          for (let m = v | ((1 << r_1) - 1); v <= m; ++v) {
            // every 16 bit value starting with the code yields the same result
            co[this.rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new Uint16Array(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = this.rev[le[cd[i] - 1]++] >> (15 - cd[i]);
        }
      }
    }
    return co;
  }

  _max(a) {
    const m = a[0];
    for (let i = 1; i < a.length; ++i) {
      if (a[i] > m) m = a[i];
    }
    return m;
  }

  _bits(d, p, m) {
    const o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
  }

  _bits16(d, p) {
    const o = (p / 8) | 0;
    return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7);
  }

  _shft(p) {
    return ((p + 7) / 8) | 0;
  }

  _slc(v, s, e) {
    if (s == null || s < 0) s = 0;
    if (e == null || e > v.length) e = v.length;
    // can't use .constructor in case user-supplied
    return new Uint8Array(v.subarray(s, e));
  }

  _gzs(d) {
    if (d[0] != 31 || d[1] != 139 || d[2] != 8)
      this._err(6, "invalid gzip data");
    const flg = d[3];
    const st = 10;
    if (flg & 4) st += (d[10] | (d[11] << 8)) + 2;
    for (let zs = ((flg >> 3) & 1) + ((flg >> 4) & 1); zs > 0; zs -= !d[st++]);
    return st + (flg & 2);
  }

  _gzl(d) {
    const l = d.length;
    return (
      (d[l - 4] | (d[l - 3] << 8) | (d[l - 2] << 16) | (d[l - 1] << 24)) >>> 0
    );
  }

  _inflt(dat, st, buf, dict) {
    // source length       dict length
    const sl = dat.length,
      dl = dict ? dict.length : 0;
    if (!sl || (st.f && !st.l)) return buf || new Uint8Array(0);
    const noBuf = !buf;
    // have to estimate size
    const resize = noBuf || st.i != 2;
    // no state
    const noSt = st.i;
    // Assumes roughly 33% compression ratio average
    if (noBuf) buf = new Uint8Array(sl * 3);
    // ensure buffer can fit at least l elements
    const cbuf = function (l) {
      const bl = buf.length;
      // need to increase size to fit
      if (l > bl) {
        // Double or set to necessary, whichever is greater
        const nbuf = new Uint8Array(Math.max(bl * 2, l));
        nbuf.set(buf);
        buf = nbuf;
      }
    };
    //  last chunk         bitpos           bytes
    let final = st.f || 0,
      pos = st.p || 0,
      bt = st.b || 0,
      lm = st.l,
      dm = st.d,
      lbt = st.m,
      dbt = st.n;
    // total bits
    const tbts = sl * 8;
    do {
      if (!lm) {
        // BFINAL - this is only 1 when last chunk is next
        final = this._bits(dat, pos, 1);
        // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
        const type = this._bits(dat, pos + 1, 3);
        pos += 3;
        if (!type) {
          // go to end of byte boundary
          const s = this._shft(pos) + 4,
            l = dat[s - 4] | (dat[s - 3] << 8),
            t = s + l;
          if (t > sl) {
            if (noSt) this._err(0);
            break;
          }
          // ensure size
          if (resize) cbuf(bt + l);
          // Copy over uncompressed data
          buf.set(dat.subarray(s, t), bt);
          // Get new bitpos, update byte count
          (st.b = bt += l), (st.p = pos = t * 8), (st.f = final);
          continue;
        } else if (type == 1)
          (lm = this.flrm), (dm = this.fdrm), (lbt = 9), (dbt = 5);
        else if (type == 2) {
          //  literal                            lengths
          const hLit = this._bits(dat, pos, 31) + 257,
            hcLen = this._bits(dat, pos + 10, 15) + 4;
          const tl = hLit + this._bits(dat, pos + 5, 31) + 1;
          pos += 14;
          // length+distance tree
          const ldt = new Uint8Array(tl);
          // code length tree
          const clt = new Uint8Array(19);
          for (let i = 0; i < hcLen; ++i) {
            // use index map to get real code
            clt[this.clim[i]] = this._bits(dat, pos + i * 3, 7);
          }
          pos += hcLen * 3;
          // code lengths bits
          const clb = this._max(clt),
            clbmsk = (1 << clb) - 1;
          // code lengths map
          const clm = this._hMap(clt, clb, 1);
          for (let i = 0; i < tl; ) {
            const r = clm[this._bits(dat, pos, clbmsk)];
            // bits read
            pos += r & 15;
            // symbol
            const s = r >> 4;
            // code length to copy
            if (s < 16) {
              ldt[i++] = s;
            } else {
              //  copy   count
              let c = 0,
                n = 0;
              if (s == 16)
                (n = 3 + this._bits(dat, pos, 3)), (pos += 2), (c = ldt[i - 1]);
              else if (s == 17) (n = 3 + this._bits(dat, pos, 7)), (pos += 3);
              else if (s == 18)
                (n = 11 + this._bits(dat, pos, 127)), (pos += 7);
              while (n--) ldt[i++] = c;
            }
          }
          //    length tree                 distance tree
          const lt = ldt.subarray(0, hLit),
            dt = ldt.subarray(hLit);
          // max length bits
          lbt = this._max(lt);
          // max dist bits
          dbt = this._max(dt);
          lm = this._hMap(lt, lbt, 1);
          dm = this._hMap(dt, dbt, 1);
        } else this._err(1);
        if (pos > tbts) {
          if (noSt) this._err(0);
          break;
        }
      }
      // Make sure the buffer can hold this + the largest possible addition
      // Maximum chunk size (practically, theoretically infinite) is 2^17
      if (resize) cbuf(bt + 131072);
      const lms = (1 << lbt) - 1,
        dms = (1 << dbt) - 1;
      let lpos = pos;
      for (; ; lpos = pos) {
        // bits read, code
        const c = lm[this._bits16(dat, pos) & lms],
          sym = c >> 4;
        pos += c & 15;
        if (pos > tbts) {
          if (noSt) this._err(0);
          break;
        }
        if (!c) this._err(2);
        if (sym < 256) buf[bt++] = sym;
        else if (sym == 256) {
          (lpos = pos), (lm = null);
          break;
        } else {
          let add = sym - 254;
          // no extra bits needed if less
          if (sym > 264) {
            // index
            const i = sym - 257,
              b = this.fleb[i];
            add = this._bits(dat, pos, (1 << b) - 1) + this.fl[i];
            pos += b;
          }
          // dist
          const d = dm[this._bits16(dat, pos) & dms],
            dsym = d >> 4;
          if (!d) this._err(3);
          pos += d & 15;
          let dt = this.fd[dsym];
          if (dsym > 3) {
            const b = this.fdeb[dsym];
            (dt += this._bits16(dat, pos) & ((1 << b) - 1)), (pos += b);
          }
          if (pos > tbts) {
            if (noSt) this._err(0);
            break;
          }
          if (resize) cbuf(bt + 131072);
          const end = bt + add;
          if (bt < dt) {
            const shift = dl - dt,
              dend = Math.min(dt, end);
            if (shift + bt < 0) this._err(3);
            for (; bt < dend; ++bt) buf[bt] = dict[shift + bt];
          }
          for (; bt < end; ++bt) buf[bt] = buf[bt - dt];
        }
      }
      (st.l = lm), (st.p = lpos), (st.b = bt), (st.f = final);
      if (lm) (final = 1), (st.m = lbt), (st.d = dm), (st.n = dbt);
    } while (!final);
    // don't reallocate for streams or user buffers
    return bt != buf.length && noBuf
      ? this._slc(buf, 0, bt)
      : buf.subarray(0, bt);
  }

  gunzipSync(data, opts = null) {
    const st = this._gzs(data);
    if (st + 8 > data.length) {
      throw new Error("Invalid GZIP data");
    }

    return this._inflt(
      data.subarray(st, -8),
      { i: 2 },
      (opts && opts.out) || new Uint8Array(this._gzl(data)),
      opts && opts.dictionary
    );
  }
}
