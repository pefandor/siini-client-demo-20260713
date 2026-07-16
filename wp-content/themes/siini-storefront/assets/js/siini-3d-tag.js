import * as THREE from './vendor/three.module.min.js';

const TAG_SELECTOR = '[data-siini-3d-tag]';
const CANVAS_SELECTOR = '[data-siini-3d-tag-canvas]';
const FALLBACK_SELECTOR = '[data-siini-3d-tag-fallback]';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const FORCE_FALLBACK = new URLSearchParams(window.location.search).has('siini_3d_fallback');

const instances = [];

window.siini3DTagDebug = {
	version: '0.5.17',
	getState() {
		return instances.map((instance) => ({
			autoRotate: !REDUCED_MOTION.matches,
			fallback: instance.fallback,
			frame: instance.frame,
			ready: instance.ready,
			rotation: instance.group
				? [
					Number(instance.group.rotation.x.toFixed(4)),
					Number(instance.group.rotation.y.toFixed(4)),
					Number(instance.group.rotation.z.toFixed(4)),
				]
				: null,
			size: instance.canvas
				? {
					height: instance.canvas.height,
					width: instance.canvas.width,
				}
				: null,
		}));
	},
};

function canUseWebGL() {
	if (FORCE_FALLBACK || !window.WebGLRenderingContext) {
		return false;
	}

	const testCanvas = document.createElement('canvas');
	const context = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
	return Boolean(context);
}

function roundedRectShape(width, height, radius) {
	const x = -width / 2;
	const y = -height / 2;
	const shape = new THREE.Shape();

	shape.moveTo(x + radius, y);
	shape.lineTo(x + width - radius, y);
	shape.quadraticCurveTo(x + width, y, x + width, y + radius);
	shape.lineTo(x + width, y + height - radius);
	shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	shape.lineTo(x + radius, y + height);
	shape.quadraticCurveTo(x, y + height, x, y + height - radius);
	shape.lineTo(x, y + radius);
	shape.quadraticCurveTo(x, y, x + radius, y);

	return shape;
}

function roundedRectPoints(width, height, radius, steps = 8) {
	const points = [];
	const corners = [
		{ cx: width / 2 - radius, cy: -height / 2 + radius, start: -Math.PI / 2, end: 0 },
		{ cx: width / 2 - radius, cy: height / 2 - radius, start: 0, end: Math.PI / 2 },
		{ cx: -width / 2 + radius, cy: height / 2 - radius, start: Math.PI / 2, end: Math.PI },
		{ cx: -width / 2 + radius, cy: -height / 2 + radius, start: Math.PI, end: Math.PI * 1.5 },
	];

	corners.forEach((corner) => {
		for (let index = 0; index <= steps; index += 1) {
			const angle = corner.start + ((corner.end - corner.start) * index) / steps;
			points.push(new THREE.Vector3(
				corner.cx + Math.cos(angle) * radius,
				corner.cy + Math.sin(angle) * radius,
				0
			));
		}
	});

	return points;
}

