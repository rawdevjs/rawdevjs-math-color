'use strict'

const clamp = require('lodash/clamp')
const MatrixMath = require('rawdevjs-math-matrix')

const ruvtTable = [
  { r: 0.0, u: 0.18006, v: 0.26352, t: -0.24341 },
  { r: 10.0, u: 0.18066, v: 0.26589, t: -0.25479 },
  { r: 20.0, u: 0.18133, v: 0.26846, t: -0.26876 },
  { r: 30.0, u: 0.18208, v: 0.27119, t: -0.28539 },
  { r: 40.0, u: 0.18293, v: 0.27407, t: -0.30470 },
  { r: 50.0, u: 0.18388, v: 0.27709, t: -0.32675 },
  { r: 60.0, u: 0.18494, v: 0.28021, t: -0.35156 },
  { r: 70.0, u: 0.18611, v: 0.28342, t: -0.37915 },
  { r: 80.0, u: 0.18740, v: 0.28668, t: -0.40955 },
  { r: 90.0, u: 0.18880, v: 0.28997, t: -0.44278 },
  { r: 100.0, u: 0.19032, v: 0.29326, t: -0.47888 },
  { r: 125.0, u: 0.19462, v: 0.30141, t: -0.58204 },
  { r: 150.0, u: 0.19962, v: 0.30921, t: -0.70471 },
  { r: 175.0, u: 0.20525, v: 0.31647, t: -0.84901 },
  { r: 200.0, u: 0.21142, v: 0.32312, t: -1.01820 },
  { r: 225.0, u: 0.21807, v: 0.32909, t: -1.21680 },
  { r: 250.0, u: 0.22511, v: 0.33439, t: -1.45120 },
  { r: 275.0, u: 0.23247, v: 0.33904, t: -1.72980 },
  { r: 300.0, u: 0.24010, v: 0.34308, t: -2.06370 },
  { r: 325.0, u: 0.24792, v: 0.34655, t: -2.46810 },
  { r: 350.0, u: 0.25591, v: 0.34951, t: -2.96410 },
  { r: 375.0, u: 0.26400, v: 0.35200, t: -3.58140 },
  { r: 400.0, u: 0.27218, v: 0.35407, t: -4.36330 },
  { r: 425.0, u: 0.28039, v: 0.35577, t: -5.37620 },
  { r: 450.0, u: 0.28863, v: 0.35714, t: -6.72620 },
  { r: 475.0, u: 0.29685, v: 0.35823, t: -8.59550 },
  { r: 500.0, u: 0.30505, v: 0.35907, t: -11.3240 },
  { r: 525.0, u: 0.31320, v: 0.35968, t: -15.6280 },
  { r: 550.0, u: 0.32129, v: 0.36011, t: -23.3250 },
  { r: 575.0, u: 0.32931, v: 0.36038, t: -40.7700 },
  { r: 600.0, u: 0.33724, v: 0.36051, t: -116.450 }
]

class ColorMath {
  static rgbToHsv (rgb) {
    let max = Math.max(rgb.r, rgb.g, rgb.b)
    let min = Math.min(rgb.r, rgb.g, rgb.b)

    if (max === min) {
      return {h: 0, s: 0, v: max}
    }

    let m = max - min
    let h = 0

    switch (max) {
      case rgb.r:
        h = (rgb.g - rgb.b) / m
        break

      case rgb.g:
        h = (rgb.b - rgb.r) / m + 2
        break

      case rgb.b:
        h = (rgb.r - rgb.g) / m + 4
        break
    }

    return {
      h: h * 60,
      s: m / max,
      v: max
    }
  }

  static hsvToRgb (hsv) {
    let h = clamp(hsv.h, 0, 360)
    let s = clamp(hsv.s, 0, 1)
    let v = clamp(hsv.v, 0, 1)

    if (s === 0) {
      return {r: v, g: v, b: v}
    }

    h = (h % 360.0) / 60

    let i = Math.floor(h)
    let f = h - i
    let p = v * (1 - s)
    let q = v * (1 - s * f)
    let t = v * (1 - s * (1 - f))

    switch (i) {
      case 0:
        return {r: v, g: t, b: p}
      case 1:
        return {r: q, g: v, b: p}
      case 2:
        return {r: p, g: v, b: t}
      case 3:
        return {r: p, g: q, b: v}
      case 4:
        return {r: t, g: p, b: v}
      case 5:
        return {r: v, g: p, b: q}
    }

    return {r: 0, g: 0, b: 0}
  }

  static temperatureFromXY (xy) {
    let us = 2.0 * xy.x / (1.5 - xy.x + 6.0 * xy.y)
    let vs = 3.0 * xy.y / (1.5 - xy.x + 6.0 * xy.y)

    let di = 0.0
    let dj = 0.0

    let index = 0

    for (; index < 31; index++) {
      di = (vs - ruvtTable[index].v) - ruvtTable[index].t * (us - ruvtTable[index].u)

      if (index > 0 && di < 0.0) {
        break
      }

      dj = di
    }

    di /= Math.sqrt(1.0 + ruvtTable[index].t * ruvtTable[index].t)
    dj /= Math.sqrt(1.0 + ruvtTable[index - 1].t * ruvtTable[index - 1].t)

    let f = dj / (dj - di)

    let temperature = 1000000.0 / ((ruvtTable[index].r - ruvtTable[index - 1].r) * f + ruvtTable[index - 1].r)

    let ud = us - ((ruvtTable[index].u - ruvtTable[index - 1].u) * f + ruvtTable[index - 1].u)
    let vd = vs - ((ruvtTable[index].v - ruvtTable[index - 1].v) * f + ruvtTable[index - 1].v)

    let tli = Math.sqrt(1.0 + ruvtTable[index].t * ruvtTable[index].t)
    let tui = 1.0 / tli
    let tvi = ruvtTable[index].t / tli

    let tlj = Math.sqrt(1.0 + ruvtTable[index - 1].t * ruvtTable[index - 1].t)
    let tuj = 1.0 / tlj
    let tvj = ruvtTable[index - 1].t / tlj

    let tu = (tui - tuj) * f + tuj
    let tv = (tvi - tvj) * f + tvj
    let tl = Math.sqrt(tu * tu + tv * tv)

    tu /= tl
    tv /= tl

    let tint = (ud * tu + vd * tv) * -3000.0

    return {
      temperature: temperature,
      tint: tint
    }
  }

