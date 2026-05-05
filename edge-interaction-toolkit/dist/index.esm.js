var C = Object.defineProperty;
var z = (m, t, e) => t in m ? C(m, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : m[t] = e;
var h = (m, t, e) => z(m, typeof t != "symbol" ? t + "" : t, e);
class f {
  constructor(t = 1, e = 0, s = 0, i = 1, r = 0, a = 0) {
    h(this, "a");
    h(this, "b");
    h(this, "c");
    h(this, "d");
    h(this, "e");
    h(this, "f");
    this.a = t, this.b = e, this.c = s, this.d = i, this.e = r, this.f = a;
  }
  static identity() {
    return new f(1, 0, 0, 1, 0, 0);
  }
  static translation(t, e) {
    return new f(1, 0, 0, 1, t, e);
  }
  static rotation(t) {
    const e = Math.cos(t), s = Math.sin(t);
    return new f(e, s, -s, e, 0, 0);
  }
  static scaling(t, e) {
    return new f(t, 0, 0, e, 0, 0);
  }
  static skewing(t, e) {
    return new f(1, Math.tan(e), Math.tan(t), 1, 0, 0);
  }
  reset() {
    return this.a = 1, this.b = 0, this.c = 0, this.d = 1, this.e = 0, this.f = 0, this;
  }
  translate(t, e) {
    const s = f.translation(t, e);
    return this.multiply(s);
  }
  rotate(t) {
    const e = f.rotation(t);
    return this.multiply(e);
  }
  scale(t, e) {
    const s = f.scaling(t, e);
    return this.multiply(s);
  }
  skew(t, e) {
    const s = f.skewing(t, e);
    return this.multiply(s);
  }
  multiply(t) {
    const e = this.a * t.a + this.b * t.c, s = this.a * t.b + this.b * t.d, i = this.c * t.a + this.d * t.c, r = this.c * t.b + this.d * t.d, a = this.e * t.a + this.f * t.c + t.e, n = this.e * t.b + this.f * t.d + t.f;
    return this.a = e, this.b = s, this.c = i, this.d = r, this.e = a, this.f = n, this;
  }
  preMultiply(t) {
    const e = t.a * this.a + t.b * this.c, s = t.a * this.b + t.b * this.d, i = t.c * this.a + t.d * this.c, r = t.c * this.b + t.d * this.d, a = t.e * this.a + t.f * this.c + this.e, n = t.e * this.b + t.f * this.d + this.f;
    return this.a = e, this.b = s, this.c = i, this.d = r, this.e = a, this.f = n, this;
  }
  invert() {
    const t = this.a * this.d - this.b * this.c;
    if (Math.abs(t) < 1e-10)
      return this.reset();
    const e = 1 / t, s = this.d * e, i = -this.b * e, r = -this.c * e, a = this.a * e, n = (this.c * this.f - this.d * this.e) * e, l = (this.b * this.e - this.a * this.f) * e;
    return this.a = s, this.b = i, this.c = r, this.d = a, this.e = n, this.f = l, this;
  }
  inverse() {
    return this.clone().invert();
  }
  transpose() {
    const t = this.b;
    return this.b = this.c, this.c = t, this;
  }
  transformPoint(t) {
    return {
      x: this.a * t.x + this.c * t.y + this.e,
      y: this.b * t.x + this.d * t.y + this.f
    };
  }
  transformPoints(t) {
    return t.map((e) => this.transformPoint(e));
  }
  transformVector(t) {
    return {
      x: this.a * t.x + this.c * t.y,
      y: this.b * t.x + this.d * t.y
    };
  }
  get translation() {
    return { x: this.e, y: this.f };
  }
  get rotation() {
    return Math.atan2(this.b, this.a);
  }
  get scaleX() {
    return Math.sqrt(this.a * this.a + this.b * this.b);
  }
  get scaleY() {
    return Math.sqrt(this.c * this.c + this.d * this.d);
  }
  get determinant() {
    return this.a * this.d - this.b * this.c;
  }
  clone() {
    return new f(this.a, this.b, this.c, this.d, this.e, this.f);
  }
  toArray() {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }
  fromArray(t) {
    return this.a = t[0] ?? 1, this.b = t[1] ?? 0, this.c = t[2] ?? 0, this.d = t[3] ?? 1, this.e = t[4] ?? 0, this.f = t[5] ?? 0, this;
  }
  equals(t, e = 1e-10) {
    return Math.abs(this.a - t.a) <= e && Math.abs(this.b - t.b) <= e && Math.abs(this.c - t.c) <= e && Math.abs(this.d - t.d) <= e && Math.abs(this.e - t.e) <= e && Math.abs(this.f - t.f) <= e;
  }
  static multiply(t, e) {
    return t.clone().multiply(e);
  }
  static lerp(t, e, s) {
    return new f(
      t.a + (e.a - t.a) * s,
      t.b + (e.b - t.b) * s,
      t.c + (e.c - t.c) * s,
      t.d + (e.d - t.d) * s,
      t.e + (e.e - t.e) * s,
      t.f + (e.f - t.f) * s
    );
  }
}
class S {
  constructor(t = {}) {
    h(this, "_x");
    h(this, "_y");
    h(this, "_rotation");
    h(this, "_scaleX");
    h(this, "_scaleY");
    h(this, "_skewX");
    h(this, "_skewY");
    h(this, "_matrix");
    h(this, "_inverseMatrix");
    h(this, "_matrixDirty");
    h(this, "_inverseDirty");
    this._x = t.x ?? 0, this._y = t.y ?? 0, this._rotation = t.rotation ?? 0, this._scaleX = t.scaleX ?? 1, this._scaleY = t.scaleY ?? 1, this._skewX = t.skewX ?? 0, this._skewY = t.skewY ?? 0, this._matrix = new f(), this._inverseMatrix = new f(), this._matrixDirty = !0, this._inverseDirty = !0;
  }
  get x() {
    return this._x;
  }
  set x(t) {
    this._x = t, this._markDirty();
  }
  get y() {
    return this._y;
  }
  set y(t) {
    this._y = t, this._markDirty();
  }
  get rotation() {
    return this._rotation;
  }
  set rotation(t) {
    this._rotation = t, this._markDirty();
  }
  get scaleX() {
    return this._scaleX;
  }
  set scaleX(t) {
    this._scaleX = t, this._markDirty();
  }
  get scaleY() {
    return this._scaleY;
  }
  set scaleY(t) {
    this._scaleY = t, this._markDirty();
  }
  get skewX() {
    return this._skewX;
  }
  set skewX(t) {
    this._skewX = t, this._markDirty();
  }
  get skewY() {
    return this._skewY;
  }
  set skewY(t) {
    this._skewY = t, this._markDirty();
  }
  _markDirty() {
    this._matrixDirty = !0, this._inverseDirty = !0;
  }
  _updateMatrix() {
    this._matrixDirty && (this._matrix.reset().translate(this._x, this._y).rotate(this._rotation).scale(this._scaleX, this._scaleY).skew(this._skewX, this._skewY), this._matrixDirty = !1);
  }
  _updateInverseMatrix() {
    this._inverseDirty && (this._updateMatrix(), this._inverseMatrix = this._matrix.inverse(), this._inverseDirty = !1);
  }
  get matrix() {
    return this._updateMatrix(), this._matrix;
  }
  get inverseMatrix() {
    return this._updateInverseMatrix(), this._inverseMatrix;
  }
  translate(t, e) {
    return this._x += t, this._y += e, this._markDirty(), this;
  }
  rotate(t) {
    return this._rotation += t, this._markDirty(), this;
  }
  scale(t, e) {
    return this._scaleX *= t, this._scaleY *= e, this._markDirty(), this;
  }
  set(t, e, s, i, r, a, n) {
    return t !== void 0 && (this._x = t), e !== void 0 && (this._y = e), s !== void 0 && (this._rotation = s), i !== void 0 && (this._scaleX = i), r !== void 0 && (this._scaleY = r), a !== void 0 && (this._skewX = a), n !== void 0 && (this._skewY = n), this._markDirty(), this;
  }
  localToGlobal(t) {
    return this._updateMatrix(), this._matrix.transformPoint(t);
  }
  globalToLocal(t) {
    return this._updateInverseMatrix(), this._inverseMatrix.transformPoint(t);
  }
  applyToContext(t) {
    this._updateMatrix(), t.setTransform(
      this._matrix.a,
      this._matrix.b,
      this._matrix.c,
      this._matrix.d,
      this._matrix.e,
      this._matrix.f
    );
  }
  toData() {
    return {
      x: this._x,
      y: this._y,
      rotation: this._rotation,
      scaleX: this._scaleX,
      scaleY: this._scaleY,
      skewX: this._skewX,
      skewY: this._skewY
    };
  }
  fromData(t) {
    return this.set(
      t.x,
      t.y,
      t.rotation,
      t.scaleX,
      t.scaleY,
      t.skewX,
      t.skewY
    );
  }
  clone() {
    return new S(this.toData());
  }
  copyFrom(t) {
    return this.fromData(t.toData());
  }
  static fromData(t) {
    return new S(t);
  }
}
class g {
  constructor(t = {}) {
    h(this, "id");
    h(this, "transform");
    h(this, "fill");
    h(this, "stroke");
    h(this, "strokeWidth");
    h(this, "visible");
    h(this, "locked");
    h(this, "layerIndex");
    h(this, "name");
    h(this, "matrix");
    h(this, "inverseMatrix");
    this.id = t.id || this.generateId(), this.transform = t.transform || {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    }, this.fill = t.fill, this.stroke = t.stroke, this.strokeWidth = t.strokeWidth ?? 1, this.visible = t.visible ?? !0, this.locked = t.locked ?? !1, this.layerIndex = t.layerIndex ?? 0, this.name = t.name || "Shape", this.matrix = new f(), this.inverseMatrix = new f(), this.updateMatrices();
  }
  generateId() {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  updateMatrices() {
    this.matrix.reset().translate(this.transform.x, this.transform.y).rotate(this.transform.rotation).scale(this.transform.scaleX, this.transform.scaleY).skew(this.transform.skewX, this.transform.skewY), this.inverseMatrix = this.matrix.invert();
  }
  translate(t, e) {
    this.transform.x += t, this.transform.y += e, this.updateMatrices();
  }
  rotate(t) {
    this.transform.rotation += t, this.updateMatrices();
  }
  scale(t, e) {
    this.transform.scaleX *= t, this.transform.scaleY *= e, this.updateMatrices();
  }
  setTransform(t) {
    this.transform = { ...this.transform, ...t }, this.updateMatrices();
  }
  localToGlobal(t) {
    return this.matrix.transformPoint(t);
  }
  globalToLocal(t) {
    return this.inverseMatrix.transformPoint(t);
  }
  applyTransform(t) {
    t.setTransform(
      this.matrix.a,
      this.matrix.b,
      this.matrix.c,
      this.matrix.d,
      this.matrix.e,
      this.matrix.f
    );
  }
  drawStyle(t) {
    this.fill && (t.fillStyle = this.colorToString(this.fill), t.fill()), this.stroke && (t.strokeStyle = this.colorToString(this.stroke), t.lineWidth = this.strokeWidth, t.stroke());
  }
  colorToString(t) {
    return `rgba(${Math.round(t.r)}, ${Math.round(t.g)}, ${Math.round(t.b)}, ${t.a})`;
  }
  clone() {
    const t = this.constructor, e = new t(this.toJSON());
    return e.id = this.generateId(), e;
  }
}
class y extends g {
  constructor(e = {}) {
    super(e);
    h(this, "x");
    h(this, "y");
    h(this, "width");
    h(this, "height");
    h(this, "cornerRadius");
    this.x = e.x ?? 0, this.y = e.y ?? 0, this.width = e.width ?? 100, this.height = e.height ?? 100, this.cornerRadius = e.cornerRadius ?? 0, this.name = e.name || "Rectangle";
  }
  getBoundingBox() {
    const s = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height }
    ].map((l) => this.localToGlobal(l));
    let i = 1 / 0, r = 1 / 0, a = -1 / 0, n = -1 / 0;
    for (const l of s)
      i = Math.min(i, l.x), r = Math.min(r, l.y), a = Math.max(a, l.x), n = Math.max(n, l.y);
    return {
      x: i,
      y: r,
      width: a - i,
      height: n - r
    };
  }
  containsPoint(e) {
    const s = this.globalToLocal(e);
    return s.x >= this.x && s.x <= this.x + this.width && s.y >= this.y && s.y <= this.y + this.height;
  }
  draw(e) {
    if (this.visible) {
      if (e.save(), this.applyTransform(e), e.beginPath(), this.cornerRadius > 0) {
        const s = Math.min(this.cornerRadius, this.width / 2, this.height / 2);
        e.moveTo(this.x + s, this.y), e.lineTo(this.x + this.width - s, this.y), e.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + s), e.lineTo(this.x + this.width, this.y + this.height - s), e.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - s, this.y + this.height), e.lineTo(this.x + s, this.y + this.height), e.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - s), e.lineTo(this.x, this.y + s), e.quadraticCurveTo(this.x, this.y, this.x + s, this.y);
      } else
        e.rect(this.x, this.y, this.width, this.height);
      e.closePath(), this.drawStyle(e), e.restore();
    }
  }
  toJSON() {
    return {
      id: this.id,
      type: "rect",
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : void 0,
      stroke: this.stroke ? { ...this.stroke } : void 0,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius
    };
  }
  static fromJSON(e) {
    return new y(e);
  }
}
class x extends g {
  constructor(e = {}) {
    super(e);
    h(this, "cx");
    h(this, "cy");
    h(this, "rx");
    h(this, "ry");
    h(this, "rotation");
    this.cx = e.cx ?? 50, this.cy = e.cy ?? 50, this.rx = e.rx ?? 50, this.ry = e.ry ?? 50, this.rotation = e.rotation ?? 0, this.name = e.name || "Ellipse";
  }
  getBoundingBox() {
    const e = this.rx, s = this.ry, i = this.rotation, r = Math.cos(i), a = Math.sin(i), n = 2 * Math.sqrt(e * e * r * r + s * s * a * a), l = 2 * Math.sqrt(e * e * a * a + s * s * r * r), o = { x: this.cx, y: this.cy }, c = this.localToGlobal(o);
    return {
      x: c.x - n / 2,
      y: c.y - l / 2,
      width: n,
      height: l
    };
  }
  containsPoint(e) {
    const s = this.globalToLocal(e), i = s.x - this.cx, r = s.y - this.cy, a = Math.cos(-this.rotation), n = Math.sin(-this.rotation), l = i * a - r * n, o = i * n + r * a;
    return l * l / (this.rx * this.rx) + o * o / (this.ry * this.ry) <= 1;
  }
  draw(e) {
    this.visible && (e.save(), this.applyTransform(e), e.beginPath(), e.ellipse(
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      this.rotation,
      0,
      Math.PI * 2
    ), e.closePath(), this.drawStyle(e), e.restore());
  }
  toJSON() {
    return {
      id: this.id,
      type: "ellipse",
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : void 0,
      stroke: this.stroke ? { ...this.stroke } : void 0,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry,
      rotation: this.rotation
    };
  }
  static fromJSON(e) {
    return new x(e);
  }
}
class M extends g {
  constructor(e = {}) {
    super(e);
    h(this, "commands");
    h(this, "closed");
    this.commands = e.commands || [], this.closed = e.closed ?? !1, this.name = e.name || "Path";
  }
  getBoundingBox() {
    if (this.commands.length === 0)
      return { x: 0, y: 0, width: 0, height: 0 };
    const e = this.getPathPoints();
    if (e.length === 0)
      return { x: 0, y: 0, width: 0, height: 0 };
    const s = e.map((l) => this.localToGlobal(l));
    let i = 1 / 0, r = 1 / 0, a = -1 / 0, n = -1 / 0;
    for (const l of s)
      i = Math.min(i, l.x), r = Math.min(r, l.y), a = Math.max(a, l.x), n = Math.max(n, l.y);
    return {
      x: i,
      y: r,
      width: a - i,
      height: n - r
    };
  }
  getPathPoints() {
    const e = [];
    let s = { x: 0, y: 0 };
    for (const i of this.commands)
      switch (i.type) {
        case "M":
        case "L":
          s = { x: i.points[0], y: i.points[1] }, e.push(s);
          break;
        case "C":
          e.push(
            { x: i.points[0], y: i.points[1] },
            { x: i.points[2], y: i.points[3] },
            { x: i.points[4], y: i.points[5] }
          ), s = { x: i.points[4], y: i.points[5] };
          break;
        case "Q":
          e.push(
            { x: i.points[0], y: i.points[1] },
            { x: i.points[2], y: i.points[3] }
          ), s = { x: i.points[2], y: i.points[3] };
          break;
      }
    return e;
  }
  containsPoint(e) {
    const s = this.globalToLocal(e), i = this.createPath2D();
    return document.createElement("canvas").getContext("2d").isPointInPath(i, s.x, s.y);
  }
  createPath2D() {
    const e = new Path2D();
    for (const s of this.commands)
      switch (s.type) {
        case "M":
          e.moveTo(s.points[0], s.points[1]);
          break;
        case "L":
          e.lineTo(s.points[0], s.points[1]);
          break;
        case "C":
          e.bezierCurveTo(
            s.points[0],
            s.points[1],
            s.points[2],
            s.points[3],
            s.points[4],
            s.points[5]
          );
          break;
        case "Q":
          e.quadraticCurveTo(
            s.points[0],
            s.points[1],
            s.points[2],
            s.points[3]
          );
          break;
        case "Z":
          e.closePath();
          break;
      }
    return this.closed && e.closePath(), e;
  }
  draw(e) {
    if (!this.visible) return;
    e.save(), this.applyTransform(e);
    const s = this.createPath2D();
    this.fill && (e.fillStyle = this.colorToString(this.fill), e.fill(s)), this.stroke && (e.strokeStyle = this.colorToString(this.stroke), e.lineWidth = this.strokeWidth, e.stroke(s)), e.restore();
  }
  moveTo(e, s) {
    this.commands.push({ type: "M", points: [e, s] });
  }
  lineTo(e, s) {
    this.commands.push({ type: "L", points: [e, s] });
  }
  cubicCurveTo(e, s, i, r, a, n) {
    this.commands.push({ type: "C", points: [e, s, i, r, a, n] });
  }
  quadraticCurveTo(e, s, i, r) {
    this.commands.push({ type: "Q", points: [e, s, i, r] });
  }
  closePath() {
    this.commands.push({ type: "Z", points: [] });
  }
  toJSON() {
    return {
      id: this.id,
      type: "path",
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : void 0,
      stroke: this.stroke ? { ...this.stroke } : void 0,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      commands: this.commands.map((e) => ({ ...e, points: [...e.points] })),
      closed: this.closed
    };
  }
  static fromJSON(e) {
    return new M(e);
  }
}
class w extends g {
  constructor(e = {}) {
    super(e);
    h(this, "x");
    h(this, "y");
    h(this, "content");
    h(this, "fontSize");
    h(this, "fontFamily");
    h(this, "textAlign");
    h(this, "textBaseline");
    this.x = e.x ?? 0, this.y = e.y ?? 0, this.content = e.content ?? "Text", this.fontSize = e.fontSize ?? 16, this.fontFamily = e.fontFamily ?? "Arial, sans-serif", this.textAlign = e.textAlign ?? "left", this.textBaseline = e.textBaseline ?? "alphabetic", this.name = e.name || "Text";
  }
  getBoundingBox() {
    const e = this.measureText(), i = [
      { x: e.x, y: e.y },
      { x: e.x + e.width, y: e.y },
      { x: e.x + e.width, y: e.y + e.height },
      { x: e.x, y: e.y + e.height }
    ].map((o) => this.localToGlobal(o));
    let r = 1 / 0, a = 1 / 0, n = -1 / 0, l = -1 / 0;
    for (const o of i)
      r = Math.min(r, o.x), a = Math.min(a, o.y), n = Math.max(n, o.x), l = Math.max(l, o.y);
    return {
      x: r,
      y: a,
      width: n - r,
      height: l - a
    };
  }
  measureText() {
    const s = document.createElement("canvas").getContext("2d");
    if (!s)
      return { x: this.x, y: this.y, width: 100, height: this.fontSize };
    s.font = `${this.fontSize}px ${this.fontFamily}`, s.textAlign = this.textAlign, s.textBaseline = this.textBaseline;
    const i = s.measureText(this.content);
    let r = this.x, a = this.y;
    switch (this.textAlign) {
      case "center":
        r -= i.width / 2;
        break;
      case "right":
        r -= i.width;
        break;
    }
    switch (this.textBaseline) {
      case "top":
      case "hanging":
        break;
      case "middle":
        a -= this.fontSize / 2;
        break;
      case "alphabetic":
      case "ideographic":
      case "bottom":
        a -= this.fontSize;
        break;
    }
    return {
      x: r,
      y: a,
      width: i.width,
      height: this.fontSize
    };
  }
  containsPoint(e) {
    const s = this.measureText(), i = this.globalToLocal(e);
    return i.x >= s.x && i.x <= s.x + s.width && i.y >= s.y && i.y <= s.y + s.height;
  }
  draw(e) {
    this.visible && (e.save(), this.applyTransform(e), e.font = `${this.fontSize}px ${this.fontFamily}`, e.textAlign = this.textAlign, e.textBaseline = this.textBaseline, this.fill && (e.fillStyle = this.colorToString(this.fill), e.fillText(this.content, this.x, this.y)), this.stroke && (e.strokeStyle = this.colorToString(this.stroke), e.lineWidth = this.strokeWidth, e.strokeText(this.content, this.x, this.y)), e.restore());
  }
  toJSON() {
    return {
      id: this.id,
      type: "text",
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : void 0,
      stroke: this.stroke ? { ...this.stroke } : void 0,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      x: this.x,
      y: this.y,
      content: this.content,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline
    };
  }
  static fromJSON(e) {
    return new w(e);
  }
}
class v {
  constructor() {
    h(this, "_selectedIds");
    h(this, "_listeners");
    h(this, "_shapes");
    this._selectedIds = /* @__PURE__ */ new Set(), this._listeners = /* @__PURE__ */ new Set(), this._shapes = /* @__PURE__ */ new Map();
  }
  get selectedIds() {
    return Array.from(this._selectedIds);
  }
  get selectedCount() {
    return this._selectedIds.size;
  }
  get isEmpty() {
    return this._selectedIds.size === 0;
  }
  registerShape(t) {
    this._shapes.set(t.id, t);
  }
  unregisterShape(t) {
    this._shapes.delete(t), this.remove(t);
  }
  clearShapes() {
    this._shapes.clear(), this.clear();
  }
  has(t) {
    return this._selectedIds.has(t);
  }
  add(t) {
    return this._selectedIds.has(t) ? !1 : (this._selectedIds.add(t), this._notify({
      type: "add",
      ids: [t]
    }), !0);
  }
  remove(t) {
    return this._selectedIds.has(t) ? (this._selectedIds.delete(t), this._notify({
      type: "remove",
      ids: [t]
    }), !0) : !1;
  }
  toggle(t) {
    return this._selectedIds.has(t) ? (this.remove(t), !1) : (this.add(t), !0);
  }
  replace(t) {
    this._selectedIds = new Set(t), this._notify({
      type: "replace",
      ids: t
    });
  }
  clear() {
    if (this._selectedIds.size === 0) return;
    const t = this.selectedIds;
    this._selectedIds.clear(), this._notify({
      type: "clear",
      ids: t
    });
  }
  selectPoint(t, e = !1) {
    const s = this._findShapeAtPoint(t);
    e ? s && this.toggle(s) : s ? this.has(s) || this.replace([s]) : this.clear();
  }
  selectRectangle(t, e = !1) {
    const s = this._findShapesInRect(t);
    if (e)
      for (const i of s)
        this.toggle(i);
    else
      this.replace(s);
  }
  _findShapeAtPoint(t) {
    const e = Array.from(this._shapes.values()).sort((s, i) => i.layerIndex - s.layerIndex);
    for (const s of e)
      if (!(!s.visible || s.locked) && s.containsPoint(t))
        return s.id;
    return null;
  }
  _findShapesInRect(t) {
    const e = [];
    for (const [s, i] of this._shapes) {
      if (!i.visible || i.locked) continue;
      const r = i.getBoundingBox();
      r.x >= t.x && r.y >= t.y && r.x + r.width <= t.x + t.width && r.y + r.height <= t.y + t.height && e.push(s);
    }
    return e;
  }
  getSelectedShapes() {
    const t = [];
    for (const e of this._selectedIds) {
      const s = this._shapes.get(e);
      s && t.push(s);
    }
    return t;
  }
  getSelectionBounds() {
    const t = this.getSelectedShapes();
    if (t.length === 0) return null;
    let e = 1 / 0, s = 1 / 0, i = -1 / 0, r = -1 / 0;
    for (const a of t) {
      const n = a.getBoundingBox();
      e = Math.min(e, n.x), s = Math.min(s, n.y), i = Math.max(i, n.x + n.width), r = Math.max(r, n.y + n.height);
    }
    return {
      x: e,
      y: s,
      width: i - e,
      height: r - s
    };
  }
  deleteSelected() {
    const t = this.getSelectedShapes();
    for (const e of t)
      this._shapes.delete(e.id);
    return this.clear(), t;
  }
  onSelectionChange(t) {
    return this._listeners.add(t), () => {
      this._listeners.delete(t);
    };
  }
  _notify(t) {
    for (const e of this._listeners)
      e(t);
  }
  clone() {
    const t = new v();
    for (const e of this._selectedIds)
      t._selectedIds.add(e);
    for (const [e, s] of this._shapes)
      t._shapes.set(e, s);
    return t;
  }
}
class T {
  constructor() {
    h(this, "_layers");
    h(this, "_shapeToLayer");
    h(this, "_listeners");
    h(this, "_nextLayerId");
    this._layers = [], this._shapeToLayer = /* @__PURE__ */ new Map(), this._listeners = /* @__PURE__ */ new Set(), this._nextLayerId = 1, this.addLayer("Default");
  }
  get layers() {
    return [...this._layers];
  }
  get activeLayer() {
    return this._layers[this._layers.length - 1];
  }
  addLayer(t, e) {
    const s = {
      id: `layer_${this._nextLayerId++}`,
      name: t,
      visible: !0,
      locked: !1,
      shapeIds: [],
      index: e ?? this._layers.length
    };
    return e !== void 0 ? (this._layers.splice(e, 0, s), this._updateIndices()) : this._layers.push(s), this._notify({
      type: "add",
      layerId: s.id,
      layers: this.layers
    }), s;
  }
  removeLayer(t) {
    const e = this._layers.findIndex((i) => i.id === t);
    if (e === -1 || this._layers.length <= 1) return !1;
    const s = this._layers[e];
    for (const i of s.shapeIds)
      this._shapeToLayer.delete(i);
    return this._layers.splice(e, 1), this._updateIndices(), this._notify({
      type: "remove",
      layerId: t,
      layers: this.layers
    }), !0;
  }
  getLayer(t) {
    return this._layers.find((e) => e.id === t);
  }
  getLayerByShapeId(t) {
    const e = this._shapeToLayer.get(t);
    return e ? this.getLayer(e) : void 0;
  }
  updateLayer(t, e) {
    const s = this.getLayer(t);
    return s ? (Object.assign(s, e), this._notify({
      type: "update",
      layerId: t,
      layers: this.layers
    }), !0) : !1;
  }
  moveLayer(t, e) {
    const s = this._layers.findIndex((r) => r.id === t);
    if (s === -1 || e < 0 || e >= this._layers.length || s === e) return !1;
    const [i] = this._layers.splice(s, 1);
    return this._layers.splice(e, 0, i), this._updateIndices(), this._notify({
      type: "reorder",
      layerId: t,
      layers: this.layers
    }), !0;
  }
  moveLayerUp(t) {
    const e = this._layers.findIndex((s) => s.id === t);
    return e === -1 || e >= this._layers.length - 1 ? !1 : this.moveLayer(t, e + 1);
  }
  moveLayerDown(t) {
    const e = this._layers.findIndex((s) => s.id === t);
    return e === -1 || e <= 0 ? !1 : this.moveLayer(t, e - 1);
  }
  addShapeToLayer(t, e) {
    const s = this.getLayer(e);
    if (!s) return !1;
    const i = this._shapeToLayer.get(t);
    if (i) {
      const r = this.getLayer(i);
      r && (r.shapeIds = r.shapeIds.filter((a) => a !== t));
    }
    return s.shapeIds.push(t), this._shapeToLayer.set(t, e), this._notify({
      type: "update",
      layerId: e,
      layers: this.layers
    }), !0;
  }
  removeShapeFromLayer(t) {
    const e = this._shapeToLayer.get(t);
    if (!e) return !1;
    const s = this.getLayer(e);
    return s ? (s.shapeIds = s.shapeIds.filter((i) => i !== t), this._shapeToLayer.delete(t), this._notify({
      type: "update",
      layerId: e,
      layers: this.layers
    }), !0) : !1;
  }
  isShapeVisible(t) {
    const e = this.getLayerByShapeId(t);
    return e ? e.visible : !0;
  }
  isShapeLocked(t) {
    const e = this.getLayerByShapeId(t);
    return e ? e.locked : !1;
  }
  getShapesInLayer(t) {
    const e = this.getLayer(t);
    return e ? [...e.shapeIds] : [];
  }
  getRenderOrder() {
    const t = [];
    for (const e of this._layers)
      e.visible && t.push(...e.shapeIds);
    return t;
  }
  onLayerChange(t) {
    return this._listeners.add(t), () => {
      this._listeners.delete(t);
    };
  }
  _updateIndices() {
    this._layers.forEach((t, e) => {
      t.index = e;
    });
  }
  _notify(t) {
    for (const e of this._listeners)
      e(t);
  }
  toJSON() {
    return {
      layers: this._layers.map((t) => ({ ...t, shapeIds: [...t.shapeIds] })),
      shapeToLayer: Object.fromEntries(this._shapeToLayer)
    };
  }
  fromJSON(t) {
    this._layers = t.layers.map((s) => ({ ...s, shapeIds: [...s.shapeIds] })), this._shapeToLayer = new Map(Object.entries(t.shapeToLayer));
    let e = 0;
    for (const s of this._layers) {
      const i = s.id.match(/layer_(\d+)/);
      i && (e = Math.max(e, parseInt(i[1])));
    }
    this._nextLayerId = e + 1, this._notify({
      type: "update",
      layers: this.layers
    });
  }
}
class p {
  static shapeFromData(t) {
    switch (t.type) {
      case "rect":
        return new y(t);
      case "ellipse":
        return new x(t);
      case "path":
        return new M(t);
      case "text":
        return new w(t);
      default:
        throw new Error(`Unknown shape type: ${t.type}`);
    }
  }
  static shapeToData(t) {
    return t.toJSON();
  }
  static shapesFromDataArray(t) {
    return t.map((e) => this.shapeFromData(e));
  }
  static shapesToDataArray(t) {
    return t.map((e) => this.shapeToData(e));
  }
  static serializeProject(t, e) {
    const s = {
      version: this.VERSION,
      timestamp: Date.now(),
      canvasState: {
        ...t,
        shapes: this.shapesToDataArray(
          t.shapes.map(
            (i) => typeof i == "string" ? { id: i } : i
          )
        )
      },
      layers: e
    };
    return JSON.stringify(s, null, 2);
  }
  static deserializeProject(t) {
    const e = JSON.parse(t);
    e.version !== this.VERSION && console.warn(`Version mismatch: expected ${this.VERSION}, got ${e.version}`);
    const s = this.shapesFromDataArray(e.canvasState.shapes);
    return {
      canvasState: {
        ...e.canvasState,
        shapes: e.canvasState.shapes
      },
      layerData: e.layers,
      shapes: s
    };
  }
  static saveToLocalStorage(t, e, s) {
    try {
      const i = this.serializeProject(t, e);
      return localStorage.setItem(s || this.STORAGE_KEY, i), !0;
    } catch (i) {
      return console.error("Failed to save to localStorage:", i), !1;
    }
  }
  static loadFromLocalStorage(t) {
    try {
      const e = localStorage.getItem(t || this.STORAGE_KEY);
      return e ? this.deserializeProject(e) : null;
    } catch (e) {
      return console.error("Failed to load from localStorage:", e), null;
    }
  }
  static clearLocalStorage(t) {
    localStorage.removeItem(t || this.STORAGE_KEY);
  }
  static hasLocalStorageData(t) {
    return localStorage.getItem(t || this.STORAGE_KEY) !== null;
  }
  static exportToFile(t, e, s = "canvas-project.json") {
    const i = this.serializeProject(t, e), r = new Blob([i], { type: "application/json" }), a = URL.createObjectURL(r), n = document.createElement("a");
    n.href = a, n.download = s, document.body.appendChild(n), n.click(), document.body.removeChild(n), URL.revokeObjectURL(a);
  }
  static async importFromFile(t) {
    return new Promise((e, s) => {
      const i = new FileReader();
      i.onload = (r) => {
        var a;
        try {
          const n = (a = r.target) == null ? void 0 : a.result, l = this.deserializeProject(n);
          e(l);
        } catch (n) {
          s(n);
        }
      }, i.onerror = () => {
        s(new Error("Failed to read file"));
      }, i.readAsText(t);
    });
  }
  static deepClone(t) {
    return JSON.parse(JSON.stringify(t));
  }
}
h(p, "VERSION", "1.0.0"), h(p, "STORAGE_KEY", "edge-interaction-toolkit-canvas");
class A {
  constructor(t, e = {}) {
    h(this, "_canvas");
    h(this, "_ctx");
    h(this, "_shapes");
    h(this, "_selectionManager");
    h(this, "_layerManager");
    h(this, "_currentTool");
    h(this, "_isDrawing");
    h(this, "_startPoint");
    h(this, "_currentPoint");
    h(this, "_backgroundColor");
    h(this, "_zoom");
    h(this, "_panX");
    h(this, "_panY");
    h(this, "_viewMatrix");
    h(this, "_inverseViewMatrix");
    h(this, "_listeners");
    h(this, "_selectionBox");
    h(this, "_isMultiSelect");
    h(this, "_draggedShapes");
    h(this, "_isDragging");
    this._canvas = t, this._ctx = t.getContext("2d"), this._shapes = /* @__PURE__ */ new Map(), this._selectionManager = new v(), this._layerManager = new T(), this._currentTool = "select", this._isDrawing = !1, this._startPoint = { x: 0, y: 0 }, this._currentPoint = { x: 0, y: 0 }, this._backgroundColor = e.backgroundColor || "#ffffff", this._zoom = 1, this._panX = 0, this._panY = 0, this._viewMatrix = new f(), this._inverseViewMatrix = new f(), this._listeners = /* @__PURE__ */ new Map(), this._selectionBox = null, this._isMultiSelect = !1, this._draggedShapes = /* @__PURE__ */ new Map(), this._isDragging = !1, e.width && (t.width = e.width), e.height && (t.height = e.height), this._updateViewMatrix(), this._bindEvents(), this._render();
  }
  get canvas() {
    return this._canvas;
  }
  get ctx() {
    return this._ctx;
  }
  get currentTool() {
    return this._currentTool;
  }
  get zoom() {
    return this._zoom;
  }
  get panX() {
    return this._panX;
  }
  get panY() {
    return this._panY;
  }
  get selectedIds() {
    return this._selectionManager.selectedIds;
  }
  get selectedShapes() {
    return this._selectionManager.getSelectedShapes();
  }
  get shapes() {
    return Array.from(this._shapes.values());
  }
  setTool(t) {
    this._currentTool = t, this._emit("toolChange", { tool: t });
  }
  setZoom(t) {
    this._zoom = Math.max(0.1, Math.min(10, t)), this._updateViewMatrix(), this._render(), this._emit("zoomChange", { zoom: this._zoom });
  }
  setPan(t, e) {
    this._panX = t, this._panY = e, this._updateViewMatrix(), this._render();
  }
  zoomBy(t, e, s) {
    const i = e ?? this._canvas.width / 2, r = s ?? this._canvas.height / 2, a = this._screenToWorld({ x: i, y: r });
    this._zoom = Math.max(0.1, Math.min(10, this._zoom * t)), this._updateViewMatrix();
    const n = this._worldToScreen(a);
    this._panX += i - n.x, this._panY += r - n.y, this._updateViewMatrix(), this._render();
  }
  _updateViewMatrix() {
    this._viewMatrix.reset().translate(this._panX, this._panY).scale(this._zoom, this._zoom), this._inverseViewMatrix = this._viewMatrix.inverse();
  }
  _screenToWorld(t) {
    return this._inverseViewMatrix.transformPoint(t);
  }
  _worldToScreen(t) {
    return this._viewMatrix.transformPoint(t);
  }
  _bindEvents() {
    this._canvas.addEventListener("mousedown", this._onMouseDown.bind(this)), this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this)), this._canvas.addEventListener("mouseup", this._onMouseUp.bind(this)), this._canvas.addEventListener("mouseleave", this._onMouseLeave.bind(this)), this._canvas.addEventListener("wheel", this._onWheel.bind(this)), this._canvas.addEventListener("dblclick", this._onDoubleClick.bind(this));
  }
  _onMouseDown(t) {
    const e = this._canvas.getBoundingClientRect(), s = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    }, i = this._screenToWorld(s);
    if (this._startPoint = i, this._currentPoint = i, this._isMultiSelect = t.shiftKey, this._currentTool === "select") {
      const r = this._findShapeAtPoint(i);
      r && this._selectionManager.has(r) ? (this._isDragging = !0, this._startDrag(i)) : r ? (this._isMultiSelect ? this._selectionManager.toggle(r) : this._selectionManager.replace([r]), this._isDragging = !0, this._startDrag(i)) : (this._isDrawing = !0, this._selectionBox = {
        x: i.x,
        y: i.y,
        width: 0,
        height: 0
      });
    } else
      this._isDrawing = !0;
    this._emit("mouseDown", { screenPoint: s, worldPoint: i, button: t.button });
  }
  _onMouseMove(t) {
    const e = this._canvas.getBoundingClientRect(), s = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    }, i = this._screenToWorld(s);
    this._currentPoint = i, this._isDragging && this._currentTool === "select" ? this._drag(i) : this._isDrawing && this._currentTool === "select" && this._selectionBox && this._updateSelectionBox(i), this._render(), this._emit("mouseMove", { screenPoint: s, worldPoint: i });
  }
  _onMouseUp(t) {
    const e = this._canvas.getBoundingClientRect(), s = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    }, i = this._screenToWorld(s);
    this._isDragging ? (this._endDrag(), this._isDragging = !1) : this._isDrawing && (this._currentTool === "select" && this._selectionBox ? this._finishSelectionBox() : this._createShape()), this._isDrawing = !1, this._selectionBox = null, this._render(), this._emit("mouseUp", { screenPoint: s, worldPoint: i, button: t.button });
  }
  _onMouseLeave(t) {
    this._isDragging && (this._endDrag(), this._isDragging = !1), this._isDrawing = !1, this._selectionBox = null, this._render();
  }
  _onWheel(t) {
    t.preventDefault();
    const e = this._canvas.getBoundingClientRect(), s = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    }, i = t.deltaY > 0 ? 0.9 : 1.1;
    this.zoomBy(i, s.x, s.y);
  }
  _onDoubleClick(t) {
    const e = this._canvas.getBoundingClientRect(), s = {
      x: t.clientX - e.left,
      y: t.clientY - e.top
    }, i = this._screenToWorld(s);
    this._emit("doubleClick", { screenPoint: s, worldPoint: i });
  }
  _findShapeAtPoint(t) {
    const e = Array.from(this._shapes.values()).filter((s) => s.visible && !s.locked).sort((s, i) => i.layerIndex - s.layerIndex);
    for (const s of e)
      if (s.containsPoint(t))
        return s.id;
    return null;
  }
  _startDrag(t) {
    this._draggedShapes.clear();
    for (const e of this._selectionManager.getSelectedShapes()) {
      const s = e.getBoundingBox();
      this._draggedShapes.set(e.id, {
        offsetX: t.x - s.x,
        offsetY: t.y - s.y
      });
    }
  }
  _drag(t) {
    const e = t.x - this._startPoint.x, s = t.y - this._startPoint.y;
    if (!(Math.abs(e) < 1 && Math.abs(s) < 1)) {
      for (const i of this._selectionManager.getSelectedShapes())
        i.translate(e, s);
      this._startPoint = t;
    }
  }
  _endDrag() {
    this._draggedShapes.clear(), this._emit("shapesMoved", { shapeIds: this._selectionManager.selectedIds });
  }
  _updateSelectionBox(t) {
    if (!this._selectionBox) return;
    const e = Math.min(this._startPoint.x, t.x), s = Math.min(this._startPoint.y, t.y), i = Math.abs(t.x - this._startPoint.x), r = Math.abs(t.y - this._startPoint.y);
    this._selectionBox = { x: e, y: s, width: i, height: r };
  }
  _finishSelectionBox() {
    if (!this._selectionBox) return;
    const t = [];
    for (const [e, s] of this._shapes) {
      if (!s.visible || s.locked) continue;
      const i = s.getBoundingBox();
      i.x >= this._selectionBox.x && i.y >= this._selectionBox.y && i.x + i.width <= this._selectionBox.x + this._selectionBox.width && i.y + i.height <= this._selectionBox.y + this._selectionBox.height && t.push(e);
    }
    if (this._isMultiSelect)
      for (const e of t)
        this._selectionManager.toggle(e);
    else
      this._selectionManager.replace(t);
  }
  _createShape() {
    const t = this._currentPoint.x - this._startPoint.x, e = this._currentPoint.y - this._startPoint.y;
    if (Math.abs(t) < 5 && Math.abs(e) < 5) return;
    let s = null;
    switch (this._currentTool) {
      case "rect":
        s = new y({
          x: Math.min(this._startPoint.x, this._currentPoint.x),
          y: Math.min(this._startPoint.y, this._currentPoint.y),
          width: Math.abs(t),
          height: Math.abs(e),
          fill: { r: 100, g: 149, b: 237, a: 0.5 },
          stroke: { r: 102, g: 126, b: 234, a: 1 },
          strokeWidth: 2
        });
        break;
      case "ellipse":
        s = new x({
          cx: (this._startPoint.x + this._currentPoint.x) / 2,
          cy: (this._startPoint.y + this._currentPoint.y) / 2,
          rx: Math.abs(t) / 2,
          ry: Math.abs(e) / 2,
          fill: { r: 236, g: 72, b: 153, a: 0.5 },
          stroke: { r: 219, g: 39, b: 119, a: 1 },
          strokeWidth: 2
        });
        break;
      case "text":
        s = new w({
          x: this._startPoint.x,
          y: this._startPoint.y,
          content: "双击编辑",
          fontSize: 24,
          fill: { r: 31, g: 41, b: 55, a: 1 }
        });
        break;
    }
    s && this.addShape(s);
  }
  addShape(t) {
    this._shapes.set(t.id, t), this._selectionManager.registerShape(t), this._layerManager.addShapeToLayer(t.id, this._layerManager.activeLayer.id), this._selectionManager.clear(), this._selectionManager.add(t.id), this._render(), this._emit("shapeAdded", { shape: t });
  }
  removeShape(t) {
    const e = this._shapes.get(t);
    return e ? (this._shapes.delete(t), this._selectionManager.unregisterShape(t), this._layerManager.removeShapeFromLayer(t), this._render(), this._emit("shapeRemoved", { shapeId: t, shape: e }), !0) : !1;
  }
  getShape(t) {
    return this._shapes.get(t);
  }
  clear() {
    this._shapes.clear(), this._selectionManager.clearShapes(), this._layerManager = new T(), this._render(), this._emit("canvasCleared", {});
  }
  _render() {
    const t = this._ctx, e = this._canvas;
    t.save(), t.fillStyle = this._backgroundColor, t.fillRect(0, 0, e.width, e.height), t.setTransform(
      this._viewMatrix.a,
      this._viewMatrix.b,
      this._viewMatrix.c,
      this._viewMatrix.d,
      this._viewMatrix.e,
      this._viewMatrix.f
    );
    const s = this._layerManager.getRenderOrder();
    for (const i of s) {
      const r = this._shapes.get(i);
      r && r.draw(t);
    }
    for (const i of this._selectionManager.getSelectedShapes()) {
      const r = i.getBoundingBox();
      t.save(), t.setTransform(1, 0, 0, 1, 0, 0);
      const a = {
        x: this._worldToScreen({ x: r.x, y: r.y }),
        width: r.width * this._zoom,
        height: r.height * this._zoom
      };
      t.strokeStyle = "#667eea", t.lineWidth = 2, t.setLineDash([5, 5]), t.strokeRect(
        a.x.x,
        a.x.y,
        a.width,
        a.height
      ), t.setLineDash([]);
      const n = 6, l = [
        { x: a.x.x, y: a.x.y },
        { x: a.x.x + a.width, y: a.x.y },
        { x: a.x.x + a.width, y: a.x.y + a.height },
        { x: a.x.x, y: a.x.y + a.height }
      ];
      for (const o of l)
        t.fillStyle = "#ffffff", t.strokeStyle = "#667eea", t.lineWidth = 2, t.fillRect(
          o.x - n / 2,
          o.y - n / 2,
          n,
          n
        ), t.strokeRect(
          o.x - n / 2,
          o.y - n / 2,
          n,
          n
        );
      t.restore();
    }
    if (this._selectionBox) {
      t.save(), t.setTransform(1, 0, 0, 1, 0, 0);
      const i = this._worldToScreen({ x: this._selectionBox.x, y: this._selectionBox.y }), r = this._worldToScreen({
        x: this._selectionBox.x + this._selectionBox.width,
        y: this._selectionBox.y + this._selectionBox.height
      });
      t.fillStyle = "rgba(102, 126, 234, 0.1)", t.strokeStyle = "#667eea", t.lineWidth = 1, t.setLineDash([3, 3]), t.fillRect(
        i.x,
        i.y,
        r.x - i.x,
        r.y - i.y
      ), t.strokeRect(
        i.x,
        i.y,
        r.x - i.x,
        r.y - i.y
      ), t.restore();
    }
    t.restore();
  }
  saveToStorage(t) {
    const e = {
      shapes: Array.from(this._shapes.values()).map((s) => s.toJSON()),
      selectedIds: this._selectionManager.selectedIds,
      activeLayer: this._layerManager.activeLayer.index,
      zoom: this._zoom,
      panX: this._panX,
      panY: this._panY
    };
    return p.saveToLocalStorage(e, this._layerManager.toJSON(), t);
  }
  loadFromStorage(t) {
    const e = p.loadFromLocalStorage(t);
    if (!e) return !1;
    this._shapes.clear();
    for (const s of e.shapes)
      this._shapes.set(s.id, s), this._selectionManager.registerShape(s);
    return this._layerManager.fromJSON(e.layerData), this._selectionManager.replace(e.canvasState.selectedIds), this._zoom = e.canvasState.zoom, this._panX = e.canvasState.panX, this._panY = e.canvasState.panY, this._updateViewMatrix(), this._render(), this._emit("canvasLoaded", {}), !0;
  }
  exportToFile(t = "canvas-project.json") {
    const e = {
      shapes: Array.from(this._shapes.values()).map((s) => s.toJSON()),
      selectedIds: this._selectionManager.selectedIds,
      activeLayer: this._layerManager.activeLayer.index,
      zoom: this._zoom,
      panX: this._panX,
      panY: this._panY
    };
    p.exportToFile(e, this._layerManager.toJSON(), t);
  }
  async importFromFile(t) {
    try {
      const e = await p.importFromFile(t);
      this._shapes.clear();
      for (const s of e.shapes)
        this._shapes.set(s.id, s), this._selectionManager.registerShape(s);
      return this._layerManager.fromJSON(e.layerData), this._selectionManager.replace(e.canvasState.selectedIds), this._zoom = e.canvasState.zoom, this._panX = e.canvasState.panX, this._panY = e.canvasState.panY, this._updateViewMatrix(), this._render(), this._emit("canvasLoaded", {}), !0;
    } catch (e) {
      return console.error("Failed to import file:", e), !1;
    }
  }
  on(t, e) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e), () => {
      var s;
      (s = this._listeners.get(t)) == null || s.delete(e);
    };
  }
  off(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.delete(e);
  }
  _emit(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.forEach((i) => i(e));
  }
  destroy() {
    this._listeners.clear(), this._shapes.clear(), this._selectionManager.clearShapes();
  }
}
class b {
  constructor(t) {
    h(this, "_buffer");
    h(this, "_capacity");
    h(this, "_writeIndex");
    h(this, "_readIndex");
    h(this, "_length");
    this._capacity = t, this._buffer = new Float32Array(t), this._writeIndex = 0, this._readIndex = 0, this._length = 0;
  }
  get capacity() {
    return this._capacity;
  }
  get length() {
    return this._length;
  }
  get isEmpty() {
    return this._length === 0;
  }
  get isFull() {
    return this._length === this._capacity;
  }
  write(t) {
    const e = t.length, s = this._capacity - this._length;
    if (s === 0) return 0;
    const i = Math.min(e, s);
    for (let r = 0; r < i; r++)
      this._buffer[this._writeIndex] = t[r], this._writeIndex = (this._writeIndex + 1) % this._capacity;
    return this._length += i, i;
  }
  read(t) {
    if (this._length === 0 || t <= 0)
      return new Float32Array(0);
    const e = Math.min(t, this._length), s = new Float32Array(e);
    for (let i = 0; i < e; i++)
      s[i] = this._buffer[this._readIndex], this._readIndex = (this._readIndex + 1) % this._capacity;
    return this._length -= e, s;
  }
  peek(t) {
    if (this._length === 0 || t <= 0)
      return new Float32Array(0);
    const e = Math.min(t, this._length), s = new Float32Array(e);
    for (let i = 0; i < e; i++) {
      const r = (this._readIndex + i) % this._capacity;
      s[i] = this._buffer[r];
    }
    return s;
  }
  discard(t) {
    if (this._length === 0 || t <= 0) return 0;
    const e = Math.min(t, this._length);
    return this._readIndex = (this._readIndex + e) % this._capacity, this._length -= e, e;
  }
  clear() {
    this._writeIndex = 0, this._readIndex = 0, this._length = 0, this._buffer.fill(0);
  }
  getAvailable() {
    return this._capacity - this._length;
  }
  getReadable() {
    return this._length;
  }
  toArray() {
    return this.peek(this._length);
  }
  forEach(t) {
    for (let e = 0; e < this._length; e++) {
      const s = (this._readIndex + e) % this._capacity;
      t(this._buffer[s], e);
    }
  }
  map(t) {
    const e = [];
    return this.forEach((s, i) => {
      e.push(t(s, i));
    }), e;
  }
  reduce(t, e) {
    let s = e;
    return this.forEach((i, r) => {
      s = t(s, i, r);
    }), s;
  }
  clone() {
    const t = new b(this._capacity);
    return t._buffer = new Float32Array(this._buffer), t._writeIndex = this._writeIndex, t._readIndex = this._readIndex, t._length = this._length, t;
  }
}
class P {
  constructor(t = {}) {
    h(this, "_config");
    h(this, "_audioContext");
    h(this, "_mediaStream");
    h(this, "_mediaStreamSource");
    h(this, "_scriptProcessor");
    h(this, "_analyser");
    h(this, "_ringBuffer");
    h(this, "_isRunning");
    h(this, "_isRecording");
    h(this, "_listeners");
    this._config = {
      sampleRate: t.sampleRate ?? 16e3,
      channels: t.channels ?? 1,
      bufferSize: t.bufferSize ?? 4096,
      fftSize: t.fftSize ?? 2048
    }, this._audioContext = null, this._mediaStream = null, this._mediaStreamSource = null, this._scriptProcessor = null, this._analyser = null, this._ringBuffer = new b(this._config.sampleRate * 3), this._isRunning = !1, this._isRecording = !1, this._listeners = /* @__PURE__ */ new Map();
  }
  get config() {
    return { ...this._config };
  }
  get isRunning() {
    return this._isRunning;
  }
  get isRecording() {
    return this._isRecording;
  }
  get ringBuffer() {
    return this._ringBuffer;
  }
  get sampleRate() {
    return this._config.sampleRate;
  }
  async init() {
    if (!this._isRunning)
      try {
        this._audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: this._config.sampleRate
        }), this._mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: this._config.channels,
            sampleRate: this._config.sampleRate,
            echoCancellation: !0,
            noiseSuppression: !0,
            autoGainControl: !0
          }
        }), this._mediaStreamSource = this._audioContext.createMediaStreamSource(this._mediaStream), this._analyser = this._audioContext.createAnalyser(), this._analyser.fftSize = this._config.fftSize, this._analyser.smoothingTimeConstant = 0.1, this._scriptProcessor = this._audioContext.createScriptProcessor(
          this._config.bufferSize,
          this._config.channels,
          this._config.channels
        ), this._scriptProcessor.onaudioprocess = this._onAudioProcess.bind(this), this._mediaStreamSource.connect(this._analyser), this._analyser.connect(this._scriptProcessor), this._scriptProcessor.connect(this._audioContext.destination), this._isRunning = !0, this._emit("initialized", { success: !0 });
      } catch (t) {
        throw this._emit("error", { error: t instanceof Error ? t.message : String(t) }), t;
      }
  }
  start() {
    this._isRecording || (this._isRecording = !0, this._ringBuffer.clear(), this._emit("started", {}));
  }
  stop() {
    this._isRecording = !1, this._emit("stopped", {});
  }
  _onAudioProcess(t) {
    if (!this._isRecording) return;
    const e = t.inputBuffer, s = t.outputBuffer, i = e.getChannelData(0), r = this._resample(i, e.sampleRate, this._config.sampleRate);
    this._ringBuffer.write(r);
    const a = {
      data: new Float32Array(r),
      sampleRate: this._config.sampleRate,
      timestamp: performance.now(),
      duration: r.length / this._config.sampleRate
    };
    this._emit("audioFrame", a);
    for (let n = 0; n < s.numberOfChannels; n++)
      s.getChannelData(n).fill(0);
  }
  _resample(t, e, s) {
    if (e === s)
      return t;
    const i = e / s, r = Math.round(t.length / i), a = new Float32Array(r);
    for (let n = 0; n < r; n++) {
      const l = n * i, o = Math.floor(l), c = l - o;
      o + 1 < t.length ? a[n] = t[o] * (1 - c) + t[o + 1] * c : a[n] = t[o];
    }
    return a;
  }
  readAvailable() {
    return this._ringBuffer.read(this._ringBuffer.length);
  }
  peekAvailable() {
    return this._ringBuffer.peek(this._ringBuffer.length);
  }
  getFeatures(t = 1024) {
    if (this._ringBuffer.length < t) return null;
    const e = this._ringBuffer.peek(t), s = this._calculateRMS(e), i = this._calculateZCR(e), r = this._calculateEnergy(e), a = this._calculateSpectralCentroid(e), n = this._calculateSpectralFlatness(e);
    return {
      rms: s,
      zcr: i,
      energy: r,
      spectralCentroid: a,
      spectralFlatness: n,
      timestamp: performance.now()
    };
  }
  _calculateRMS(t) {
    let e = 0;
    for (let s = 0; s < t.length; s++)
      e += t[s] * t[s];
    return Math.sqrt(e / t.length);
  }
  _calculateZCR(t) {
    let e = 0;
    for (let s = 1; s < t.length; s++)
      (t[s] >= 0 && t[s - 1] < 0 || t[s] < 0 && t[s - 1] >= 0) && e++;
    return e / t.length;
  }
  _calculateEnergy(t) {
    let e = 0;
    for (let s = 0; s < t.length; s++)
      e += t[s] * t[s];
    return e / t.length;
  }
  _calculateSpectralCentroid(t) {
    const e = t.length, s = 1024, i = Math.min(e, s), r = new Float32Array(s);
    for (let o = 0; o < i; o++) {
      const c = 0.5 * (1 - Math.cos(2 * Math.PI * o / (i - 1)));
      r[o] = t[o] * c;
    }
    const a = new Float32Array(s / 2);
    for (let o = 0; o < s / 2; o++)
      a[o] = Math.abs(r[o * 2]) + Math.abs(r[o * 2 + 1]);
    let n = 0, l = 0;
    for (let o = 0; o < a.length; o++)
      n += a[o], l += o * a[o];
    return n > 0 ? l / n : 0;
  }
  _calculateSpectralFlatness(t) {
    const e = t.length, s = 1024, i = Math.min(e, s), r = new Float32Array(s / 2);
    for (let _ = 0; _ < s / 2; _++) {
      const d = _ * 2 < i ? t[_ * 2] : 0, u = _ * 2 + 1 < i ? t[_ * 2 + 1] : 0;
      r[_] = Math.sqrt(d * d + u * u);
    }
    let a = 0, n = 0, l = 0;
    for (let _ = 0; _ < r.length; _++)
      r[_] > 0 && (a += Math.log(r[_]), n += r[_], l++);
    if (l === 0 || n === 0) return 0;
    const o = Math.exp(a / l), c = n / l;
    return o / c;
  }
  clearBuffer() {
    this._ringBuffer.clear();
  }
  async destroy() {
    this._isRunning = !1, this._isRecording = !1, this._scriptProcessor && (this._scriptProcessor.onaudioprocess = null, this._scriptProcessor.disconnect(), this._scriptProcessor = null), this._analyser && (this._analyser.disconnect(), this._analyser = null), this._mediaStreamSource && (this._mediaStreamSource.disconnect(), this._mediaStreamSource = null), this._mediaStream && (this._mediaStream.getTracks().forEach((t) => t.stop()), this._mediaStream = null), this._audioContext && (this._audioContext.state !== "closed" && await this._audioContext.close(), this._audioContext = null), this._ringBuffer.clear(), this._emit("destroyed", {});
  }
  on(t, e) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e), () => {
      var s;
      (s = this._listeners.get(t)) == null || s.delete(e);
    };
  }
  off(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.delete(e);
  }
  _emit(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.forEach((i) => i(e));
  }
}
class B {
  constructor(t = {}) {
    h(this, "_config");
    h(this, "_frameIndex");
    h(this, "_isSpeech");
    h(this, "_speechFrames");
    h(this, "_silenceFrames");
    h(this, "_hangoverCount");
    h(this, "_speechStartFrame");
    h(this, "_history");
    h(this, "_listeners");
    h(this, "_isRunning");
    this._config = {
      threshold: t.threshold ?? 0.5,
      frameDurationMs: t.frameDurationMs ?? 30,
      bufferSize: t.bufferSize ?? 10,
      hangoverFrames: t.hangoverFrames ?? 5,
      minSpeechFrames: t.minSpeechFrames ?? 3
    }, this._frameIndex = 0, this._isSpeech = !1, this._speechFrames = 0, this._silenceFrames = 0, this._hangoverCount = 0, this._speechStartFrame = -1, this._history = [], this._listeners = /* @__PURE__ */ new Map(), this._isRunning = !1;
  }
  get config() {
    return { ...this._config };
  }
  get isSpeech() {
    return this._isSpeech;
  }
  get isRunning() {
    return this._isRunning;
  }
  get history() {
    return [...this._history];
  }
  start() {
    this._isRunning || (this._isRunning = !0, this._frameIndex = 0, this._isSpeech = !1, this._speechFrames = 0, this._silenceFrames = 0, this._hangoverCount = 0, this._speechStartFrame = -1, this._history = [], this._emit("started", {}));
  }
  stop() {
    this._isRunning && (this._isRunning = !1, this._emit("stopped", {}));
  }
  reset() {
    this._frameIndex = 0, this._isSpeech = !1, this._speechFrames = 0, this._silenceFrames = 0, this._hangoverCount = 0, this._speechStartFrame = -1, this._history = [];
  }
  process(t) {
    if (!this._isRunning)
      return {
        isSpeech: !1,
        probability: 0,
        frameIndex: this._frameIndex++,
        timestamp: t.timestamp
      };
    const e = this._calculateSpeechProbability(t);
    e >= this._config.threshold ? (this._speechFrames++, this._silenceFrames = 0, this._hangoverCount = this._config.hangoverFrames, !this._isSpeech && this._speechFrames >= this._config.minSpeechFrames && (this._isSpeech = !0, this._speechStartFrame = this._frameIndex, this._emit("speechStart", {
      frameIndex: this._frameIndex,
      timestamp: t.timestamp
    }))) : (this._silenceFrames++, this._isSpeech && (this._hangoverCount > 0 ? this._hangoverCount-- : (this._isSpeech = !1, this._speechFrames = 0, this._emit("speechEnd", {
      frameIndex: this._frameIndex,
      timestamp: t.timestamp,
      startFrame: this._speechStartFrame
    }))));
    const i = {
      isSpeech: this._isSpeech,
      probability: e,
      frameIndex: this._frameIndex,
      timestamp: t.timestamp
    };
    return this._history.push(i), this._history.length > this._config.bufferSize && this._history.shift(), this._emit("result", i), this._frameIndex++, i;
  }
  _calculateSpeechProbability(t) {
    let e = 0, s = 0;
    if (t.rms > 0) {
      const n = Math.min(1, t.rms * 10);
      e += n * 0.4, s += 0.4;
    }
    const i = t.zcr * 100, r = i > 5 && i < 50 ? 1 : i / 50;
    if (e += r * 0.2, s += 0.2, t.spectralCentroid > 0) {
      const n = Math.min(1, t.spectralCentroid / 200);
      e += n * 0.2, s += 0.2;
    }
    if (t.spectralFlatness > 0) {
      const n = 1 - t.spectralFlatness;
      e += n * 0.2, s += 0.2;
    }
    if (t.energy > 0) {
      const n = Math.min(1, t.energy * 100);
      e += n * 0.1, s += 0.1;
    }
    const a = s > 0 ? e / s : 0;
    return Math.max(0, Math.min(1, a));
  }
  getSpeechSegments() {
    const t = [];
    let e = !1, s = -1, i = 0;
    for (const r of this._history)
      r.isSpeech && !e ? (e = !0, s = r.frameIndex, i = r.timestamp) : !r.isSpeech && e && (e = !1, t.push({
        startFrame: s,
        endFrame: r.frameIndex - 1,
        startTimestamp: i,
        endTimestamp: r.timestamp
      }));
    if (e) {
      const r = this._history[this._history.length - 1];
      t.push({
        startFrame: s,
        endFrame: r.frameIndex,
        startTimestamp: i,
        endTimestamp: r.timestamp
      });
    }
    return t;
  }
  updateConfig(t) {
    this._config = { ...this._config, ...t };
  }
  on(t, e) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e), () => {
      var s;
      (s = this._listeners.get(t)) == null || s.delete(e);
    };
  }
  off(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.delete(e);
  }
  _emit(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.forEach((i) => i(e));
  }
}
class R {
  constructor(t = {}) {
    h(this, "_sampleRate");
    h(this, "_fftSize");
    h(this, "_hopSize");
    h(this, "_numMfcc");
    h(this, "_numFilters");
    h(this, "_minFreq");
    h(this, "_maxFreq");
    h(this, "_filterBank");
    h(this, "_dctMatrix");
    h(this, "_hannWindow");
    this._sampleRate = t.sampleRate ?? 16e3, this._fftSize = t.fftSize ?? 512, this._hopSize = t.hopSize ?? 160, this._numMfcc = t.numMfcc ?? 13, this._numFilters = t.numFilters ?? 26, this._minFreq = t.minFreq ?? 0, this._maxFreq = t.maxFreq ?? this._sampleRate / 2, this._filterBank = this._createMelFilterBank(), this._dctMatrix = this._createDCTMatrix(), this._hannWindow = this._createHannWindow();
  }
  get sampleRate() {
    return this._sampleRate;
  }
  get fftSize() {
    return this._fftSize;
  }
  get hopSize() {
    return this._hopSize;
  }
  get numMfcc() {
    return this._numMfcc;
  }
  extract(t) {
    const e = Math.floor((t.length - this._fftSize) / this._hopSize) + 1, s = [];
    for (let i = 0; i < e; i++) {
      const r = i * this._hopSize, a = t.slice(r, r + this._fftSize);
      if (a.length < this._fftSize) {
        const n = new Float32Array(this._fftSize);
        n.set(a);
        const l = this._processFrame(n);
        s.push(l);
      } else {
        const n = this._processFrame(a);
        s.push(n);
      }
    }
    return s;
  }
  _processFrame(t) {
    const e = this._applyWindow(t), s = this._computeMagnitudeSpectrum(e), r = this._applyFilterBank(s).map((n) => Math.log(Math.max(n, 1e-10)));
    return this._applyDCT(r);
  }
  _createHannWindow() {
    const t = [];
    for (let e = 0; e < this._fftSize; e++)
      t[e] = 0.5 * (1 - Math.cos(2 * Math.PI * e / (this._fftSize - 1)));
    return t;
  }
  _applyWindow(t) {
    const e = new Float32Array(t.length);
    for (let s = 0; s < t.length; s++)
      e[s] = t[s] * this._hannWindow[s];
    return e;
  }
  _computeMagnitudeSpectrum(t) {
    const e = new Float32Array(this._fftSize / 2);
    for (let s = 0; s < this._fftSize / 2; s++) {
      let i = 0, r = 0;
      for (let a = 0; a < this._fftSize; a++) {
        const n = -2 * Math.PI * s * a / this._fftSize;
        i += t[a] * Math.cos(n), r += t[a] * Math.sin(n);
      }
      e[s] = Math.sqrt(i * i + r * r) / this._fftSize;
    }
    return e;
  }
  _createMelFilterBank() {
    const t = [], e = this._numFilters, s = this._fftSize, i = this._sampleRate, r = this._hzToMel(this._minFreq), a = this._hzToMel(this._maxFreq), n = [];
    for (let c = 0; c <= e + 1; c++)
      n[c] = r + (a - r) * c / (e + 1);
    const o = n.map((c) => this._melToHz(c)).map((c) => Math.floor((s + 1) * c / i));
    for (let c = 1; c <= e; c++) {
      const _ = new Array(s / 2).fill(0);
      for (let d = o[c - 1]; d <= o[c]; d++)
        d < s / 2 && (_[d] = (d - o[c - 1]) / (o[c] - o[c - 1]));
      for (let d = o[c]; d <= o[c + 1]; d++)
        d < s / 2 && (_[d] = 1 - (d - o[c]) / (o[c + 1] - o[c]));
      t.push(_);
    }
    return t;
  }
  _applyFilterBank(t) {
    const e = [];
    for (let s = 0; s < this._filterBank.length; s++) {
      let i = 0;
      for (let r = 0; r < t.length; r++)
        i += t[r] * t[r] * this._filterBank[s][r];
      e.push(i);
    }
    return e;
  }
  _createDCTMatrix() {
    const t = [], e = this._numFilters, s = this._numMfcc;
    for (let i = 0; i < s; i++) {
      t[i] = [];
      for (let r = 0; r < e; r++)
        t[i][r] = Math.sqrt(2 / e) * Math.cos(i * Math.PI * (r + 0.5) / e);
    }
    return t;
  }
  _applyDCT(t) {
    const e = new Float32Array(this._numMfcc);
    for (let s = 0; s < this._numMfcc; s++) {
      let i = 0;
      for (let r = 0; r < t.length; r++)
        i += t[r] * this._dctMatrix[s][r];
      e[s] = i;
    }
    return e;
  }
  _hzToMel(t) {
    return 2595 * Math.log10(1 + t / 700);
  }
  _melToHz(t) {
    return 700 * (Math.pow(10, t / 2595) - 1);
  }
  computeDeltaFeatures(t) {
    var r;
    const e = [], s = t.length, i = ((r = t[0]) == null ? void 0 : r.length) || 0;
    for (let a = 0; a < s; a++) {
      const n = new Float32Array(i);
      for (let l = 0; l < i; l++) {
        let o = 0, c = 0;
        for (let _ = 1; _ <= 2; _++) {
          const d = a - _ >= 0 ? t[a - _][l] : 0, u = a + _ < s ? t[a + _][l] : t[a][l];
          o += _ * (u - d), c += _ * _;
        }
        n[l] = o / (2 * c);
      }
      e.push(n);
    }
    return e;
  }
  normalizeFeatures(t) {
    const e = t.length;
    if (e === 0) return t;
    const s = t[0].length, i = new Float32Array(s), r = new Float32Array(s);
    for (let n = 0; n < s; n++) {
      let l = 0;
      for (let o = 0; o < e; o++)
        l += t[o][n];
      i[n] = l / e;
    }
    for (let n = 0; n < s; n++) {
      let l = 0;
      for (let o = 0; o < e; o++) {
        const c = t[o][n] - i[n];
        l += c * c;
      }
      r[n] = Math.sqrt(l / e + 1e-10);
    }
    const a = [];
    for (let n = 0; n < e; n++) {
      const l = new Float32Array(s);
      for (let o = 0; o < s; o++)
        l[o] = (t[n][o] - i[o]) / r[o];
      a.push(l);
    }
    return a;
  }
}
class D {
  constructor(t = {}) {
    h(this, "_config");
    h(this, "_extractor");
    h(this, "_template");
    h(this, "_templates");
    h(this, "_threshold");
    h(this, "_isTrained");
    h(this, "_listeners");
    h(this, "_frameBuffer");
    h(this, "_maxFrames");
    this._config = {
      modelName: t.modelName ?? "wakeword-model",
      threshold: t.threshold ?? 0.7,
      windowSize: t.windowSize ?? 100,
      hopSize: t.hopSize ?? 10,
      samplingRate: t.samplingRate ?? 16e3,
      mfccCoeffs: t.mfccCoeffs ?? 13
    }, this._extractor = new R({
      sampleRate: this._config.samplingRate,
      numMfcc: this._config.mfccCoeffs
    }), this._template = null, this._templates = /* @__PURE__ */ new Map(), this._threshold = this._config.threshold, this._isTrained = !1, this._listeners = /* @__PURE__ */ new Map(), this._frameBuffer = [], this._maxFrames = this._config.windowSize;
  }
  get config() {
    return { ...this._config };
  }
  get isTrained() {
    return this._isTrained;
  }
  get threshold() {
    return this._threshold;
  }
  set threshold(t) {
    this._threshold = t;
  }
  get extractor() {
    return this._extractor;
  }
  train(t, e = "default") {
    const s = this._extractor.extract(t);
    if (s.length === 0)
      throw new Error("Failed to extract MFCC features from audio data");
    const i = this._extractor.normalizeFeatures(s);
    e === "default" && (this._template = i), this._templates.set(e, i), this._isTrained = !0, this._emit("trained", {
      type: "audio_data",
      timestamp: performance.now(),
      data: { label: e, frames: i.length }
    });
  }
  trainWithFeatures(t, e = "default") {
    if (t.length === 0)
      throw new Error("Empty feature array provided");
    e === "default" && (this._template = t), this._templates.set(e, t), this._isTrained = !0, this._emit("trained", {
      type: "audio_data",
      timestamp: performance.now(),
      data: { label: e, frames: t.length }
    });
  }
  reset() {
    this._template = null, this._templates.clear(), this._isTrained = !1, this._frameBuffer = [];
  }
  predict(t) {
    if (!this._isTrained || !this._template)
      return {
        detected: !1,
        confidence: 0,
        timestamp: performance.now(),
        label: ""
      };
    const e = this._extractor.extract(t);
    if (e.length === 0)
      return {
        detected: !1,
        confidence: 0,
        timestamp: performance.now(),
        label: ""
      };
    const s = this._extractor.normalizeFeatures(e);
    let i = 0, r = "";
    for (const [l, o] of this._templates) {
      const _ = 1 / (1 + this._dynamicTimeWarping(s, o));
      _ > i && (i = _, r = l);
    }
    if (this._template) {
      const o = 1 / (1 + this._dynamicTimeWarping(s, this._template));
      o > i && (i = o, r = "default");
    }
    const a = i >= this._threshold, n = {
      detected: a,
      confidence: i,
      timestamp: performance.now(),
      label: r
    };
    return a && this._emit("wakeword", {
      type: "wakeword",
      timestamp: n.timestamp,
      data: n
    }), n;
  }
  predictIncremental(t) {
    if (this._frameBuffer.push(t), this._frameBuffer.length > this._maxFrames && this._frameBuffer.shift(), this._frameBuffer.length < Math.min(this._maxFrames, 20))
      return null;
    const e = this._extractor.normalizeFeatures(this._frameBuffer);
    let s = 0, i = "";
    for (const [a, n] of this._templates) {
      const o = 1 / (1 + this._dynamicTimeWarping(e, n));
      o > s && (s = o, i = a);
    }
    if (this._template) {
      const n = 1 / (1 + this._dynamicTimeWarping(e, this._template));
      n > s && (s = n, i = "default");
    }
    if (s >= this._threshold) {
      this._frameBuffer = [];
      const a = {
        detected: !0,
        confidence: s,
        timestamp: performance.now(),
        label: i
      };
      return this._emit("wakeword", {
        type: "wakeword",
        timestamp: a.timestamp,
        data: a
      }), a;
    }
    return null;
  }
  _dynamicTimeWarping(t, e) {
    const s = t.length, i = e.length;
    if (s === 0 || i === 0) return 1 / 0;
    const r = new Array(s + 1);
    for (let a = 0; a <= s; a++) {
      r[a] = new Array(i + 1);
      for (let n = 0; n <= i; n++)
        r[a][n] = 1 / 0;
    }
    r[0][0] = 0;
    for (let a = 1; a <= s; a++)
      for (let n = 1; n <= i; n++) {
        const l = this._euclideanDistance(t[a - 1], e[n - 1]);
        r[a][n] = l + Math.min(
          r[a - 1][n],
          r[a][n - 1],
          r[a - 1][n - 1]
        );
      }
    return r[s][i] / Math.max(s, i);
  }
  _euclideanDistance(t, e) {
    let s = 0;
    const i = Math.min(t.length, e.length);
    for (let r = 0; r < i; r++) {
      const a = t[r] - e[r];
      s += a * a;
    }
    return Math.sqrt(s);
  }
  on(t, e) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e), () => {
      var s;
      (s = this._listeners.get(t)) == null || s.delete(e);
    };
  }
  off(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.delete(e);
  }
  _emit(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.forEach((i) => i(e));
  }
  saveModel() {
    const t = {};
    for (const [e, s] of this._templates)
      t[e] = s.map((i) => Array.from(i));
    return this._template && (t.default = this._template.map((e) => Array.from(e))), {
      config: this._config,
      templates: t
    };
  }
  loadModel(t) {
    this._config = { ...this._config, ...t.config };
    for (const [e, s] of Object.entries(t.templates)) {
      const i = s.map((r) => new Float32Array(r));
      e === "default" && (this._template = i), this._templates.set(e, i);
    }
    this._isTrained = !0;
  }
}
class Y {
  constructor(t = {}) {
    h(this, "_audioProcessor");
    h(this, "_vad");
    h(this, "_model");
    h(this, "_isInitialized");
    h(this, "_isRunning");
    h(this, "_listeners");
    h(this, "_wakeword");
    h(this, "_audioConfig");
    h(this, "_vadConfig");
    h(this, "_wakewordConfig");
    h(this, "_frameCount");
    h(this, "_speechFrames");
    h(this, "_isSpeechDetected");
    h(this, "_cooldownFrames");
    h(this, "_cooldownCounter");
    var e, s, i, r, a, n, l, o, c, _, d, u, k, F, I;
    this._audioConfig = {
      sampleRate: ((e = t.audioConfig) == null ? void 0 : e.sampleRate) ?? 16e3,
      channels: ((s = t.audioConfig) == null ? void 0 : s.channels) ?? 1,
      bufferSize: ((i = t.audioConfig) == null ? void 0 : i.bufferSize) ?? 4096,
      fftSize: ((r = t.audioConfig) == null ? void 0 : r.fftSize) ?? 2048
    }, this._vadConfig = {
      threshold: ((a = t.vadConfig) == null ? void 0 : a.threshold) ?? 0.4,
      frameDurationMs: ((n = t.vadConfig) == null ? void 0 : n.frameDurationMs) ?? 30,
      bufferSize: ((l = t.vadConfig) == null ? void 0 : l.bufferSize) ?? 10,
      hangoverFrames: ((o = t.vadConfig) == null ? void 0 : o.hangoverFrames) ?? 8,
      minSpeechFrames: ((c = t.vadConfig) == null ? void 0 : c.minSpeechFrames) ?? 3
    }, this._wakewordConfig = {
      modelName: ((_ = t.wakewordConfig) == null ? void 0 : _.modelName) ?? "wakeword-model",
      threshold: ((d = t.wakewordConfig) == null ? void 0 : d.threshold) ?? 0.65,
      windowSize: ((u = t.wakewordConfig) == null ? void 0 : u.windowSize) ?? 80,
      hopSize: ((k = t.wakewordConfig) == null ? void 0 : k.hopSize) ?? 10,
      samplingRate: ((F = t.wakewordConfig) == null ? void 0 : F.samplingRate) ?? 16e3,
      mfccCoeffs: ((I = t.wakewordConfig) == null ? void 0 : I.mfccCoeffs) ?? 13
    }, this._audioProcessor = new P(this._audioConfig), this._vad = new B(this._vadConfig), this._model = new D(this._wakewordConfig), this._isInitialized = !1, this._isRunning = !1, this._listeners = /* @__PURE__ */ new Map(), this._wakeword = t.wakeword ?? "你好小明", this._frameCount = 0, this._speechFrames = 0, this._isSpeechDetected = !1, this._cooldownFrames = 50, this._cooldownCounter = 0, this._setupListeners(), this._createDummyTemplate();
  }
  get isInitialized() {
    return this._isInitialized;
  }
  get isRunning() {
    return this._isRunning;
  }
  get wakeword() {
    return this._wakeword;
  }
  get audioProcessor() {
    return this._audioProcessor;
  }
  get vad() {
    return this._vad;
  }
  get model() {
    return this._model;
  }
  async init() {
    this._isInitialized || (await this._audioProcessor.init(), this._isInitialized = !0, this._emit("initialized", {
      type: "audio_data",
      timestamp: performance.now(),
      data: { success: !0 }
    }));
  }
  async start() {
    this._isInitialized || await this.init(), !this._isRunning && (this._audioProcessor.start(), this._vad.start(), this._isRunning = !0, this._frameCount = 0, this._speechFrames = 0, this._cooldownCounter = 0, this._emit("started", {
      type: "audio_data",
      timestamp: performance.now(),
      data: { wakeword: this._wakeword }
    }));
  }
  stop() {
    this._isRunning && (this._audioProcessor.stop(), this._vad.stop(), this._isRunning = !1, this._emit("stopped", {
      type: "audio_data",
      timestamp: performance.now(),
      data: {}
    }));
  }
  async destroy() {
    this.stop(), await this._audioProcessor.destroy(), this._listeners.clear(), this._isInitialized = !1;
  }
  _setupListeners() {
    this._audioProcessor.on("audioFrame", (t) => {
      this._processAudioFrame(t);
    }), this._vad.on("speechStart", (t) => {
      this._isSpeechDetected = !0, this._speechFrames = 0, this._emit("vad_start", {
        type: "vad_start",
        timestamp: t.timestamp,
        data: t
      });
    }), this._vad.on("speechEnd", (t) => {
      this._isSpeechDetected = !1, this._emit("vad_end", {
        type: "vad_end",
        timestamp: t.timestamp,
        data: t
      }), this._speechFrames > 10 && this._speechFrames < 100 && this._processSpeechSegment(), this._speechFrames = 0;
    });
  }
  _processAudioFrame(t) {
    if (this._cooldownCounter > 0) {
      this._cooldownCounter--;
      return;
    }
    const e = this._audioProcessor.getFeatures(1024);
    if (e) {
      const s = this._vad.process(e);
      this._isSpeechDetected && this._speechFrames++, this._emit("audio_data", {
        type: "audio_data",
        timestamp: t.timestamp,
        data: {
          frame: t,
          features: e,
          vad: s
        }
      });
    }
    this._frameCount++;
  }
  _processSpeechSegment() {
    const t = this._audioProcessor.readAvailable();
    if (t.length < 1e3) return;
    const e = this._model.predict(t);
    e.detected && (this._cooldownCounter = this._cooldownFrames, this._emit("wakeword", {
      type: "wakeword",
      timestamp: e.timestamp,
      data: {
        ...e,
        wakeword: this._wakeword
      }
    }));
  }
  onWakeword(t) {
    return this.on("wakeword", (e) => {
      t({
        detected: e.data.detected,
        confidence: e.data.confidence,
        timestamp: e.data.timestamp,
        label: e.data.label,
        wakeword: e.data.wakeword
      });
    });
  }
  onVADStart(t) {
    return this.on("vad_start", (e) => {
      t(e.data);
    });
  }
  onVADEnd(t) {
    return this.on("vad_end", (e) => {
      t(e.data);
    });
  }
  on(t, e) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(e), () => {
      var s;
      (s = this._listeners.get(t)) == null || s.delete(e);
    };
  }
  off(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.delete(e);
  }
  _emit(t, e) {
    var s;
    (s = this._listeners.get(t)) == null || s.forEach((i) => i(e));
  }
  _createDummyTemplate() {
    const t = [];
    for (let e = 0; e < 50; e++) {
      const s = new Float32Array(this._wakewordConfig.mfccCoeffs);
      for (let i = 0; i < this._wakewordConfig.mfccCoeffs; i++)
        s[i] = Math.sin(e * 0.1 + i * 0.05) * 5 + Math.cos(e * 0.07 + i * 0.03) * 3;
      t.push(s);
    }
    this._model.trainWithFeatures(t, this._wakeword);
  }
  trainWithAudio(t, e) {
    this._model.train(t, e ?? this._wakeword);
  }
  trainWithFeatures(t, e) {
    this._model.trainWithFeatures(t, e ?? this._wakeword);
  }
  setWakeword(t) {
    this._wakeword = t;
  }
  setThreshold(t) {
    this._model.threshold = t;
  }
  setVADThreshold(t) {
    this._vad.updateConfig({ threshold: t });
  }
  saveModel() {
    return this._model.saveModel();
  }
  loadModel(t) {
    this._model.loadModel(t);
  }
}
export {
  P as AudioStreamProcessor,
  A as CanvasEditor,
  x as Ellipse,
  T as LayerManager,
  f as Matrix2D,
  M as Path,
  y as Rect,
  b as RingBuffer,
  v as SelectionManager,
  p as Serializer,
  g as Shape,
  w as Text,
  S as Transform,
  B as VAD,
  Y as WakewordDetector,
  D as WakewordModel
};
