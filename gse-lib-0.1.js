class GSEngine {
    constructor(canvasId, options = {}, gameName, creater) {
        document.body.innerHTML = "<div id='engineContainer'>" + document.body.innerHTML + "</div>";
        let previewId = Math.random().toString();
        let loadBarId = Math.random().toString();
        this.preview = GameAndEnginePreview.replace("GseGameName", gameName)
        .replace("GseCreaterName", creater)
        .replace("LoadBarId", loadBarId)
        .replace("PreviewId", previewId);
        document.body.innerHTML += this.preview;
        let inter = setInterval(() => 
            {
                const randomStep = Math.floor(Math.random() * 26) + 5;
                document.getElementById(loadBarId).value += randomStep;
                if(document.getElementById(loadBarId).value >= 2000){
                    document.getElementById(previewId).addEventListener("click", () => {document.getElementById(previewId).style.display = 'none'});
                    clearInterval(inter);
                }
            }, 50);
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scenes = {};
        this.currentScene = null;
        this.gameObjects = [];
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fixedTime = 0;
        this.fixedDeltaTime = options.fixedDeltaTime || 0.02; // 50 FPS для FixedUpdate
        this.isRunning = false;
        this.physicsEnabled = options.physicsEnabled !== false;
        this.collisionMatrix = options.collisionMatrix || {};
        this.uiElements = [];
        
        this.canvas.width = options.width || 800;
        this.canvas.height = options.height || 600;
        
        this.gravity = options.gravity || { x: 0, y: 0.5 };
        this.layers = options.layers || ['default', 'ui'];
        
        this.start();
    }
    
    createScene(name) {
        const scene = {
            name,
            gameObjects: [],
            uiElements: [],
            start: () => {},
            update: () => {},
            fixedUpdate: () => {},
            onLoad: () => {}
        };
        this.scenes[name] = scene;
        return scene;
    }
    
    loadScene(name) {
        if (this.scenes[name]) {
            this.currentScene = this.scenes[name];
            this.gameObjects = this.currentScene.gameObjects;
            this.uiElements = this.currentScene.uiElements;
            this.currentScene.onLoad();
        }
    }
    
    createGameObject(name, components = [], layer = 'default') {
        const gameObject = {
            name,
            transform: {
                position: { x: 0, y: 0 },
                rotation: 0,
                scale: { x: 1, y: 1 }
            },
            components: [],
            layer,
            active: true,
            tag: 'untagged',
            onCollision: (other) => {},
            onTrigger: (other) => {},
            start: () => {},
            update: () => {},
            fixedUpdate: () => {},
            addComponent: function(component) {
                component.gameObject = this;
                component.engine = this.engine;
                this.components.push(component);
                return component;
            },
            getComponent: function(type) {
                return this.components.find(c => c instanceof type);
            },
            removeComponent: function(component) {
                const index = this.components.indexOf(component);
                if (index !== -1) {
                    this.components.splice(index, 1);
                }
            }
        };
        
        gameObject.engine = this;
        
        components.forEach(comp => {
            const component = new comp();
            gameObject.addComponent(component);
        });
        
        if (this.currentScene) {
            this.currentScene.gameObjects.push(gameObject);
        }
        
        this.gameObjects.push(gameObject);
        
        // Вызов start для объекта и его компонентов
        gameObject.start();
        gameObject.components.forEach(comp => {
            if (comp.start) comp.start();
        });
        
        return gameObject;
    }
    
    createUIElement(name, components = []) {
        const uiElement = {
            name,
            rectTransform: {
                position: { x: 0, y: 0 },
                size: { width: 100, height: 50 },
                anchor: { x: 0.5, y: 0.5 }
            },
            components: [],
            active: true,
            start: () => {},
            update: () => {},
            addComponent: function(component) {
                component.uiElement = this;
                this.components.push(component);
                return component;
            },
            getComponent: function(type) {
                return this.components.find(c => c instanceof type);
            },
            removeComponent: function(component) {
                const index = this.components.indexOf(component);
                if (index !== -1) {
                    this.components.splice(index, 1);
                }
            }
        };
        
        components.forEach(comp => uiElement.addComponent(new comp()));
        
        if (this.currentScene) {
            this.currentScene.uiElements.push(uiElement);
        }
        
        this.uiElements.push(uiElement);
        
        uiElement.start();
        uiElement.components.forEach(comp => {
            if (comp.start) comp.start();
        });
        
        return uiElement;
    }
    
    find(name) {
        return this.gameObjects.find(obj => obj.name === name);
    }
    
    findWithTag(tag) {
        return this.gameObjects.filter(obj => obj.tag === tag);
    }
    
    destroy(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.gameObjects.splice(index, 1);
        }
        
        if (this.currentScene) {
            const sceneIndex = this.currentScene.gameObjects.indexOf(gameObject);
            if (sceneIndex !== -1) {
                this.currentScene.gameObjects.splice(sceneIndex, 1);
            }
        }
    }
    
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    stop() {
        this.isRunning = false;
    }
    
    gameLoop(timestamp) {
        this.deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.fixedTime += this.deltaTime;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Вызов FixedUpdate с фиксированным интервалом
        while (this.fixedTime >= this.fixedDeltaTime) {
            this.fixedUpdateGameObjects();
            if (this.currentScene && this.currentScene.fixedUpdate) {
                this.currentScene.fixedUpdate(this.fixedDeltaTime);
            }
            this.fixedTime -= this.fixedDeltaTime;
        }
        
        this.updateGameObjects();
        this.renderGameObjects();
        this.renderUI();
        
        if (this.isRunning) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    updateGameObjects() {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(this.deltaTime);
        }
        
        if (this.physicsEnabled) {
            this.updatePhysics();
        }
        
        for (const gameObject of this.gameObjects) {
            if (!gameObject.active) continue;
            
            gameObject.update(this.deltaTime);
            
            for (const component of gameObject.components) {
                if (component.update) {
                    component.update(this.deltaTime);
                }
            }
        }
        
        for (const uiElement of this.uiElements) {
            if (!uiElement.active) continue;
            
            uiElement.update(this.deltaTime);
            
            for (const component of uiElement.components) {
                if (component.update) {
                    component.update(this.deltaTime);
                }
            }
        }
    }
    
    fixedUpdateGameObjects() {
        for (const gameObject of this.gameObjects) {
            if (!gameObject.active) continue;
            
            gameObject.fixedUpdate(this.fixedDeltaTime);
            
            for (const component of gameObject.components) {
                if (component.fixedUpdate) {
                    component.fixedUpdate(this.fixedDeltaTime);
                }
            }
        }
    }
    
    updatePhysics() {
        for (const gameObject of this.gameObjects) {
            if (!gameObject.active) continue;
            
            const rigidbody = gameObject.getComponent(Rigidbody2D);
            if (!rigidbody) continue;
            
            if (rigidbody.useGravity && !rigidbody.isKinematic) {
                rigidbody.velocity.x += this.gravity.x * this.deltaTime;
                rigidbody.velocity.y += this.gravity.y * this.deltaTime;
            }
            
            const collider = gameObject.getComponent(Collider2D);
            if (collider && !rigidbody.isKinematic) {
                const newPosition = {
                    x: gameObject.transform.position.x + rigidbody.velocity.x * this.deltaTime,
                    y: gameObject.transform.position.y + rigidbody.velocity.y * this.deltaTime
                };
                
                const collisionResult = this.checkCollision(gameObject, newPosition);
                
                if (collisionResult.hasCollision) {
                    if (collider.isTrigger) {
                        for (const other of collisionResult.collisions) {
                            gameObject.onTrigger(other);
                            if (collider.onTrigger) {
                                collider.onTrigger(other);
                            }
                        }
                    } else {
                        gameObject.transform.position = collisionResult.safePosition;
                        rigidbody.velocity = collisionResult.safeVelocity;
                        
                        for (const other of collisionResult.collisions) {
                            gameObject.onCollision(other);
                            if (collider.onCollision) {
                                collider.onCollision(other);
                            }
                        }
                    }
                } else {
                    gameObject.transform.position = newPosition;
                }
            } else {
                gameObject.transform.position.x += rigidbody.velocity.x * this.deltaTime;
                gameObject.transform.position.y += rigidbody.velocity.y * this.deltaTime;
            }
        }
    }
    
    checkCollision(gameObject, newPosition) {
        const result = {
            hasCollision: false,
            collisions: [],
            safePosition: { ...newPosition },
            safeVelocity: { x: 0, y: 0 }
        };
        
        const collider = gameObject.getComponent(Collider2D);
        if (!collider) return result;
        
        const rigidbody = gameObject.getComponent(Rigidbody2D);
        
        const originalPosition = { ...gameObject.transform.position };
        gameObject.transform.position = newPosition;
        
        for (const other of this.gameObjects) {
            if (other === gameObject || !other.active) continue;
            
            if (this.collisionMatrix[gameObject.layer] && 
                !this.collisionMatrix[gameObject.layer].includes(other.layer)) {
                continue;
            }
            
            const otherCollider = other.getComponent(Collider2D);
            if (!otherCollider) continue;
            
            if (this.checkColliderOverlap(collider, otherCollider)) {
                result.hasCollision = true;
                result.collisions.push({
                    gameObject: other,
                    collider: otherCollider
                });
                
                if (!collider.isTrigger && !otherCollider.isTrigger && rigidbody) {
                    result.safePosition = { ...originalPosition };
                    result.safeVelocity = {
                        x: rigidbody.velocity.x * -rigidbody.bounciness,
                        y: rigidbody.velocity.y * -rigidbody.bounciness
                    };
                }
            }
        }
        
        gameObject.transform.position = originalPosition;
        return result;
    }
    
    checkColliderOverlap(colliderA, colliderB) {
        if (colliderA instanceof BoxCollider2D && colliderB instanceof BoxCollider2D) {
            const a = colliderA.getWorldBounds();
            const b = colliderB.getWorldBounds();
            
            return a.x < b.x + b.width &&
                   a.x + a.width > b.x &&
                   a.y < b.y + b.height &&
                   a.y + a.height > b.y;
        }
        return false;
    }
    
    renderGameObjects() {
        const layersOrder = this.layers;
        const layeredObjects = {};
        
        for (const layer of layersOrder) {
            layeredObjects[layer] = [];
        }
        
        for (const gameObject of this.gameObjects) {
            if (!gameObject.active) continue;
            
            if (layeredObjects[gameObject.layer]) {
                layeredObjects[gameObject.layer].push(gameObject);
            } else {
                layeredObjects['default'].push(gameObject);
            }
        }
        
        for (const layer of layersOrder) {
            for (const gameObject of layeredObjects[layer]) {
                for (const component of gameObject.components) {
                    if (component.render) {
                        component.render(this.ctx);
                    }
                }
            }
        }
    }
    
    renderUI() {
        for (const uiElement of this.uiElements) {
            if (!uiElement.active) continue;
            
            for (const component of uiElement.components) {
                if (component.render) {
                    component.render(this.ctx);
                }
            }
        }
    }
}