  static xyFromTemperature (temperature, tint) {
    let r = 1000000.0 / temperature

    let index = 1

    for (; index < 31; index++) {
      if (r < ruvtTable[index].r) {
        break
      }
    }

    let f = (ruvtTable[index].r - r) / (ruvtTable[index].r - ruvtTable[index - 1].r)

    let us = (ruvtTable[index - 1].u - ruvtTable[index].u) * f + ruvtTable[index].u
    let vs = (ruvtTable[index - 1].v - ruvtTable[index].v) * f + ruvtTable[index].v

    let tli = Math.sqrt(1.0 + ruvtTable[index].t * ruvtTable[index].t)
    let tui = 1.0 / tli
    let tvi = ruvtTable[index].t / tli

    let tlj = Math.sqrt(1.0 + ruvtTable[index - 1].t * ruvtTable[index - 1].t)
    let tuj = 1.0 / tlj
    let tvj = ruvtTable[index - 1].t / tlj

    let tu = (tuj - tui) * f + tui
    let tv = (tvj - tvi) * f + tvi
    let tl = Math.sqrt(tu * tu + tv * tv)

    tu /= tl
    tv /= tl

    us += tu * tint / -3000.0
    vs += tv * tint / -3000.0

    return {
      x: (1.5 * us / (us - 4.0 * vs + 2.0)),
      y: (vs / (us - 4.0 * vs + 2.0))
    }
  }

  static xyToXyz (xy) {
    return {
      x: (xy.x / xy.y),
      y: 1.0,
      z: ((1.0 - xy.x - xy.y) / xy.y)
    }
  }

  static xyzToXy (xyz) {
    let s = xyz.x + xyz.y + xyz.z

    return {
      x: (xyz.x / s),
      y: (xyz.y / s)
    }
  }

  static vectorToXY (vector) {
    let s = vector.data[0] + vector.data[1] + vector.data[2]

    return {
      x: (vector.data[0] / s),
      y: (vector.data[1] / s)
    }
  }

  static vectorToXYZ (vector) {
    return {
      x: vector.data[0],
      y: vector.data[1],
      z: vector.data[2]
    }
  }

  static whitePointXYZConvertMatrix (sourceWhitePoint, targetWhitePoint) {
    let bradfordMatrix = new MatrixMath.Matrix3([0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296])

    let sourceWhitePointVector = new MatrixMath.Vector3([sourceWhitePoint.x, sourceWhitePoint.y, sourceWhitePoint.z])
    let targetWhitePointVector = new MatrixMath.Vector3([targetWhitePoint.x, targetWhitePoint.y, targetWhitePoint.z])

    sourceWhitePointVector = sourceWhitePointVector.multiply(bradfordMatrix)
    targetWhitePointVector = targetWhitePointVector.multiply(bradfordMatrix)

    let x = targetWhitePointVector.data[0] / sourceWhitePointVector.data[0]
    let y = targetWhitePointVector.data[1] / sourceWhitePointVector.data[1]
    let z = targetWhitePointVector.data[2] / sourceWhitePointVector.data[2]

    return bradfordMatrix.inverse().multiply(new MatrixMath.Matrix3([x, y, z])).multiply(bradfordMatrix)
  }
}

ColorMath.whitePointD50 = {
  x: 0.34567,
  y: 0.35850
}

ColorMath.whitePointD65 = {
  x: 0.31271,
  y: 0.32902
}

ColorMath.matrixProPhotoRgb2XYZ = new MatrixMath.Matrix3([0.797675, 0.135192, 0.0313534, 0.288040, 0.711874, 0.000086, 0.0, 0.0, 0.825210])

ColorMath.matrixXYZ2ProPhotoRgb = new MatrixMath.Matrix3([1.34594, -0.255608, -0.0511118, -0.544599, 1.50817, 0.0205351, 0.0, 0.0, 1.21181])

ColorMath.matrixSRgb2XYZ = new MatrixMath.Matrix3([0.412424, 0.357579, 0.180464, 0.212656, 0.715158, 0.0721856, 0.0193324, 0.119193, 0.950444])

// D65
ColorMath.matrixXYZ2SRgb = new MatrixMath.Matrix3([3.24071, -1.53726, -0.498571, -0.969258, 1.87599, 0.0415557, 0.0556352, -0.203996, 1.05707])

// D50
// ColorMath.matrixXYZ2SRgb = new MatrixMath.matrix3([3.1338561, -1.6168667, -0.4906146, -0.9787684,  1.9161415,  0.0334540, 0.0719453, -0.2289914,  1.4052427])

module.exports = ColorMath
