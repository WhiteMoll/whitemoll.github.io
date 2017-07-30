/**
Copyright (C) 2017 Thomas Ville

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
var sketch = function (p) {
    var myCanvas = undefined;

    var nbParticlesInit = 100;
    var particles = [];

    var isRunning = true;

    var minClientSize = document.body.clientWidth < document.body.clientHeight ? document.body.clientWidth : document.body.clientHeight;

    let width = document.body.clientWidth;
    let height = document.body.clientHeight;

    const origWidth = width;
    const origHeight = height;

    let domGuiContainer = document.getElementById('gui-container');
    let domNameContainer = document.getElementById('name-container');
    let domToggleAnimationBtn = document.getElementById('toggle-animation-btn');
    let domTweakAnimationBtn = document.getElementById('tweak-animation-btn');

    var gui = new dat.GUI({ autoPlace: false });
    domGuiContainer.appendChild(gui.domElement);
    domGuiContainer.style.visibility = 'hidden';
    
    var preset = {
        lineColor: {r: 255, g: 255, b: 255},
        backgroundColor: {r: 11, g: 70, b: 80},
        backgroundSpeed: 0.06,
        maxDistance: Math.floor(minClientSize/4),
        reset: function() {
            particles = [];
            for(let i = 0; i < nbParticlesInit; i++) {
                addParticle(particles);
            }
            Object.assign(animation, preset);
        }
    };
    var animation = Object.assign({}, preset);
    
    var isGuiVisible = false;
    var consecutiveFPSDrops = 0, consecutiveFPSAbove = 0;

    domNameContainer.classList.add('visible');
    domToggleAnimationBtn.onclick = onToggleAnimationClick;
    domTweakAnimationBtn.onclick = onTweakClick;
    
    p.setup = function() {
        // Rescales to 1080p when the screen is qHD (for smartphones)
        // Sorry for people who have UHD screens ^^
        if(width * height > 3500000)
            p.pixelDensity(0.75);

        // Create the canvas
        myCanvas = p.createCanvas(width, height);
        myCanvas.parent('home');
        p.frameRate(60);

        // Set the tweaking gui
        gui.addColor(animation, 'lineColor');
        gui.addColor(animation, 'backgroundColor');
        gui.add(animation, 'backgroundSpeed', 0, 0.1);
        gui.add(animation, 'maxDistance', 1, minClientSize);
        gui.add(animation, 'reset');
        // Add some particles
        for(let i = 0; i < nbParticlesInit; i++) {
            addParticle(particles);
        }
    }

    p.draw = function() {
        if(!isRunning) return;
        if(p.frameRate() > 15) {
            animation.backgroundColor = increaseHue(animation.backgroundColor, animation.backgroundSpeed/p.frameRate());
            p.background('rgb('+Math.floor(animation.backgroundColor.r)+','+Math.floor(animation.backgroundColor.g)+','+Math.floor(animation.backgroundColor.b)+')');

            for(let i = 0; i < particles.length; i++) {
                if(particles[i].position.x > width + animation.maxDistance || particles[i].position.x < -animation.maxDistance || particles[i].position.y > height + animation.maxDistance || particles[i].position.y < -animation.maxDistance) {
                    respawnParticle(particles[i]);
                } else {
                    particles[i].position.x += particles[i].direction.x/p.frameRate();
                    particles[i].position.y += particles[i].direction.y/p.frameRate();
                }
                p.stroke('rgb('+Math.floor(animation.lineColor.r)+','+Math.floor(animation.lineColor.g)+','+Math.floor(animation.lineColor.b)+')');
                
                let distance = Math.sqrt(Math.pow(particles[i].position.x - p.mouseX, 2) + Math.pow(particles[i].position.y - p.mouseY, 2));
                if(distance < animation.maxDistance) {
                    p.strokeWeight(2 - distance/(animation.maxDistance/2));
                    p.line(p.mouseX, p.mouseY, particles[i].position.x, particles[i].position.y);
                }
                for(let j = i+1; j < particles.length; j++) {
                    let distance = particles[i].position.dist(particles[j].position);
                    if(distance < animation.maxDistance) {
                        p.strokeWeight(1 - distance/(animation.maxDistance/1));
                        p.line(particles[i].position.x, particles[i].position.y, particles[j].position.x, particles[j].position.y);
                    }
                }
            }
            // Update the gui
            for (let i in gui.__controllers) {
                gui.__controllers[i].updateDisplay();
            }
        } else {
            consecutiveFPSDrops++;
            if(consecutiveFPSDrops > 20) {
                // Second stage of optimization : stop the animation
                domToggleAnimationBtn.click();
                consecutiveFPSDrops = 0;
            } else if(consecutiveFPSDrops > 10) {
                // First stage of optimization : scale down the rendering definition
                p.pixelDensity(0.75);
            }
        }
    }
    // Add particles when clicked
    p.mouseDragged = function(t) {
        if(t.target == myCanvas.canvas) {
            let part = particles[Math.floor(Math.random()*particles.length)];
            part.position.x = p.mouseX;
            part.position.y = p.mouseY;
            return false;
        }
    }
    // dynamically adjust the canvas to the window
    p.windowResized= function() {
        width = p.windowWidth;
        height = p.windowHeight;
        minClientSize = width < height ? width : height;
        
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    }
    /******* Particles ********/
    // Add one particle to the list of particles
    function addParticle(particles, x, y) {
        x = x || Math.random()*width;
        y = y || Math.random()*height;

        let direction = p.createVector(Math.random()-0.5, Math.random()-0.5);
        direction.setMag(Math.random()*20+10);

        particles.push({
            position: p.createVector(x,y),
            direction: direction
        });
    }
    // Move a particle at a random position, trying to put it away of every other particle
    function respawnParticle(particle) {
        let randX = 0;
        let randY = 0;
        let allowedTries = 10;
        do {
            randX = Math.random()*width;
            randY = Math.random()*height;
            allowedTries--;
        } while(allowedTries !== 0 && isConnectedToParticles(particles, animation.maxDistance, randX, randY));
        particle.position.x = randX;
        particle.position.y = randY;
    }
    // Returns true if the position is close enough to make a connection with another particle
    function isConnectedToParticles(particles, maxDistance, x, y) {
        let invisible = true;
        let position = p.createVector(x, y);
        for(let j = 0; j < particles.length; j++) {
            if(particles[j].position.dist(position) < maxDistance) {
                invisible = false;
                break;
            }
        }
        return !invisible;
    }

    /******* Utilities ********/
    // Returns the distance between two points
    function distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }
    // Change the hue of the color by delta
    function increaseHue(color, delta) {
        let hsv = RGBtoHSV(color);
        hsv.h+=delta;
        return HSVtoRGB(hsv);
    }
    // https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
    /* accepts parameters
    * r  Object = {r:x, g:y, b:z}
    * OR 
    * r, g, b
    */
    function RGBtoHSV(r, g, b) {
        if (arguments.length === 1) {
            g = r.g, b = r.b, r = r.r;
        }
        var max = Math.max(r, g, b), min = Math.min(r, g, b),
            d = max - min,
            h,
            s = (max === 0 ? 0 : d / max),
            v = max / 255;

        switch (max) {
            case min: h = 0; break;
            case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
            case g: h = (b - r) + d * 2; h /= 6 * d; break;
            case b: h = (r - g) + d * 4; h /= 6 * d; break;
        }

        return {
            h: h,
            s: s,
            v: v
        };
    }
    /* accepts parameters
    * h  Object = {h:x, s:y, v:z}
    * OR 
    * h, s, v
    */
    function HSVtoRGB(h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
            s = h.s, v = h.v, h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /******* Other events ********/
    function onTweakClick() {
        isGuiVisible = !isGuiVisible;
        if(isGuiVisible) {
            domNameContainer.classList.remove('visible');
            domGuiContainer.style.visibility = 'visible';
        } else {
            domNameContainer.classList.add('visible');
            domGuiContainer.style.visibility = 'hidden';
        }
    }
    function onToggleAnimationClick() {
        isRunning = !isRunning;
        if(isRunning) {
            this.innerHTML = 'Animation On';
        } else {
            this.innerHTML = 'Animation Off';            
        }
    }
};

new p5(sketch, document.getElementById('home'));


