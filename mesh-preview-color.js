import * as T from 'three';

// Sample the reference in normalized object space. A coarse volume also works
// for submissions whose topology and UV layout differ from the reference.
const palettes = new WeakMap();
const resolution = 28;
const cells = resolution ** 3;
const color = new T.Color(), point = new T.Vector3(), uv = new T.Vector2();
function cell(value) {
  return Math.max(0, Math.min(resolution - 1, Math.floor(value * resolution)));
}
function cellAt(mesh, index, bounds, size) {
  mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld).sub(bounds.min).divide(size);
  return cell(point.x) + resolution * (cell(point.y) + resolution * cell(point.z));
}
function dimensions(box) {
  return box.getSize(new T.Vector3()).max(new T.Vector3(1e-6, 1e-6, 1e-6));
}
function referencePalette(root) {
  if (palettes.has(root)) return palettes.get(root);
  root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(root, true), size = dimensions(bounds);
  const colors = new Float32Array(cells * 3), counts = new Uint32Array(cells);
  const images = new Map();
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, material = mesh.material, map = material.map;
    let pixels;
    if (map?.image && geometry.attributes.uv) {
      if (!images.has(map)) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(512, map.image.width);
        canvas.height = Math.min(512, map.image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(map.image, 0, 0, canvas.width, canvas.height);
        images.set(map, ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
      pixels = images.get(map);
    }
    const vertexColor = geometry.attributes.color;
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      color.copy(material.color);
      if (pixels) {
        uv.fromBufferAttribute(geometry.attributes.uv, i);
        map.transformUv(uv);
        const x = Math.min(pixels.width - 1, Math.max(0, Math.floor(uv.x * pixels.width)));
        const y = Math.min(pixels.height - 1, Math.max(0, Math.floor(uv.y * pixels.height)));
        const offset = 4 * (x + y * pixels.width), data = pixels.data;
        if (data[offset + 3] < 16) continue;
        color.setRGB(data[offset]/255, data[offset+1]/255, data[offset+2]/255, map.colorSpace).multiply(material.color);
      }
      if (vertexColor) {
        color.r *= vertexColor.getX(i); color.g *= vertexColor.getY(i); color.b *= vertexColor.getZ(i);
      }
      const k = cellAt(mesh, i, bounds, size);
      colors[k*3] += color.r; colors[k*3+1] += color.g; colors[k*3+2] += color.b; counts[k]++;
    }
  });
  // Propagate to empty cells, including geometry outside the GT silhouette.
  const queue = new Uint32Array(cells);
  let end = 0;
  for (let k = 0; k < cells; k++) if (counts[k]) {
    for (let c = 0; c < 3; c++) colors[k*3+c] /= counts[k];
    queue[end++] = k;
  }
  for (let cursor = 0; cursor < end; cursor++) {
    const k = queue[cursor];
    for (let axis = 0, stride = 1; axis < 3; axis++, stride *= resolution) {
      const coordinate = Math.floor(k / stride) % resolution;
      for (const dir of [-1, 1]) {
        const next = k + dir * stride;
        if (coordinate+dir < 0 || coordinate+dir >= resolution || counts[next]) continue;
        colors.set(colors.subarray(k*3,k*3+3), next*3);
        counts[next] = 1; queue[end++] = next;
      }
    }
  }
  palettes.set(root, end ? colors : null);
  return palettes.get(root);
}
export function colorBareDelivery(reference, root, {colorUniformSurface = false} = {}) {
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return null;
  const materials = meshes.map(mesh => mesh.material);
  if (materials.some(mat => mat.map || mat.vertexColors || mat.emissiveMap || !mat.color)) return null;
  const first = materials[0].color;
  const uniform = materials.every(({color}) => color.equals(first));
  if (!(colorUniformSurface && uniform)) {
    const authoredColor = materials.some(({color: c}) =>
      Math.min(c.r,c.g,c.b) < .32 ||
      Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b) > .03 ||
      Math.abs(c.r-first.r) > .08);
    if (authoredColor) return null;
  }
  const palette = referencePalette(reference);
  if (!palette) return null;
  root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(root, true), size = dimensions(bounds);
  const copies = [];
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone(), material = mesh.material.clone();
    const rgb = new Float32Array(3 * geometry.attributes.position.count);
    for (let i = 0; i < rgb.length / 3; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).sub(bounds.min).divide(size);
      point.multiplyScalar(resolution).addScalar(-.5).clampScalar(0,resolution-1);
      const x = Math.floor(point.x), y = Math.floor(point.y), z = Math.floor(point.z);
      for (let dz=0; dz<=1; dz++) for (let dy=0; dy<=1; dy++) for (let dx=0; dx<=1; dx++) {
        const k = Math.min(x+dx,resolution-1) + resolution * (Math.min(y+dy,resolution-1) + resolution*Math.min(z+dz,resolution-1));
        const weight = (dx ? point.x-x : 1-point.x+x) * (dy ? point.y-y : 1-point.y+y) * (dz ? point.z-z : 1-point.z+z);
        for (let c=0; c<3; c++) rgb[3*i+c] += weight * palette[3*k+c];
      }
    }
    geometry.setAttribute('color', new T.BufferAttribute(rgb,3));
    material.color.set(0xffffff); material.vertexColors = true; material.metalness = 0;
    mesh.geometry = geometry; mesh.material = material; copies.push([geometry,material]);
  }
  return () => copies.forEach(([g,m]) => {g.dispose();m.dispose();});
}
