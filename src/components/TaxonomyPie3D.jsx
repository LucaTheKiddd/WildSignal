import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const COLORS = ['#ff4fa3', '#7c6cff', '#27d7b1', '#ffc857', '#ff7657', '#4aa8ff', '#b5e85b', '#778297'];

export default function TaxonomyPie3D({ data = [] }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const wedgesRef = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const chartData = useMemo(() => data.filter((item) => item.value > 0), [data]);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
  }, [chartData]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !chartData.length) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.3, 6.3);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const group = new THREE.Group();
    group.rotation.x = -0.72;
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 2.7);
    light.position.set(-3, 4, 6);
    scene.add(light);

    let angle = Math.PI / 2;
    const wedges = chartData.map((slice, index) => {
      const arc = (slice.value / total) * Math.PI * 2;
      const gap = Math.min(0.018, arc * 0.08);
      const start = angle - arc + gap;
      const end = angle - gap;
      angle -= arc;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.absarc(0, 0, 1.85, start, end, false);
      shape.lineTo(0, 0);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.36,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
        curveSegments: 32,
      });
      const material = new THREE.MeshStandardMaterial({
        color: COLORS[index % COLORS.length],
        roughness: 0.43,
        metalness: 0.12,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -0.18;
      const middle = (start + end) / 2;
      mesh.userData = { index, middle, baseColor: material.color.clone() };
      group.add(mesh);
      return mesh;
    });
    wedgesRef.current = wedges;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let lastX = 0;
    let animationFrame;

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, Math.max(height, 220), false);
      camera.aspect = width / Math.max(height, 220);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const selectFromPointer = (event) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(wedges)[0];
      if (hit) setActiveIndex(hit.object.userData.index);
    };
    const pointerDown = (event) => {
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event) => {
      if (dragging) {
        group.rotation.z += (event.clientX - lastX) * 0.012;
        lastX = event.clientX;
      } else selectFromPointer(event);
    };
    const pointerUp = (event) => {
      dragging = false;
      canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);

    const render = () => {
      if (!dragging) group.rotation.z += 0.0012;
      wedges.forEach((mesh) => {
        const selected = mesh.userData.index === activeIndexRef.current;
        const lift = selected ? 0.11 : 0;
        mesh.position.x += (Math.cos(mesh.userData.middle) * lift - mesh.position.x) * 0.12;
        mesh.position.y += (Math.sin(mesh.userData.middle) * lift - mesh.position.y) * 0.12;
        mesh.material.emissive.copy(mesh.userData.baseColor);
        mesh.material.emissiveIntensity = selected ? 0.22 : 0;
      });
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      wedges.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
      wedgesRef.current = [];
    };
  }, [chartData, total]);

  if (!chartData.length) return null;
  const selected = chartData[Math.min(activeIndex, chartData.length - 1)];

  return (
    <div className="taxonomy-chart" aria-label="Interactive 3D chart of sampled species occurrences">
      <div className="taxonomy-canvas" ref={hostRef}>
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="taxonomy-tooltip">
          <strong>{selected.name}</strong>
          <span>{selected.value} records · {Math.round(selected.value / total * 100)}%</span>
        </div>
        <small className="taxonomy-drag-hint">DRAG TO ROTATE</small>
      </div>
      <div className="taxonomy-legend">
        {chartData.map((item, index) => (
          <button
            type="button"
            key={`${item.name}-${index}`}
            className={index === activeIndex ? 'active' : ''}
            onClick={() => setActiveIndex(index)}
            onPointerEnter={() => setActiveIndex(index)}
          >
            <i style={{ '--slice-color': COLORS[index % COLORS.length] }} />
            <span>{item.name}</span>
            <em>{Math.round(item.value / total * 100)}%</em>
          </button>
        ))}
      </div>
    </div>
  );
}