class Component {
    constructor() {
        this.gameObject = null;
        this.uiElement = null;
        this.engine = null;
    }
    
    start() {}
    update(deltaTime) {}
    fixedUpdate(deltaTime) {}
    render(ctx) {}
}

class SpriteRenderer extends Component {
    constructor(imageSrc, width, height) {
        super();
        this.width = width;
        this.height = height;
        this.image = null;
        this.loaded = false;
        
        if (imageSrc) {
            this.loadImage(imageSrc);
        }
    }
    
    loadImage(imageSrc) {
        this.image = new Image();
        this.image.onload = () => {
            this.loaded = true;
        };
        this.image.onerror = () => {
            console.error(`Failed to load image: ${imageSrc}`);
            this.loaded = false;
        };
        this.image.src = imageSrc;
    }
    
    render(ctx) {
        if (!this.loaded || !this.image) return;
        
        const transform = this.gameObject.transform;
        ctx.save();
        ctx.translate(transform.position.x, transform.position.y);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(transform.scale.x, transform.scale.y);
        
        ctx.drawImage(
            this.image,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        
        ctx.restore();
    }
}

class UIImage extends Component {
    constructor(imageSrc, width, height) {
        super();
        this.width = width;
        this.height = height;
        this.image = null;
        this.loaded = false;
        this.color = 'white';
        
        if (imageSrc) {
            this.loadImage(imageSrc);
        }
    }
    