function createLabelTexture() {
	const canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 640;

	const context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = '#171717';
	context.textAlign = 'left';
	context.textBaseline = 'alphabetic';

	context.font = 'italic 700 148px Georgia, "Times New Roman", serif';
	context.fillText('sini', 120, 255);

	context.font = '900 44px Arial, Helvetica, sans-serif';
	context.fillText('SINI VERIFIED', 122, 370);

	context.font = '900 34px Arial, Helvetica, sans-serif';
	context.fillText('DROP S26-01', 122, 432);

	context.fillStyle = '#6f6f6a';
	context.font = '900 30px Arial, Helvetica, sans-serif';
	context.fillText('ORIGINAL CHECK', 122, 486);

	context.fillStyle = '#171717';
	for (let index = 0; index < 12; index += 1) {
		const width = index % 3 === 0 ? 9 : 4;
		context.fillRect(702 + index * 15, 402, width, 82);
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	texture.needsUpdate = true;
	return texture;
}

function createShineTexture() {
	const canvas = document.createElement('canvas');
	canvas.width = 128;
	canvas.height = 512;

	const context = canvas.getContext('2d');
	const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
	gradient.addColorStop(0, 'rgba(255,255,255,0)');
	gradient.addColorStop(0.45, 'rgba(255,255,255,0.58)');
	gradient.addColorStop(1, 'rgba(255,255,255,0)');
	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.needsUpdate = true;
	return texture;
}

function createTagScene() {
	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 20);
	camera.position.set(0, 0, 6);

	const group = new THREE.Group();
	scene.add(group);

	const cardWidth = 3.35;
	const cardHeight = 2.1;
	const cardDepth = 0.08;
	const frontZ = cardDepth / 2 + 0.006;

	const cardGeometry = new THREE.ExtrudeGeometry(
		roundedRectShape(cardWidth, cardHeight, 0.13),
		{
			bevelEnabled: true,
			bevelSegments: 5,
			bevelSize: 0.022,
			bevelThickness: 0.018,
			depth: cardDepth,
		}
	);
	cardGeometry.center();

	const card = new THREE.Mesh(
		cardGeometry,
		new THREE.MeshStandardMaterial({
			color: 0xf7f6ef,
			metalness: 0.03,
			roughness: 0.88,
		})
	);
	group.add(card);

	const borderGeometry = new THREE.BufferGeometry().setFromPoints(
		roundedRectPoints(cardWidth - 0.11, cardHeight - 0.11, 0.1)
	);
	const border = new THREE.LineLoop(
		borderGeometry,
		new THREE.LineBasicMaterial({ color: 0x151515, depthTest: false, transparent: true, opacity: 0.88 })
	);
	border.position.z = frontZ + 0.004;
	border.renderOrder = 2;
	group.add(border);

	const label = new THREE.Mesh(
		new THREE.PlaneGeometry(cardWidth, cardHeight),
		new THREE.MeshBasicMaterial({
			depthTest: false,
			map: createLabelTexture(),
			transparent: true,
		})
	);
	label.position.z = frontZ + 0.008;
	label.renderOrder = 3;
	group.add(label);

	const hole = new THREE.Mesh(
		new THREE.TorusGeometry(0.115, 0.016, 20, 48),
		new THREE.MeshBasicMaterial({ color: 0x151515, depthTest: false })
	);
	hole.position.set(-cardWidth / 2 + 0.38, cardHeight / 2 - 0.34, frontZ + 0.018);
	hole.renderOrder = 4;
	group.add(hole);

	const holeInner = new THREE.Mesh(
		new THREE.CircleGeometry(0.071, 36),
		new THREE.MeshBasicMaterial({ color: 0xf3f3f0, depthTest: false })
	);
	holeInner.position.set(hole.position.x, hole.position.y, frontZ + 0.02);
	holeInner.renderOrder = 5;
	group.add(holeInner);

	const shine = new THREE.Mesh(
		new THREE.PlaneGeometry(0.44, cardHeight * 1.45),
		new THREE.MeshBasicMaterial({
			depthTest: false,
			map: createShineTexture(),
			opacity: 0,
			transparent: true,
		})
	);
	shine.position.set(-1.28, 0, frontZ + 0.03);
	shine.rotation.z = -0.52;
	shine.renderOrder = 6;
	group.add(shine);

	scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d5cc, 1.45));

	const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
	keyLight.position.set(1.8, 2.6, 4.2);
	scene.add(keyLight);

	const fillLight = new THREE.DirectionalLight(0xf1efe6, 0.75);
	fillLight.position.set(-3.2, -1.4, 2.8);
	scene.add(fillLight);

	group.rotation.set(-0.15, -0.35, -0.055);
	group.position.set(0, 0, 0);

	return { camera, group, scene, shine };
}

