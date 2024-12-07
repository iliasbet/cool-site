// Three.js setup
let scene, camera, renderer, material;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
const MOUSE_RADIUS = 300;

// Particle system
let particles = [];
const PARTICLE_COUNT = 300;
let particleCtx;

// Lightning system
let lightningCtx;
let lightningPoints = [];
const MAX_LIGHTNING_POINTS = 5;

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 1.2;
        this.speedY = (Math.random() - 0.5) * 1.2;
        this.life = 1;
        
        // Apple-like colors
        const hue = 210 + Math.random() * 20; // Blue range
        const saturation = 80 + Math.random() * 20;
        const lightness = 60 + Math.random() * 20;
        this.color = `hsla(${hue}, ${saturation}%, ${lightness}%, `;
        
        // Subtle movement
        this.oscillationSpeed = Math.random() * 0.04 + 0.02;
        this.oscillationAmplitude = Math.random() * 2.0 + 0.8;
        this.initialX = this.x;
        this.time = 0;
    }

    update() {
        this.time += this.oscillationSpeed;
        this.x = this.initialX + Math.sin(this.time) * this.oscillationAmplitude;
        this.y += this.speedY;
        this.life -= 0.003;

        if (this.life <= 0 || this.y < 0 || this.y > window.innerHeight) {
            this.reset();
        }
    }

    draw(ctx) {
        const glow = this.size * 3;
        const alpha = this.life * 0.3;
        
        // Soft glow
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, glow
        );
        gradient.addColorStop(0, this.color + alpha + ')');
        gradient.addColorStop(1, this.color + '0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

class LightningPoint {
    constructor(x, y) {
        this.start = { x, y };
        this.end = {
            x: x + (Math.random() * 200 - 100),
            y: y + (Math.random() * 200 - 100)
        };
        this.life = 1;
        this.branches = Math.floor(Math.random() * 2) + 1;
        this.width = Math.random() * 1 + 0.5;
        this.detail = Math.floor(Math.random() * 2) + 2;
        this.hue = 210 + Math.random() * 20; // Blue range
    }

    update() {
        this.life -= 0.1;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = this.life * 0.5;
        const mainColor = `hsla(${this.hue}, 80%, 60%, ${alpha})`;
        const glowColor = `hsla(${this.hue}, 80%, 70%, ${alpha * 0.3})`;
        
        const drawBranch = (start, end, width, depth) => {
            if (depth <= 0) return;
            
            // Create minimal segments
            let points = [start];
            let segments = this.detail + (2 - depth) * 2;
            
            for (let i = 1; i < segments; i++) {
                let t = i / segments;
                let point = {
                    x: start.x + (end.x - start.x) * t,
                    y: start.y + (end.y - start.y) * t
                };
                
                // Subtle randomness
                let offset = (1 - t) * t * 20;
                point.x += (Math.random() - 0.5) * offset;
                point.y += (Math.random() - 0.5) * offset;
                points.push(point);
            }
            points.push(end);
            
            // Draw glow
            ctx.beginPath();
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = width * 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            
            // Draw main line
            ctx.beginPath();
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            
            // Create minimal branches
            if (depth > 1) {
                for (let i = 1; i < points.length - 1; i++) {
                    if (Math.random() < 0.2) {
                        let angle = Math.atan2(points[i+1].y - points[i].y, points[i+1].x - points[i].x);
                        angle += (Math.random() - 0.5) * Math.PI / 4;
                        
                        let length = Math.random() * 50 + 25;
                        let branchEnd = {
                            x: points[i].x + Math.cos(angle) * length,
                            y: points[i].y + Math.sin(angle) * length
                        };
                        
                        drawBranch(points[i], branchEnd, width * 0.6, depth - 1);
                    }
                }
            }
        };
        
        drawBranch(this.start, this.end, this.width, this.branches);
    }
}

// Initialize Three.js scene
function init() {
    try {
        console.log('Initializing Three.js scene...');
        // Create scene
        scene = new THREE.Scene();
        
        // Orthographic camera for 2D rendering
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 1, 1000);
        camera.position.z = 1;

        // Initialize renderer with alpha and better quality
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('three-container').appendChild(renderer.domElement);

        // Initialize particle system
        const particleCanvas = document.getElementById('particle-canvas');
        particleCanvas.width = width;
        particleCanvas.height = height;
        particleCtx = particleCanvas.getContext('2d');

        // Initialize lightning system
        const lightningCanvas = document.getElementById('lightning-canvas');
        lightningCanvas.width = width;
        lightningCanvas.height = height;
        lightningCtx = lightningCanvas.getContext('2d');

        // Create particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }

        console.log('Loading texture...');
        // Load texture
        const loader = new THREE.TextureLoader();
        loader.load('cherenkov.jpg', 
            // Success callback
            (texture) => {
                console.log('Texture loaded successfully');
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                // Create custom shader material
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        tDiffuse: { value: texture },
                        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                        uRadius: { value: MOUSE_RADIUS },
                        uResolution: { value: new THREE.Vector2(width, height) },
                        uTime: { value: 0 }
                    },
                    vertexShader: document.getElementById('vertexShader').textContent,
                    fragmentShader: document.getElementById('fragmentShader').textContent,
                    transparent: true
                });

                // Create plane geometry that fills the screen
                const geometry = new THREE.PlaneGeometry(width, height);
                const mesh = new THREE.Mesh(geometry, material);
                scene.add(mesh);

                // Start animation
                animate();
                
                // Animate text elements
                anime({
                    targets: '#name',
                    opacity: [0, 1],
                    translateY: [50, 0],
                    duration: 1500,
                    easing: 'easeOutExpo'
                });

                anime({
                    targets: '#links',
                    opacity: [0, 1],
                    translateY: [30, 0],
                    delay: 500,
                    duration: 1500,
                    easing: 'easeOutExpo'
                });
            },
            // Progress callback
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // Error callback
            (error) => {
                console.error('Error loading texture:', error);
            }
        );

        // Event listeners
        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener('mousemove', onMouseMove, false);
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Handle window resize
function onWindowResize() {
    try {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

        if (material) {
            material.uniforms.uResolution.value.set(width, height);
        }

        // Resize canvases
        const particleCanvas = document.getElementById('particle-canvas');
        particleCanvas.width = width;
        particleCanvas.height = height;

        const lightningCanvas = document.getElementById('lightning-canvas');
        lightningCanvas.width = width;
        lightningCanvas.height = height;
    } catch (error) {
        console.error('Error during resize:', error);
    }
}

// Handle mouse movement
function onMouseMove(event) {
    targetX = event.clientX;
    targetY = event.clientY;
}

// Update mouse position with smoothing
function updateMousePosition() {
    mouseX += (targetX - mouseX) * 0.15;
    mouseY += (targetY - mouseY) * 0.15;

    if (material) {
        material.uniforms.uMouse.value.set(mouseX, mouseY);
    }
}

// Update and draw particles
function updateParticles() {
    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    particles.forEach(particle => {
        particle.update();
        particle.draw(particleCtx);
    });
}

// Update and draw lightning
function updateLightning() {
    lightningCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    lightningPoints = lightningPoints.filter(point => {
        point.update();
        point.draw(lightningCtx);
        return point.life > 0;
    });
}

let lastTime = performance.now();

// Animation loop
function animate() {
    try {
        requestAnimationFrame(animate);
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) * 0.001; // Convert to seconds
        lastTime = currentTime;
        
        updateMousePosition();
        updateParticles();
        updateLightning();
        
        if (material) {
            material.uniforms.uTime.value += deltaTime;
        }
        
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Error during animation:', error);
    }
}

// Start the application
console.log('Starting application...');
init(); 