    loadImage(imageSrc) {
        this.image = new Image();
        this.image.onload = () => {
            this.loaded = true;
        };
        this.image.onerror = () => {
            console.error(`Failed to load image: ${imageSrc}`);
            this.loaded = false;
        };
        this.image.src = imageSrc;
    }
    
    render(ctx) {
        const rect = this.uiElement.rectTransform;
        const x = rect.position.x - rect.size.width * rect.anchor.x;
        const y = rect.position.y - rect.size.height * rect.anchor.y;
        
        if (this.loaded && this.image) {
            ctx.drawImage(
                this.image,
                x,
                y,
                rect.size.width,
                rect.size.height
            );
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(x, y, rect.size.width, rect.size.height);
        }
    }
}

class UIText extends Component {
    constructor(text, style = {}) {
        super();
        this.text = text;
        this.style = {
            color: style.color || 'black',
            fontSize: style.fontSize || '16px',
            fontFamily: style.fontFamily || 'Arial',
            align: style.align || 'left'
        };
    }
    
    render(ctx) {
        const rect = this.uiElement.rectTransform;
        const x = rect.position.x - rect.size.width * rect.anchor.x;
        const y = rect.position.y - rect.size.height * rect.anchor.y;
        
        ctx.save();
        ctx.fillStyle = this.style.color;
        ctx.font = `${this.style.fontSize} ${this.style.fontFamily}`;
        ctx.textAlign = this.style.align;
        
        const lines = this.text.split('\n');
        const lineHeight = parseInt(this.style.fontSize) * 1.2;
        
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x, y + i * lineHeight);
        }
        
