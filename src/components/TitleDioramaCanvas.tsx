import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createTitleDioramaScene } from '../game/titleScene3D';

function detectSoftwareWebGL(): boolean {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let probe: HTMLCanvasElement | null = null;
  try {
    probe = document.createElement('canvas');
    gl = (probe.getContext('webgl2') ||
      probe.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return false;
    const rendererStr = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return false;
  } finally {
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    probe = null;
  }
}

function afterDraw(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  cb: () => void,
  delayMs = 80
): number {
  const gl2 = gl as WebGL2RenderingContext;
  if (typeof gl2.fenceSync === 'function' && gl2.SYNC_GPU_COMMANDS_COMPLETE) {
    const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = (): number => {
      if (!sync) {
        return window.setTimeout(cb, delayMs);
      }
      const status = gl2.clientWaitSync(sync, 0, 0);
      if (status === gl2.TIMEOUT_EXPIRED) {
        return window.setTimeout(() => {
          pollId = poll();
        }, 16);
      }
      gl2.deleteSync(sync);
      return window.setTimeout(cb, delayMs);
    };
    let pollId = window.setTimeout(() => {
      pollId = poll();
    }, 16);
    return pollId;
  }
  gl.finish();
  return window.setTimeout(cb, delayMs);
}

export const TitleDioramaCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const diorama = createTitleDioramaScene(renderer, isSoftwareGl);

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width || window.innerWidth));
      const h = Math.max(320, Math.floor(rect.height || window.innerHeight));
      renderer.setSize(w, h, false);
      diorama.resize(w, h);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      diorama.setPointer(nx, ny);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let elapsed = 0;
    let lastTs = performance.now();
    const glCtx = renderer.getContext();

    const step = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      diorama.update(dt, elapsed);
      renderer.render(diorama.scene, diorama.camera);

      if (isSoftwareGl) {
        timerId = afterDraw(glCtx, () => {
          if (!disposed) step(performance.now());
        });
      } else {
        rafId = window.requestAnimationFrame(step);
      }
    };

    if (isSoftwareGl) {
      step(performance.now());
    } else {
      rafId = window.requestAnimationFrame(step);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      diorama.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};