function createInstance(shell) {
	const canvas = shell.querySelector(CANVAS_SELECTOR);
	const fallbackElement = shell.querySelector(FALLBACK_SELECTOR);
	const instance = {
		canvas,
		fallback: false,
		frame: 0,
		group: null,
		ready: false,
	};

	instances.push(instance);

	if (!canvas || !fallbackElement || !canUseWebGL()) {
		shell.classList.add('is-fallback');
		instance.fallback = true;
		return;
	}

	try {
		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
			canvas,
			powerPreference: 'low-power',
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.setClearColor(0x000000, 0);

		const { camera, group, scene, shine } = createTagScene();
		instance.group = group;

		const pointer = { x: 0, y: 0 };
		const targetPointer = { x: 0, y: 0 };
		let hover = 0;
		let targetHover = 0;
		let scrollProgress = 0;
		let animationId = 0;

		const resize = () => {
			const rect = shell.getBoundingClientRect();
			const width = Math.max(1, Math.round(rect.width));
			const height = Math.max(1, Math.round(rect.height));
			const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
			const aspect = width / height;
			const viewHeight = aspect < 1.2 ? 3.4 : 2.95;

			camera.left = (-viewHeight * aspect) / 2;
			camera.right = (viewHeight * aspect) / 2;
			camera.top = viewHeight / 2;
			camera.bottom = -viewHeight / 2;
			camera.updateProjectionMatrix();
			renderer.setPixelRatio(ratio);
			renderer.setSize(width, height, false);
		};

		const updateScroll = () => {
			scrollProgress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
		};

		const animate = (time = 0) => {
			instance.frame += 1;

			pointer.x += (targetPointer.x - pointer.x) * 0.08;
			pointer.y += (targetPointer.y - pointer.y) * 0.08;
			hover += (targetHover - hover) * 0.08;

			const seconds = time * 0.001;
			const autoRotate = !REDUCED_MOTION.matches;
			const floatY = autoRotate ? Math.sin(seconds * 0.72) * 0.055 : 0;
			const drift = autoRotate ? Math.sin(seconds * 0.36) * 0.07 : 0;

			group.rotation.x = -0.15 + pointer.y * 0.14 + scrollProgress * 0.07;
			group.rotation.y = -0.35 + pointer.x * 0.24 + drift + scrollProgress * 0.12;
			group.rotation.z = -0.055 + (autoRotate ? Math.sin(seconds * 0.42) * 0.024 : 0);
			group.position.y = floatY - scrollProgress * 0.08;
			group.position.z = hover * 0.04;

			shine.material.opacity = 0.05 + hover * 0.14;
			shine.position.x = -1.28 + hover * 0.92 + (autoRotate ? Math.sin(seconds * 0.64) * 0.08 : 0);

			renderer.render(scene, camera);

			if (!instance.ready) {
				instance.ready = true;
				fallbackElement.setAttribute('aria-hidden', 'true');
				shell.classList.add('is-webgl-ready');
			}

			animationId = window.requestAnimationFrame(animate);
		};

		const onPointerMove = (event) => {
			const rect = shell.getBoundingClientRect();
			targetPointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
			targetPointer.y = -(((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2);
		};

		const onPointerLeave = () => {
			targetPointer.x = 0;
			targetPointer.y = 0;
			targetHover = 0;
		};

		const onPointerEnter = () => {
			targetHover = 1;
		};

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(shell);
		resize();
		updateScroll();
		window.addEventListener('scroll', updateScroll, { passive: true });
		shell.addEventListener('pointerenter', onPointerEnter, { passive: true });
		shell.addEventListener('pointermove', onPointerMove, { passive: true });
		shell.addEventListener('pointerleave', onPointerLeave, { passive: true });

		animationId = window.requestAnimationFrame(animate);

		window.addEventListener('pagehide', () => {
			window.cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
			window.removeEventListener('scroll', updateScroll);
			shell.removeEventListener('pointerenter', onPointerEnter);
			shell.removeEventListener('pointermove', onPointerMove);
			shell.removeEventListener('pointerleave', onPointerLeave);
			renderer.dispose();
		}, { once: true });
	} catch (error) {
		shell.classList.add('is-fallback');
		instance.fallback = true;
		instance.ready = false;
		console.warn('SINI 3D tag fallback:', error);
	}
}

document.querySelectorAll(TAG_SELECTOR).forEach((shell) => {
	if (!shell.getClientRects().length) {
		return;
	}

	createInstance(shell);
});