        ctx.restore();
    }
}

class Rigidbody2D extends Component {
    constructor() {
        super();
        this.velocity = { x: 0, y: 0 };
        this.useGravity = true;
        this.isKinematic = false;
        this.mass = 1;
        this.bounciness = 0.5;
    }
}

class Collider2D extends Component {
    constructor(isTrigger = false) {
        super();
        this.isTrigger = isTrigger;
        this.onCollision = (other) => {};
        this.onTrigger = (other) => {};
    }
}

class BoxCollider2D extends Collider2D {
    constructor(width, height, isTrigger = false) {
        super(isTrigger);
        this.width = width;
        this.height = height;
        this.offset = { x: 0, y: 0 };
    }
    
    getWorldBounds() {
        return {
            x: this.gameObject.transform.position.x + this.offset.x - this.width / 2,
            y: this.gameObject.transform.position.y + this.offset.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

class PlayerController extends Component {
    constructor(speed = 200) {
        super();
        this.speed = speed;
        this.keys = {};
        
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }
    
    update(deltaTime) {
        const rigidbody = this.gameObject.getComponent(Rigidbody2D);
        if (!rigidbody) return;
        
        rigidbody.velocity.x = 0;
        
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            rigidbody.velocity.x = -this.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            rigidbody.velocity.x = this.speed;
        }
        if ((this.keys['ArrowUp'] || this.keys['w'] || this.keys[' '])) {
            const collider = this.gameObject.getComponent(Collider2D);
            if (collider) {
                const belowPosition = {
                    x: this.gameObject.transform.position.x,
                    y: this.gameObject.transform.position.y + 5
                };
                
                const collisionCheck = this.engine.checkCollision(
                    this.gameObject,
                    belowPosition
                );
                
                if (collisionCheck.hasCollision) {
                    rigidbody.velocity.y = -this.speed * 1.5;
                }
            }
        }
    }
}
class AudioPlayer extends Component {
    sounds = {};
    playsNowCount = 0;
    playsNow = [];
    audioContext = null;
    initialized = false;

    constructor() {
        super();
        // Инициализируем аудио при первом взаимодействии пользователя
        document.addEventListener('click', this.initAudio.bind(this), { once: true });
    }

    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;
    }

    addSound(name, src) {
        this.sounds[name] = new Audio(src);
        this.sounds[name].preload = 'auto';
    }
    
    playSrc(src){
        new Audio(src).play().catch((e) => {console.log("Audio error:", e.message)});
    }
    
    play(name) {
        if (!this.initialized || !this.sounds[name]) return;
        
        // Попытка воспроизведения с обработкой ошибки
        const playPromise = this.sounds[name].play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Воспроизведение звука заблокировано:", error);
                // Можно показать подсказку пользователю, что нужно взаимодействие
            });
        }

        if (!this.playsNow.includes(name)) {
            this.playsNow.push(name);
        }
        this.playsNowCount += 1;
    }

    pause(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
        }
    }

    stop(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0.0;
            
            if (this.playsNowCount > 0) {
                this.playsNowCount -= 1;
            } else {
                this.playsNowCount = 0;
            }
            
            this.playsNow = this.playsNow.filter((n) => n !== name);
        }
    }

    isPlaying(name) {
        return this.playsNow.includes(name);
    }
}
const GameAndEnginePreview = `
<div style="position: absolute; background-color: gray; height: 100%; width: 100%; left:0px; top:0px; z-index: 9999999999999;" id="PreviewId">
    <img src="https://goidastudio.github.io/goidastudio-dev/gse-icon.jpg" style="height: 100px; width: 100px; border-radius: 100%; border: 5px dashed; border-color: black;" />  
    <br>      
    <progress id="LoadBarId" value="0" max="2000"></progress>
    <br>
    <h5>Идет предзагрузка, игра уже поностью загружена, но во избежание ошибок нужно подождать. 
    <h1>GseGameName</h1>
    <h2>by GseCreaterName</h2>
    <br>
    <h4>Made with GSEngine © 2025</h2>
    <h4>by Goida Studio © 2025</h3>
    <h2>После завершения загрузки кликнете по экрану</h2>
</div>
`;
